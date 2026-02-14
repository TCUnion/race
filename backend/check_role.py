from database import supabase

def check_role():
    print("--- 檢查當前資料庫角色與表格屬性 ---")
    
    # 透過 SQL 函數檢查當前使用者 (如果 Supabase 允許執行這類 query)
    try:
        # 使用 rpc 呼叫來執行簡單查詢
        res = supabase.rpc('get_current_role_info', {}).execute()
        print(f"角色資訊: {res.data}")
    except Exception as e:
        print(f"無法透過 RPC 取得角色: {e}")

if __name__ == "__main__":
    check_role()
