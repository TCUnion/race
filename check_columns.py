
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set")
    exit(1)

supabase: Client = create_client(url, key)

try:
    # 嘗試抓取一筆資料來檢查欄位名
    response = supabase.table("tcu_members").select("*").limit(1).execute()
    if response.data:
        print("Columns in tcu_members:")
        for key in response.data[0].keys():
            print(f"- {key}")
    else:
        print("No data in tcu_members, trying to fetch from strava_bindings")
        
    response_binding = supabase.table("strava_bindings").select("*").limit(1).execute()
    if response_binding.data:
        print("\nColumns in strava_bindings:")
        for key in response_binding.data[0].keys():
            print(f"- {key}")
    else:
        print("\nNo data in strava_bindings")

except Exception as e:
    print(f"Error: {e}")
