import os
from supabase import create_client
from dotenv import load_dotenv

def run_migration():
    load_dotenv()
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
        return

    supabase = create_client(url, key)
    
    migration_file = "migrations/005_add_team_name_to_segments.sql"
    if not os.path.exists(migration_file):
        print(f"Error: Migration file {migration_file} not found")
        return
        
    with open(migration_file, "r") as f:
        sql = f.read()
        
    print(f"Executing migration from {migration_file}...")
    try:
        # 使用 RPC exec_sql 執行 SQL
        res = supabase.postgrest.rpc("exec_sql", {"sql_query": sql}).execute()
        print("Migration successful!")
        print(f"Response: {res}")
    except Exception as e:
        print(f"Migration failed with error: {e}")

if __name__ == "__main__":
    run_migration()
