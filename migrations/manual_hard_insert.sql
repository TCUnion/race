-- =============================================================================
-- FINAL ATTEMPT: Manual Hard-INSERT (No Triggers)
-- 用途：繞過所有不穩定的觸發器與郵件邏輯，直接在資料庫手動釘入使用者。
-- =============================================================================

-- 1. 徹底清除所有觸發器 (避免干擾手動插入)
DROP TRIGGER IF EXISTS on_auth_user_created_manager ON auth.users;
DROP TRIGGER IF EXISTS tr_notify_n8n_registration ON auth.users;
DROP TRIGGER IF EXISTS tr_notify_n8n_manager_roles ON public.manager_roles;

-- 2. 清除殘留與錯誤的帳號
DELETE FROM auth.users WHERE email = 'service@tsu.com.tw';
DELETE FROM public.manager_roles WHERE email = 'service@tsu.com.tw';

-- 3. 手動插入 auth.users
-- 使用最通用的欄位設定，確保自建 Supabase 也能相容
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'service@tsu.com.tw',
    crypt('sam123456', gen_salt('bf')), -- 密碼固定為 sam123456
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"role":"shop_owner","shop_name":"TSU 服務中心"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
);

-- 4. 手動插入 manager_roles 權限 (直接關聯剛剛插入的 ID)
INSERT INTO public.manager_roles (user_id, email, role, shop_name, is_active)
SELECT id, email, 'shop_owner', 'TSU 服務中心', true
FROM auth.users
WHERE email = 'service@tsu.com.tw';

-- 驗證
SELECT id, email, email_confirmed_at FROM auth.users WHERE email = 'service@tsu.com.tw';
SELECT * FROM public.manager_roles WHERE email = 'service@tsu.com.tw';
