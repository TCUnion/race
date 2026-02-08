-- 修復 team_races 表的 RLS 權限問題
-- 錯誤: permission denied for table team_races (code: 42501)

-- 1. 確保 RLS 已啟用（如果已啟用會忽略）
ALTER TABLE team_races ENABLE ROW LEVEL SECURITY;

-- 2. 授予 service_role 和 authenticated 角色完整權限
GRANT ALL ON team_races TO authenticated;
GRANT ALL ON team_races TO service_role;
GRANT ALL ON team_races TO anon;

-- 3. 授予序列權限（用於 auto-increment ID）
GRANT USAGE, SELECT ON SEQUENCE team_races_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE team_races_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE team_races_id_seq TO anon;

-- 4. 重建 RLS 政策
DROP POLICY IF EXISTS "team_races_select_policy" ON team_races;
DROP POLICY IF EXISTS "team_races_insert_policy" ON team_races;
DROP POLICY IF EXISTS "team_races_update_policy" ON team_races;
DROP POLICY IF EXISTS "team_races_delete_policy" ON team_races;
DROP POLICY IF EXISTS "allow_all" ON team_races;

-- 5. 建立允許所有操作的政策
CREATE POLICY "allow_all_operations" ON team_races
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 完成
SELECT '✅ team_races RLS 權限已修復' AS status;
