
-- Update check constraint for manager_roles.role
ALTER TABLE public.manager_roles DROP CONSTRAINT IF EXISTS manager_roles_role_check;

ALTER TABLE public.manager_roles 
ADD CONSTRAINT manager_roles_role_check 
CHECK (role IN ('admin', 'shop_owner', 'team_coach', 'power_coach'));

-- Now update the role
UPDATE manager_roles
SET role = 'admin', is_active = true
WHERE email = 'service@tsu.com.tw';

UPDATE manager_roles
SET role = 'power_coach'
WHERE email = 'samkhlin@gmail.com' AND role = 'admin';
