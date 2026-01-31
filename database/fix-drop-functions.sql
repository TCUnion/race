-- 刪除可能造成 RLS 遞迴的函數
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_strava_id() CASCADE;

-- 刷新 Schema cache
NOTIFY pgrst, 'reload schema';
