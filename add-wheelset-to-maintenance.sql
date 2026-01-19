-- ==========================================
-- 1. 新增維修紀錄與輪組的關聯欄位
-- ==========================================
ALTER TABLE public.bike_maintenance 
ADD COLUMN IF NOT EXISTS wheelset_id UUID REFERENCES public.wheelsets(id);

-- ==========================================
-- 2. 確保零件詳細資訊欄位存在 (JSONB 格式)
-- ==========================================
ALTER TABLE public.bike_maintenance 
ADD COLUMN IF NOT EXISTS parts_details JSONB DEFAULT '[]'::jsonb;

-- ==========================================
-- 3. 強制刷新 PostgREST Schema Cache
-- ==========================================
-- 透過修改資料表註解或發送 NOTIFY 來觸發刷新
COMMENT ON TABLE public.bike_maintenance IS '腳踏車保養紀錄表 (已整合輪組連動)';
NOTIFY pgrst, 'reload schema';
