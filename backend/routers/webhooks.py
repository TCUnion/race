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
        # Return 200 even on error to prevent Strava from retrying indefinitely? 
        # Usually better to fail if it's transient, but for logic errors return 200.
        return {"status": "error", "message": str(e)}
