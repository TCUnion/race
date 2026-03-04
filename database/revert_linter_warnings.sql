-- ==========================================
-- 1. 還原 Extension in Public 問題
-- ==========================================

-- 將資料庫層級的 search_path 還原為預設值
ALTER DATABASE postgres SET search_path TO "$user", public;

-- 將 vector 移回 public schema
ALTER EXTENSION vector SET SCHEMA public;

-- 註: postgis 原先保留在 public 且無法更動 schema，因此這裡不需要還原。

-- ==========================================
-- 2. 還原 Function Search Path Mutable 問題
-- 針對先前修改過的函式，將其 search_path 重設回預設值
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
        BEGIN
            EXECUTE format('ALTER FUNCTION %s RESET search_path', r.func_sig);
            RAISE NOTICE 'Function reset: %', r.func_sig;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Skipped %: % (You might not be the owner)', r.func_sig, SQLERRM;
        END;
    END LOOP;
END
$$ LANGUAGE plpgsql;

-- 重新載入 PostgREST schema 快取
NOTIFY pgrst, 'reload schema';
