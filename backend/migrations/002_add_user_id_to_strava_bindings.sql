-- 新增 user_id 欄位至 strava_bindings 表格
-- 用途：儲存 Supabase Auth User ID 以進行更嚴格的 RLS 驗證

-- 1. 新增 user_id 欄位 (UUID 類型)
ALTER TABLE strava_bindings ADD COLUMN IF NOT EXISTS user_id UUID;

-- 2. 建立索引以提升根據 user_id 查詢的效能
CREATE INDEX IF NOT EXISTS idx_strava_bindings_user_id ON strava_bindings(user_id);

-- 3. 更新 RLS 政策 (選用，但建議)
-- 允許使用者讀取與更新屬於自己的綁定記錄
-- 這裡我們維持目前的 Allow public read，但可以讓 UPDATE 更安全

-- 若要更嚴格，可以取消註解以下內容並在 SQL Editor 執行：
-- DROP POLICY IF EXISTS "Allow authenticated update" ON strava_bindings;
-- CREATE POLICY "Allow authenticated update" ON strava_bindings
--     FOR UPDATE USING (auth.uid() = user_id);

-- 完成！
