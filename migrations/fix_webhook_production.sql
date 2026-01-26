-- =============================================================================
-- REPAIR: Re-enable Webhook & Update to Production URL
-- 用途：確保註冊通知正確發送到 n8n 的生產環境路徑。
-- =============================================================================

-- 1. 更新函式：換成生產環境 URL (去掉 -test)，並加入異常隔離
CREATE OR REPLACE FUNCTION public.notify_n8n_on_registration()
RETURNS TRIGGER AS $$
DECLARE
    -- 生產環境 Webhook URL
    webhook_url TEXT := 'https://tcun8n.zeabur.app/webhook/supabase-registration'; 
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

-- 2. 重新綁定觸發器到 manager_roles (最穩定)
DROP TRIGGER IF EXISTS tr_notify_n8n_manager_roles ON public.manager_roles;
CREATE TRIGGER tr_notify_n8n_manager_roles
    AFTER INSERT ON public.manager_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_n8n_on_registration();

-- 3. 連線測試：直接從資料庫發送一筆資料給 n8n
-- 請在執行後回到 n8n 檢查是否有新的「生產環境」執行紀錄
SELECT net.http_post(
    url := 'https://tcun8n.zeabur.app/webhook/supabase-registration',
    body := '{"test": "production_url_test"}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb
);

SELECT 'Webhook 已切換至生產環境並重新啟用。請檢查 n8n 執行紀錄。' as status;
