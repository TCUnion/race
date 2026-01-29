from database import supabase
import json

try:
    # Try fetching one record to see keys
    res = supabase.table("strava_tokens").select("*").limit(1).execute()
    if res.data:
        print("strava_tokens columns:", list(res.data[0].keys()))
        print("Sample data:", res.data[0])
    else:
        print("strava_tokens is empty.")

    # Check athletes too
    res_ath = supabase.table("athletes").select("*").limit(1).execute()
    if res_ath.data:
        print("athletes columns:", list(res_ath.data[0].keys()))
    else:
        print("athletes is empty.")

except Exception as e:
    print(f"Error: {e}")
