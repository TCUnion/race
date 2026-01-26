-- =============================================================================
-- Feature: Add Contact Info Columns to manager_roles
-- 用途：儲存車店/車隊的聯絡資訊（地址、電話、社群連結）
-- =============================================================================

DO $$
BEGIN
    -- 1. Add 'address' column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'manager_roles' AND column_name = 'address') THEN
        ALTER TABLE public.manager_roles ADD COLUMN address TEXT DEFAULT NULL;
    END IF;

    -- 2. Add 'phone' column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'manager_roles' AND column_name = 'phone') THEN
        ALTER TABLE public.manager_roles ADD COLUMN phone TEXT DEFAULT NULL;
    END IF;

    -- 3. Add 'social_links' column (JSONB for flexibility: facebook, instagram, website, etc.)
    -- Example: {"facebook": "...", "instagram": "...", "website": "..."}
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'manager_roles' AND column_name = 'social_links') THEN
        ALTER TABLE public.manager_roles ADD COLUMN social_links JSONB DEFAULT '{}'::jsonb;
    END IF;

END $$;
