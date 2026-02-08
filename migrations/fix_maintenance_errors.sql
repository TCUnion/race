-- 1. Fix the missing default value for the ID column
ALTER TABLE bike_maintenance ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2. List all triggers on the bike_maintenance table to identify the problematic one
SELECT 
    event_object_table as table_name,
    trigger_name
FROM 
    information_schema.triggers
WHERE 
    event_object_table = 'bike_maintenance';

-- 3. (Optional) If you see a trigger related to active_wheelset, you can try to drop it:
-- DROP TRIGGER IF EXISTS [trigger_name] ON bike_maintenance;
