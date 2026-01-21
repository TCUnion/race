from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import urllib.request
import json
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
    代理 n8n 會員綁定 Webhook，解決 CORS 問題。
    """
    try:
        body = await request.json()
        # 優先從環境變數讀取 n8n URL，預設為生產路徑
        # 若在 n8n 編輯器測試，請將此變數設為 https://n8n.criterium.tw/webhook-test/member-binding
        import os
        n8n_url = os.getenv("N8N_MEMBER_BINDING_URL", "https://n8n.criterium.tw/webhook/member-binding")
        
        print(f"Proxying request to n8n: {n8n_url}")
        
        req = urllib.request.Request(
            n8n_url,
            data=json.dumps(body).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        
        try:
            with urllib.request.urlopen(req) as response:
                status = response.getcode()
                res_data = response.read().decode('utf-8')
                print(f"n8n response status: {status}, data: {res_data}")
                
                # 如果 n8n 返回空字串或非 JSON，提供預設回應
                if not res_data.strip():
                    return {"success": True, "message": "Webhook received with empty response"}
                
                try:
                    return json.loads(res_data)
                except json.JSONDecodeError:
                    return {"success": True, "message": "Webhook received", "raw_response": res_data}
        except urllib.error.HTTPError as e:
            error_content = e.read().decode('utf-8')
            print(f"n8n HTTP Error {e.code}: {error_content}")
            return {"success": False, "message": f"n8n error: {error_content}"}
            
    except Exception as e:
        print(f"Proxy error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Proxy failed: {str(e)}")
