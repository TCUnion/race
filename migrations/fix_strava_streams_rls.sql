-- Enable RLS on strava_streams
ALTER TABLE public.strava_streams ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone (or authenticated users)
CREATE POLICY "Allow public read access" ON public.strava_streams
FOR SELECT USING (true);

-- Allow authenticated users to update ftp column
-- Ideally you'd restrict this to the owner or a coach, but for simplicity/debugging:
CREATE POLICY "Allow authenticated update" ON public.strava_streams
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
