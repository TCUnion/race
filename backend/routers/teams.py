
from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from database import supabase
from datetime import datetime
from utils.og_generator import generate_race_og_image

router = APIRouter(prefix="/api/teams", tags=["teams"])

async def generate_and_upload_og_image_task(race_id: int, name: str, polyline_str: str, distance: float, elevation: float):
    """
    背景任務：產生 OG Image 並上傳至 Supabase Storage
    """
    if not polyline_str:
        print(f"[WARN] No polyline for race {race_id}, skipping OG generation")
        return
    
    # 1. 產生圖片
    img_data = generate_race_og_image(name, polyline_str, distance, elevation)
    if not img_data:
        print(f"[ERROR] Failed to generate OG image for race {race_id}")
        return
        
    # 2. 上傳至 Supabase Storage (Bucket: race-previews)
    file_path = f"races/{race_id}/og_image.jpg"
    try:
        # 使用 upsert=True
        bucket = supabase.storage.from_("race-previews")
        bucket.upload(path=file_path, file=img_data, file_options={"content-type": "image/jpeg", "x-upsert": "true"})
        
        # 3. 取得公用連結
        public_url = bucket.get_public_url(file_path)
        # 有些版本的 get_public_url 回傳可能包含額外資訊，確保取得字串
        if isinstance(public_url, str):
            pass
        elif hasattr(public_url, "public_url"): # 處理不同版本 SDK
            public_url = public_url.public_url
        elif isinstance(public_url, dict):
            public_url = public_url.get("publicURL") or public_url.get("public_url")
            
        # 4. 更新資料庫
        supabase.table("team_races").update({"og_image": public_url}).eq("id", race_id).execute()
        
        print(f"[INFO] OG Image generated and uploaded for race {race_id}: {public_url}")
    except Exception as e:
        print(f"[ERROR] Upload OG image error for race {race_id}: {str(e)}")

