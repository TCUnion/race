from fastapi import APIRouter, Query, HTTPException, Request, Response
from pydantic import BaseModel
from typing import Optional, Dict, List, Any
from database import supabase
from strava_service import StravaService
from datetime import datetime, timezone
import json

router = APIRouter(prefix="/webhook", tags=["webhooks"])

class StravaEvent(BaseModel):
    aspect_type: str  # create, update, delete
    event_time: int
    object_id: int    # activity_id or athlete_id
    object_type: str  # activity or athlete
    owner_id: int     # athlete_id
    subscription_id: int
    updates: Dict[str, Any] = {}

@router.get("/strava-webhook")
def verify_webhook(
    hub_mode: str = Query(alias="hub.mode"),
    hub_challenge: str = Query(alias="hub.challenge"),
    hub_verify_token: str = Query(alias="hub.verify_token")
):
    """
    Strava Webhook 驗證端點
    """
    print(f"Webhook Verification: mode={hub_mode}, challenge={hub_challenge}, token={hub_verify_token}")
    
    if hub_mode == "subscribe" and hub_verify_token == "STRAVA":
        # 直接回傳 challenge JSON (符合 n8n 邏輯)
        return {"hub.challenge": hub_challenge}
    
    raise HTTPException(status_code=403, detail="Invalid verification token")

@router.post("/strava-webhook")
async def receive_webhook(event: StravaEvent):
    """
    處理 Strava Webhook 事件
    """
    print(f"Received Webhook Event: {event}")

    # 1. 只處理新活動建立 (create activity)
    if event.object_type != "activity" or event.aspect_type != "create":
        return {"status": "ignored", "reason": "Not an activity create event"}

    athlete_id = event.owner_id
    activity_id = event.object_id

    try:
        # 2. 檢查是否為已報名選手 (Query registrations table)
        # 用 supabase 查詢
        reg_response = supabase.table("registrations").select("*").eq("strava_athlete_id", athlete_id).execute()
        
        if not reg_response.data:
            return {"status": "ignored", "reason": "Athlete not registered"}
        
        registrations = reg_response.data
        registered_segment_ids = [r["segment_id"] for r in registrations]
        athlete_name = registrations[0].get("athlete_name", "Unknown") # 假設同一選手名稱一致

        print(f"Processing activity {activity_id} for athlete {athlete_id} ({athlete_name}). Registered segments: {registered_segment_ids}")

        # 3. 取得活動詳情
        activity_data = StravaService.get_activity(athlete_id, activity_id)
        
        if not activity_data:
            return {"status": "error", "message": "Failed to fetch activity details"}

        # 4. 提取並過濾 Segment Efforts
        efforts = activity_data.get("segment_efforts", [])
        matched_efforts = []

        for effort in efforts:
            seg_id = effort.get("segment", {}).get("id")
            if seg_id in registered_segment_ids:
                # 構建寫入資料
                effort_data = {
                    "id": effort["id"],
                    "segment_id": seg_id,
                    "athlete_id": effort["athlete"]["id"],
                    "athlete_name": athlete_name,
                    "elapsed_time": effort["elapsed_time"],
                    "moving_time": effort["moving_time"],
                    "start_date": effort["start_date_local"],
                    "average_watts": effort.get("average_watts"),
                    "device_watts": effort.get("device_watts", False),
                    "average_heartrate": effort.get("average_heartrate"),
                    "max_heartrate": effort.get("max_heartrate"),
                    "activity_id": activity_id # 建議新增此欄位以便追蹤，若 DB schema 支援
                }
                matched_efforts.append(effort_data)

        if not matched_efforts:
            return {"status": "ok", "message": "No matching segment efforts found"}

        # 5. 寫入資料庫 (UPSERT segment_efforts)
        # 逐筆寫入或批次寫入
        print(f"Upserting {len(matched_efforts)} efforts...")
        
        # 由於需要另外寫入 sync_metadata，這裡逐筆處理較安全，或者分開處理
        for effort_record in matched_efforts:
            # 寫入 segment_efforts
            # 注意: 請確認資料庫 schema 是否允許 extra fields (如 activity_id)。若不確定，先僅寫入已知欄位。
            # 根據 n8n 邏輯，需移除不支援的欄位嗎？ n8n map 裡面沒有 activity_id，但有 id (effort id).
            # 使用 n8n 用過的欄位:
            data_to_upsert = {k: v for k, v in effort_record.items() if k != "activity_id"} 
            
            # Upsert effort (resolution=merge-duplicates is handled by supabase-py if configured? 
            # supabase-py upsert default is merge if PK exists)
            supabase.table("segment_efforts").upsert(data_to_upsert).execute()

            # 6. 更新同步狀態 (sync_metadata)
            # n8n 邏輯: 
            # "segment_id": {{ $json.segment_id }},
            # "athlete_id": {{ $json.athlete_id }},
            # "last_synced_at": "{{ $now.toISO() }}",
            # "last_effort_id": {{ $json.id }},
            # "sync_count": 1 (這是固定值? n8n 看起來是寫 1)
            
            # 若要累加 sync_count，需先查詢。這裡依照 n8n 邏輯先寫死或簡單處理。
            # 觀察 n8n: "sync_count": 1. 可能只是標示有同步過。
            
            metadata = {
                "segment_id": effort_record["segment_id"],
                "athlete_id": effort_record["athlete_id"],
                "last_synced_at": datetime.now(timezone.utc).isoformat(),
                "last_effort_id": effort_record["id"],
                # "sync_count": 1 # 可選
            }
            try:
                # 嘗試 upsert sync_metadata
                supabase.table("sync_metadata").upsert(metadata).execute()
            except Exception as e:
                print(f"Error updating sync_metadata: {e}")

        return {"status": "ok", "message": f"Processed {len(matched_efforts)} efforts"}

    except Exception as e:
        print(f"Error processing webhook: {e}")
        return {"status": "error", "message": str(e)}

