-- 新增保養零件詳細資訊欄位
-- 用於儲存每個保養項目的 品牌(brand)、型號(model) 與 其他資訊(other)
-- 格式範例: [{"type_id": "chain", "brand": "Shimano", "model": "CN-HG901", "other": "116目"}]

ALTER TABLE public.bike_maintenance 
ADD COLUMN IF NOT EXISTS parts_details JSONB DEFAULT '[]'::jsonb;

-- 強制刷新 Schema cache
NOTIFY pgrst, 'reload schema';
