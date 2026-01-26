-- =============================================
-- FIX MANAGER DEFAULT ACTIVE STATE
-- 解決新註冊管理員預設為「啟用」的問題
-- 請將此內容完整複製到 Supabase SQL Editor 執行
-- =============================================

-- 1. 修改 Trigger Function，將預設 is_active 設為 FALSE
CREATE OR REPLACE FUNCTION public.handle_new_manager_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 只有當使用者是透過 Manager 註冊頁面 (帶有 role metadata) 加入時才執行
  IF (new.raw_user_meta_data->>'role') IS NOT NULL THEN
    INSERT INTO public.manager_roles (
      id,
      email,
      role,
      shop_name,
      is_active,
      created_at,
      updated_at
    )
    VALUES (
      new.id, -- 綁定 auth.users 的 UUID
      new.email,
      new.raw_user_meta_data->>'role',
      new.raw_user_meta_data->>'shop_name',
      FALSE, -- 修正：預設為 FALSE (需審核)
      NOW(),
      NOW()
    )
    ON CONFLICT (email) DO UPDATE SET
      role = EXCLUDED.role,
      shop_name = EXCLUDED.shop_name,
      updated_at = NOW(); 
      -- 注意：若重複，不更新 is_active，避免覆蓋已啟用的狀態
      -- 但如果是新註冊，應該是不存在的，所以 INSERT 會生效且為 FALSE
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 嘗試為 email 加入唯一性約束 (若尚未存在)
-- 這能確保不會有重複 email 的管理員資料
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'manager_roles_email_key'
    ) THEN
        ALTER TABLE public.manager_roles ADD CONSTRAINT manager_roles_email_key UNIQUE (email);
    END IF;
EXCEPTION
    WHEN duplicate_table THEN 
        -- 忽略重複約束錯誤
        NULL;
    WHEN others THEN
        -- 若有重複資料導致無法加入約束，則不強制執行，但印出警告
        RAISE NOTICE '無法加入 Unique Email Constraint，可能存在重複資料';
END $$;

-- 3. 將已存在的重複資料 (若原本因 Bug 產生) 清理 (可選，視需求而定)
-- 這裡暫不執行刪除，以免誤刪。

SELECT 'Trigger updated to default is_active = FALSE' as result;
