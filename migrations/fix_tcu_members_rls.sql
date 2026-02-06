-- ==========================================
-- 修復 tcu_members 表 RLS 未啟用問題
-- 日期: 2026-02-06
-- 問題: policy_exists_rls_disabled
-- ==========================================

-- 啟用 RLS
ALTER TABLE public.tcu_members ENABLE ROW LEVEL SECURITY;

-- 驗證 RLS 狀態
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE tablename = 'tcu_members';
