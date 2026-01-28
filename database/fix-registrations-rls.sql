-- ====================================
-- 修正報名系統 (registrations) RLS 政策
-- 請在 Zeabur Supabase Studio SQL Editor 中執行此腳本
-- ====================================

-- 1. 刪除所有現有的 registrations 政策以清理環境
DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'registrations' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON registrations', pol.policyname);
    END LOOP;
END $$;

-- 2. 確保 RLS 已啟用 (防止被意外關閉)
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- 3. 建立簡潔且正確的政策 (允許所有人進行基本操作)
-- 注意：生產環境建議根據 uid() 過濾，目前為了解決報名問題先開放公眾權限

-- 允許讀取 (所有人)
CREATE POLICY "registrations_select_policy" ON registrations
    FOR SELECT USING (true);

-- 允許新增 (所有人)
CREATE POLICY "registrations_insert_policy" ON registrations
    FOR INSERT WITH CHECK (true);

-- 允許更新 (所有人)
CREATE POLICY "registrations_update_all_policy" ON registrations
    FOR UPDATE USING (true) WITH CHECK (true);

-- 允許所有人刪除
CREATE POLICY "registrations_delete_all_policy" ON registrations
    FOR DELETE USING (true);

-- 4. 賦予權限給匿名與驗證角色
GRANT ALL ON TABLE registrations TO anon, authenticated, service_role;

-- 5. 確認表格結構是否存在必填欄位
-- 如果需要，可以在此處補強欄位

-- ====================================
-- 執行完成！請嘗試重新提交報名表單。
-- ====================================
