-- ==========================================
-- ROLLBACK SCRIPT: 復原 Linter 警告修復
-- ==========================================

-- ==========================================
-- 1. 復原 Function Search Path Mutable 問題
-- 將 19 個函數的 search_path 恢復為預設 (動態執行時的環境)
-- ==========================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT p.oid::regprocedure AS func_sig
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' 
          AND proname IN (
              'cleanup_expired_tokens', 
              'is_admin', 
              'get_my_strava_id', 
              'admin_reset_password_by_email', 
              'cleanup_expired_binding_sessions', 
              'cleanup_old_rate_limits', 
              'update_athlete_ftp_history', 
              'get_missing_segments', 
              'get_race_leaderboard', 
              'handle_updated_at', 
              'calculate_power_zones', 
              'calculate_normalized_power', 
              'calculate_tss', 
              'analyze_activity_power_distribution', 
              'calculate_hr_zones'
          )
    LOOP
        -- RESET search_path 會將之移除，恢復系統預設
        -- 使用 EXCEPT 區塊，防止權限不足時卡死
        BEGIN
            EXECUTE format('ALTER FUNCTION %s RESET search_path', r.func_sig);
            RAISE NOTICE 'Function search_path reset: %', r.func_sig;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Skipped %: % (You might not be the owner)', r.func_sig, SQLERRM;
        END;
    END LOOP;
END
$$ LANGUAGE plpgsql;

-- ==========================================
-- 2. 復原 Extension in Public 問題
-- ==========================================

-- 將 vector 與 postgis 移回 public schema
ALTER EXTENSION vector SET SCHEMA public;
ALTER EXTENSION postgis SET SCHEMA public;

-- 將資料庫層級的 search_path 恢復原本設定（不包含 extensions）
ALTER DATABASE postgres SET search_path TO "$user", public;

-- 通知 PostgREST 重新載入 schema (避免 API 炸掉)
NOTIFY pgrst, 'reload schema';
