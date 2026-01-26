-- ==========================================
-- HOTFIX: 補上缺失的 manager_email 欄位
-- 原因：使用者回報 "column user_authorizations.manager_email does not exist"
-- ==========================================

-- 1. 確保 user_authorizations 有 manager_email
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_authorizations' AND column_name='manager_email') THEN
        ALTER TABLE public.user_authorizations ADD COLUMN manager_email TEXT;
        COMMENT ON COLUMN public.user_authorizations.manager_email IS '管理者 Email (用於無 Strava 綁定之帳號)';
        
        -- 建立索引
        CREATE INDEX IF NOT EXISTS idx_user_auth_manager_email ON public.user_authorizations(manager_email);
    END IF;

    -- 確保 manager_athlete_id 可為空 (支援純 Email 管理員)
    ALTER TABLE public.user_authorizations ALTER COLUMN manager_athlete_id DROP NOT NULL;
END $$;


-- 2. 確保 notification_settings 有 manager_email
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notification_settings' AND column_name='manager_email') THEN
        ALTER TABLE public.notification_settings ADD COLUMN manager_email TEXT;
        COMMENT ON COLUMN public.notification_settings.manager_email IS '管理者 Email (用於通知設定)';
        
        CREATE INDEX IF NOT EXISTS idx_notification_settings_email ON public.notification_settings(manager_email);
    END IF;
    
    ALTER TABLE public.notification_settings ALTER COLUMN manager_athlete_id DROP NOT NULL;
END $$;


-- 3. 確保 notification_logs 有 manager_email
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notification_logs' AND column_name='manager_email') THEN
        ALTER TABLE public.notification_logs ADD COLUMN manager_email TEXT;
        COMMENT ON COLUMN public.notification_logs.manager_email IS '管理者 Email (發送記錄摘要)';
        
        CREATE INDEX IF NOT EXISTS idx_notification_logs_email ON public.notification_logs(manager_email);
    END IF;
    
    ALTER TABLE public.notification_logs ALTER COLUMN manager_athlete_id DROP NOT NULL;
END $$;

-- 4. 重新套用 RLS 策略 (以防先前執行失敗)
DO $$
BEGIN
    -- 僅在欄位存在時重建 Policy，避免報錯
    DROP POLICY IF EXISTS "Managers access own authorizations" ON public.user_authorizations;
    CREATE POLICY "Managers access own authorizations" ON public.user_authorizations 
        FOR ALL USING (
            (manager_athlete_id::text IN (SELECT athlete_id::text FROM manager_roles WHERE email = auth.email())) OR 
            (manager_email = auth.email())
        );

    DROP POLICY IF EXISTS "Managers access own settings" ON public.notification_settings;
    CREATE POLICY "Managers access own settings" ON public.notification_settings 
        FOR ALL USING (
            (manager_athlete_id::text IN (SELECT athlete_id::text FROM manager_roles WHERE email = auth.email())) OR 
            (manager_email = auth.email())
        );

    DROP POLICY IF EXISTS "Managers access own logs" ON public.notification_logs;
    CREATE POLICY "Managers access own logs" ON public.notification_logs 
        FOR ALL USING (
            (manager_athlete_id::text IN (SELECT athlete_id::text FROM manager_roles WHERE email = auth.email())) OR 
            (manager_email = auth.email())
        );
END $$;
