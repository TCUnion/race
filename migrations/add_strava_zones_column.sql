-- Add strava_zones column to strava_streams table if it doesn't exist
ALTER TABLE public.strava_streams 
ADD COLUMN IF NOT EXISTS strava_zones JSONB;

-- Comment on column
COMMENT ON COLUMN public.strava_streams.strava_zones IS 'Raw Strava Zone Analysis Data (Heart Rate & Power)';
 