
import requests
import json

url = "https://tcusupabase.zeabur.app/rest/v1/"
service_role_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q"

headers = {
    "apikey": service_role_key,
    "Authorization": f"Bearer {service_role_key}",
    "Content-Type": "application/json",
    "Prefer": "params=multiple-objects"
}

# 由於我們沒有直接執行 SQL 的端點（除非使用 RPC），
# 如果 Zeabur 的 Supabase 支援 /rpc/exec_sql，我們可以使用它。
# 但通常更穩定的方式是直接透過 RPC 建立資料表，或是如果沒有，我們就只能告知使用者。
# 不過！Supabase 容器通常會暴露 5432 埠，但這裡是經由 Kong 轉發。

# 另一種方式是使用 PostgREST 的特點。
# 但最直接且「正確」的方式是在 Supabase Dashboard 執行 SQL。
# 既然使用者給了我 Zeabur 網址，我嘗試看看是否有 SQL 介面或是 RPC。

# 如果不行的話，我會提供完整的 SQL 給使用者，請他在 Zeabur Dashboard 執行。
# 但身為 Agent，我應該嘗試自動化。

# 實際上，Supabase 有一個 /rpc 路由。如果我們建立一個執行 SQL 的函式就太棒了。
# 但在沒有該函式的情況下，我們無法透過 HTTP REST API 建立資料表。

# 所以，我將採取以下行動：
# 1. 撰寫一份完美的 SQL。
# 2. 嘗試檢查是否存在 site_settings 表。
# 3. 如果無法直接執行，我會將 SQL 貼給使用者，並解釋原因。

def check_table(table_name):
    try:
        r = requests.get(f"{url}{table_name}?limit=1", headers=headers)
        return r.status_code == 200
    except:
        return False

print(f"Checking tables on Zeabur...")
tables = ["activities", "leaderboard", "site_settings", "registrations", "segments"]
for t in tables:
    exists = check_table(t)
    print(f"Table '{t}': {'Exists' if exists else 'Missing'}")

sql_check = """
-- 完美的同步 SQL
CREATE TABLE IF NOT EXISTS public.activities (
    id BIGINT PRIMARY KEY,
    title TEXT,
    date TEXT,
    power TEXT,
    time TEXT,
    is_pr BOOLEAN
);

CREATE TABLE IF NOT EXISTS public.leaderboard (
    id BIGINT PRIMARY KEY,
    rank INTEGER,
    name TEXT,
    avatar TEXT,
    bike TEXT,
    time TEXT,
    speed TEXT,
    date TEXT
);

CREATE TABLE IF NOT EXISTS public.site_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 補全 segments 可能缺失的欄位
ALTER TABLE public.segments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE public.segments ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE public.segments ADD COLUMN IF NOT EXISTS total_elevation_gain FLOAT;

-- 補全 registrations 欄位
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 啟用 RLS
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- 策略
DROP POLICY IF EXISTS "Public read activities" ON public.activities;
CREATE POLICY "Public read activities" ON public.activities FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin full access activities" ON public.activities;
CREATE POLICY "Admin full access activities" ON public.activities FOR ALL USING (true);

DROP POLICY IF EXISTS "Public read leaderboard" ON public.leaderboard;
CREATE POLICY "Public read leaderboard" ON public.leaderboard FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin full access leaderboard" ON public.leaderboard;
CREATE POLICY "Admin full access leaderboard" ON public.leaderboard FOR ALL USING (true);

DROP POLICY IF EXISTS "Public read site_settings" ON public.site_settings;
CREATE POLICY "Public read site_settings" ON public.site_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin full access site_settings" ON public.site_settings;
CREATE POLICY "Admin full access site_settings" ON public.site_settings FOR ALL USING (true);
"""

with open("zeabur_sync.sql", "w") as f:
    f.write(sql_check)

print("\nSQL 已生成至 zeabur_sync.sql")
