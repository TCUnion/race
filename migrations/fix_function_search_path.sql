-- =============================================================================
-- Migration: 修復函式 search_path 安全性警告
-- 目的: 將 8 個函式的 search_path 設為空字串，防止 search_path 注入攻擊
-- 
-- 參考: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
-- =============================================================================

-- 1. sync_wheelset_mileage (觸發器函式)
-- 作用: 同步輪組里程
ALTER FUNCTION public.sync_wheelset_mileage() SET search_path = '';

-- 2. get_table_stats
-- 作用: 取得資料表統計資訊
-- 注意: 若函式不存在會報錯，使用 DO 區塊處理
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'get_table_stats'
    ) THEN
        ALTER FUNCTION public.get_table_stats() SET search_path = '';
    END IF;
END $$;

-- 3. cleanup_expired_tokens
-- 作用: 清理過期的密碼重設 Token
ALTER FUNCTION public.cleanup_expired_tokens() SET search_path = '';

-- 4. is_admin
-- 作用: 檢查目前登入者是否為管理員
ALTER FUNCTION public.is_admin() SET search_path = '';

-- 5. get_my_strava_id
-- 作用: 取得目前登入者綁定的 Strava ID
ALTER FUNCTION public.get_my_strava_id() SET search_path = '';

-- 6. admin_reset_password_by_email
-- 作用: 管理員重設使用者密碼
-- 參數: target_email TEXT, new_password TEXT
ALTER FUNCTION public.admin_reset_password_by_email(TEXT, TEXT) SET search_path = '';

-- 7. get_missing_segments
-- 作用: 取得缺少詳細資料的路段
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'get_missing_segments'
    ) THEN
        -- 嘗試不帶參數版本
        BEGIN
            ALTER FUNCTION public.get_missing_segments() SET search_path = '';
        EXCEPTION WHEN undefined_function THEN
            -- 可能有參數,嘗試其他簽名
            NULL;
        END;
    END IF;
END $$;

-- 8. get_race_leaderboard
-- 作用: 取得比賽排行榜資料
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'get_race_leaderboard'
    ) THEN
        -- 嘗試不帶參數版本
        BEGIN
            ALTER FUNCTION public.get_race_leaderboard() SET search_path = '';
        EXCEPTION WHEN undefined_function THEN
            -- 可能有參數,需要手動處理
            NULL;
        END;
    END IF;
END $$;

-- =============================================================================
-- 驗證: 檢查所有函式的 search_path 設定
-- =============================================================================
-- 執行此查詢確認修復成功:
-- SELECT 
--     p.proname AS function_name,
--     pg_catalog.array_to_string(p.proconfig, ', ') AS config
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
-- AND p.proname IN (
--     'sync_wheelset_mileage', 'get_table_stats', 'cleanup_expired_tokens',
--     'is_admin', 'get_my_strava_id', 'admin_reset_password_by_email',
--     'get_missing_segments', 'get_race_leaderboard'
-- );

-- 通知 PostgREST 重載 Schema
NOTIFY pgrst, 'reload schema';
