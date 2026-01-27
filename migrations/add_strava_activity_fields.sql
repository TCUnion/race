-- 擴充 Strava 活動數據欄位
-- 用於提升保養分析精確度與報表豐富度

ALTER TABLE public.strava_activities 
ADD COLUMN IF NOT EXISTS sport_type TEXT,
ADD COLUMN IF NOT EXISTS elapsed_time INTEGER,
ADD COLUMN IF NOT EXISTS average_speed FLOAT8,
ADD COLUMN IF NOT EXISTS max_speed FLOAT8,
ADD COLUMN IF NOT EXISTS average_cadence FLOAT8,
ADD COLUMN IF NOT EXISTS kilojoules FLOAT8,
ADD COLUMN IF NOT EXISTS calories FLOAT8,
ADD COLUMN IF NOT EXISTS device_name TEXT,
ADD COLUMN IF NOT EXISTS trainer BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS commute BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS start_date_local TEXT;

-- 註解欄位用途
COMMENT ON COLUMN public.strava_activities.sport_type IS '活動運動類型 (如 Ride, VirtualRide)';
COMMENT ON COLUMN public.strava_activities.elapsed_time IS '總耗時 (秒)';
COMMENT ON COLUMN public.strava_activities.kilojoules IS '總能量消耗 (用於鏈條保養分析)';
COMMENT ON COLUMN public.strava_activities.trainer IS '是否為訓練台 (室內) 活動';
COMMENT ON COLUMN public.strava_activities.device_name IS '記錄設備名稱 (如 Garmin Edge 530)';
