-- ==========================================
-- 保養項目清單調整 (v2)
-- 目的：移除「輪框檢查」、「變速調整」，新增電池電量相關項目
-- ==========================================

-- 1. 移除取消的項目
DELETE FROM maintenance_types WHERE id IN ('wheel_check', 'gear_adjustment');

-- 2. 新增 功率計換電池/充電
INSERT INTO maintenance_types (id, name, description, default_interval_km, icon, sort_order)
VALUES ('power_meter_battery', '功率計換電池/充電', '建議定期檢查電量或是充電', 3000, 'zap', 20)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  default_interval_km = EXCLUDED.default_interval_km;

-- 3. 新增 心跳帶換電池/充電
INSERT INTO maintenance_types (id, name, description, default_interval_km, icon, sort_order)
VALUES ('hrm_battery', '心跳帶換電池/充電', '建議定期檢查電量或是充電', 3000, 'activity', 21)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  default_interval_km = EXCLUDED.default_interval_km;

-- 4. 新增 電變甩把換電池
INSERT INTO maintenance_types (id, name, description, default_interval_km, icon, sort_order)
VALUES ('di2_shifter_battery', '電變甩把換電池', 'CR2032/1632 電池更換', 5000, 'battery', 22)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  default_interval_km = EXCLUDED.default_interval_km;

-- 重整 PostgREST 快取
NOTIFY pgrst, 'reload schema';
