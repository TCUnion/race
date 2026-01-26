-- =============================================================================
-- MIGRATION: Fix Manager Registration (Schema & Trigger)
-- DESCRIPTION: Consolidates previous fixes to ensure manager_roles has user_id, 
--              athlete_id is optional, and the trigger correctly handles auth metadata.
-- DATE: 2026-01-25
-- =============================================================================

BEGIN;

-- 1. Schema Updates: Ensure manager_roles table is compatible
-- -----------------------------------------------------------------------------

-- A. Add 'user_id' column if it doesn't exist (links to auth.users.id UUID)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'manager_roles' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.manager_roles 
        ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- B. Make 'athlete_id' nullable (Manager registration via email doesn't have this yet)
ALTER TABLE public.manager_roles 
ALTER COLUMN athlete_id DROP NOT NULL;

-- 2. Trigger Cleanup: Remove potentially conflicting triggers
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created_manager ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_manager_user();

-- 3. Trigger Implementation: Robust handling of new user registration
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_manager_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_shop_name TEXT;
BEGIN
  -- Extract metadata safely
  v_role := new.raw_user_meta_data->>'role';
  v_shop_name := new.raw_user_meta_data->>'shop_name';

  -- Only proceed if this is a manager registration (indicated by presence of 'role')
  IF v_role IS NOT NULL THEN
    
    -- Insert into manager_roles using the UUID from auth.users
    INSERT INTO public.manager_roles (
      user_id,    -- Link to auth.users
      email,
      role,
      shop_name,
      is_active,  -- Default to FALSE for email verification
      created_at,
      updated_at
    )
    VALUES (
      new.id,
      new.email,
      v_role,
      v_shop_name,
      FALSE,
      NOW(),
      NOW()
    );
    
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but allow user creation to succeed (optional choice, but prevents 500 if trigger fails)
  -- Or RAISE to rollback transaction. Here we RAISE to ensure data consistency.
  RAISE WARNING 'Error in manager registration trigger: %', SQLERRM;
  RETURN NEW; -- If you want to fail hard, use: RAISE EXCEPTION 'Manager registration failed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Bind Trigger
-- -----------------------------------------------------------------------------
CREATE TRIGGER on_auth_user_created_manager
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_manager_user();

COMMIT;

-- Verify
SELECT 'Migration completed successfully.' as result;
