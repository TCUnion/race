import os
import time
import requests
from typing import Optional, Dict, Any
from .database import supabase

STRAVA_CLIENT_ID = os.getenv("STRAVA_CLIENT_ID")
STRAVA_CLIENT_SECRET = os.getenv("STRAVA_CLIENT_SECRET")

class StravaService:
    @staticmethod
    def get_token(athlete_id: int) -> Optional[Dict[str, Any]]:
        response = supabase.table("strava_tokens").select("*").eq("athlete_id", athlete_id).execute()
        if response.data:
            token_data = response.data[0]
            # 檢查是否過期 (提早 5 分鐘刷新)
            if token_data["expires_at"] < time.time() + 300:
                return StravaService.refresh_token(athlete_id, token_data["refresh_token"])
            return token_data
        return None

    @staticmethod
    def refresh_token(athlete_id: int, refresh_token: str) -> Optional[Dict[str, Any]]:
        print(f"Refreshing token for athlete {athlete_id}...")
        response = requests.post(
            "https://www.strava.com/oauth/token",
            data={
                "client_id": STRAVA_CLIENT_ID,
                "client_secret": STRAVA_CLIENT_SECRET,
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
            },
        )
        if response.status_code == 200:
            new_token = response.json()
            data = {
                "access_token": new_token["access_token"],
                "refresh_token": new_token["refresh_token"],
                "expires_at": new_token["expires_at"],
            }
            supabase.table("strava_tokens").update(data).eq("athlete_id", athlete_id).execute()
            return {**data, "athlete_id": athlete_id}
        return None

    @staticmethod
    def get_segment_efforts(athlete_id: int, segment_id: int):
        token_data = StravaService.get_token(athlete_id)
        if not token_data:
            return None
        
        headers = {"Authorization": f"Bearer {token_data['access_token']}"}
        # 取得該選手在該路段的所有努力 (efforts)
        # 注意: Strava API 對於非目前使用者的數據獲取有限制，通常只能拿自己的
        # 但在 Challenge 場景，我們可以要求使用者連結後，定期備份他們的努力
        response = requests.get(
            f"https://www.strava.com/api/v3/segment_efforts?segment_id={segment_id}&athlete_id={athlete_id}",
            headers=headers
        )
        if response.status_code == 200:
            return response.json()
        return None
