from database import supabase

def verify_migration_state():
    print("--- 驗證遷移狀態 (v2 檢查) ---")
    
    # 1. 檢查 strava_bindings_v2 是否存在
    try:
        res_v2 = supabase.table("strava_bindings_v2").select("*", count="exact").limit(1).execute()
        print(f"找到 strava_bindings_v2 表格，資料筆數: {res_v2.count if res_v2.count is not None else '未知'}")
    except Exception as e:
        print(f"strava_bindings_v2 不存在或無法存取: {e}")

    # 2. 檢查當前 strava_bindings 是否具備 id 預設值 (透過嘗試不帶 id insert)
    test_data = {
        "tcu_member_email": "verify_migration@example.com",
        "strava_id": "888888",
        "tcu_account": "VERIFY",
        "member_name": "Verify User"
    }
    
    try:
        print("\n嘗試寫入 strava_bindings (不帶 id)...")
        res = supabase.table("strava_bindings").insert(test_data).execute()
        print("寫入成功！這代表結構已修復。")
        # 清理
        supabase.table("strava_bindings").delete().eq("tcu_member_email", "verify_migration@example.com").execute()
    except Exception as e:
        print(f"寫入失敗: {e}")
        if "null value in column \"id\"" in str(e):
            print("確認：目前 strava_bindings 仍遺失自動跳號功能。")

if __name__ == "__main__":
    verify_migration_state()
