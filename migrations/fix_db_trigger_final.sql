-- =============================================
-- FINAL FIX SCRIPT: 解決註冊 500 錯誤與 Trigger 問題
-- 請將此內容完整複製到 Supabase SQL Editor 執行
-- =============================================

-- 1. 確保管理員表格的 athlete_id 不是必填
-- (這樣純 Email 註冊才不會因為沒有 athlete_id 而失敗)
ALTER TABLE public.manager_roles ALTER COLUMN athlete_id DROP NOT NULL;

-- 2. 清除舊的 Trigger 與 Function (避免衝突)
DROP TRIGGER IF EXISTS on_auth_user_created_manager ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_manager_user();

-- 3. 重建正確的 Function
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
      TRUE,
      NOW(),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 重新綁定 Trigger
CREATE TRIGGER on_auth_user_created_manager
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_manager_user();

-- 顯示成功訊息
SELECT 'Database fixed successfully' as result;
