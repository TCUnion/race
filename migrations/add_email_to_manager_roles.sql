-- Add email column to manager_roles used for connecting Supabase Auth
ALTER TABLE public.manager_roles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_manager_roles_email ON public.manager_roles(email);

-- Comment
COMMENT ON COLUMN public.manager_roles.email IS 'Linked Supabase Auth email for password login';
