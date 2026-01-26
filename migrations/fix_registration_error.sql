-- 修復註冊時的 500 錯誤 (Error sending confirmation email)
-- 原因：註冊時 Trigger 嘗試寫入 manager_roles，但 athlete_id 為必填 (NOT NULL)，導致交易失敗。

-- 1. 將 athlete_id 設為可空 (Nullable)，支援純 Email 註冊
ALTER TABLE public.manager_roles ALTER COLUMN athlete_id DROP NOT NULL;

-- 2. 確保 Trigger 函式定義正確
CREATE OR REPLACE FUNCTION public.handle_new_manager_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 檢查 user_metadata 是否包含 role 資訊 (代表是從 Manager 註冊頁面來的)
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
      new.id, -- 連結 auth.users 的 uuid
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
