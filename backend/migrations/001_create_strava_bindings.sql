-- Strava 綁定表格 Migration
-- 執行此 SQL 於 Supabase SQL Editor 中

-- 1. 建立 strava_bindings 表格
CREATE TABLE IF NOT EXISTS strava_bindings (
    id SERIAL PRIMARY KEY,
    tcu_member_email VARCHAR(255) UNIQUE NOT NULL,
    strava_id VARCHAR(50) NOT NULL,
    tcu_account VARCHAR(50),
    member_name VARCHAR(100),
    bound_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_strava_bindings_strava_id ON strava_bindings(strava_id);
CREATE INDEX IF NOT EXISTS idx_strava_bindings_email ON strava_bindings(tcu_member_email);
CREATE INDEX IF NOT EXISTS idx_strava_bindings_tcu_account ON strava_bindings(tcu_account);

-- 3. 建立 RLS 政策 (Row Level Security)
ALTER TABLE strava_bindings ENABLE ROW LEVEL SECURITY;

-- 允許所有人讀取 (用於公開排行榜驗證)
CREATE POLICY "Allow public read" ON strava_bindings
    FOR SELECT USING (true);

-- 允許已驗證用戶新增自己的綁定
CREATE POLICY "Allow authenticated insert" ON strava_bindings
    FOR INSERT WITH CHECK (true);

-- 允許已驗證用戶更新自己的綁定
CREATE POLICY "Allow authenticated update" ON strava_bindings
    FOR UPDATE USING (true);

-- 允許已驗證用戶刪除自己的綁定
CREATE POLICY "Allow authenticated delete" ON strava_bindings
    FOR DELETE USING (true);

-- 4. 建立觸發器自動更新 updated_at
CREATE OR REPLACE FUNCTION update_strava_bindings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_strava_bindings_updated_at
    BEFORE UPDATE ON strava_bindings
    FOR EACH ROW
    EXECUTE FUNCTION update_strava_bindings_updated_at();

-- 完成！
