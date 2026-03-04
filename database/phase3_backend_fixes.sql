-- ==============================================================================
-- 1. Enable Row Level Security (RLS) on Admin Tables
--    This ensures that ONLY authenticated admins/managers can modify data.
-- ==============================================================================

-- Protect segments table via Trigger (Bypass supabase_admin ownership restrictions)
--    This ensures that ONLY authenticated admins/managers can modify data.
-- ==============================================================================

CREATE OR REPLACE FUNCTION enforce_admin_segments()
RETURNS trigger AS $$
BEGIN
    -- Bypass protection for postgres, service_role, and supabase_admin
    -- This allows the Supabase Dashboard UI and backend services to manage the table
    IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
        RETURN NEW;
    END IF;

    -- Only authenticated API users can attempt to modify
    IF auth.role() != 'authenticated' THEN
        RAISE EXCEPTION 'Access denied: You must be logged in to modify segments.';
    END IF;

    -- Check if user is active admin or manager
    IF NOT EXISTS (
        SELECT 1 FROM public.manager_roles 
        WHERE email = auth.email() AND role IN ('admin', 'manager') AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Access denied: You must be an admin or manager to modify segments.';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_enforce_admin_segments ON public.segments;
CREATE TRIGGER trigger_enforce_admin_segments
BEFORE INSERT OR UPDATE OR DELETE ON public.segments
FOR EACH ROW EXECUTE FUNCTION enforce_admin_segments();

-- Apply to manager_roles table (Security Config)
ALTER TABLE public.manager_roles OWNER TO postgres;
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
