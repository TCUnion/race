-- =============================================================================
-- Debug: Test Admin Reset Password RPC
-- 用途：手動測試重設密碼函式，確認是否能成功更新
-- =============================================================================

-- 1. 確保加密套件存在 (通常預設有，但防萬一)
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- 2. 直接呼叫 RPC 測試 (假設測試帳號為 samkhlin@gmail.com)
-- 請將 'samkhlin@gmail.com' 替換為實際測試的 Email
DO $$
DECLARE
    result JSONB;
    target_email TEXT := 'samkhlin@gmail.com'; 
    new_test_pass TEXT := 'test123456';
    old_hash TEXT;
    new_hash TEXT;
BEGIN
    -- 記錄舊的 Hash
    SELECT encrypted_password INTO old_hash FROM auth.users WHERE email = target_email;
    RAISE NOTICE 'Old Hash: %', old_hash;

    -- 執行函數
    SELECT public.admin_reset_password_by_email(target_email, new_test_pass) INTO result;
    
    RAISE NOTICE 'RPC Result: %', result;

    -- 檢查新的 Hash
    SELECT encrypted_password INTO new_hash FROM auth.users WHERE email = target_email;
    RAISE NOTICE 'New Hash: %', new_hash;

    IF old_hash IS DISTINCT FROM new_hash THEN
        RAISE NOTICE '✅ Password hash changed successfully!';
    ELSE
        RAISE NOTICE '❌ Password hash did NOT change!';
    END IF;
END $$;
