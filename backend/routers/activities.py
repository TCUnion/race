import httpx
from fastapi import APIRouter, HTTPException
from database import supabase

router = APIRouter(prefix="/api/activities", tags=["activities"])

@router.get("")
def get_activities():
    # 使用明確的欄位清單取代 selcet("*")，提升效能
    response = supabase.table("strava_activities").select(
        "id, athlete_id, name, distance, moving_time, elapsed_time, "
        "start_date, start_date_local, type, sport_type, average_speed, max_speed, "
        "average_heartrate, max_heartrate, average_watts, max_watts, weighted_average_watts, "
        "kilojoules, total_elevation_gain, device_watts, has_heartrate, suffer_score"
    ).order("date", desc=True).execute()
    return response.data

@router.get("/{activity_id}/check")
async def check_activity(activity_id: str):
    """
    檢查特定 activity 在本地 Supabase 與 Strava 遠端的狀態。
    """
    # 1. 檢查 Supabase 是否有此筆紀錄
    db_res = supabase.table("strava_activities").select("id, athlete_id, name, start_date").eq("id", activity_id).execute()
    db_exists = len(db_res.data) > 0
    activity_data = db_res.data[0] if db_exists else None

    strava_exists = False
    strava_error = None
    strava_data = None

    if db_exists:
        # 2. 取得 Athlete 的 Access Token
        athlete_id = activity_data['athlete_id']
        token_res = supabase.table("strava_tokens").select("access_token").eq("athlete_id", athlete_id).execute()
        
        if len(token_res.data) > 0:
            access_token = token_res.data[0]['access_token']
            
            # 3. 呼叫 Strava API 確認
            async with httpx.AsyncClient() as client:
                strava_url = f"https://www.strava.com/api/v3/activities/{activity_id}?include_all_efforts=false"
                headers = {"Authorization": f"Bearer {access_token}"}
                resp = await client.get(strava_url, headers=headers)
                
                if resp.status_code == 200:
                    strava_exists = True
                    strava_data = resp.json()
                elif resp.status_code == 404:
                    strava_exists = False
                    strava_error = "404 Record Not Found"
                else:
                    strava_exists = False
                    strava_error = f"{resp.status_code} {resp.text}"
        else:
            strava_error = "Token not found in database"

    return {
        "activity_id": activity_id,
        "db_exists": db_exists,
        "db_data": activity_data,
        "strava_exists": strava_exists,
        "strava_error": strava_error,
        "strava_name": strava_data.get("name") if strava_data else None
    }

@router.delete("/{activity_id}")
def delete_activity(activity_id: str):
    """
    手動刪除有異常的 activity 紀錄
    """
    res = supabase.table("strava_activities").delete().eq("id", activity_id).execute()
    
    # Supabase Python client returns data of deleted rows if return=minimal is not set
    if len(res.data) == 0:
        raise HTTPException(status_code=404, detail="Activity not found in database")
        
    return {"message": f"Activity {activity_id} successfully deleted", "deleted_data": res.data}
