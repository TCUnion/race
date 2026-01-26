-- =============================================================================
-- DIAGNOSTIC: Check Webhook Execution Status
-- 用途：檢查 pg_net 插件是否成功發送請求，以及是否有錯誤。
-- =============================================================================

-- 1. 查看 net schema 下所有表格及其欄位資訊
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_schema = 'net'
ORDER BY table_name, ordinal_position;

-- 2. 檢查觸發器是否真的存在於 auth.users
SELECT tgname, tgenabled, tgtype
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass
AND tgname = 'tr_notify_n8n_registration';

-- 3. 測試：直接手動觸發一次 HTTP POST (不透過註冊)
-- 執行後請立即查看第 1 點的結果
SELECT net.http_post(
    url := 'https://tcun8n.zeabur.app/webhook-test/supabase-registration',
    body := '{"test": "manual_trigger"}'::jsonb
);
