
import requests

# 來源端 (MCP 獲取的資料)
registrations = [
    {
        "strava_athlete_id": 2838277,
        "athlete_name": "三義 劉德華",
        "athlete_profile": "https://dgalywyr863hv.cloudfront.net/pictures/athletes/2838277/901288/7/large.jpg"
    }
]

# 目標端設定
target_url = "https://tcusupabase2.zeabur.app/rest/v1/athletes"
target_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q"

headers = {
    "apikey": target_key,
    "Authorization": f"Bearer {target_key}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

for reg in registrations:
    # 拆分姓名 (假設第一個空格或前幾個字是 firstname)
    name = reg["athlete_name"]
    parts = name.split()
    firstname = parts[0] if parts else "Unknown"
    lastname = " ".join(parts[1:]) if len(parts) > 1 else ""

    data = {
        "id": reg["strava_athlete_id"],
        "firstname": firstname,
        "lastname": lastname,
        "profile": reg["athlete_profile"]
    }
    
    r = requests.post(target_url, headers=headers, json=data)
    print(f"Athlete {reg['strava_athlete_id']}: {r.status_code}")

print("Athlete rebuild completed!")
