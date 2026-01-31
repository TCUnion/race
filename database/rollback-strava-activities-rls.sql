-- ==========================================
-- 回復腳本：還原 strava_activities RLS 至原始狀態
-- 使用情境：新 RLS Policy 導致資料存取異常時執行
-- 建立日期：2026-01-31
-- ==========================================

-- 1. 移除新建立的 Policies
DROP POLICY IF EXISTS "Athletes can view own activities" ON public.strava_activities;
DROP POLICY IF EXISTS "Managers can view team activities" ON public.strava_activities;

-- 2. 還原原始的 Policies
CREATE POLICY "Allow authenticated read activities" ON public.strava_activities
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admin write activities" ON public.strava_activities
    FOR ALL TO authenticated USING (
        (auth.jwt() ->> 'email') IN (SELECT email FROM auth.users WHERE is_super_admin = true)
    ) WITH CHECK (true);

-- 3. 取消強制 RLS（恢復預設行為）
ALTER TABLE public.strava_activities NO FORCE ROW LEVEL SECURITY;

-- 4. 驗證 Policies 狀態
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'strava_activities';