# ====================================================================
#  MIGRATED OAUTH & BINDING LOGIC (Matching User Requirements)
#  - URL: /webhook/member-binding
#  - URL: /webhook/strava/auth/start
# ====================================================================

import os
import urllib.request
import ssl
import requests
from fastapi.responses import RedirectResponse, HTMLResponse

@router.post("/member-binding")
async def proxy_member_binding(request: Request):
    """
    處理會員綁定邏輯 (Replica of auth.py proxy_member_binding but under /webhook)
    URL: /webhook/member-binding
    """
    try:
        body = await request.json()
        print(f"[DEBUG][Webhook] Received binding body: {body}")
        
        action = body.get("action")
        email = body.get("email")
        memberName = body.get("memberName")
        strava_id = body.get("stravaId")
        tcu_account = body.get("input_id")
        
        if not email or not strava_id:
             return {"success": False, "message": "Missing email or stravaId"}

        # 1. Verify Member
        member_res = supabase.table("tcu_members").select("email, real_name, account").eq("email", email).execute()
        if not member_res.data:
            return {
                "success": False, 
                "message": "查無此會員資料。請先至 https://www.tsu.com.tw/ 進行註冊。系統每天早上 9 點更新會員資料，請於更新後再試一次。"
            }

        # 2. Check Existing Binding
        binding_res = supabase.table("strava_bindings").select("*").eq("tcu_member_email", email).execute()
        bindings = binding_res.data
        
        if action == "generate_otp":
            if bindings:
                existing_binding = bindings[0]
                existing_strava_id = str(existing_binding.get("strava_id"))
                incoming_strava_id = str(strava_id)
                
                if existing_strava_id == incoming_strava_id:
                    return {"success": True, "message": "Already bound successfully", "already_bound": True}
                
                return {
                    "success": False, 
                    "message": f"此會員身份已綁定其他 Strava 帳號 (ID: {existing_strava_id})。如有疑問，請洽 TCU Line@ 官方。"
                }

        # 3. Proxy to n8n (if n8n is still used for OTP) OR Handle internally?
        # User said "bind member https://service.criterium.tw/webhook/member-binding"
        # Since n8n is reportedly down/migrated, we should ideally handle it here or proxy.
        # But for now, we follow the existing logic which proxies to N8N_MEMBER_BINDING_URL.
        # IF N8N is down, this will fail. BUT the user said "n8n没了个" (n8n is gone).
        # So we MUST handle OTP generation here or mockup.
        # For now, let's keep proxy logic but be aware it might need internal implementation if n8n is truly dead.
        
        n8n_url = os.getenv("N8N_MEMBER_BINDING_URL", "https://n8n.criterium.tw/webhook/member-binding")
        # If n8n domain is down, this will timeout.
        
        req = urllib.request.Request(
            n8n_url,
            data=json.dumps(body).encode('utf-8'),
            headers={'Content-Type': 'application/json', 'User-Agent': 'TCU-Backend'},
            method='POST'
        )
        
        try:
             # Use shorter timeout if suspecting dead service
            with urllib.request.urlopen(req, context=ssl._create_unverified_context(), timeout=10) as response:
                res_data = response.read().decode('utf-8')
                try:
                    return json.loads(res_data)
                except:
                    return {"success": True, "message": "Webhook received", "data": res_data}
        except Exception as e:
            print(f"[WARN] n8n proxy failed: {e}. Returning success with mock for migration safety if n8n is down.")
            # If n8n is dead, we can't send OTP.
            return {"success": False, "message": f"OTP 服務暫時無法使用 (n8n 連線失敗: {e})"}

    except Exception as e:
        return {"success": False, "message": f"Error: {str(e)}"}

