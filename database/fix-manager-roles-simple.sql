-- ============================================
-- 修復 manager_roles RLS 問題（簡化版）
-- 只處理 manager_roles 表
-- ============================================

-- 1. 刪除所有現有的 manager_roles RLS 政策
DROP POLICY IF EXISTS "Admin manage roles" ON public.manager_roles;
DROP POLICY IF EXISTS "Self read role" ON public.manager_roles;
DROP POLICY IF EXISTS "Admin only manage roles" ON public.manager_roles;
DROP POLICY IF EXISTS "Self read own role" ON public.manager_roles;
DROP POLICY IF EXISTS "Admin read all roles" ON public.manager_roles;
DROP POLICY IF EXISTS "Admin insert roles" ON public.manager_roles;
DROP POLICY IF EXISTS "Admin update roles" ON public.manager_roles;
DROP POLICY IF EXISTS "Admin delete roles" ON public.manager_roles;
DROP POLICY IF EXISTS "Anon insert for registration" ON public.manager_roles;
DROP POLICY IF EXISTS "Public select for verification" ON public.manager_roles;
DROP POLICY IF EXISTS "Allow all for testing" ON public.manager_roles;

-- 2. 停用 RLS
ALTER TABLE public.manager_roles DISABLE ROW LEVEL SECURITY;

-- 3. 刷新 Schema cache
NOTIFY pgrst, 'reload schema';

-- 完成！
-- 暫時停用 RLS 以便測試登入功能
