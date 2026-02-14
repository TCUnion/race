import os
import sys
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    sys.exit(1)

supabase = create_client(url, key)

def test_insertion():
    print("Testing insertion into 'strava_member_bindings'...")
    test_data = {
        "tcu_member_email": "test_v3@example.com",
        "strava_id": "999999999",
        "member_name": "Test User V3",
        "tcu_account": "TESTV3"
    }
    
    try:
        # 測試寫入 (不提供 ID，驗證 SERIAL 是否運作)
        res = supabase.table("strava_member_bindings").upsert(test_data, on_conflict="tcu_member_email").execute()
        print(f"Success! Inserted/Upserted record: {res.data}")
        
        # 驗證 ID 是否存在且大於 0
        inserted_id = res.data[0].get("id")
        if inserted_id and inserted_id > 0:
            print(f"Verified: Identity column (id={inserted_id}) is working correctly.")
        else:
            print(f"Failure: Identity column returned unexpected ID: {inserted_id}")
            
    except Exception as e:
        print(f"Error during insertion: {e}")

if __name__ == "__main__":
    test_insertion()
