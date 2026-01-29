-- ==========================================
-- Fix Database Permissions Script
-- Goal: Ensure 'postgres' role owns all tables to prevent "must be owner" errors
-- ==========================================

-- 1. Switch to service_role to have high privileges (if needed)
-- SET ROLE service_role; -- Optional: usually postgres or default is fine if you are admin

-- 2. Force ownership of all key tables to postgres
ALTER TABLE public.segments OWNER TO postgres;
ALTER TABLE public.registrations OWNER TO postgres;
ALTER TABLE public.strava_tokens OWNER TO postgres;
ALTER TABLE public.athletes OWNER TO postgres;
ALTER TABLE public.bikes OWNER TO postgres;
ALTER TABLE public.shoes OWNER TO postgres;
ALTER TABLE public.clubs OWNER TO postgres;
ALTER TABLE public.athlete_clubs OWNER TO postgres;
ALTER TABLE public.segment_efforts OWNER TO postgres;
ALTER TABLE public.vehicles OWNER TO postgres; 
ALTER TABLE public.maintenance_records OWNER TO postgres;
ALTER TABLE public.tcu_members OWNER TO postgres;
ALTER TABLE public.manager_roles OWNER TO postgres;
ALTER TABLE public.strava_bindings OWNER TO postgres;

-- 3. Grant usage just in case
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- 4. Ensure authenticated users can still access (via RLS)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
