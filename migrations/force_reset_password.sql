-- =============================================================================
-- FIX: Force Reset Password & Confirmed Status
-- 用途：解決登入時出現 "Invalid login credentials" 的問題。
-- =============================================================================

-- 1. 查看使用者目前狀態
SELECT id, email, email_confirmed_at, last_sign_in_at 
FROM auth.users 
WHERE email = 'service@tsu.com.tw';

-- 2. 強制更新密碼與驗證狀態
-- 注意：這是直接操作資料庫密碼雜湊，最為保險。
-- 這裡將密碼統一設為：sam123456 (您可以自行修改)
UPDATE auth.users 
SET 
    encrypted_password = crypt('sam123456', gen_salt('bf')), 
    email_confirmed_at = NOW(),
    updated_at = NOW(),
    last_sign_in_at = NOW(),
    raw_app_meta_data = '{"provider":"email","providers":["email"]}',
    raw_user_meta_data = '{"role":"shop_owner","shop_name":"TSU 測試中心"}'
WHERE email = 'service@tsu.com.tw';

-- 3. 確保管理員權限也已同步
INSERT INTO public.manager_roles (user_id, email, role, shop_name, is_active)
SELECT id, email, 'shop_owner', 'TSU 測試中心', true
FROM auth.users
WHERE email = 'service@tsu.com.tw'
ON CONFLICT (email) DO UPDATE 
SET 
    user_id = EXCLUDED.user_id,
    is_active = true,
    updated_at = NOW();

SELECT '使用者 service@tsu.com.tw 的密碼已強力重設為 sam123456 並已啟用。' as status;
