-- 新增 polyline 欄位到 team_races 表
-- 用於儲存賽事路線編碼

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'team_races' AND column_name = 'polyline') THEN
        ALTER TABLE team_races ADD COLUMN polyline TEXT;
    END IF;
END $$;

-- 完成
SELECT '✅ team_races 路線 polyline 欄位已新增' AS status;
