-- Make athlete_id nullable in manager_roles
ALTER TABLE public.manager_roles ALTER COLUMN athlete_id DROP NOT NULL;

-- Ensure email is unique if used as identifier
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_manager_roles_email_unique ON public.manager_roles(email) WHERE email IS NOT NULL;
