-- 修復 Supabase 安全性警告 (Security Issues)
-- 問題: Functions with role mutable search_path
-- 解法: 明確設定 search_path = public

-- 1. 修復 sync_wheelset_mileage 函數
ALTER FUNCTION public.sync_wheelset_mileage() SET search_path = public;

-- 2. 修復 update_updated_at_column 函數 (若存在)
-- 由於 schema.sql 中未明確定義此函數但截圖中有警告，推測是 Supabase 預設或舊 migrations 建立的
-- 若執行失敗表示該函數不存在，可忽略
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
    END IF;
END $$;

-- 強制刷新 Schema cache
NOTIFY pgrst, 'reload schema';
