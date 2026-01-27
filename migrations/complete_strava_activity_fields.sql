-- ============================================
-- Strava 活動資料表 (strava_activities) 完整補齊 SQL
-- 包含所有核心性能指標、地圖資料、與設備資訊
-- ============================================

ALTER TABLE public.strava_activities 
-- 1. 核心活動資訊 (若尚未存在)
ADD COLUMN IF NOT EXISTS sport_type TEXT,
ADD COLUMN IF NOT EXISTS elapsed_time INTEGER,
ADD COLUMN IF NOT EXISTS start_date_local TEXT,
ADD COLUMN IF NOT EXISTS distance FLOAT8,
ADD COLUMN IF NOT EXISTS moving_time INTEGER,

-- 2. 性能與消耗指標
ADD COLUMN IF NOT EXISTS average_speed FLOAT8,
ADD COLUMN IF NOT EXISTS max_speed FLOAT8,
ADD COLUMN IF NOT EXISTS average_cadence FLOAT8,
ADD COLUMN IF NOT EXISTS average_watts FLOAT8,
ADD COLUMN IF NOT EXISTS max_watts FLOAT8,
ADD COLUMN IF NOT EXISTS weighted_average_watts FLOAT8,
ADD COLUMN IF NOT EXISTS kilojoules FLOAT8,
ADD COLUMN IF NOT EXISTS calories FLOAT8,
ADD COLUMN IF NOT EXISTS suffer_score INTEGER,

-- 3. 生理指標
ADD COLUMN IF NOT EXISTS average_heartrate FLOAT8,
ADD COLUMN IF NOT EXISTS max_heartrate FLOAT8,
ADD COLUMN IF NOT EXISTS has_heartrate BOOLEAN DEFAULT false,

-- 4. 環境與坡度資料
ADD COLUMN IF NOT EXISTS total_elevation_gain FLOAT8,
ADD COLUMN IF NOT EXISTS elev_high FLOAT8,
ADD COLUMN IF NOT EXISTS elev_low FLOAT8,
ADD COLUMN IF NOT EXISTS average_temp FLOAT8,

-- 5. 設備與屬性
ADD COLUMN IF NOT EXISTS device_name TEXT,
ADD COLUMN IF NOT EXISTS gear_id TEXT,
ADD COLUMN IF NOT EXISTS trainer BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS commute BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS manual BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS private BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS visibility TEXT,

-- 6. 進階與追蹤資料
ADD COLUMN IF NOT EXISTS athlete JSONB, -- 存入原始 Athlete 物件
ADD COLUMN IF NOT EXISTS map JSONB,     -- 存入地圖 Polyline 資訊
ADD COLUMN IF NOT EXISTS start_latlng JSONB,
ADD COLUMN IF NOT EXISTS end_latlng JSONB,
ADD COLUMN IF NOT EXISTS upload_id BIGINT,
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT,
ADD COLUMN IF NOT EXISTS utc_offset INTEGER,

-- 7. 元數據
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 註解重要欄位
COMMENT ON TABLE public.strava_activities IS 'Strava 詳細活動紀錄表';
COMMENT ON COLUMN public.strava_activities.kilojoules IS '總能量消耗 (用於鏈條保養分析)';
COMMENT ON COLUMN public.strava_activities.sport_type IS '具體運動類型 (如 VirtualRide, Ride, GravelRide)';
COMMENT ON COLUMN public.strava_activities.athlete IS 'Strava 原始車友資物件 (包含 id)';
COMMENT ON COLUMN public.strava_activities.map IS '活動地圖資料，包含 summary_polyline';
