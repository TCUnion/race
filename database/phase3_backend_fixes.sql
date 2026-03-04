-- ==============================================================================
-- 1. Enable Row Level Security (RLS) on Admin Tables
--    This ensures that ONLY authenticated admins/managers can modify data.
-- ==============================================================================

-- Apply to segments table
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;

-- Allow public to select segments
CREATE POLICY "Public can read segments"
ON public.segments FOR SELECT
USING (true);

-- Allow authenticated admins to INSERT/UPDATE/DELETE segments
-- Only users who are logged in via Supabase Auth (authenticated role)
-- and have an 'admin' or 'manager' role in manager_roles table.
CREATE POLICY "Admins can modify segments"
ON public.segments FOR ALL
USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM public.manager_roles 
    WHERE email = auth.email() AND role IN ('admin', 'manager') AND is_active = true
  )
)
WITH CHECK (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM public.manager_roles 
    WHERE email = auth.email() AND role IN ('admin', 'manager') AND is_active = true
  )
);

-- Apply to manager_roles table (Security Config)
ALTER TABLE public.manager_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read manager_roles"
ON public.manager_roles FOR SELECT
USING (true);

CREATE POLICY "Only admins can modify manager_roles"
ON public.manager_roles FOR ALL
USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM public.manager_roles 
    WHERE email = auth.email() AND role = 'admin' AND is_active = true
  )
)
WITH CHECK (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM public.manager_roles 
    WHERE email = auth.email() AND role = 'admin' AND is_active = true
  )
);

-- ==============================================================================
-- 2. Prevent Registration for Expired Challenges (Trigger)
-- ==============================================================================

CREATE OR REPLACE FUNCTION check_segment_expiration()
RETURNS trigger AS $$
DECLARE
    seg_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT end_date INTO seg_end_date 
    FROM public.segments 
    WHERE id = NEW.segment_id;

    -- If end_date is null, it never expires. Otherwise check if it's in the past.
    IF seg_end_date IS NOT NULL AND seg_end_date < CURRENT_TIMESTAMP THEN
        RAISE EXCEPTION 'Cannot register for an expired segment (Segment ID: %). End date was %', NEW.segment_id, seg_end_date;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_segment_expiration ON public.registrations;
CREATE TRIGGER enforce_segment_expiration
BEFORE INSERT OR UPDATE ON public.registrations
FOR EACH ROW EXECUTE FUNCTION check_segment_expiration();
