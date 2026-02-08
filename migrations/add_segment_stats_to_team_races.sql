-- 新增路段統計欄位到 team_races 表
-- 用於顯示賽事卡片上的詳細資訊

-- 新增 distance 欄位（距離，單位：公尺）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'team_races' AND column_name = 'distance') THEN
        ALTER TABLE team_races ADD COLUMN distance FLOAT;
    END IF;
END $$;

-- 新增 average_grade 欄位（平均坡度，單位：%）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'team_races' AND column_name = 'average_grade') THEN
        ALTER TABLE team_races ADD COLUMN average_grade FLOAT;
    END IF;
END $$;

-- 新增 elevation_gain 欄位（爬升，單位：公尺）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'team_races' AND column_name = 'elevation_gain') THEN
        ALTER TABLE team_races ADD COLUMN elevation_gain FLOAT;
    END IF;
END $$;

-- 完成
SELECT '✅ team_races 路段統計欄位已新增' AS status;
