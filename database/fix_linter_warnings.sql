-- ==========================================
-- 1. 修正 Extension in Public 問題
-- ==========================================

-- 建立獨立的 extensions schema（如果尚不存在）
CREATE SCHEMA IF NOT EXISTS extensions;

-- 確保資料庫層級的 search_path 包含 extensions，避免移出 public 後應用程式找不到相關型別
-- 注意：Supabase 預設資料庫名稱通常為 postgres
ALTER DATABASE postgres SET search_path TO "$user", public, extensions;

-- 將 vector 移至 extensions schema
-- (若原先有 View 或 Function 直指 public.geometry 等明確路徑，可能需要手動修改，但 Supabase 預設通常支援此操作)
ALTER EXTENSION vector SET SCHEMA extensions;

-- 注意：postgis 擴充套件不支援 SET SCHEMA 語法。
-- 若要將 postgis 移出 public，必須完全 DROP 後重新 CREATE EXTENSION postgis WITH SCHEMA extensions;
-- 但這會導致所有依賴 geometry 的資料表欄位被刪除 (Cascade)！
-- 因此我們將保留 postgis 於 public schema，請忽略 Supabase 對 postgis 的 Linter 警告。


-- ==========================================
-- 2. 修正 Function Search Path Mutable 問題
-- 針對 Linter 警告提到的 19 個函式
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
        -- 作法 A: 綁定明確的安全路徑 (包含 public 與 extensions)，避免函式內部缺少前綴而報錯
        -- 加入 BEGIN ... EXCEPTION 區塊，防止特定函數因擁有者不同而導致整個腳本中斷
        BEGIN
            EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions', r.func_sig);
            RAISE NOTICE 'Function altered: %', r.func_sig;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Skipped %: % (You might not be the owner)', r.func_sig, SQLERRM;
        END;
    END LOOP;
END
$$ LANGUAGE plpgsql;

-- 重新載入 PostgREST schema 快取
NOTIFY pgrst, 'reload schema';
