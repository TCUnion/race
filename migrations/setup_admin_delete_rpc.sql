-- =============================================================================
-- Feature: Admin Delete RPC
-- 用途：提供給 n8n 使用的 RPC 函式，透過 Email 刪除 auth.users 帳號
-- 優點：解決前端可能缺少 user_id 或 ID 不一致的問題
-- =============================================================================

-- 1. 建立刪除函式 (Security Definer 以繞過權限限制)
CREATE OR REPLACE FUNCTION public.admin_delete_user_by_email(target_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_user_id UUID;
    v_deleted_count INT;
BEGIN
    -- 檢查呼叫者權限 (例如：只允許 service_role 或特定管理員)
    -- 這裡假設透過 n8n 使用 Service Role Key 呼叫，因此不做過多限制，但可擴充
    
    -- 1. 查詢 User ID
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email ILIKE target_email -- 修正: ILIKE 是運算子
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'User not found'
        );
    END IF;

    -- 2. 刪除 auth.users 記錄 (Cascade 會自動刪除 manager_roles 等關聯資料)
    DELETE FROM auth.users WHERE id = v_user_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    -- 3. 回傳結果
    RETURN jsonb_build_object(
        'success', true,
        'message', 'User deleted successfully',
        'user_id', v_user_id,
        'deleted_count', v_deleted_count
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'message', SQLERRM
    );
END;
$$;

-- 2. 賦予權限
GRANT EXECUTE ON FUNCTION public.admin_delete_user_by_email(TEXT) TO service_role;
-- 視情況也開放給 authenticated (如果要在前端直接呼叫，需加強 RLS 檢查)
-- GRANT EXECUTE ON FUNCTION public.admin_delete_user_by_email(TEXT) TO authenticated;
