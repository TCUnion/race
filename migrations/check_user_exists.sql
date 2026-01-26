-- 檢查所有使用者，確認是否有 samkhlin 帳號
SELECT id, email, confirmed_at, email_confirmed_at, last_sign_in_at 
FROM auth.users 
WHERE email ILIKE '%samkhlin%'
OR email = 'service@tsu.com.tw';

-- 檢查 manager_roles 是否已有記錄
SELECT * FROM public.manager_roles 
WHERE email ILIKE '%samkhlin%';
