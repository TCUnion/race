-- ====================================
-- 腳踏車與保養系統 - 完整資料庫初始化 (v1.0)
-- 包含 bikes 表與所有保養相關表
-- ====================================

-- 1. 建立 Bikes 表 (含新欄位)
CREATE TABLE IF NOT EXISTS public.bikes (
    id TEXT PRIMARY KEY, -- Strava Gear ID (e.g. b2318099)
    athlete_id TEXT REFERENCES public.athletes(id), -- 修改為 TEXT 以匹配 athletes 表
    primary_gear BOOLEAN,
    name TEXT,
    nickname TEXT,
    resource_state INTEGER,
    retired BOOLEAN,
    distance FLOAT, -- In meters
    converted_distance FLOAT, -- In km
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- 新增詳細資訊欄位
    brand TEXT,
    model TEXT,
    groupset_name TEXT,
    shop_name TEXT,
    remarks TEXT,
    price NUMERIC
);

-- 2. 建立保養類型表 (maintenance_types)
CREATE TABLE IF NOT EXISTS maintenance_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_interval_km INTEGER NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0
);

-- 插入預設保養項目
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

-- 3. 建立保養紀錄表 (bike_maintenance)
CREATE TABLE IF NOT EXISTS bike_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_id TEXT NOT NULL REFERENCES bikes(id) ON DELETE CASCADE,
  athlete_id TEXT NOT NULL, -- 修改為 TEXT
  maintenance_type TEXT NOT NULL,
  service_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mileage_at_service DOUBLE PRECISION NOT NULL,
  cost NUMERIC(10,2),
  shop_name TEXT,
  notes TEXT,
  is_diy BOOLEAN DEFAULT false,
  other TEXT, -- 其他欄位
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 建立自訂保養里程設定表 (bike_maintenance_settings)
CREATE TABLE IF NOT EXISTS bike_maintenance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_id TEXT NOT NULL REFERENCES bikes(id) ON DELETE CASCADE,
  maintenance_type_id TEXT NOT NULL REFERENCES maintenance_types(id) ON DELETE CASCADE,
  custom_interval_km INTEGER NOT NULL,
  athlete_id TEXT NOT NULL, -- 修改為 TEXT
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(bike_id, maintenance_type_id)
);

-- 5. 建立索引
CREATE INDEX IF NOT EXISTS idx_bike_maintenance_bike_id ON bike_maintenance(bike_id);
CREATE INDEX IF NOT EXISTS idx_bike_maintenance_athlete_id ON bike_maintenance(athlete_id);
CREATE INDEX IF NOT EXISTS idx_bike_maintenance_settings_bike_id ON bike_maintenance_settings(bike_id);

-- 6. 啟用 RLS
ALTER TABLE bikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE bike_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE bike_maintenance_settings ENABLE ROW LEVEL SECURITY;

-- 7. RLS 政策
-- Bikes
DROP POLICY IF EXISTS "Public read bikes" ON bikes;
CREATE POLICY "Public read bikes" ON bikes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin full access bikes" ON bikes;
CREATE POLICY "Admin full access bikes" ON bikes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Maintenance Types
DROP POLICY IF EXISTS "Allow public read on maintenance_types" ON maintenance_types;
CREATE POLICY "Allow public read on maintenance_types" ON maintenance_types FOR SELECT USING (true);

-- Bike Maintenance
DROP POLICY IF EXISTS "Allow all on bike_maintenance" ON bike_maintenance;
CREATE POLICY "Allow all on bike_maintenance" ON bike_maintenance FOR ALL USING (true) WITH CHECK (true);

-- Bike Maintenance Settings
DROP POLICY IF EXISTS "Allow all on bike_maintenance_settings" ON bike_maintenance_settings;
CREATE POLICY "Allow all on bike_maintenance_settings" ON bike_maintenance_settings FOR ALL USING (true) WITH CHECK (true);
