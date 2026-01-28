-- 修復 wheelsets 資料表缺失欄位與權限問題

-- 1. 補齊缺失的欄位 (包含 active_date 與輪胎資訊)
ALTER TABLE public.wheelsets ADD COLUMN IF NOT EXISTS active_date DATE;
ALTER TABLE public.wheelsets ADD COLUMN IF NOT EXISTS tire_brand TEXT;
ALTER TABLE public.wheelsets ADD COLUMN IF NOT EXISTS tire_specs TEXT;
ALTER TABLE public.wheelsets ADD COLUMN IF NOT EXISTS tire_type TEXT;

-- 2. 重設 RLS 權限 (確保 authenticated 使用者可以 UPDATE)
ALTER TABLE public.wheelsets ENABLE ROW LEVEL SECURITY;

-- 移除舊政策以避免衝突
DROP POLICY IF EXISTS "Admin full access wheelsets" ON public.wheelsets;
DROP POLICY IF EXISTS "Public read wheelsets" ON public.wheelsets;
DROP POLICY IF EXISTS "Allow authenticated all on wheelsets" ON public.wheelsets;

-- 建立新政策：允許登入使用者進行所有操作 (查詢、新增、修改、刪除)
-- 由於應用程式端會根據 athlete_id 過濾，這裡開放 authenticated 角色權限
CREATE POLICY "Allow authenticated all on wheelsets"
ON public.wheelsets
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. 強制刷新 Schema cache
NOTIFY pgrst, 'reload schema';
