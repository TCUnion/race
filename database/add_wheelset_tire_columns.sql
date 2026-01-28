-- 新增輪組缺少的輪胎相關欄位
ALTER TABLE public.wheelsets 
ADD COLUMN IF NOT EXISTS tire_brand text,
ADD COLUMN IF NOT EXISTS tire_specs text,
ADD COLUMN IF NOT EXISTS tire_type text,
ADD COLUMN IF NOT EXISTS active_date text;

-- 更新 RLS 以確保欄位可訪問 (雖然通常 ALTER TABLE 會繼承權限，但保險起見)
COMMENT ON COLUMN public.wheelsets.tire_brand IS '輪胎品牌';
COMMENT ON COLUMN public.wheelsets.tire_specs IS '輪胎規格/型號';
COMMENT ON COLUMN public.wheelsets.tire_type IS '輪胎類型';
COMMENT ON COLUMN public.wheelsets.active_date IS '啟用日期';
