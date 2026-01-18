-- 強制修復 Supabase 安全性警告 (V2)
-- 使用 CREATE OR REPLACE 與明確的 ALTER 指令

-- 1. 重建 sync_wheelset_mileage 並直接內建 search_path 設定
CREATE OR REPLACE FUNCTION public.sync_wheelset_mileage()
RETURNS TRIGGER AS $$
DECLARE
    mileage_diff float8;
BEGIN
    IF NEW.active_wheelset_id IS NOT NULL AND NEW.distance IS DISTINCT FROM OLD.distance THEN
        mileage_diff := NEW.distance - OLD.distance;
        UPDATE public.wheelsets
        SET distance = distance + mileage_diff,
            updated_at = now()
        WHERE id = NEW.active_wheelset_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp; -- 關鍵修復：明確指定搜尋路徑

-- 2. 強制修復 update_updated_at_column
-- 這是常見的 moddatetime 擴充功能函數
DO $$
BEGIN
    -- 嘗試找出並修復該函數，無論它在哪個 schema (通常在 public)
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
    END IF;
END $$;

-- 3. 通知 PostgREST 重載 Schema (確保 API 立即生效)
NOTIFY pgrst, 'reload schema';
