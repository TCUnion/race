-- =============================================================================
-- Feature: Admin Reset Password RPC
-- 用途：提供給管理員 (透過 n8n 或直接呼叫) 重設指定使用者的密碼
-- =============================================================================

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
    v_user_id UUID;
BEGIN
    -- 1. 查詢 User ID
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email ILIKE target_email
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User not found'
        );
    END IF;

    -- 2. 更新密碼
    UPDATE auth.users
    SET encrypted_password = crypt(new_password, gen_salt('bf')),
        updated_at = NOW()
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Password updated successfully'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'message', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_password_by_email(TEXT, TEXT) TO service_role;
