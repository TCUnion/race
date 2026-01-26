-- =============================================================================
-- FINAL FIX: Force Enable Manager Account
-- 執行後請使用正確的 Email 與您設定的密碼登入。
-- =============================================================================

-- 1. 先確保 manager_roles 的 email 具備唯一性約束 (否則 ON CONFLICT 會失敗)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'manager_roles_email_key'
    ) THEN
        ALTER TABLE public.manager_roles ADD CONSTRAINT manager_roles_email_key UNIQUE (email);
    END IF;
END $$;

-- 2. 強制插入或更新管理者角色
INSERT INTO public.manager_roles (email, role, is_active, shop_name, created_at, updated_at)
VALUES ('service@tsu.com.tw', 'shop_owner', true, 'TSU 管理測試', NOW(), NOW())
ON CONFLICT (email) DO UPDATE 
SET is_active = true, 
    role = 'shop_owner', 
    updated_at = NOW();

-- 3. 同步更新 auth.users 的狀態與 metadata
-- 將 user 設為已驗證，並注入管理員 metadata
UPDATE auth.users 
SET email_confirmed_at = NOW(), 
    last_sign_in_at = NOW(),
    raw_user_meta_data = 
        coalesce(raw_user_meta_data, '{}'::jsonb) || 
        '{"role": "shop_owner", "shop_name": "TSU 管理測試"}'::jsonb
WHERE email = 'service@tsu.com.tw';

-- 4. 驗證最終權限狀態
SELECT u.id as user_id, m.email, m.role, m.is_active, u.email_confirmed_at, u.confirmed_at 
FROM public.manager_roles m
JOIN auth.users u ON m.email = u.email
WHERE m.email = 'service@tsu.com.tw';
