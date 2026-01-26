-- =============================================================================
-- FIXED: Backfill missing user_id in manager_roles
-- 用途：修復 manager_roles 表中 user_id 為 NULL 的資料
-- 原因：舊資料或匯入資料缺失導致前端無法取得 user_id，進而無法執行刪除 Webhook
-- =============================================================================

DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- 1. 使用 Email 進行關聯更新
    WITH matched_users AS (
        SELECT 
            mr.id as role_id,
            au.id as auth_user_id
        FROM public.manager_roles mr
        JOIN auth.users au ON LOWER(mr.email) = LOWER(au.email)
        WHERE mr.user_id IS NULL
    )
    UPDATE public.manager_roles mr
    SET user_id = mu.auth_user_id,
        updated_at = NOW()
    FROM matched_users mu
    WHERE mr.id = mu.role_id;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RAISE NOTICE '已修復 % 筆管理員資料的 user_id', updated_count;
END $$;

-- 2. 驗證修復結果
SELECT id, email, role, user_id, is_active 
FROM public.manager_roles 
WHERE user_id IS NULL;
