-- Add BB Maintenance Item
INSERT INTO maintenance_types (id, name, default_interval_km, sort_order)
VALUES ('bottom_bracket', 'BB保養更換', 5000, 90)
ON CONFLICT (id) DO NOTHING;
