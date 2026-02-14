from database import supabase

def check_constraints():
    print("--- 檢查資料庫約束 ---")
    
    # 透過 RPC 或是直接 SQL (如果支援) 檢查。
    # 這裡我們嘗試用 select 檢查重複資料
    try:
        res = supabase.table("strava_bindings").select("tcu_member_email, count(*)").group_by("tcu_member_email").execute()
        # 注意: postgrest 不直接支援 group_by 這樣用。
    except Exception:
        pass

    # 真正的檢查: 讀取所有表格資訊 (如果可以)
    # 既然我之前看到 id 是 null 的報錯，代表 id 欄位可能有問題。
    
    # 讓我們檢查 id 是否真的有 Default 值 (SERIAL)
    # 我們嘗試用 insert 而不提供 id 給 supabase.table("strava_bindings").insert(...)
    
    test_data = {
        "tcu_member_email": "test_insert@example.com",
        "strava_id": "123456",
        "tcu_account": "INSERT_TEST",
        "member_name": "Insert User"
    }
    
    try:
        print("\n嘗試 3: 使用 .insert() 而非 .upsert()...")
        res = supabase.table("strava_bindings").insert(test_data).execute()
        print(f"Insert 成功: {res.data}")
        # 清理
        supabase.table("strava_bindings").delete().eq("tcu_member_email", "test_insert@example.com").execute()
    except Exception as e:
        print(f"Insert 失敗: {e}")

if __name__ == "__main__":
    check_constraints()
