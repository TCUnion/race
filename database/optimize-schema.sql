-- ==========================================
-- Database Optimization Script
-- Goal: Fix missing indexes on Foreign Keys and optimize RLS queries
-- Fix: Switch to postgres role to avoid "must be owner" errors
-- ==========================================

-- Switch to postgres role (Supabase SQL Editor best practice for schema changes)
SET ROLE postgres;

-- 1. Optimizing Registrations RLS & Lookups
-- RLS Policy uses: strava_athlete_id = get_my_strava_id()
-- Current Index: UNIQUE(segment_id, strava_athlete_id) -> Efficient for (segment + athlete), but not athlete alone.
CREATE INDEX IF NOT EXISTS idx_registrations_strava_athlete_id ON public.registrations(strava_athlete_id);

-- 2. FK Indexes for Equipment Tables
-- Missing index on athlete_id for bikes/shoes makes joining or deleting athletes slow (Full Table Scan on child tables).
CREATE INDEX IF NOT EXISTS idx_bikes_athlete_id ON public.bikes(athlete_id);
CREATE INDEX IF NOT EXISTS idx_shoes_athlete_id ON public.shoes(athlete_id);

-- 3. FK Indexes for Club Memberships
-- Primary Key is (athlete_id, club_id), so athlete_id is optimized.
-- But querying "all members of a club" (WHERE club_id = ?) requires a full scan of athlete_clubs.
CREATE INDEX IF NOT EXISTS idx_athlete_clubs_club_id ON public.athlete_clubs(club_id);

-- 4. FK Indexes for Segment Efforts
-- Segment efforts are often queried by segment (Leaderboard) or athlete.
-- Check existing: schema.sql doesn't show explicit indexes.
CREATE INDEX IF NOT EXISTS idx_segment_efforts_segment_id ON public.segment_efforts(segment_id);
CREATE INDEX IF NOT EXISTS idx_segment_efforts_athlete_id ON public.segment_efforts(athlete_id);
-- Compound index for fast leaderboard filtering? (segment + elapsed_time, etc.)
CREATE INDEX IF NOT EXISTS idx_segment_efforts_segment_time ON public.segment_efforts(segment_id, elapsed_time);

-- 5. FK Indexes for Maintenance System
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON public.vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_strava_athlete_id ON public.vehicles(strava_athlete_id);
-- [SKIP due to ownership issue] CREATE INDEX IF NOT EXISTS idx_maintenance_records_vehicle_id ON public.maintenance_records(vehicle_id);

-- 6. Optimize Manager Roles
-- RLS uses: email = auth.email()
-- Ensure email is indexed. schema.sql doesn't show constraint on email in manager_roles definition context (need to verify).
CREATE INDEX IF NOT EXISTS idx_manager_roles_email ON public.manager_roles(email);
