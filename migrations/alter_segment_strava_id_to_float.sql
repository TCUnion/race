-- ==========================================
-- Migration: 將 segments.strava_id 改為 FLOAT 類型
-- 目的：允許 strava_id 儲存浮點數值
-- ==========================================

-- 修改 strava_id 欄位類型從 BIGINT 改為 FLOAT
ALTER TABLE public.segments 
ALTER COLUMN strava_id TYPE FLOAT USING strava_id::FLOAT;

-- 確認修改成功
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'segments' AND column_name = 'strava_id';
