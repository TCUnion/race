-- =============================================================================
-- WORKAROUND: Manually Confirm User & Check Role Sync
-- 使用說明：此腳本用於「強制確認」帳號，繞過郵件發送失敗的問題。
-- =============================================================================

-- 1. 檢查剛才註冊的資料是否已同步至 manager_roles
-- 如果這兩條查詢有結果，代表觸發器 (Trigger) 已經成功運作！
SELECT * FROM public.manager_roles 
WHERE email = 'service@tsu.com.tw';

SELECT * FROM public.manager_roles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'service@tsu.com.tw');

-- 2. 強制確認帳號 (改為僅更新 email_confirmed_at，因為 confirmed_at 可能是產製欄位)
-- 執行此段後，您可以直接嘗試登入。
UPDATE auth.users 
SET email_confirmed_at = NOW(),
    last_sign_in_at = NOW(),
    updated_at = NOW()
WHERE email = 'service@tsu.com.tw';

-- 3. 檢查最終狀態
SELECT id, email, email_confirmed_at, confirmed_at, created_at
FROM auth.users 
WHERE email = 'service@tsu.com.tw';
