
-- Fix permissions and add column
-- Run this in Supabase SQL Editor

-- 1. Reset role to ensure we have permissions (try postgres or service_role)
SET ROLE postgres;

-- 2. Add the column safely
ALTER TABLE public.segments ADD COLUMN IF NOT EXISTS team_name TEXT;