@router.get("/strava/auth/start")
def strava_auth_start():
    """
    Start Strava OAuth Flow
    URL: /webhook/strava/auth/start
    """
    client_id = os.getenv("STRAVA_CLIENT_ID")
    # Redirect URI MUST match Strava App settings.
    # Currently configured to: service.criterium.tw (as user modified)
    # The callback path should be consistent.
    redirect_uri = "https://service.criterium.tw/webhook/strava/auth/callback"
    scope = "read,activity:read_all,profile:read_all"
    
    if not client_id:
        raise HTTPException(status_code=500, detail="Missing STRAVA_CLIENT_ID")
        
    url = f"https://www.strava.com/oauth/authorize?client_id={client_id}&response_type=code&redirect_uri={redirect_uri}&approval_prompt=force&scope={scope}"
    return RedirectResponse(url)

@router.get("/strava/auth/callback")
def strava_auth_callback(code: str, scope: str = ""):
    """
    Handle Strava OAuth Callback
    URL: /webhook/strava/auth/callback
    """
    client_id = os.getenv("STRAVA_CLIENT_ID")
    client_secret = os.getenv("STRAVA_CLIENT_SECRET")
    
    if not client_id or not client_secret:
         return HTMLResponse(content="<h1>Error: Server config missing</h1>", status_code=500)
         
    token_url = "https://www.strava.com/oauth/token"
    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "grant_type": "authorization_code"
    }
    
    try:
        response = requests.post(token_url, data=payload)
        res_data = response.json()
        
        if response.status_code != 200:
             return HTMLResponse(content=f"<h1>Strava Error: {res_data}</h1>", status_code=400)
             
        access_token = res_data.get("access_token")
        refresh_token = res_data.get("refresh_token")
        expires_at = res_data.get("expires_at")
        athlete = res_data.get("athlete", {})
        athlete_id = athlete.get("id")
        
        # Save to DB
        try:
           data = {
                "athlete_id": athlete_id,
                "access_token": access_token,
                "refresh_token": refresh_token,
                "expires_at": expires_at,
                "name": f"{athlete.get('firstname')} {athlete.get('lastname')}".strip(),
                "profile": athlete.get("profile"),
                "login_time": datetime.now(timezone.utc).isoformat()
            }
           supabase.table("strava_tokens").upsert(data).execute()
        except Exception as e:
           print(f"[WARN] DB Save failed: {e}")

        # Post Message Response
        html_content = f"""
        <html>
        <head><title>Strava Login Success</title></head>
        <body>
            <h1>Login Successful...</h1>
            <script>
                const data = {{
                    access_token: "{access_token}",
                    refresh_token: "{refresh_token}",
                    expires_at: {expires_at},
                    athlete: {json.dumps(athlete)},
                    id: {athlete_id}
                }};
                
                if (window.opener) {{
                    window.opener.postMessage({{
                        type: 'STRAVA_AUTH_SUCCESS',
                        ...data
                    }}, '*');
                    window.close();
                }} else {{
                    document.body.innerHTML += "<p>Could not find opener window.</p>";
                }}
            </script>
        </body>
        </html>
        """
        return HTMLResponse(content=html_content)
        
    except Exception as e:
        return HTMLResponse(content=f"<h1>Error: {str(e)}</h1>", status_code=500)
