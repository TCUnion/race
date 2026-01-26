-- =============================================================================
-- FINAL REPAIR: Clear All Potential 500 Blocks
-- =============================================================================

-- 1. 查看系統核心：目前哪些觸發器還活著？
-- 特別注意是否有掛在 auth.users 卻搜尋不到的
SELECT event_object_schema, event_object_table, trigger_name, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users' OR event_object_table = 'manager_roles';

-- 2. 強力清除：殺死所有已知的自定義觸發器與相關函數
DROP TRIGGER IF EXISTS tr_notify_n8n_registration ON auth.users;
DROP TRIGGER IF EXISTS tr_notify_n8n_manager_roles ON public.manager_roles;
DROP TRIGGER IF EXISTS on_auth_user_created_manager ON auth.users;
DROP TRIGGER IF EXISTS tr_sync_manager_registration ON auth.users;

DROP FUNCTION IF EXISTS public.handle_new_manager_user() CASCADE;
DROP FUNCTION IF EXISTS public.notify_n8n_on_registration() CASCADE;

-- 3. 欄位鬆綁：確保 manager_roles 不會因為缺少某些欄位而崩潰
ALTER TABLE public.manager_roles ALTER COLUMN athlete_id DROP NOT NULL;
ALTER TABLE public.manager_roles ALTER COLUMN shop_name DROP NOT NULL;
ALTER TABLE public.manager_roles ALTER COLUMN user_id DROP NOT NULL;

-- 4. 再次清除測試資料 (註冊失敗通常也會留下 partial 資料)
DELETE FROM auth.users WHERE email IN ('service@tsu.com.tw', 'samkhlin@gmail.com');
DELETE FROM public.manager_roles WHERE email IN ('service@tsu.com.tw', 'samkhlin@gmail.com');

-- 5. 驗證 pg_net 狀態
SELECT * FROM pg_extension WHERE extname = 'pg_net';

-- 結論
SELECT '清理完成。請重新嘗試註冊，並觀察前端顯示的原始錯誤訊息。' as status;
