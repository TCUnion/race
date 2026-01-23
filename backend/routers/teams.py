
from fastapi import APIRouter, HTTPException, Request
from database import supabase
from datetime import datetime

router = APIRouter(prefix="/api/teams", tags=["teams"])

@router.get("/my-team")
async def get_my_team(strava_id: str):
    """
    取得使用者的車隊資訊與權限狀態。
    1. 從 strava_bindings 找到對應的 tcu_member_email
    2. 從 tcu_members 找到 team 名稱
    3. 從 teams table 找 team 詳細資料
    """
    try:
        # 1. 確保已綁定
        binding_res = supabase.table("strava_bindings").select("tcu_member_email, tcu_account").eq("strava_id", strava_id).execute()
        if not binding_res.data:
            return {"has_team": False, "message": "User not bound"}
            
        binding = binding_res.data[0]
        email = binding.get("tcu_member_email")
        tcu_account = binding.get("tcu_account")
        
        # 2. 取得成員資料 (包含 Team)
        if tcu_account:
             member_res = supabase.table("tcu_members").select("team, name").eq("account", tcu_account).execute()
        else:
             member_res = supabase.table("tcu_members").select("team, name").eq("email", email).execute()
             
        if not member_res.data:
            return {"has_team": False, "message": "TCU member not found"}
            
        member = member_res.data[0]
        team_name = member.get("team")
        
        if not team_name:
            return {"has_team": False, "message": "No team assigned in TCU record"}

        # 3. 取得 Team 詳細資料 (如果還沒建立 teams table 資料，還是會回傳基本名稱)
        team_res = supabase.table("teams").select("*").eq("name", team_name).execute()
        
        team_data = None
        is_admin = False
        
        if team_res.data:
            team_data = team_res.data[0]
            is_admin = team_data.get("admin_strava_id") == str(strava_id)
        else:
            # Auto-create team if it doesn't exist in teams table (no admin assigned)
            # This ensures the team entity exists for manual admin assignment later
            try:
                new_team_data = {
                    "name": team_name,
                    "description": f"Official team page for {team_name}",
                    "admin_strava_id": None # No admin initially
                }
                # Use insert instead of upsert since we checked existence
                # But parallel requests might race, so upsert on name is safer if name is unique
                create_res = supabase.table("teams").upsert(new_team_data, on_conflict="name").execute()
                if create_res.data:
                    team_data = create_res.data[0]
            except Exception as e:
                print(f"[WARN] Auto-create team failed: {e}")
                # Fallback: just return basic info without team_data ID
                pass

        return {
            "has_team": True,
            "team_name": team_name,
            "team_data": team_data,
            "is_admin": is_admin,
            "member_name": member.get("name")
        }

    except Exception as e:
        print(f"[ERROR] Get my team error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/members")
async def get_team_members(team_name: str):
    """
    取得車隊成員列表
    """
    try:
        # 1. 從 tcu_members 撈取該車隊的所有成員 (使用正確的欄位名稱 'name')
        # 注意: schema.sql 中 tcu_members 並沒有 strava_id 和 education_id，這些可能需要從 strava_bindings 補齊
        member_res = supabase.table("tcu_members").select("name, tcu_id, member_type, account, email").eq("team", team_name).execute()
        members = member_res.data if member_res.data else []

        if not members:
            return []

        # 2. 獲取這些成員的 strava_id (從 strava_bindings)
        emails = [m["email"] for m in members if m.get("email")]
        binding_res = supabase.table("strava_bindings").select("tcu_member_email, strava_id").in_("tcu_member_email", emails).execute()
        
        binding_map = {b["tcu_member_email"]: b["strava_id"] for b in binding_res.data}
        
        # 收集 strava_ids 用於抓取頭像
        sids = [str(sid) for sid in binding_map.values()]
        
        avatar_map = {}
        if sids:
            athlete_res = supabase.table("athletes").select("id, profile, profile_medium").in_("id", sids).execute()
            if athlete_res.data:
                for a in athlete_res.data:
                    avatar_map[str(a["id"])] = a.get("profile_medium") or a.get("profile")
                    
        # 3. 組合資料
        enriched_members = []
        for m in members:
            sid = binding_map.get(m.get("email"))
            enriched_members.append({
                "real_name": m.get("name"), # 前端可能用到 real_name
                "tcu_id": m.get("tcu_id"),
                "member_type": m.get("member_type"),
                "strava_id": sid,
                "avatar": avatar_map.get(str(sid)) if sid else None
            })
            
        return enriched_members
        
    except Exception as e:
        print(f"[ERROR] Get team members error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/races")
async def create_team_race(request: Request):
    """
    建立車隊賽事 (Admin Only)
    """
    try:
        body = await request.json()
        strava_id = body.get("strava_id")
        team_id = body.get("team_id")
        segment_id = body.get("segment_id")
        name = body.get("name")
        start_date = body.get("start_date") # ISO String
        end_date = body.get("end_date")     # ISO String
        
        # 驗證 Admin 權限
        # 這裡再 query 一次確保安全
        team_res = supabase.table("teams").select("admin_strava_id").eq("id", team_id).execute()
        if not team_res.data or team_res.data[0]["admin_strava_id"] != str(strava_id):
            raise HTTPException(status_code=403, detail="Permission denied")
            
        data = {
            "team_id": team_id,
            "segment_id": segment_id,
            "name": name,
            "start_date": start_date,
            "end_date": end_date,
            "is_active": True
        }
        
        res = supabase.table("team_races").insert(data).execute()
        return {"success": True, "data": res.data}
        
    except Exception as e:
        print(f"[ERROR] Create race error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/races")
async def get_team_races(team_id: str):
    try:
        res = supabase.table("team_races").select("*").eq("team_id", team_id).order("created_at", desc=True).execute()
        return res.data if res.data else []
    except Exception as e:
        print(f"[ERROR] Get races error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
