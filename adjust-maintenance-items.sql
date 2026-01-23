-- ==========================================
-- 保養項目清單調整 (v1.1)
-- 目的：移除「全車保養」，新增「煞車油更換」與「補胎液新增/更換」
-- ==========================================

-- 1. 移除全車保養 (full_service)
DELETE FROM maintenance_types WHERE id = 'full_service';

-- 2. 新增 煞車油更換 (brake_fluid)
INSERT INTO maintenance_types (id, name, description, default_interval_km, icon, sort_order)
VALUES ('brake_fluid', '煞車油更換', '建議每 5,000 公里更換以維持煞車手感與安全', 5000, 'droplets', 6)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  default_interval_km = EXCLUDED.default_interval_km,
  sort_order = EXCLUDED.sort_order;

-- 3. 新增 補胎液新增/更換 (tire_sealant)
INSERT INTO maintenance_types (id, name, description, default_interval_km, icon, sort_order)
VALUES ('tire_sealant', '補胎液新增/更換', '建議每 2,000 公里或半年檢查/補充補胎液', 2000, 'beaker', 7)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  default_interval_km = EXCLUDED.default_interval_km,
  sort_order = EXCLUDED.sort_order;

-- 重要：重整 PostgREST 快取以便前端立即看到變更
NOTIFY pgrst, 'reload schema';
