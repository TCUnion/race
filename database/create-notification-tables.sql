-- 建立 missing 的通知系統表格，並修復權限問題
-- 這些表格是管理者後台功能所需的，若不存在會導致前端 500/404 報錯

-- 1. 建立通知設定表
CREATE TABLE IF NOT EXISTS public.notification_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    manager_athlete_id bigint,
    manager_email text,
    notification_type text NOT NULL, -- e.g., 'maintenance_due'
    channel text DEFAULT 'line',      -- e.g., 'line', 'email'
    is_enabled boolean DEFAULT true,
    threshold_days integer DEFAULT 7,
    threshold_percentage integer DEFAULT 90,
    schedule_time time DEFAULT '09:00',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. 建立通知記錄表
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    manager_athlete_id bigint,
    manager_email text,
    athlete_id bigint,
    notification_type text NOT NULL,
    title text,
    message text NOT NULL,
    channel text DEFAULT 'line',
    status text DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'read'
    error_message text,
    sent_at timestamptz,
    read_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- 3. 設定權限 (確保 postgres, authenticated, anon, service_role 都能存取)
GRANT ALL ON public.notification_settings TO postgres, authenticated, service_role;
GRANT ALL ON public.notification_logs TO postgres, authenticated, service_role;
GRANT SELECT ON public.notification_settings TO anon;
GRANT SELECT ON public.notification_logs TO anon;

-- 4. 啟用 RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- 5. 建立簡單政策 (暫時允許所有已登入使用者存取，後續可優化)
DROP POLICY IF EXISTS "Allow authenticated full access settings" ON public.notification_settings;
CREATE POLICY "Allow authenticated full access settings" ON public.notification_settings
FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated full access logs" ON public.notification_logs;
CREATE POLICY "Allow authenticated full access logs" ON public.notification_logs
FOR ALL TO authenticated USING (true);

-- 6. 通知系統重載架構
NOTIFY pgrst, 'reload schema';
