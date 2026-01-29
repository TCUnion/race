-- ==========================================
-- Create Strava Activities Table
-- Goal: Store latest activity summaries for Captain's War Room
-- ==========================================

CREATE TABLE IF NOT EXISTS public.strava_activities (
    id BIGINT PRIMARY KEY, -- Strava Activity ID
    athlete_id BIGINT NOT NULL, -- Strava Athlete ID
    name TEXT NOT NULL,
    distance FLOAT, -- Meters
    moving_time INTEGER, -- Seconds
    elapsed_time INTEGER, -- Seconds
    total_elevation_gain FLOAT, -- Meters
    type TEXT, -- Ride, Run, Swim, etc.
    sport_type TEXT, -- Ride, VirtualRide, etc.
    start_date TIMESTAMP WITH TIME ZONE,
    start_date_local TIMESTAMP WITH TIME ZONE,
    timezone TEXT,
    average_speed FLOAT,
    max_speed FLOAT,
    average_cadence FLOAT,
    average_temp INTEGER,
    average_watts FLOAT,
    weighted_average_watts INTEGER,
    kilojoules FLOAT,
    device_watts BOOLEAN,
    has_heartrate BOOLEAN,
    average_heartrate FLOAT,
    max_heartrate FLOAT,
    suffer_score INTEGER,
    calories FLOAT,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.strava_activities ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Public Read: Allow authenticated users to read (filtered by API logic)
CREATE POLICY "Allow authenticated read activities" ON public.strava_activities
    FOR SELECT TO authenticated USING (true);

-- 2. Service Role / Admin Write: Allow n8n or backend to insert/update
CREATE POLICY "Allow service_role write activities" ON public.strava_activities
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. Allow Admin to write (for manual sync if needed)
CREATE POLICY "Allow admin write activities" ON public.strava_activities
    FOR ALL TO authenticated USING (
        (auth.jwt() ->> 'email') IN (SELECT email FROM auth.users WHERE is_super_admin = true) -- Simplified, usually handled by Service Role
    ) WITH CHECK (true);

-- Create Index for faster queries by athlete and date
CREATE INDEX IF NOT EXISTS idx_strava_activities_athlete_date ON public.strava_activities(athlete_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_strava_activities_start_date ON public.strava_activities(start_date DESC);
