
from fastapi import APIRouter
from ..database import supabase

router = APIRouter(prefix="/api/activities", tags=["activities"])

@router.get("")
def get_activities():
    response = supabase.table("activities").select("*").order("date", desc=True).execute()
    return response.data
