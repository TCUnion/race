-- ====================================
-- 腳踏車保養紀錄系統 - 資料庫 Migration (等冪版本)
-- 請在 Zeabur Supabase Studio SQL Editor 中執行此腳本
-- ====================================

-- 1. 建立保養類型表（預設項目）
CREATE TABLE IF NOT EXISTS maintenance_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_interval_km INTEGER NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0
);

-- 2. 插入預設保養項目
INSERT INTO maintenance_types (id, name, description, default_interval_km, icon, sort_order) VALUES
  ('chain', '鏈條更換', '建議每 3,000 公里更換', 3000, 'link', 1),
  ('brake_pads', '煞車皮更換', '建議每 5,000 公里更換', 5000, 'disc', 2),
  ('tires', '輪胎更換', '建議每 8,000 公里更換', 8000, 'circle', 3),
  ('derailleur', '變速調整', '建議每 1,000 公里調整', 1000, 'settings', 4),
  ('full_service', '全車保養', '建議每 2,000 公里保養', 2000, 'wrench', 5),
  ('pedals', '踏板保養', '建議每 5,000 公里保養', 5000, 'footprints', 6),
  ('wheels', '輪框檢查', '建議每 3,000 公里檢查', 3000, 'target', 7),
  ('cables', '線組更換', '建議每 6,000 公里更換', 6000, 'cable', 8),
  ('cassette', '飛輪更換', '建議每 10,000 公里更換', 10000, 'cog', 9),
  ('bar_tape', '把帶更換', '建議每 4,000 公里更換', 4000, 'grip-horizontal', 10)
ON CONFLICT (id) DO NOTHING;

-- 新增保養項目 (針對使用者的新需求)
INSERT INTO maintenance_types (id, name, description, default_interval_km, icon, sort_order) VALUES
  ('chain_oil', '鏈條上油', '定期清潔與上油', 500, 'droplets', 0),
  ('gear_replacement', '器材更換', '零件損壞更換', 0, 'package', 11)
ON CONFLICT (id) DO NOTHING;

-- 3. 建立保養紀錄表
CREATE TABLE IF NOT EXISTS bike_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_id TEXT NOT NULL REFERENCES bikes(id) ON DELETE CASCADE,
  athlete_id BIGINT NOT NULL,
  maintenance_type TEXT NOT NULL, -- 取消 REFERENCES 以支援多選與自訂字串
  service_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mileage_at_service DOUBLE PRECISION NOT NULL,
  cost NUMERIC(10,2),
  shop_name TEXT,
  notes TEXT,
  is_diy BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 確認 other 欄位存在
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bike_maintenance' AND column_name='other') THEN
    ALTER TABLE bike_maintenance ADD COLUMN other TEXT;
  END IF;
END $$;

-- 4. 建立索引
CREATE INDEX IF NOT EXISTS idx_bike_maintenance_bike_id ON bike_maintenance(bike_id);
CREATE INDEX IF NOT EXISTS idx_bike_maintenance_athlete_id ON bike_maintenance(athlete_id);

-- 5. 啟用 RLS
ALTER TABLE maintenance_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE bike_maintenance ENABLE ROW LEVEL SECURITY;

-- 6. RLS 政策 (先刪除後建立以防報錯)
DROP POLICY IF EXISTS "Allow public read on maintenance_types" ON maintenance_types;
CREATE POLICY "Allow public read on maintenance_types" ON maintenance_types
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all on bike_maintenance" ON bike_maintenance;
CREATE POLICY "Allow all on bike_maintenance" ON bike_maintenance
  FOR ALL USING (true) WITH CHECK (true);

-- ====================================
-- 執行完成後，重新整理前端頁面即可使用保養紀錄功能
-- ====================================
