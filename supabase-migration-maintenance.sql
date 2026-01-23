-- ====================================
-- 腳踏車保養紀錄系統 - 資料庫 Migration (等冪版本 v1.1)
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
  ('brake_pads', '來令片/煞車皮更換', '建議每 5,000 公里更換', 5000, 'disc', 2),
  ('tires', '輪胎更換', '建議每 8,000 公里更換', 8000, 'circle', 3),
  ('bar_tape', '把帶更換', '建議每 4,000 公里更換', 4000, 'grip-horizontal', 10),
  ('full_service', '全車保養', '全車清潔與功能檢查', 2000, 'wrench', 5),
  ('gear_replacement', '器材更換', '零件損壞更換', 0, 'package', 11),
  ('chain_oil', '鏈條上油', '定期清潔與上油', 500, 'droplets', 0)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description;

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

-- 重要：移除舊版的外鍵約束，以支援多選項目（如：全車保養 (鏈條, 煞車)）
ALTER TABLE bike_maintenance DROP CONSTRAINT IF EXISTS bike_maintenance_maintenance_type_fkey;

-- 確認 other 欄位存在
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bike_maintenance' AND column_name='other') THEN
    ALTER TABLE bike_maintenance ADD COLUMN other TEXT;
  END IF;
END $$;

-- 4. 建立自訂保養里程設定表
CREATE TABLE IF NOT EXISTS bike_maintenance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_id TEXT NOT NULL REFERENCES bikes(id) ON DELETE CASCADE,
  maintenance_type_id TEXT NOT NULL REFERENCES maintenance_types(id) ON DELETE CASCADE,
  custom_interval_km INTEGER NOT NULL,
  athlete_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(bike_id, maintenance_type_id)
);

-- 5. 建立索引
CREATE INDEX IF NOT EXISTS idx_bike_maintenance_bike_id ON bike_maintenance(bike_id);
CREATE INDEX IF NOT EXISTS idx_bike_maintenance_athlete_id ON bike_maintenance(athlete_id);
CREATE INDEX IF NOT EXISTS idx_bike_maintenance_settings_bike_id ON bike_maintenance_settings(bike_id);

-- 6. 啟用 RLS
ALTER TABLE maintenance_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE bike_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE bike_maintenance_settings ENABLE ROW LEVEL SECURITY;

-- 7. RLS 政策 (先刪除後建立以防報錯)
DROP POLICY IF EXISTS "Allow public read on maintenance_types" ON maintenance_types;
CREATE POLICY "Allow public read on maintenance_types" ON maintenance_types
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all on bike_maintenance" ON bike_maintenance;
CREATE POLICY "Allow all on bike_maintenance" ON bike_maintenance
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on bike_maintenance_settings" ON bike_maintenance_settings;
CREATE POLICY "Allow all on bike_maintenance_settings" ON bike_maintenance_settings
  FOR ALL USING (true) WITH CHECK (true);

-- ====================================
-- 執行完成後，重新整理前端頁面即可使用保養紀錄功能
-- ====================================
