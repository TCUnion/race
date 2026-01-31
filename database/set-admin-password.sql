-- ==========================================
-- 直接設定 Supabase Auth 用戶密碼
-- ==========================================
-- 在 Supabase SQL Editor 中執行

-- 方法 1: 更新密碼（需要先取得 user id）
-- 找到用戶的 UUID
SELECT id, email FROM auth.users WHERE email = 'service@tsu.com.tw';

-- 使用 Supabase 的內建函數更新密碼
-- 注意：這需要在 Supabase Dashboard 的 SQL Editor 中用超級權限執行
UPDATE auth.users 
SET encrypted_password = crypt('您的新密碼', gen_salt('bf'))
WHERE email = 'service@tsu.com.tw';

-- 或者使用 Supabase Admin API（推薦）
-- 在 Supabase Dashboard > SQL Editor 中執行：

-- 方法 2: 使用 Auth Admin 函數（如果可用）
-- SELECT auth.admin_update_user_by_id(
--   'f36a023d-106c-48dc-b01b-0af2ff4f180b',  -- 使用者 UUID
--   jsonb_build_object('password', '您的新密碼')
-- );
