
from fastapi import APIRouter
from ..database import supabase

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])

@router.get("")
def get_leaderboard():
    response = supabase.table("leaderboard").select("*").order("rank").execute()
    return response.data
