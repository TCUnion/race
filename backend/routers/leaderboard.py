
from fastapi import APIRouter, BackgroundTasks, HTTPException
from database import supabase
from strava_service import StravaService
import time

# Force Zeabur Rebuild - Fix Import Cache

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])

@router.get("/{segment_id}")
def get_leaderboard(segment_id: int):
    # 1. 取得路段設定的起訖時間
    seg_query = supabase.table("segments").select("start_date, end_date").eq("id", segment_id).execute()
    start_date = None
    end_date = None
    
    if seg_query.data:
        start_date = seg_query.data[0].get("start_date")
        end_date = seg_query.data[0].get("end_date")

    if start_date:
        query_builder = query_builder.gte("start_date", start_date)
    if end_date:
        query_builder = query_builder.lte("start_date", end_date)
        
    query = query_builder.order("elapsed_time", desc=False).execute()
    
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
    registered_athlete_ids = {r["strava_athlete_id"] for r in registrations.data}    # 2. 批量同步：取得路段排行榜 (前 50 名)
    leaderboard = StravaService.get_segment_leaderboard(segment_id)
    if leaderboard and "entries" in leaderboard:
        print(f"Sync: Processing {len(leaderboard['entries'])} leaderboard entries for segment {segment_id}")
        for entry in leaderboard["entries"]:
            athlete_id = entry["athlete_id"]
            # 只儲存有報名的選手，或者為了數據完整性，我們可以擴充策略
            if athlete_id in registered_athlete_ids:
                data = {
                    "id": entry.get("effort_id") or f"lb_{segment_id}_{athlete_id}", # 優先使用 effort_id
                    "segment_id": segment_id,
                    "athlete_id": athlete_id,
                    "athlete_name": entry["athlete_name"],
                    "elapsed_time": entry["elapsed_time"],
                    "moving_time": entry["moving_time"],
                    "start_date": entry["start_date_local"],
                    "average_watts": entry.get("average_watts"),
                    "device_watts": entry.get("device_watts"),
                }
                supabase.table("segment_efforts").upsert(data).execute()

    # 3. 補充同步：針對已報名但不在前 50 名的選手進行個別抓取 (確保數據完整)
    # 這裡可以根據需求決定執行頻率，暫時先實作主邏輯
    for aid in registered_athlete_ids:
        # TODO: 判斷是否需要個別同步 (例如距離上次更新超過 1 小時)
        pass
