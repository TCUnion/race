from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
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
