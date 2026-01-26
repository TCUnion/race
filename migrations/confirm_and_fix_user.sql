-- =============================================================================
-- MIGRATION: Manual User Confirmation & Role Fix
-- 用途：當註冊遇到 "Error sending confirmation email" 時執行此腳本。
--      它會強制確認該 Email，並補上遺失的管理員權限。
-- =============================================================================

-- 請將下方的 Email 替換成您剛剛註冊失敗的 Email
DO $$
DECLARE
    target_email TEXT := 'samkhlin@gmail.com'; -- <--- 修改這裡
    v_user_id UUID;
BEGIN
    -- 1. 取得使用者 ID 並強制確認
    UPDATE auth.users 
    SET email_confirmed_at = NOW(), 
        last_sign_in_at = NOW()
    WHERE email = target_email
    RETURNING id INTO v_user_id;

    -- 2. 如果使用者存在，確保他具備管理員權限
    IF v_user_id IS NOT NULL THEN
        -- 補上 manager_roles 記錄 (如果觸發器因 500 錯誤沒跑完)
        INSERT INTO public.manager_roles (user_id, email, role, is_active, shop_name, created_at, updated_at)
        VALUES (
            v_user_id, 
            target_email, 
            'shop_owner', -- 預設角色
            true, 
            '預設車店', 
            NOW(), 
            NOW()
        )
        ON CONFLICT (email) DO UPDATE 
        SET is_active = true, 
            user_id = v_user_id,
            updated_at = NOW();

        RAISE NOTICE '使用者 % (ID: %) 已成功強制確認並補全權限。', target_email, v_user_id;
    ELSE
        RAISE EXCEPTION '找不到 Email 為 % 的使用者，請確認是否已點擊註冊按鈕。', target_email;
    END IF;
END $$;
