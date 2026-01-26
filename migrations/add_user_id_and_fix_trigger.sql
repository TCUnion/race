-- =========================================================
-- 嚴重錯誤修復: 解決 ID 型別不符 (UUID vs BigInt) 導致的 500 錯誤
-- =========================================================

-- 1. 修正表格結構
-- 由於 manager_roles.id 是 BigInt (自動遞增)，不能存放 UUID。
-- 我們需要新增一個 `user_id` 欄位來存放 auth.users 的主要 UUID。
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'manager_roles' AND column_name = 'user_id') THEN
        ALTER TABLE public.manager_roles ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 2. 確保 athlete_id 不是必填 (再次確認)
ALTER TABLE public.manager_roles ALTER COLUMN athlete_id DROP NOT NULL;

-- 3. 重建 Trigger Function (修正寫入邏輯)
CREATE OR REPLACE FUNCTION public.handle_new_manager_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 只有當使用者是透過 Manager 註冊頁面 (帶有 role metadata) 加入時才執行
  IF (new.raw_user_meta_data->>'role') IS NOT NULL THEN
    INSERT INTO public.manager_roles (
      user_id,    -- 寫入新的關聯欄位
      email,
      role,
      shop_name,
      is_active,
      created_at,
      updated_at
    )
    VALUES (
      new.id,     -- auth.users 的 UUID
      new.email,
      new.raw_user_meta_data->>'role',
      new.raw_user_meta_data->>'shop_name',
      TRUE,
      NOW(),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 重新綁定 Trigger (若已被刪除或需要更新)
DROP TRIGGER IF EXISTS on_auth_user_created_manager ON auth.users;
CREATE TRIGGER on_auth_user_created_manager
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_manager_user();

-- 顯示執行結果
SELECT 'Fix applied successfully: Added user_id and updated trigger' as result;
