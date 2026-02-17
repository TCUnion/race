-- 新增比賽敘述欄位到 segment_metadata 表
-- NOTE: 因為沒有 segments 表的 owner 權限，改用 segment_metadata 表存放
-- 此欄位用於儲存多行的比賽詳細說明
ALTER TABLE segment_metadata ADD COLUMN IF NOT EXISTS race_description TEXT;
