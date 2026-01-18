-- 新增輪組的輪胎相關欄位
ALTER TABLE public.wheelsets 
ADD COLUMN IF NOT EXISTS tire_brand text,
ADD COLUMN IF NOT EXISTS tire_specs text, -- 例如: 700x25c
ADD COLUMN IF NOT EXISTS tire_type text;  -- 例如: 內胎 (Tube) 或 補胎液 (Tubeless/Sealant)

-- 重新整理 Schema Cache
NOTIFY pgrst, 'reload schema';
