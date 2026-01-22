from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import urllib.request
import json
import ssl
from ..database import supabase
from typing import Optional

router = APIRouter(prefix="/api/auth", tags=["auth"])

class StravaTokenRequest(BaseModel):
    athlete_id: int
    access_token: str
    refresh_token: str
    expires_at: int

@router.post("/strava-token")
def save_strava_token(req: StravaTokenRequest):
    try:
        data = {
            "athlete_id": req.athlete_id,
            "access_token": req.access_token,
            "refresh_token": req.refresh_token,
            "expires_at": req.expires_at
        }
        # 使用 upsert
        response = supabase.table("strava_tokens").upsert(data).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/member-binding")
async def proxy_member_binding(request: Request):
    """
    處理會員綁定邏輯（使用 strava_bindings 表格）：
    1. 驗證 tcu_members 中是否存在該會員
    2. 檢查 strava_bindings 中是否已有綁定
    3. 若未綁定，代理請求至 n8n 發送 OTP
    """
    try:
        body = await request.json()
        print(f"[DEBUG] Received body: {body}")
        
        action = body.get("action")
        email = body.get("email")
        memberName = body.get("memberName")
        strava_id = body.get("stravaId")
        tcu_account = body.get("input_id")  # 使用者輸入的 TCU ID
        
        print(f"[DEBUG] Parsed: action={action}, email={email}, stravaId={strava_id}, tcu_account={tcu_account}")
        
        if not email or not strava_id:
            print(f"[DEBUG] Missing params - email: {email}, stravaId: {strava_id}")
            return {"success": False, "message": "Missing email or stravaId"}

        # --- 驗證會員存在性 (從 tcu_members) ---
        print(f"[DEBUG] Verifying member exists in tcu_members by email: {email}")
        member_res = supabase.table("tcu_members").select("email, real_name, account").eq("email", email).execute()
        members = member_res.data
        print(f"[DEBUG] tcu_members query result: {len(members) if members else 0} members found")
        
        if not members:
            print("[DEBUG] No member found in tcu_members, returning error")
            return {
                "success": False, 
                "message": "查無此會員資料。請先至 https://www.tsu.com.tw/ 進行註冊。系統每天早上 9 點更新會員資料，請於更新後再試一次。"
            }
        
        member = members[0]

        # --- 檢查綁定狀態 (從 strava_bindings) ---
        print(f"[DEBUG] Checking strava_bindings for email: {email}")
        binding_res = supabase.table("strava_bindings").select("*").eq("tcu_member_email", email).execute()
        bindings = binding_res.data
        print(f"[DEBUG] strava_bindings query result: {len(bindings) if bindings else 0} bindings found")
        
        if action == "generate_otp":
            if bindings:
                existing_binding = bindings[0]
                existing_strava_id = existing_binding.get("strava_id")
                print(f"[DEBUG] Existing binding found. strava_id: '{existing_strava_id}', incoming: '{strava_id}'")
                
                # 已綁定相同 Strava ID -> 直接成功
                if existing_strava_id == str(strava_id):
                    print("[DEBUG] Already bound to same Strava ID, returning already_bound")
                    return {"success": True, "message": "Already bound successfully", "already_bound": True}
                
                # 已綁定不同 Strava ID -> 提示聯繫官方
                print(f"[DEBUG] Already bound to DIFFERENT Strava ID: {existing_strava_id}")
                return {
                    "success": False, 
                    "message": "此會員身份已綁定其他 Strava 帳號。如有疑問，請洽 TCU Line@ 官方：https://page.line.me/criterium"
                }
            else:
                print("[DEBUG] No existing binding, proceeding to n8n webhook...")

        # --- 進入 Proxy 邏輯 (代理至 n8n) ---
        import os
        n8n_url = os.getenv("N8N_MEMBER_BINDING_URL", "https://n8n.criterium.tw/webhook/member-binding")
        
        print(f"[DEBUG] Proxying request to n8n: {n8n_url}")
        
        req = urllib.request.Request(
            n8n_url,
            data=json.dumps(body).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            method='POST'
        )
        
        try:
            # 設定 15 秒 timeout
            with urllib.request.urlopen(req, context=ssl._create_unverified_context(), timeout=15) as response:
                status = response.getcode()
                res_data = response.read().decode('utf-8')
                print(f"[DEBUG] n8n response status: {status}, data: {res_data}")
                
                if not res_data.strip():
                    return {"success": True, "message": "Webhook received with empty response"}
                
                try:
                    return json.loads(res_data)
                except json.JSONDecodeError:
                    return {"success": True, "message": "Webhook received", "raw_response": res_data}
        except urllib.error.HTTPError as e:
            error_content = e.read().decode('utf-8')
            print(f"[DEBUG] n8n HTTP Error {e.code}: {error_content}")
            return {"success": False, "message": f"n8n error: {error_content}"}
        except Exception as e:
            import socket
            if isinstance(e, socket.timeout):
                 print("[DEBUG] n8n Webhook Timed Out")
                 return {"success": False, "message": "Webhook connection timed out"}
            print(f"[DEBUG] Proxy error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Proxy failed: {str(e)}")
    except Exception as e:
        print(f"[DEBUG] General error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


# ========== 綁定確認 (OTP 驗證後寫入 strava_bindings) ==========
@router.post("/confirm-binding")
async def confirm_binding(request: Request):
    """
    OTP 驗證成功後，將綁定關係寫入 strava_bindings 表格。
    """
    try:
        body = await request.json()
        email = body.get("email")
        strava_id = body.get("stravaId")
        tcu_account = body.get("tcu_account")
        member_name = body.get("member_name")
        
        print(f"[DEBUG] Confirming binding: email={email}, stravaId={strava_id}, tcu_account={tcu_account}")
        
        if not email or not strava_id:
            return {"success": False, "message": "Missing email or stravaId"}
        
        # Upsert 到 strava_bindings
        res = supabase.table("strava_bindings").upsert({
            "tcu_member_email": email,
            "strava_id": str(strava_id),
            "tcu_account": tcu_account,
            "member_name": member_name
        }).execute()
        
        print(f"[DEBUG] Binding confirmed. Result: {res.data}")
        return {"success": True, "message": "Binding confirmed"}
    except Exception as e:
        print(f"[DEBUG] Confirm binding error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Confirm binding failed: {str(e)}")


# ========== Admin 權限定義 ==========
ADMIN_ATHLETE_IDS = ["2838277"]

@router.post("/unbind")
async def unbind_member(request: Request):
    """
    解除會員綁定（從 strava_bindings 刪除記錄）。
    僅限 Admin 權限操作。
    """
    try:
        body = await request.json()
        email = body.get("email")
        admin_id = body.get("admin_id")
        
        print(f"[DEBUG] Unbind request: email={email}, admin_id={admin_id}")
        
        if not email or not admin_id:
            return {"success": False, "message": "Missing email or admin_id"}

        # 1. 驗證權限 (後端檢查)
        if str(admin_id) not in ADMIN_ATHLETE_IDS:
            print(f"[DEBUG] Permission denied for admin_id: {admin_id}")
            return {"success": False, "message": "Permission denied: Not an administrator"}

        # 2. 檢查 Token 是否存在且合法
        token_res = supabase.table("strava_tokens").select("*").eq("athlete_id", int(admin_id)).execute()
        if not token_res.data:
            print("[DEBUG] No valid token found for admin")
            return {"success": False, "message": "Authentication failed: No valid token found"}

        # 3. 從 strava_bindings 刪除記錄
        print(f"[DEBUG] Deleting binding for email: {email}")
        res = supabase.table("strava_bindings").delete().eq("tcu_member_email", email).execute()
        print(f"[DEBUG] Delete result: {res.data}")

        # 4. 清除 tcu_members 中的綁定和 OTP 資料（保持會員狀態乾淨）
        try:
            supabase.table("tcu_members").update({
                "strava_id": None,
                "otp_code": None,
                "otp_expires_at": None
            }).eq("email", email).execute()
            print(f"[DEBUG] strava_id and OTP data cleared for email: {email}")
        except Exception as otp_error:
            print(f"[DEBUG] Failed to clear member data (non-critical): {otp_error}")

        return {"success": True, "message": "Unbound successfully"}
    except Exception as e:
        print(f"[DEBUG] Unbind error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unbind failed: {str(e)}")


# ========== 檢查綁定狀態 API ==========
@router.get("/binding-status/{strava_id}")
async def get_binding_status(strava_id: str):
    """
    根據 Strava ID 查詢綁定狀態。
    """
    try:
        print(f"[DEBUG] Checking binding status for strava_id: {strava_id}")
        res = supabase.table("strava_bindings").select("*").eq("strava_id", strava_id).execute()
        
        if res.data:
            binding = res.data[0]
            print(f"[DEBUG] Binding found: {binding}")
            return {
                "isBound": True,
                "email": binding.get("tcu_member_email"),
                "tcu_account": binding.get("tcu_account"),
                "member_name": binding.get("member_name"),
                "bound_at": binding.get("bound_at")
            }
        else:
            print("[DEBUG] No binding found")
            return {"isBound": False}
    except Exception as e:
        print(f"[DEBUG] Binding status error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")
