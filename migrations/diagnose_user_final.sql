-- =============================================================================
-- DIAGNOSTIC: Check User Record Details
-- 用途：深入檢查 service@tsu.com.tw 在資料庫中的完整狀況。
-- =============================================================================

-- 1. 檢查使用者是否存在
SELECT count(*) FROM auth.users WHERE email = 'service@tsu.com.tw';

-- 2. 查看所有欄位值 (這能幫我們確認 email_confirmed_at 是否正確)
SELECT 
    id, 
    email, 
    encrypted_password, 
    email_confirmed_at, 
    confirmed_at, 
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data
FROM auth.users 
WHERE email = 'service@tsu.com.tw';

-- 3. 查看 pgcrypto 擴充功能是否存在 (密碼加密需要它)
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';
