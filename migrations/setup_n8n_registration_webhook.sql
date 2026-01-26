-- =============================================================================
-- MIGRATION: Setup n8n Registration Webhook
-- 用途：監聽 auth.users 的 INSERT 事件，並發送 Webhook 到 n8n。
-- =============================================================================

-- 1. 啟用 pg_net 擴充功能 (用於發送 HTTP 請求)
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- 2. 建立觸發函數
CREATE OR REPLACE FUNCTION public.notify_n8n_on_registration()
RETURNS TRIGGER AS $$
DECLARE
    -- 測試用的 n8n Webhook URL (webhook-test 表示開發測試模式)
    webhook_url TEXT := 'https://tcun8n.zeabur.app/webhook-test/supabase-registration'; 
    payload JSONB;
BEGIN
    -- 準備傳送給 n8n 的資料
    payload := jsonb_build_object(
        'event', 'user_created',
        'id', new.id,
        'email', new.email,
        'metadata', new.raw_user_meta_data,
        'timestamp', NOW()
    );

    -- 使用 pg_net 發送異步 POST 請求
    PERFORM
        net.http_post(
            url := webhook_url,
            body := payload,
            headers := '{"Content-Type": "application/json"}'::jsonb
        );

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- 即使發信失敗，也要讓註冊完成 (不影響主流程)
    RAISE WARNING 'Webhook notification failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 綁定觸發器
DROP TRIGGER IF EXISTS tr_notify_n8n_registration ON auth.users;
CREATE TRIGGER tr_notify_n8n_registration
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_n8n_on_registration();

-- 驗證
SELECT 'Webhook trigger setup completed. Please update your URL inside the function if needed.' as status;
