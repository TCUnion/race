
from fastapi import APIRouter, BackgroundTasks, HTTPException
from ..database import supabase
from ..strava_service import StravaService
import time

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])

@router.get("/{segment_id}")
def get_leaderboard(segment_id: int):
    # 從 segment_efforts 取得該路段的所有努力，並按時間排序
    # 這裡使用 RPC 或 複雜查詢來取得每個人的最佳成績
    # 簡單起見，我們先抓取所有數據並在 Python 中處理 (或使用 SQL GROUP BY)
    
    query = supabase.table("segment_efforts")\
        .select("*")\
        .eq("segment_id", segment_id)\
        .order("elapsed_time", desc=False)\
        .execute()
    
    # 處理重複的選手，只取最佳成績
    seen_athletes = {}
    ranked_list = []
    
    for effort in query.data:
        aid = effort["athlete_id"]
        if aid not in seen_athletes:
            seen_athletes[aid] = True
            ranked_list.append(effort)
            
    # 格式化為前端需要的格式
    result = []
    for i, effort in enumerate(ranked_list):
        result.append({
            "id": effort["id"],
            "rank": i + 1,
            "name": effort["athlete_name"] or f"Athlete {effort['athlete_id']}",
            "time": f"{effort['elapsed_time'] // 60}:{effort['elapsed_time'] % 60:02d}",
            "time_seconds": effort["elapsed_time"],
            "avg_power_value": effort["average_watts"],
            "date": effort["start_date"][:10] if effort["start_date"] else "Unknown",
            "strava_activity_id": effort["id"]
        })
        
    return result

@router.post("/sync/{segment_id}")
async def sync_leaderboard(segment_id: int, background_tasks: BackgroundTasks):
    background_tasks.add_task(perform_sync, segment_id)
    return {"message": f"Sync started for segment {segment_id}"}

def perform_sync(segment_id: int):
    # 1. 取得所有報名該路段的選手
    registrations = supabase.table("registrations").select("strava_athlete_id").eq("segment_id", segment_id).execute()
    athlete_ids = [r["strava_athlete_id"] for r in registrations.data]
    
    for aid in athlete_ids:
        # 2. 取得選手 Token 並抓取努力
        efforts = StravaService.get_segment_efforts(aid, segment_id)
        if efforts:
            for effort in efforts:
                # 3. 儲存努力到資料庫
                data = {
                    "id": effort["id"],
                    "segment_id": segment_id,
                    "athlete_id": aid,
                    "athlete_name": effort["athlete"]["firstname"] + " " + effort["athlete"]["lastname"] if "athlete" in effort else None,
                    "elapsed_time": effort["elapsed_time"],
                    "moving_time": effort["moving_time"],
                    "start_date": effort["start_date_local"],
                    "average_watts": effort.get("average_watts"),
                    "device_watts": effort.get("device_watts"),
                }
                supabase.table("segment_efforts").upsert(data).execute()
