-- =============================================================================
-- DIAGNOSTIC: Check Manager Registration Failures
-- =============================================================================

-- 1. 檢查是否有部分建立的帳號 (存在於 auth.users 但沒有驗證)
SELECT id, email, created_at, last_sign_in_at, confirmed_at, raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 2. 檢查 manager_roles 是否有遺留的重複 Email 導致觸發器失敗
-- (即使 auth.users 成功，若觸發器插入失敗且沒被 catch，也會導致 500)
SELECT id, email, role, shop_name, created_at
FROM public.manager_roles
ORDER BY created_at DESC
LIMIT 5;

-- 3. 檢查是否有其他觸發器在運行
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table, 
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users' AND event_object_schema = 'auth';
