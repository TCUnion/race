-- Add Di2 Charging Maintenance Item
INSERT INTO maintenance_types (id, name, default_interval_km, sort_order)
VALUES ('di2_charging', '電變充電', 1500, 92)
ON CONFLICT (id) DO NOTHING;
