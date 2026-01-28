
UPDATE manager_roles
SET role = 'admin', is_active = true
WHERE email = 'service@tsu.com.tw';

-- Also check samkhlin to ensure it is NOT admin (should be power_coach or similar)
UPDATE manager_roles
SET role = 'power_coach'
WHERE email = 'samkhlin@gmail.com' AND role = 'admin';
