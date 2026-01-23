
import requests
import json

# 來源端設定
source_url = "https://eknotpyeqfupzijjrleg.supabase.co/rest/v1/"
source_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q"

# 目標端設定
target_url = "https://tcusupabase2.zeabur.app/rest/v1/"
target_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKIC29iIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q"

def migrate_table(table_name):
    print(f"Migrating table '{table_name}'...")
    
    # 讀取來源
    s_headers = {
        "apikey": source_key,
        "Authorization": f"Bearer {source_key}"
    }
    r = requests.get(f"{source_url}{table_name}", headers=s_headers)
    if r.status_code != 200:
        print(f"❌ 讀取來源 '{table_name}' 失敗: {r.status_code}")
        return
    
    data = r.json()
    print(f"Found {len(data)} records.")
    if len(data) == 0:
        return

    # 寫入目標
    t_headers = {
        "apikey": target_key,
        "Authorization": f"Bearer {target_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    
    # 分批寫入 (每批 100 筆)
    batch_size = 100
    for i in range(0, len(data), batch_size):
        batch = data[i:i + batch_size]
        r_post = requests.post(f"{target_url}{table_name}", headers=t_headers, json=batch)
        if r_post.status_code in [201, 204, 200]:
            print(f"✅ 寫入第 {i}-{i+len(batch)} 筆成功")
        else:
            print(f"❌ 寫入第 {i} 筆失敗: {r_post.status_code} - {r_post.text}")

# 依造外鍵順序遷移
tables_to_migrate = [
    "athletes", 
    "strava_tokens", 
    "bikes", 
    "clubs", 
    "shoes", 
    "athlete_clubs", 
    "tcu_members", 
    "athlete_profiles"
]

for t in tables_to_migrate:
    migrate_table(t)

print("Migration completed!")
