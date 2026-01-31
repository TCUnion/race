-- ==========================================
-- 改進版 RLS Policies for strava_activities
-- 目標：實現選手級別資料隔離（Multi-tenant Isolation）
-- 建立日期：2026-01-31
-- 回復腳本：rollback-strava-activities-rls.sql
-- ==========================================

-- 1. 確保 RLS 強制執行
ALTER TABLE public.strava_activities FORCE ROW LEVEL SECURITY;

-- 2. 刪除過於寬鬆的 Policy
DROP POLICY IF EXISTS "Allow authenticated read activities" ON public.strava_activities;
DROP POLICY IF EXISTS "Allow admin write activities" ON public.strava_activities;

-- 3. 新增：選手只能讀取自己的資料
CREATE POLICY "Athletes can view own activities" ON public.strava_activities
    FOR SELECT TO authenticated
    USING (
        athlete_id::text = (auth.jwt() -> 'app_metadata' ->> 'athlete_id')
    );

-- 4. 新增：教練/管理員可讀取其管轄選手資料
-- NOTE: manager_roles 表格使用 email 欄位（非 manager_email）
CREATE POLICY "Managers can view team activities" ON public.strava_activities
    FOR SELECT TO authenticated
    USING (
        athlete_id IN (
            SELECT athlete_id FROM public.manager_roles
            WHERE email = auth.jwt() ->> 'email'
        )
    );

-- 5. 保留 service_role 完全存取（供 n8n 使用）
-- 現有 Policy "Allow service_role write activities" 已正確設定，無需修改

-- 6. 驗證新 Policies 狀態
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'strava_activities';
