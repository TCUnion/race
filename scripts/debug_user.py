
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("VITE_SUPABASE_ANON_KEY")

if not url or not key:
    print("Error: Missing Supabase credentials")
    exit(1)

supabase: Client = create_client(url, key)

target_id = "y120513973"

print(f"Querying for: {target_id}")

try:
    # Query by account
    res = supabase.table("tcu_members").select("*").eq("account", target_id).execute()
    if res.data:
        print("Found by account:")
        print(res.data)
    else:
        # Query by tcu_id
        res = supabase.table("tcu_members").select("*").eq("tcu_id", target_id).execute()
        if res.data:
            print("Found by tcu_id:")
            print(res.data)
        else:
            print("Not found")

except Exception as e:
    print(f"Error: {e}")
