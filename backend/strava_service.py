import os
import time
import requests
from typing import Optional, Dict, Any
from database import supabase

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
        response = requests.get(
            f"https://www.strava.com/api/v3/segment_efforts?segment_id={segment_id}&athlete_id={athlete_id}",
            headers=headers
        )
        if response.status_code == 200:
            return response.json()
        return None

    @staticmethod
    def get_segment_leaderboard(segment_id: int, athlete_id_for_token: Optional[int] = None):
        """
        取得路段的公開排行榜。
        athlete_id_for_token: 用於獲取 access_token 的選手 ID。若未提供，則隨機取用資料庫中第一個有效的 Token。
        """
        if athlete_id_for_token:
            token_data = StravaService.get_token(athlete_id_for_token)
        else:
            # 隨機取得一個 Token
            response = supabase.table("strava_tokens").select("*").limit(1).execute()
            if response.data:
                token_data = StravaService.get_token(response.data[0]["athlete_id"])
            else:
                return None

        if not token_data:
            return None

        headers = {"Authorization": f"Bearer {token_data['access_token']}"}
        # 抓取前 50 名 (或者更多)
        response = requests.get(
            f"https://www.strava.com/api/v3/segments/{segment_id}/leaderboard?per_page=50",
            headers=headers
        )
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error fetching leaderboard: {response.status_code} - {response.text}")
            return None
