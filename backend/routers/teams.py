
from fastapi import APIRouter, HTTPException, Request
from database import supabase
from datetime import datetime

router = APIRouter(prefix="/api/teams", tags=["teams"])

@router.get("/my-team")
async def get_my_team(strava_id: str):
    """
    取得使用者的車隊資訊與權限狀態。
    優先使用 tcu_members，若無資料則 fallback 到 strava_bindings。
    """
    try:
        # 1. 從 strava_bindings 取得綁定資訊
        binding_res = supabase.table("strava_bindings").select("*").eq("strava_id", strava_id).execute()
        if not binding_res.data:
            return {"has_team": False, "message": "User not bound"}
            
        binding = binding_res.data[0]
        email = binding.get("tcu_member_email")
        tcu_account = binding.get("tcu_account")
        member_name_from_binding = binding.get("member_name")
        
        # 2. 嘗試從 tcu_members 取得成員資料 (包含 Team)
        member = None
        team_name = None
        member_name = member_name_from_binding  # 預設使用 strava_bindings 的 member_name
        member_type = "隊員"  # 預設為隊員
        
        if tcu_account:
            member_res = supabase.table("tcu_members").select("team, real_name, member_type").eq("account", tcu_account).execute()
            if member_res.data:
                member = member_res.data[0]
        
        if not member and email:
            member_res = supabase.table("tcu_members").select("team, real_name, member_type").eq("email", email).execute()
            if member_res.data:
                member = member_res.data[0]
        
        # 3. 如果找到 tcu_members 資料，使用它；否則 fallback
        if member:
            team_name = member.get("team")
            member_name = member.get("real_name") or member_name_from_binding
            member_type = member.get("member_type") or "隊員"
        
        # 4. 如果沒有車隊資訊，回傳無車隊但保留成員資訊
        if not team_name:
            return {
                "has_team": False, 
                "message": "No team assigned",
                "member_name": member_name,
                "is_bound": True
            }

        # 5. 取得 Team 詳細資料 (如果 teams table 沒有該車隊，自動建立)
        team_res = supabase.table("teams").select("*").eq("name", team_name).execute()
        
        team_data = None
        is_admin = False
        
        if team_res.data:
            team_data = team_res.data[0]
            is_admin = team_data.get("admin_strava_id") == str(strava_id)
        else:
            # 自動建立車隊記錄
            try:
                new_team_data = {
                    "name": team_name,
                    "description": f"Official team page for {team_name}",
                    "admin_strava_id": None
                }
                create_res = supabase.table("teams").upsert(new_team_data, on_conflict="name").execute()
                if create_res.data:
                    team_data = create_res.data[0]
            except Exception as e:
                print(f"[WARN] Auto-create team failed: {e}")

        return {
            "has_team": True,
            "team_name": team_name,
            "team_data": team_data,
            "is_admin": is_admin,
            "member_name": member_name,
            "member_type": member_type
        }

    except Exception as e:
        print(f"[ERROR] Get my team error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/members")
async def get_team_members(team_name: str):
    """
    取得車隊成員列表 (含詳細資料)
    strava_id 從 strava_bindings 取得
    排序：付費車隊管理員 > 隊長 > 隊員
    """
    try:
        # 1. 從 tcu_members 撈取該車隊的所有成員 (包含 skills)
        member_res = supabase.table("tcu_members").select(
            "real_name, nickname, birthday, self_introduction, skills, tcu_id, member_type, profile_photo, email"
        ).eq("team", team_name).execute()
        members = member_res.data if member_res.data else []

        if not members:
            return []
        
        # 2. 從 strava_bindings 獲取 strava_id (用 email 關聯)
        emails = [m["email"] for m in members if m.get("email")]
        binding_map = {}
        if emails:
            binding_res = supabase.table("strava_bindings").select("tcu_member_email, strava_id").in_("tcu_member_email", emails).execute()
            binding_map = {b["tcu_member_email"]: b["strava_id"] for b in binding_res.data}
        
        # 3. 收集 strava_ids 用於 fallback 頭像 (當 profile_photo 為空時)
        sids = [str(sid) for sid in binding_map.values() if sid]
        
        avatar_map = {}
        if sids:
            athlete_res = supabase.table("athletes").select("id, profile, profile_medium").in_("id", sids).execute()
            if athlete_res.data:
                for a in athlete_res.data:
                    avatar_map[str(a["id"])] = a.get("profile_medium") or a.get("profile")
                    
        # 4. 組合資料
        enriched_members = []
        for m in members:
            sid = binding_map.get(m.get("email"))
            role = m.get("member_type") or "隊員"
            
            # 計算年齡
            age = None
            birthday = m.get("birthday")
            if birthday:
                try:
                    from datetime import date
                    birth_date = date.fromisoformat(str(birthday)[:10])
                    today = date.today()
                    age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
                except:
                    pass
            
            # 頭像優先使用 profile_photo，否則從 athletes 表抓
            avatar = m.get("profile_photo") or (avatar_map.get(str(sid)) if sid else None)
            
            enriched_members.append({
                "real_name": m.get("real_name"),
                "nickname": m.get("nickname"),
                "age": age,
                "self_intro": m.get("self_introduction"),
                "skills": m.get("skills"),
                "tcu_id": m.get("tcu_id"),
                "member_type": role,
                "strava_id": sid,
                "avatar": avatar
            })
        
        # 5. 排序：付費車隊管理員 > 隊長 > 其他
        def sort_key(x):
            role = x["member_type"]
            if "付費車隊管理員" in role:
                return 0
            elif "隊長" in role:
                return 1
            else:
                return 2
        
        enriched_members.sort(key=sort_key)
            
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
