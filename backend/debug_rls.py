from database import supabase
import sys

def debug_binding():
    print("--- Supabase RLS 診斷開始 ---")
    
    # 測試 1: 查詢 strava_bindings 表格結構 (透過取得一筆資料)
    try:
        print("測試 1: 嘗試讀取 strava_bindings...")
        res = supabase.table("strava_bindings").select("*").limit(1).execute()
        print(f"成功連線！現有資料數量: {len(res.data)}")
        if res.data:
            print(f"現有欄位: {list(res.data[0].keys())}")
    except Exception as e:
        print(f"測試 1 失敗: {e}")

    # 測試 2: 模擬 confirm_binding 的寫入動作
    test_data = {
        "tcu_member_email": "debug_test@example.com",
        "strava_id": "99999999",
        "tcu_account": "DEBUG_ACC",
        "member_name": "Debug User"
    }
    
    try:
        print(f"\n測試 2: 嘗試寫入/更新 (upsert) 測試資料 (指定 on_conflict): {test_data}")
        res = supabase.table("strava_bindings").upsert(test_data, on_conflict="tcu_member_email").execute()
        print(f"寫入成功！回傳資料: {res.data}")
        
        # 清理測試資料
        supabase.table("strava_bindings").delete().eq("tcu_member_email", "debug_test@example.com").execute()
        print("測試資料已清理。")
    except Exception as e:
        print(f"測試 2 (寫入) 失敗: {e}")
        print("這通常代表 RLS 政策封鎖了寫入，或者存在未被滿足的資料表約束。")

    # 測試 3: 驗證 tcu_members 讀取
    try:
        print("\n測試 3: 驗證 tcu_members 讀取權限...")
        res = supabase.table("tcu_members").select("email").limit(1).execute()
        print(f"成功讀取 tcu_members，範例 Email: {res.data[0].get('email') if res.data else '無資料'}")
    except Exception as e:
        print(f"測試 3 失敗: {e}")

if __name__ == "__main__":
    debug_binding()