@router.get("/my-team")
async def get_my_team(strava_id: str):
    """
    取得使用者的車隊資訊與權限狀態。
    從 strava_member_bindings 取得 tcu_account，再從 tcu_members 取得 team 資訊。
    """
    try:
        # 1. 從 strava_member_bindings 取得綁定資訊
        binding_res = supabase.table("strava_member_bindings").select("*").eq("strava_id", strava_id).execute()
        if not binding_res.data:
            return {"has_team": False, "message": "User not bound"}
            
        binding = binding_res.data[0]
        email = binding.get("tcu_member_email")
        tcu_account = binding.get("tcu_account")
        member_name_from_binding = binding.get("member_name")
        
        # 2. 嘗試從 tcu_members 取得成員資料 (包含 Team)
        member = None
        team_name = None
        member_name = member_name_from_binding  # 預設使用 strava_member_bindings 的 member_name
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

        # 5. 判斷是否為管理員（根據 member_type 判斷）
        is_admin = member_type in ["付費車隊管理員", "隊長", "管理員"] if member_type else False

        return {
            "has_team": True,
            "team_name": team_name,
            "team_data": {
                "name": team_name,
                "description": f"{team_name} 車隊"
            },
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
    strava_id 從 strava_member_bindings 取得
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
        
        # 2. 從 strava_member_bindings 獲取 strava_id (用 email 關聯)
        emails = [m["email"] for m in members if m.get("email")]
        binding_map = {}
        if emails:
            binding_res = supabase.table("strava_member_bindings").select("tcu_member_email, strava_id").in_("tcu_member_email", emails).execute()
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
async def create_team_race(request: Request, background_tasks: BackgroundTasks):
    """
    建立車隊賽事 (Admin Only)
    使用 team_name + strava_id 驗證權限
    """
    try:
        body = await request.json()
        strava_id = str(body.get("strava_id"))
        team_name = body.get("team_name")
        segment_id = body.get("segment_id")
        name = body.get("name")
        start_date = body.get("start_date")  # ISO String
        end_date = body.get("end_date")      # ISO String
        
        # 路段統計資料（從前端傳入）
        distance = body.get("distance")
        average_grade = body.get("average_grade")
        elevation_gain = body.get("elevation_gain")
        
        if not all([strava_id, team_name, segment_id, start_date, end_date]):
            raise HTTPException(status_code=400, detail="缺少必要參數")
        
        # 1. 從 strava_member_bindings 取得 tcu_member_email
        binding_res = supabase.table("strava_member_bindings").select("tcu_member_email, tcu_account").eq("strava_id", strava_id).execute()
        if not binding_res.data:
            raise HTTPException(status_code=403, detail="未綁定 Strava 帳號")
        
        binding = binding_res.data[0]
        email = binding.get("tcu_member_email")
        tcu_account = binding.get("tcu_account")
        
        # 2. 從 tcu_members 驗證是否為該車隊的管理員/隊長
        member = None
        if tcu_account:
            member_res = supabase.table("tcu_members").select("team, member_type").eq("account", tcu_account).execute()
            if member_res.data:
                member = member_res.data[0]
        
        if not member and email:
            member_res = supabase.table("tcu_members").select("team, member_type").eq("email", email).execute()
            if member_res.data:
                member = member_res.data[0]
        
        if not member:
            raise HTTPException(status_code=403, detail="找不到 TCU 成員資料")
        
        # 3. 驗證是否為該車隊成員
        if member.get("team") != team_name:
            raise HTTPException(status_code=403, detail="您不屬於此車隊")
        
        # 4. 驗證是否為隊長或管理員
        member_type = member.get("member_type") or ""
        is_authorized = "隊長" in member_type or "管理員" in member_type
        if not is_authorized:
            raise HTTPException(status_code=403, detail="只有隊長或管理員可以建立賽事")
        
        # 5. 檢查是否已有進行中的賽事（一個車隊只能有一個賽事）
        existing_race = supabase.table("team_races").select("id").eq("team_name", team_name).eq("is_active", True).execute()
        if existing_race.data and len(existing_race.data) > 0:
            raise HTTPException(status_code=400, detail="車隊已有進行中的賽事，請先結束現有賽事")
        
        # 6. 建立賽事資料（包含路段統計）
        data = {
            "team_name": team_name,
            "segment_id": int(segment_id),
            "name": name or f"路段 {segment_id}",
            "start_date": start_date,
            "end_date": end_date,
            "is_active": True,
            "created_by": strava_id,
            "distance": distance,
            "average_grade": average_grade,
            "elevation_gain": elevation_gain,
            "polyline": body.get("polyline")
        }
        
        res = supabase.table("team_races").insert(data).execute()
        
        # 觸發 OG Image 產生
        if res.data:
            new_race_id = res.data[0].get("id")
            background_tasks.add_task(
                generate_and_upload_og_image_task,
                new_race_id,
                name or f"路段 {segment_id}",
                body.get("polyline"),
                distance,
                elevation_gain
            )
        
        # 7. 同步到 segments 表讓賽事出現在挑戰列表
        # 先檢查 segment 是否已存在
        existing_segment = supabase.table("segments").select("id").eq("id", int(segment_id)).execute()
        
        segment_data = {
            "id": int(segment_id),
            "name": name or f"路段 {segment_id}",
            "distance": int(distance) if distance else None,
            "average_grade": average_grade,
            "total_elevation_gain": int(elevation_gain) if elevation_gain else None,
            "polyline": body.get("polyline"),
            "start_date": start_date,
            "end_date": end_date,
            "is_active": True
        }
        
        if existing_segment.data:
            # 更新現有 segment 的日期
            supabase.table("segments").update({
                "start_date": start_date,
                "end_date": end_date,
                "is_active": True
            }).eq("id", int(segment_id)).execute()
        else:
            # 建立新 segment
            supabase.table("segments").insert(segment_data).execute()
        
        return {"success": True, "data": res.data}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Create race error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/races")
async def get_team_races(team_name: str):
    """取得車隊賽事列表 (含報名人數)"""
    try:
        # 1. 取得賽事列表
        res = supabase.table("team_races").select("*").eq("team_name", team_name).order("created_at", desc=True).execute()
        races = res.data if res.data else []

        if not races:
            return []

        # 2. 取得每場賽事的報名人數
        # 由於 Supabase client 不容易直接 group by count，這裡先用迴圈查詢，或是直接撈所有相關報名紀錄 (如果資料量不大)
        # 考量效能，這裡先針對每場賽事查詢 count (N+1 query, 但預期賽事數量很少)
        
        enriched_races = []
        for race in races:
            segment_id = race.get("segment_id")
            count_res = supabase.table("registrations").select("id", count="exact").eq("segment_id", segment_id).execute()
            
            
            # 將 participant_count 加入賽事物件
            race["participant_count"] = count_res.count if count_res.count is not None else 0
            
            # 取得路段詳細資料 (description, link)
            if segment_id:
                seg_res = supabase.table("segments").select("description, link, distance, average_grade, total_elevation_gain, polyline").eq("id", segment_id).maybe_single().execute()
                if seg_res.data:
                    # Merge segment data, prioritizing segment table's current data
                    race["description"] = seg_res.data.get("description")
                    race["link"] = seg_res.data.get("link")
                    # Also update these technical fields to ensure latest data from segment
                    race["distance"] = seg_res.data.get("distance")
                    race["average_grade"] = seg_res.data.get("average_grade")
                    race["elevation_gain"] = seg_res.data.get("total_elevation_gain")
                    # Polyline might be stored as map or polyline in frontend expectations, keeping consistent with create
                    race["polyline"] = seg_res.data.get("polyline")

            enriched_races.append(race)
            
        return enriched_races
        
    except Exception as e:
        print(f"[ERROR] Get races error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/races/{segment_id}/participants")
async def get_race_participants(segment_id: int):
    """取得賽事報名名單"""
    try:
        # 關聯 registraitons 與 athletes (透過 strava_athlete_id) 或是 tcu_members (透過 tcu_id 或是 name)
        # 目前 registrations table 有: segment_id, strava_athlete_id, athlete_name, athlete_profile, team, number, status, tcu_id
        
        res = supabase.table("registrations").select("*").eq("segment_id", segment_id).order("registered_at", desc=True).execute()
        return res.data if res.data else []
    except Exception as e:
        print(f"[ERROR] Get participants error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/races/{race_id}")
async def update_team_race(race_id: int, request: Request, background_tasks: BackgroundTasks):
    """
    更新車隊賽事 (僅限隊長)
    """
    try:
        body = await request.json()
        strava_id = str(body.get("strava_id"))
        team_name = body.get("team_name")
        name = body.get("name")
        start_date = body.get("start_date")
        end_date = body.get("end_date")
        
        if not strava_id or not team_name or not name or not start_date or not end_date:
            raise HTTPException(status_code=400, detail="缺少必要參數")
        
        # 1. 驗證賽事是否存在且屬於該車隊
        race_res = supabase.table("team_races").select("*").eq("id", race_id).execute()
        if not race_res.data:
            raise HTTPException(status_code=404, detail="賽事不存在")
        
        race = race_res.data[0]
        if race.get("team_name") != team_name:
            raise HTTPException(status_code=403, detail="您無權更新此賽事")
        
        # 2. 驗證權限（僅限隊長/管理員）
        binding_res = supabase.table("strava_member_bindings").select("tcu_member_email, tcu_account").eq("strava_id", strava_id).execute()
        if not binding_res.data:
            raise HTTPException(status_code=403, detail="未綁定 Strava 帳號")
        
        binding = binding_res.data[0]
        email = binding.get("tcu_member_email")
        tcu_account = binding.get("tcu_account")
        
        member = None
        if tcu_account:
            member_res = supabase.table("tcu_members").select("team, member_type").eq("account", tcu_account).execute()
            if member_res.data:
                member = member_res.data[0]
        
        if not member and email:
            member_res = supabase.table("tcu_members").select("team, member_type").eq("email", email).execute()
            if member_res.data:
                member = member_res.data[0]
        
        if not member or member.get("team") != team_name:
            raise HTTPException(status_code=403, detail="您不屬於此車隊")
        
        member_type = member.get("member_type") or ""
        is_authorized = "隊長" in member_type or "管理員" in member_type
        if not is_authorized:
            raise HTTPException(status_code=403, detail="只有隊長或管理員可以更新賽事")
        
        # 3. 更新賽事
        update_data = {
            "name": name,
            "start_date": start_date,
            "end_date": end_date,
            "og_image": body.get("og_image")
        }
        
        # 更新 team_races
        supabase.table("team_races").update(update_data).eq("id", race_id).execute()
        
        # 觸發 OG Image 產生 (重新產圖以反映可能的名稱變更)
        background_tasks.add_task(
            generate_and_upload_og_image_task,
            race_id,
            name,
            race.get("polyline"),
            race.get("distance", 0),
            race.get("elevation_gain", 0)
        )
        
        # 同步更新 segments 表 (因為 Challengs 頁面讀取的是 segments)
        segment_id = race.get("segment_id")
        if segment_id:
            segment_update_data = {
                "name": name,
                "start_date": start_date,
                "end_date": end_date,
                "description": body.get("description"),
                "link": body.get("link")
            }
            # Remove None values to avoid overwriting with null if not provided (though frontend should provide them)
            # Actually frontend might send empty string, which is fine. 
            # But let's be safe and only update if present in body to support partial updates if needed, 
            # though here we expect full update.
            
            supabase.table("segments").update(segment_update_data).eq("id", segment_id).execute()
            
        return {"success": True, "message": "賽事已更新"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Update race error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/races/{race_id}")
async def delete_team_race(race_id: int, request: Request):
    """
    刪除車隊賽事 (僅限隊長)
    """
    try:
        body = await request.json()
        strava_id = str(body.get("strava_id"))
        team_name = body.get("team_name")
        
        if not strava_id or not team_name:
            raise HTTPException(status_code=400, detail="缺少必要參數")
        
        # 1. 驗證賽事是否存在且屬於該車隊
        race_res = supabase.table("team_races").select("*").eq("id", race_id).execute()
        if not race_res.data:
            raise HTTPException(status_code=404, detail="賽事不存在")
        
        race = race_res.data[0]
        if race.get("team_name") != team_name:
            raise HTTPException(status_code=403, detail="您無權刪除此賽事")
        
        # 2. 驗證權限（僅限隊長）
        binding_res = supabase.table("strava_member_bindings").select("tcu_member_email, tcu_account").eq("strava_id", strava_id).execute()
        if not binding_res.data:
            raise HTTPException(status_code=403, detail="未綁定 Strava 帳號")
        
        binding = binding_res.data[0]
        email = binding.get("tcu_member_email")
        tcu_account = binding.get("tcu_account")
        
        member = None
        if tcu_account:
            member_res = supabase.table("tcu_members").select("team, member_type").eq("account", tcu_account).execute()
            if member_res.data:
                member = member_res.data[0]
        
        if not member and email:
            member_res = supabase.table("tcu_members").select("team, member_type").eq("email", email).execute()
            if member_res.data:
                member = member_res.data[0]
        
        if not member or member.get("team") != team_name:
            raise HTTPException(status_code=403, detail="您不屬於此車隊")
        
        member_type = member.get("member_type") or ""
        is_authorized = "隊長" in member_type or "管理員" in member_type
        if not is_authorized:
            raise HTTPException(status_code=403, detail="只有隊長或管理員可以刪除賽事")
        
        # 3. 刪除賽事
        supabase.table("team_races").delete().eq("id", race_id).execute()
        return {"success": True, "message": "賽事已刪除"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Delete race error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
