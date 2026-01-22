
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(dotenv_path="backend/.env")

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(url, key)

email = "samkhlin@gmail.com"

print(f"--- Checking for {email} ---")

# 1. Check tcu_members
print("\n[tcu_members]")
res = supabase.table("tcu_members").select("*").eq("email", email).execute()
member = res.data[0] if res.data else None
if member:
    print(f"Found member: ID={member.get('tcu_id')}, StravaID in table={member.get('strava_id')}")
else:
    print("Member not found in tcu_members")

# 2. Check strava_bindings
print("\n[strava_bindings]")
res = supabase.table("strava_bindings").select("*").eq("tcu_member_email", email).execute()
binding = res.data[0] if res.data else None
strava_id = None
if binding:
    print(f"Found binding: StravaID={binding.get('strava_id')}, Name={binding.get('member_name')}")
    strava_id = binding.get('strava_id')
else:
    print("No binding found in strava_bindings")

# 3. Check athletes
if strava_id:
    print(f"\n[athletes] Checking for strava_id={strava_id}")
    res = supabase.table("athletes").select("*").eq("id", strava_id).execute()
    if res.data:
        print(f"Found athlete: {res.data[0]}")
    else:
        print(f"Athlete not found for ID {strava_id}")
else:
    print("\n[athletes] Skipping check (no strava_id)")

# 4. Check strava_tokens
if strava_id:
    print(f"\n[strava_tokens] Checking for strava_id={strava_id}")
    res = supabase.table("strava_tokens").select("*").eq("athlete_id", strava_id).execute()
    if res.data:
        print(f"Found token entry: {res.data[0]}")
    else:
        print(f"Token not found for ID {strava_id}")
