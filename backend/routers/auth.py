from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import urllib.request
import json
import ssl
from database import supabase
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
                existing_strava_id = str(existing_binding.get("strava_id"))
                incoming_strava_id = str(strava_id)
                print(f"[DEBUG] Existing binding found. strava_id: '{existing_strava_id}', incoming: '{incoming_strava_id}'")
                
                # 已綁定相同 Strava ID -> 直接成功
                if existing_strava_id == incoming_strava_id:
                    print("[DEBUG] Already bound to same Strava ID, returning already_bound")
                    return {"success": True, "message": "Already bound successfully", "already_bound": True}
                
                # 已綁定不同 Strava ID -> 提示聯繫官方
                print(f"[DEBUG] Already bound to DIFFERENT Strava ID: {existing_strava_id}")
                return {
                    "success": False, 
                    "message": f"此會員身份已綁定其他 Strava 帳號 (ID: {existing_strava_id})。如有疑問，請洽 TCU Line@ 官方：https://page.line.me/criterium"
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
            # 設定 30 秒 timeout 以應對 n8n 處理較慢的情況
            with urllib.request.urlopen(req, context=ssl._create_unverified_context(), timeout=30) as response:
                status = response.getcode()
                res_data = response.read().decode('utf-8')
                print(f"[DEBUG] n8n response status: {status}, data: {res_data}")
                
                if not res_data.strip():
                    return {"success": True, "message": "Webhook received with empty response"}
                
                try:
                    # 嘗試解析 JSON
                    parsed_res = json.loads(res_data)
                    if isinstance(parsed_res, dict):
                         return parsed_res
                    return {"success": True, "message": "Webhook received", "data": parsed_res}
                except json.JSONDecodeError:
                    print(f"[DEBUG] n8n response is not JSON: {res_data}")
                    return {"success": True, "message": "Webhook received", "raw_response": res_data}
        except urllib.error.HTTPError as e:
            error_content = e.read().decode('utf-8')
            print(f"[DEBUG] n8n HTTP Error {e.code}: {error_content}")
            return {"success": False, "message": f"n8n 服務回傳錯誤 ({e.code})"}
        except Exception as e:
            print(f"[DEBUG] Proxy connection error: {str(e)}")
            return {"success": False, "message": f"與轉發服務連線失敗: {str(e)}"}
    except Exception as e:
        print(f"[DEBUG] General error in proxy_member_binding: {str(e)}")
        return {"success": False, "message": f"處理請求時發生錯誤: {str(e)}"}


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
        
        # 取得完整會員資料以回傳給前端顯示 (優先使用 account)
        if tcu_account:
            print(f"[DEBUG] Fetching member for response by account: {tcu_account}")
            member_res = supabase.table("tcu_members").select("*").eq("account", tcu_account).execute()
        else:
            member_res = supabase.table("tcu_members").select("*").eq("email", email).execute()
            
        member_data = member_res.data[0] if member_res.data else {}
        
        print(f"[DEBUG] Binding confirmed. Result: {res.data}")
        return {
            "success": True, 
            "message": "Binding confirmed",
            "member_data": member_data
        }
    except Exception as e:
        print(f"[DEBUG] Confirm binding error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Confirm binding failed: {str(e)}")


# ========== Admin 權限定義 ==========
import os

# ========== Admin 權限定義 ==========
# 從環境變數讀取 Admin IDs (逗號分隔)，預設為空
admin_ids_str = os.getenv("ADMIN_ATHLETE_IDS", "")
ADMIN_ATHLETE_IDS = [x.strip() for x in admin_ids_str.split(",") if x.strip()]
if not ADMIN_ATHLETE_IDS:
    # Fallback only for dev/migration safety if env var is missing, but better to enforce env var
    # print("[WARN] ADMIN_ATHLETE_IDS not set in environment.")
    pass

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

        # 1. 查詢現有綁定以進行權限驗證
        binding_res = supabase.table("strava_bindings").select("*").eq("tcu_member_email", email).execute()
        existing_binding = binding_res.data[0] if binding_res.data else None
        
        is_admin = str(admin_id) in ADMIN_ATHLETE_IDS
        is_self = existing_binding and str(existing_binding.get("strava_id")) == str(admin_id)
        
        if not is_admin and not is_self:
            print(f"[DEBUG] Permission denied. admin_id: {admin_id}, bound_id: {existing_binding.get('strava_id') if existing_binding else 'None'}")
            return {"success": False, "message": "Permission denied: Not an administrator or data owner"}

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
            email = binding.get("tcu_member_email")
            print(f"[DEBUG] Binding found: {binding}")
            
            # 取得完整會員資料 (優先使用 tcu_account 查詢，避免同 Email 多帳號問題)
            tcu_account = binding.get("tcu_account")
            if tcu_account:
                 print(f"[DEBUG] Fetching member by account: {tcu_account}")
                 member_res = supabase.table("tcu_members").select("*").eq("account", tcu_account).execute()
            else:
                 print(f"[DEBUG] Fetching member by email (fallback): {email}")
                 member_res = supabase.table("tcu_members").select("*").eq("email", email).execute()
            
            member_data = member_res.data[0] if member_res.data else {}
            
            return {
                "isBound": True,
                "email": email,
                "tcu_account": binding.get("tcu_account"),
                "member_name": binding.get("member_name"),
                "bound_at": binding.get("bound_at"),
                "member_data": member_data
            }
        else:
            print("[DEBUG] No binding found")
            return {"isBound": False}
    except Exception as e:
        print(f"[DEBUG] Binding status error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")
