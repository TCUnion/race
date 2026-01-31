-- ==========================================
-- 修復 PostgREST Schema Cache 問題
-- 錯誤：PGRST200 - Could not find a relationship between 'registrations' and 'segments'
-- ==========================================

-- 1. 確認 registrations 表格的外鍵約束存在
-- 如果不存在，需要新增
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'registrations_segment_id_fkey' 
        AND table_name = 'registrations'
    ) THEN
        ALTER TABLE public.registrations
        ADD CONSTRAINT registrations_segment_id_fkey
        FOREIGN KEY (segment_id) REFERENCES public.segments(id);
    END IF;
END $$;

-- 2. 通知 PostgREST 重新載入 Schema Cache
-- 方法一：直接呼叫 pg_notify（Supabase 會自動監聽）
NOTIFY pgrst, 'reload schema';

-- 3. 驗證外鍵約束是否存在
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'registrations';
