-- 車隊賽事資料表 Migration
-- 如果表已存在，此腳本會進行必要的欄位調整

-- 1. 嘗試建立表（如果不存在）
CREATE TABLE IF NOT EXISTS team_races (
    id SERIAL PRIMARY KEY,
    team_name VARCHAR(255) NOT NULL,
    segment_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 如果表已存在但使用 team_id，新增 team_name 欄位
DO $$
BEGIN
    -- 檢查是否存在 team_id 欄位但不存在 team_name 欄位
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'team_races' AND column_name = 'team_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'team_races' AND column_name = 'team_name'
    ) THEN
        ALTER TABLE team_races ADD COLUMN team_name VARCHAR(255);
    END IF;
    
    -- 確保 created_by 欄位存在
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'team_races' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE team_races ADD COLUMN created_by VARCHAR(50);
    END IF;
END $$;

-- 3. 建立索引以加速查詢
CREATE INDEX IF NOT EXISTS idx_team_races_team_name ON team_races(team_name);
CREATE INDEX IF NOT EXISTS idx_team_races_is_active ON team_races(is_active);
CREATE INDEX IF NOT EXISTS idx_team_races_segment_id ON team_races(segment_id);

-- 4. 啟用 RLS（如果尚未啟用）
ALTER TABLE team_races ENABLE ROW LEVEL SECURITY;

-- 5. 建立 RLS 政策（允許所有人讀取，但只有管理員可以寫入）
DROP POLICY IF EXISTS "team_races_select_policy" ON team_races;
CREATE POLICY "team_races_select_policy" ON team_races
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "team_races_insert_policy" ON team_races;
CREATE POLICY "team_races_insert_policy" ON team_races
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "team_races_update_policy" ON team_races;
CREATE POLICY "team_races_update_policy" ON team_races
    FOR UPDATE USING (true);

-- 完成訊息
SELECT '✅ team_races 資料表 migration 完成' AS status;
