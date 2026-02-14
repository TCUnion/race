from database import supabase

def check_owner():
    print("--- 檢查表格所有者 ---")
    
    # 透過 SQL 查詢 pg_tables 獲取所有者資訊
    sql = "SELECT tablename, tableowner FROM pg_tables WHERE schemaname = 'public' AND tablename = 'strava_bindings';"
    try:
        # 注意: 這裡我們假設有一個執行 raw sql 的 rpc 或是能透過一般的 select/query 繞過
        # 在 Supabase 預設環境中，通常需要透過 RPC 或是 SQL Editor 執行。
        # 這裡我們換個方式：嘗試查詢所有 table 屬性
        pass
    except Exception as e:
        print(f"失敗: {e}")

if __name__ == "__main__":
    check_owner()
