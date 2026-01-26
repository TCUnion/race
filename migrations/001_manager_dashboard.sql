-- ====================================
-- 管理後台系統 - 資料庫遷移 (v1.0)
-- 授權關係、通知設定與通知記錄表
-- ====================================

-- 1. 授權關係表
-- 管理「管理者」與「車友」之間的授權關係
CREATE TABLE IF NOT EXISTS public.user_authorizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    manager_athlete_id BIGINT NOT NULL,      -- 管理者 Strava Athlete ID (車店/車隊長)
    athlete_id BIGINT NOT NULL,              -- 被授權車友 Strava Athlete ID
    authorization_type TEXT NOT NULL DEFAULT 'all',  -- 'maintenance', 'activity', 'statistics', 'all'
    status TEXT DEFAULT 'pending',           -- 'pending', 'approved', 'rejected', 'expired'
    shop_name TEXT,                          -- 車店/車隊名稱 (可選)
    notes TEXT,                              -- 備註
    created_at TIMESTAMPTZ DEFAULT now(),
    approved_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,                  -- 授權到期時間 (可選，NULL 表示永久)
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(manager_athlete_id, athlete_id)
);

-- 2. 通知設定表
-- 管理者的通知偏好設定
CREATE TABLE IF NOT EXISTS public.notification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    manager_athlete_id BIGINT NOT NULL,
    notification_type TEXT NOT NULL,         -- 'maintenance_due', 'parts_prep', 'activity_summary', 'overdue_alert'
    channel TEXT NOT NULL,                   -- 'line', 'email', 'push', 'all'
    is_enabled BOOLEAN DEFAULT true,
    threshold_days INTEGER DEFAULT 7,        -- 提前幾天通知
    threshold_percentage INTEGER DEFAULT 85, -- 保養進度達到多少 % 時通知
    schedule_time TIME DEFAULT '08:00:00',   -- 每日通知時間
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(manager_athlete_id, notification_type, channel)
);

-- 3. 通知記錄表
-- 記錄所有發送的通知歷史
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    manager_athlete_id BIGINT NOT NULL,
    athlete_id BIGINT,                       -- 相關車友 (可為 NULL，如摘要通知)
    notification_type TEXT NOT NULL,         -- 'maintenance_due', 'parts_prep', 'activity_summary'
    title TEXT,                              -- 通知標題
    message TEXT NOT NULL,                   -- 通知內容
    channel TEXT NOT NULL,                   -- 'line', 'email', 'push'
    status TEXT DEFAULT 'pending',           -- 'pending', 'sent', 'failed', 'read'
    error_message TEXT,                      -- 發送失敗原因
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 管理者角色表 (可選，用於權限細分)
CREATE TABLE IF NOT EXISTS public.manager_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    athlete_id BIGINT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'manager',    -- 'admin', 'shop_owner', 'team_leader', 'technician'
    shop_name TEXT,                          -- 車店名稱
    shop_address TEXT,                       -- 車店地址
    shop_phone TEXT,                         -- 車店電話
    line_notify_token TEXT,                  -- LINE Notify Token
    email TEXT,                              -- 通知郵箱
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ====================================
-- 索引建立
-- ====================================

-- user_authorizations 索引
CREATE INDEX IF NOT EXISTS idx_user_auth_manager ON public.user_authorizations(manager_athlete_id);
CREATE INDEX IF NOT EXISTS idx_user_auth_athlete ON public.user_authorizations(athlete_id);
CREATE INDEX IF NOT EXISTS idx_user_auth_status ON public.user_authorizations(status);

-- notification_settings 索引
CREATE INDEX IF NOT EXISTS idx_notification_settings_manager ON public.notification_settings(manager_athlete_id);

-- notification_logs 索引
CREATE INDEX IF NOT EXISTS idx_notification_logs_manager ON public.notification_logs(manager_athlete_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_athlete ON public.notification_logs(athlete_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON public.notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created ON public.notification_logs(created_at);

-- manager_roles 索引
CREATE INDEX IF NOT EXISTS idx_manager_roles_athlete ON public.manager_roles(athlete_id);

-- ====================================
-- RLS 政策
-- ====================================

-- 啟用 RLS
ALTER TABLE public.user_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_roles ENABLE ROW LEVEL SECURITY;

-- user_authorizations 政策
DROP POLICY IF EXISTS "Public read user_authorizations" ON public.user_authorizations;
CREATE POLICY "Public read user_authorizations" ON public.user_authorizations 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert user_authorizations" ON public.user_authorizations;
CREATE POLICY "Public insert user_authorizations" ON public.user_authorizations 
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update user_authorizations" ON public.user_authorizations;
CREATE POLICY "Public update user_authorizations" ON public.user_authorizations 
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public delete user_authorizations" ON public.user_authorizations;
CREATE POLICY "Public delete user_authorizations" ON public.user_authorizations 
    FOR DELETE USING (true);

-- notification_settings 政策
DROP POLICY IF EXISTS "Public all notification_settings" ON public.notification_settings;
CREATE POLICY "Public all notification_settings" ON public.notification_settings 
    FOR ALL USING (true) WITH CHECK (true);

-- notification_logs 政策
DROP POLICY IF EXISTS "Public all notification_logs" ON public.notification_logs;
CREATE POLICY "Public all notification_logs" ON public.notification_logs 
    FOR ALL USING (true) WITH CHECK (true);

-- manager_roles 政策
DROP POLICY IF EXISTS "Public read manager_roles" ON public.manager_roles;
CREATE POLICY "Public read manager_roles" ON public.manager_roles 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public all manager_roles" ON public.manager_roles;
CREATE POLICY "Public all manager_roles" ON public.manager_roles 
    FOR ALL USING (true) WITH CHECK (true);

-- ====================================
-- 預設資料
-- ====================================

-- 預設通知類型說明 (作為參考)
COMMENT ON COLUMN public.notification_settings.notification_type IS 
    'maintenance_due: 保養即將到期, parts_prep: 備料提醒, activity_summary: 活動摘要, overdue_alert: 超期警告';

COMMENT ON COLUMN public.user_authorizations.authorization_type IS 
    'maintenance: 僅保養資料, activity: 僅活動資料, statistics: 僅統計資料, all: 全部資料';

COMMENT ON COLUMN public.manager_roles.role IS 
    'admin: 系統管理員, shop_owner: 車店老闆, team_leader: 車隊長, technician: 技師';
