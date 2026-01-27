-- Add ftp column to athletes table if it doesn't exist
ALTER TABLE public.athletes 
ADD COLUMN IF NOT EXISTS ftp INTEGER DEFAULT 200;

-- Add ftp column to strava_streams table if it doesn't exist
ALTER TABLE public.strava_streams 
ADD COLUMN IF NOT EXISTS ftp INTEGER;

-- Comment on columns
COMMENT ON COLUMN public.athletes.ftp IS 'Cycling Functional Threshold Power (Watts)';
COMMENT ON COLUMN public.strava_streams.ftp IS 'FTP value at the time of the activity (Watts)';
