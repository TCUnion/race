-- =============================================================================
-- MIGRATION: Add pending_password column for bypass registration
-- 用途：暫存使用者密碼，直到 n8n 流程建立 auth.users 後清除
-- =============================================================================

-- 1. 新增欄位
ALTER TABLE public.manager_roles
ADD COLUMN IF NOT EXISTS pending_password TEXT;

COMMENT ON COLUMN public.manager_roles.pending_password IS 
'暫存密碼。當 n8n 建立 auth.users 帳號後會被清除。';

-- 2. 確認結果
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'manager_roles' AND column_name = 'pending_password';
