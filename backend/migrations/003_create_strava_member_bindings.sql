-- 建立全新的 strava_member_bindings 資料表
-- 解決舊表格 strava_bindings 沒有 Identity 欄位且權限被鎖定的問題

CREATE TABLE IF NOT EXISTS strava_member_bindings (
    id SERIAL PRIMARY KEY,
    tcu_member_email VARCHAR(255) UNIQUE NOT NULL,
    strava_id VARCHAR(50) NOT NULL,
    tcu_account VARCHAR(50),
    member_name VARCHAR(100),
    user_id UUID,
    bound_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立 RLS 政策
ALTER TABLE strava_member_bindings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON strava_member_bindings;
CREATE POLICY "Service role full access" ON strava_member_bindings FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public read access" ON strava_member_bindings;
CREATE POLICY "Public read access" ON strava_member_bindings FOR SELECT TO anon, authenticated USING (true);

-- 嘗試遷移現有資料 (如果有的話)
-- 這裡採取寬鬆模式，如果欄位不存在或舊表格不存在則忽略
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'strava_bindings') THEN
        -- 檢查是否有 user_id 欄位
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'strava_bindings' AND column_name = 'user_id') THEN
            INSERT INTO strava_member_bindings (tcu_member_email, strava_id, tcu_account, member_name, user_id, bound_at, updated_at)
            SELECT tcu_member_email, strava_id, tcu_account, member_name, user_id, bound_at, updated_at
            FROM strava_bindings
            ON CONFLICT (tcu_member_email) DO NOTHING;
        ELSE
            INSERT INTO strava_member_bindings (tcu_member_email, strava_id, tcu_account, member_name, bound_at, updated_at)
            SELECT tcu_member_email, strava_id, tcu_account, member_name, bound_at, updated_at
            FROM strava_bindings
            ON CONFLICT (tcu_member_email) DO NOTHING;
        END IF;
    END IF;
END $$;
