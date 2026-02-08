-- 新增 hosted_by 欄位到 segments 表
-- 用於標記賽事的主辦車隊

-- 新增 hosted_by 欄位
ALTER TABLE segments 
ADD COLUMN IF NOT EXISTS hosted_by TEXT;

-- 新增索引以加速查詢
CREATE INDEX IF NOT EXISTS idx_segments_hosted_by 
ON segments(hosted_by) 
WHERE hosted_by IS NOT NULL;

-- 新增備註
COMMENT ON COLUMN segments.hosted_by IS '主辦車隊名稱（來自 team_races）';
