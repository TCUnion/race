-- ==========================================
-- 回復 manager_roles RLS 政策 (Rollback)
-- 日期: 2026-02-06
-- 說明: 如果新政策造成問題，執行此腳本恢復原狀
-- ==========================================

-- 移除新建立的政策
DROP POLICY IF EXISTS "manager_roles_select" ON public.manager_roles;
DROP POLICY IF EXISTS "manager_roles_insert" ON public.manager_roles;
DROP POLICY IF EXISTS "manager_roles_update" ON public.manager_roles;
DROP POLICY IF EXISTS "manager_roles_delete" ON public.manager_roles;

-- 恢復原始政策 (FOR ALL USING true)
CREATE POLICY "Public read manager_roles" ON public.manager_roles 
    FOR SELECT USING (true);

CREATE POLICY "Public all manager_roles" ON public.manager_roles 
    FOR ALL USING (true) WITH CHECK (true);

-- 驗證政策已恢復
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename = 'manager_roles';
