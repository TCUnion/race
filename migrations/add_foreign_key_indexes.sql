-- ==========================================
-- 外鍵索引優化腳本
-- 日期: 2026-02-06
-- 說明: 為外鍵欄位建立索引以加速 JOIN 和 DELETE 操作
-- ==========================================

SET ROLE postgres;

-- 1. 設備表索引
CREATE INDEX IF NOT EXISTS idx_bikes_athlete_id ON public.bikes(athlete_id);
CREATE INDEX IF NOT EXISTS idx_shoes_athlete_id ON public.shoes(athlete_id);

-- 2. 路段成績索引
CREATE INDEX IF NOT EXISTS idx_segment_efforts_v2_segment_id ON public.segment_efforts_v2(segment_id);
CREATE INDEX IF NOT EXISTS idx_segment_efforts_v2_athlete_id ON public.segment_efforts_v2(athlete_id);
CREATE INDEX IF NOT EXISTS idx_segment_efforts_v2_leaderboard ON public.segment_efforts_v2(segment_id, elapsed_time);

-- 3. 活動表索引
CREATE INDEX IF NOT EXISTS idx_activities_athlete_id ON public.strava_activities(athlete_id);
CREATE INDEX IF NOT EXISTS idx_activities_gear_id ON public.strava_activities(gear_id);
CREATE INDEX IF NOT EXISTS idx_activities_athlete_date ON public.strava_activities(athlete_id, start_date DESC);

-- 4. 保養系統索引
CREATE INDEX IF NOT EXISTS idx_bike_maintenance_athlete ON public.bike_maintenance(athlete_id);
CREATE INDEX IF NOT EXISTS idx_bike_maintenance_bike ON public.bike_maintenance(bike_id);
CREATE INDEX IF NOT EXISTS idx_bike_maintenance_date ON public.bike_maintenance(service_date DESC);

-- 5. 俱樂部關聯索引 (表格不存在，跳過)
-- CREATE INDEX IF NOT EXISTS idx_athlete_clubs_club_id ON public.athlete_clubs(club_id);

-- 6. 報名表索引 (需要以表格 owner 身份執行)
-- CREATE INDEX IF NOT EXISTS idx_registrations_strava_athlete_id ON public.registrations(strava_athlete_id);

-- 7. 授權與管理者索引
CREATE INDEX IF NOT EXISTS idx_user_auth_status_manager ON public.user_authorizations(status, manager_athlete_id);
CREATE INDEX IF NOT EXISTS idx_manager_roles_email ON public.manager_roles(email);

-- ==========================================
-- 驗證索引建立
-- ==========================================
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
