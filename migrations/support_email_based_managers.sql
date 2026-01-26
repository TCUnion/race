-- ==========================================
-- 支援以 Email 為主的管理員 - 資料庫遷移
-- ==========================================

-- 1. 擴充授權關係表 (user_authorizations)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_authorizations' AND column_name='manager_email') THEN
        ALTER TABLE public.user_authorizations ADD COLUMN manager_email TEXT;
        COMMENT ON COLUMN public.user_authorizations.manager_email IS '管理者 Email (用於無 Strava 綁定之帳號)';
    END IF;
    
    -- 修改 manager_athlete_id 為可空 (若要在純 Email 模式下運作)
    ALTER TABLE public.user_authorizations ALTER COLUMN manager_athlete_id DROP NOT NULL;
END $$;

-- 更新唯一約束 (改為組合唯一，視情況而定。這裡暫時維持原樣或改為允許 email)
-- 建立基於 Email 的索引
CREATE INDEX IF NOT EXISTS idx_user_auth_manager_email ON public.user_authorizations(manager_email);

-- 2. 擴充通知設定表 (notification_settings)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notification_settings' AND column_name='manager_email') THEN
        ALTER TABLE public.notification_settings ADD COLUMN manager_email TEXT;
        COMMENT ON COLUMN public.notification_settings.manager_email IS '管理者 Email (用於通知設定)';
    END IF;
    
    ALTER TABLE public.notification_settings ALTER COLUMN manager_athlete_id DROP NOT NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_notification_settings_email ON public.notification_settings(manager_email);

-- 3. 擴充通知記錄表 (notification_logs)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notification_logs' AND column_name='manager_email') THEN
        ALTER TABLE public.notification_logs ADD COLUMN manager_email TEXT;
        COMMENT ON COLUMN public.notification_logs.manager_email IS '管理者 Email (發送記錄摘要)';
    END IF;
    
    ALTER TABLE public.notification_logs ALTER COLUMN manager_athlete_id DROP NOT NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_notification_logs_email ON public.notification_logs(manager_email);

-- 4. 更新 RLS 策略 (確保以 Email 登入的管理員能讀寫自己的資料)
-- 注意：這裡的策略假設 auth.email() 會與上述 email 欄位匹配

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
