-- ==========================================
-- RLS 復原腳本 (Rollback)
-- 用途：將 RLS 策略恢復到此次修正前的狀態
-- ==========================================

-- 1. 恢復 registrations 表格 (恢復為寬鬆模式)
DROP POLICY IF EXISTS "Public read registrations" ON public.registrations;
DROP POLICY IF EXISTS "Owner insert registrations" ON public.registrations;
DROP POLICY IF EXISTS "Owner/Admin update registrations" ON public.registrations;
DROP POLICY IF EXISTS "Owner/Admin delete registrations" ON public.registrations;

CREATE POLICY "registrations_select_policy" ON public.registrations FOR SELECT USING (true);
CREATE POLICY "registrations_insert_policy" ON public.registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "registrations_update_all_policy" ON public.registrations FOR UPDATE USING (true);
CREATE POLICY "registrations_delete_all_policy" ON public.registrations FOR DELETE USING (true);

-- 2. 恢復 tcu_members 表格 (恢復為公開讀取)
DROP POLICY IF EXISTS "Owner/Admin read tcu_members" ON public.tcu_members;
CREATE POLICY "Public read tcu_members" ON public.tcu_members FOR SELECT USING (true);

-- 3. 恢復 strava_tokens 表格 (恢復為所有登入者可讀)
DROP POLICY IF EXISTS "Owner/Admin access strava_tokens" ON public.strava_tokens;
CREATE POLICY "Admin only strava_tokens" ON public.strava_tokens FOR ALL TO authenticated USING (true);

-- 4. 恢復 manager_roles 表格
DROP POLICY IF EXISTS "Admin manage roles" ON public.manager_roles;
DROP POLICY IF EXISTS "Self read role" ON public.manager_roles;
-- 如果原來沒有 RLS，可以選擇關閉
-- ALTER TABLE public.manager_roles DISABLE ROW LEVEL SECURITY;

-- 5. 移除輔助函數與索引 (選用，不移除不影響運作)
-- DROP FUNCTION IF EXISTS public.get_my_strava_id();
-- DROP FUNCTION IF EXISTS public.is_admin();
-- DROP INDEX IF EXISTS idx_strava_bindings_user_id;
-- ALTER TABLE public.strava_bindings DROP COLUMN IF EXISTS user_id;

-- 6. 重載 Schema
NOTIFY pgrst, 'reload schema';
