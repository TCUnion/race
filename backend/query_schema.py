import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(url, key)

print("--- tcunio_race ---")
try:
    res = supabase.table('tcunio_race').select('*').limit(1).execute()
    print(res.data)
except Exception as e:
    print(e)

print("--- team_races ---")
try:
    res = supabase.table('team_races').select('*').limit(1).execute()
    print(res.data)
except Exception as e:
    print(e)
