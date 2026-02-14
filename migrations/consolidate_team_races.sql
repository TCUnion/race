-- ==========================================
-- Migration: Consolidate team_races into segments
-- Goal: Unified table for all race types
-- Fixes: UUID casting errors
-- Note: Execute this in Supabase Dashboard SQL Editor with admin privileges
-- ==========================================


-- 1. Add new columns to segments table
ALTER TABLE segments 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS segment_type TEXT DEFAULT 'challenge' CHECK (segment_type IN ('challenge', 'team_race'));

-- 2. Migrate data from team_races to segments
-- We handle potential non-UUID created_by values by checking format or setting NULL
-- Since we can't easily validate UUID in pure SQL without a function, we'll try a safe cast approach or assume NULL if invalid.
-- However, for simplicity in standard restricted SQL, we might need a DO block or just try to cast and catch.
-- But here we will attempt to cast, and if it fails, the transaction aborts.
-- To be safe, we'll use NULLIF or similar if we know specific bad values, or just let it fail if data is bad (user should fix data first).
-- Given the error '2838277' is strava ID likely, we should probably map it to a specific admin user or leave owner_id NULL.
-- Let's set owner_id to NULL for now if it's not a valid UUID string matching regex.

INSERT INTO segments (
    strava_id,
    name,
    description,
    distance,
    average_grade,
    elevation_gain,
    polyline,
    is_active,
    start_date,
    end_date,
    hosted_by,
    owner_id,
    segment_type
)
SELECT 
    tr.segment_id,              -- strava_id
    tr.name,                    -- name (Team Race Name)
    tr.name,                    -- description (Use name as description default)
    tr.distance,
    tr.average_grade,
    tr.elevation_gain,
    tr.polyline,
    tr.is_active,
    tr.start_date::text,        -- Ensure type compatibility
    tr.end_date::text,          -- Ensure type compatibility
    tr.team_name,               -- hosted_by
    CASE 
        WHEN tr.created_by ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN tr.created_by::uuid
        ELSE NULL -- Or set to a specific admin UUID if known
    END,        -- owner_id
    'team_race'                 -- segment_type
FROM team_races tr;

-- 3. Update RLS Policies
-- Enable RLS on segments if not already enabled
ALTER TABLE segments ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all active segments
DROP POLICY IF EXISTS "Public segments are viewable by everyone" ON segments;
CREATE POLICY "Public segments are viewable by everyone" 
ON segments FOR SELECT 
USING (true);

-- Allow Team Owners to manage their own races
DROP POLICY IF EXISTS "Users can manage their own team races" ON segments;
CREATE POLICY "Users can manage their own team races" 
ON segments FOR ALL 
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- 4. Comment on table
COMMENT ON COLUMN segments.owner_id IS '建立此賽事的車隊管理員 ID';
COMMENT ON COLUMN segments.segment_type IS '賽事類型：challenge (官方挑戰) 或 team_race (車隊賽事)';
