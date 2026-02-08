-- 新增 description 欄位到 segments 表
-- 用於顯示自訂的路段名稱（例如車隊賽事名稱）

-- 新增 description 欄位
ALTER TABLE segments 
ADD COLUMN IF NOT EXISTS description TEXT;

-- 新增備註
COMMENT ON COLUMN segments.description IS '路段說明或自訂名稱（例如車隊賽事名稱）';
