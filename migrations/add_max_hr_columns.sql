-- Add max_heartrate column to athletes table if it doesn't exist
ALTER TABLE public.athletes 
ADD COLUMN IF NOT EXISTS max_heartrate INTEGER DEFAULT 190;

-- Add max_heartrate column to strava_streams table if it doesn't exist
ALTER TABLE public.strava_streams 
ADD COLUMN IF NOT EXISTS max_heartrate INTEGER;

-- Comment on columns
COMMENT ON COLUMN public.athletes.max_heartrate IS 'Athlete Maximum Heart Rate (bpm)';
COMMENT ON COLUMN public.strava_streams.max_heartrate IS 'Max Heart Rate value at the time of the activity (bpm)';
