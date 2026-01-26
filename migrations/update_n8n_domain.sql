-- =============================================================================
-- MIGRATION: Update n8n Domain to service.criterium.tw
-- 用途：更新所有 Webhook 觸發器與測試函式，使用新的域名 service.criterium.tw
-- =============================================================================

-- 1. 更新通知函式
CREATE OR REPLACE FUNCTION public.notify_n8n_on_registration()
RETURNS TRIGGER AS $$
DECLARE
    -- 更新為新域名
    webhook_url TEXT := 'https://service.criterium.tw/webhook/supabase-registration'; 
    payload JSONB;
BEGIN
    BEGIN
        -- 準備資料
        payload := jsonb_build_object(
            'event', 'user_created',
            'email', new.email,
            'role', new.role,
            'shop_name', new.shop_name,
            'timestamp', NOW()
        );

        -- 發送 POST
        PERFORM net.http_post(
            url := webhook_url,
            body := payload,
            headers := '{"Content-Type": "application/json"}'::jsonb
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Webhook failed: %', SQLERRM;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 測試新域名連線
-- 這會發送一個測試請求給新的 n8n 網址，請檢查 n8n 是否收到
SELECT net.http_post(
    url := 'https://service.criterium.tw/webhook/supabase-registration',
    body := '{"test": "domain_update_test"}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb
);

SELECT 'Webhook domain updated to service.criterium.tw.' as status;
