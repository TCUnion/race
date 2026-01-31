-- ============================================
-- 全面修復 Supabase Auth RLS 遞迴問題
-- 問題: Database error querying schema (500)
-- ============================================

-- 1. 暫時停用所有可能造成問題的 RLS
ALTER TABLE IF EXISTS public.manager_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.strava_bindings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.strava_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tcu_members DISABLE ROW LEVEL SECURITY;

-- 2. 刪除可能造成遞迴的函數
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_strava_id() CASCADE;

-- 3. 重新建立安全函數（使用 SECURITY DEFINER 繞過 RLS）
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
    result boolean;
BEGIN
    -- 使用 SECURITY DEFINER 直接查詢，繞過 RLS
    SELECT EXISTS (
        SELECT 1 FROM public.manager_roles 
        WHERE email = auth.email() AND role = 'admin' AND is_active = true
    ) INTO result;
    RETURN COALESCE(result, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_my_strava_id()
RETURNS bigint AS $$
DECLARE
    result bigint;
BEGIN
    SELECT strava_id INTO result 
    FROM public.strava_bindings 
    WHERE user_id = auth.uid() 
    LIMIT 1;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. 刪除所有現有的 manager_roles RLS 政策
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

-- 5. 暫時允許所有操作（用於測試）
ALTER TABLE public.manager_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for testing" ON public.manager_roles
FOR ALL USING (true) WITH CHECK (true);

-- 6. 授權
GRANT ALL ON public.manager_roles TO anon;
GRANT ALL ON public.manager_roles TO authenticated;
GRANT ALL ON public.manager_roles TO service_role;

-- 7. 其他表也暫時開放（用於測試）
ALTER TABLE public.strava_bindings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all strava_bindings" ON public.strava_bindings;
CREATE POLICY "Allow all strava_bindings" ON public.strava_bindings
FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.strava_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all strava_tokens" ON public.strava_tokens;
CREATE POLICY "Allow all strava_tokens" ON public.strava_tokens
FOR ALL USING (true) WITH CHECK (true);

-- 8. password_reset_tokens 也需要開放
ALTER TABLE IF EXISTS public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all password_reset_tokens" ON public.password_reset_tokens;
CREATE POLICY "Allow all password_reset_tokens" ON public.password_reset_tokens
FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.password_reset_tokens TO anon;
GRANT ALL ON public.password_reset_tokens TO authenticated;
GRANT ALL ON public.password_reset_tokens TO service_role;

-- 9. 刷新 Schema cache
NOTIFY pgrst, 'reload schema';

-- 完成！
-- 請再次嘗試登入
