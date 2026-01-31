-- ==========================================
-- 建立 Admin 密碼重設 RPC 函數
-- 用於 n8n webhook 呼叫重設 Supabase Auth 用戶密碼
-- ==========================================

-- 注意：此函數需要 SECURITY DEFINER 權限才能存取 auth.users 表格
-- 必須由 postgres 超級使用者執行

CREATE OR REPLACE FUNCTION public.admin_reset_password_by_email(
    target_email TEXT,
    new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    target_user_id UUID;
    result JSONB;
BEGIN
    -- 1. 查找目標用戶
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = target_email;
    
    IF target_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found with email: ' || target_email
        );
    END IF;
    
    -- 2. 更新密碼
    UPDATE auth.users
    SET 
        encrypted_password = crypt(new_password, gen_salt('bf')),
        updated_at = NOW()
    WHERE id = target_user_id;
    
    -- 3. 回傳成功訊息
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Password updated successfully for ' || target_email,
        'user_id', target_user_id
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- 授權給 service_role 使用
GRANT EXECUTE ON FUNCTION public.admin_reset_password_by_email(TEXT, TEXT) TO service_role;

-- 驗證函數是否建立成功
SELECT proname, prokind FROM pg_proc WHERE proname = 'admin_reset_password_by_email';
