
import requests

url = "https://tcusupabase2.zeabur.app/rest/v1/"
service_role_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q"

headers = {
    "apikey": service_role_key,
    "Authorization": f"Bearer {service_role_key}",
    "Content-Type": "application/json"
}

tables = [
    "athletes", "bikes", "clubs", "shoes", "athlete_clubs", 
    "tcu_members", "athlete_profiles", "strava_tokens",
    "segments", "registrations", "activities", "leaderboard", "site_settings"
]

print("Checking Target Database (tcusupabase2) Table Rows:")
for table in tables:
    try:
        current_headers = headers.copy()
        current_headers.update({"Range": "0-0", "Prefer": "count=exact"})
        r = requests.get(f"{url}{table}?select=count", headers=current_headers)
        count = r.headers.get("Content-Range", "0-0/0").split("/")[-1]
        print(f"Table '{table}': {count} rows")
    except Exception as e:
        print(f"Table '{table}': Error polling (might not exist)")
