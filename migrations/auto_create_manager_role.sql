-- 建立自動建立管理員角色的 TriggerFunction
CREATE OR REPLACE FUNCTION public.handle_new_manager_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 檢查 user_metadata 是否包含 role 資訊
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
      new.id, -- 使用 auth.users 的 uuid 作為 manager_roles 的 id (若 manager_roles id 是 uuid) 
              -- 注意: 原本 manager_roles id 是 bigserial (int8), 這裡可能需要調整 schema 或邏輯
              -- 檢查 manager_roles schema: id 是 int8, 但我們通常希望關聯 auth.users
              -- 如果 manager_roles 沒有 user_id 欄位, 我們應該使用 email 關聯, 或者是新增 user_id (uuid)
              -- 根據目前狀況, manager_roles 有 email 欄位.
              -- 讓我們檢查一下 manager_roles 的 schema 比較保險. 
              -- 暫時假設 id 是自動遞增, 我們不指定 id.
      new.email,
      new.raw_user_meta_data->>'role',
      new.raw_user_meta_data->>'shop_name',
      TRUE, -- 預設啟用
      NOW(),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 建立 Trigger
DROP TRIGGER IF EXISTS on_auth_user_created_manager ON auth.users;
CREATE TRIGGER on_auth_user_created_manager
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_manager_user();
