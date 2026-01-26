-- Drop existing check constraint if exists
ALTER TABLE public.manager_roles DROP CONSTRAINT IF EXISTS manager_roles_role_check;

-- Add new check constraint with updated roles
ALTER TABLE public.manager_roles 
ADD CONSTRAINT manager_roles_role_check 
CHECK (role IN ('shop_owner', 'team_leader', 'technician', 'team_coach', 'power_coach'));
