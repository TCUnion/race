-- Add real_name column to manager_roles table
ALTER TABLE manager_roles 
ADD COLUMN IF NOT EXISTS real_name TEXT;

-- Add comment
COMMENT ON COLUMN manager_roles.real_name IS '管理員真實姓名';

-- Update RLS policies to allow update of real_name (if necessary, though usually UPDATE policies cover all columns)
-- Just ensuring the column is available is the main step.
