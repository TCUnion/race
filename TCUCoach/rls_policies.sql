-- Enable Row Level Security (RLS) on tables
ALTER TABLE strava_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE strava_streams ENABLE ROW LEVEL SECURITY;

-- 1. Policy for Authenticated Users (Supabase Auth)
-- Requires user's metadata or a profiles table to link auth.uid() -> athlete_id
-- Assuming auth.jwt() contains 'athlete_id' claim OR we join with a profiles table.
-- Here we assume a profiles table exists or will exist:
-- CREATE TABLE profiles (id uuid references auth.users, strava_athlete_id text);

-- Policy: Users can only select their own activities
CREATE POLICY "Users can view own activities"
ON strava_activities
FOR SELECT
TO authenticated
USING (
  athlete_id = (
    SELECT raw_user_meta_data->>'strava_id' 
    FROM auth.users 
    WHERE id = auth.uid()
  )
);

-- 2. Policy for Service Role (Backend/n8n)
-- Allow full access for backend services
CREATE POLICY "Service role has full access"
ON strava_activities
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3. Policy for Strava Streams (Linked to Activities)
-- Users can see streams if they can see the parent activity
CREATE POLICY "Users can view streams of own activities"
ON strava_streams
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM strava_activities
    WHERE id = strava_streams.activity_id
  )
);

CREATE POLICY "Service role has full access to streams"
ON strava_streams
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- WARNING: 
-- 目前前端使用 Anonymous Key 且未整合 Supabase Auth。
-- 若啟用上述 RLS，前端將無法讀取資料 (因為 current_user 是 anon)。
-- 若要暫時允許前端讀取 (依賴前端過濾，但不安全)，可開啟以下 Policy (不建議生產環境):
-- CREATE POLICY "Anon read access" ON strava_activities FOR SELECT TO anon USING (true);
