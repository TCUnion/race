-- ==========================================
-- RLS 強效修復腳本 (V4 - 結構化 Athlete ID 導向)
-- 用途：將 strava_tokens 表格與 Auth User 直接連結
-- ==========================================

-- 1. 結構變更：在 strava_tokens 中新增 user_id 欄位
ALTER TABLE public.strava_tokens ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. 資料對接：從既存的 strava_bindings 表格中修復連結
-- 這樣既存使用者不需要重新登入 Strava 也能被識別
UPDATE public.strava_tokens st
SET user_id = sb.user_id
FROM public.strava_bindings sb
WHERE st.athlete_id = sb.strava_id::bigint
AND st.user_id IS NULL 
AND sb.user_id IS NOT NULL;

-- 3. 備援對接：若 strava_bindings 沒有 user_id，改用 Email 匹配一次
UPDATE public.strava_tokens st
SET user_id = au.id
FROM auth.users au, public.strava_bindings sb
WHERE st.athlete_id = sb.strava_id::bigint
AND LOWER(sb.tcu_member_email) = LOWER(au.email)
AND st.user_id IS NULL;

-- 4. 重新實作 get_my_strava_id 函數 (現在可以安全使用 user_id 欄位)
CREATE OR REPLACE FUNCTION public.get_my_strava_id()
RETURNS bigint AS $$
BEGIN
  RETURN (
    SELECT athlete_id 
    FROM public.strava_tokens 
    WHERE user_id = auth.uid() 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. 增強版 is_admin 函數 (支援不分大小寫)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.manager_roles 
    WHERE LOWER(email) = LOWER(auth.email()) AND role = 'admin' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. 更新 registrations 政策 (確保管理員與本人皆可操作)
DROP POLICY IF EXISTS "Owner/Admin insert registrations" ON public.registrations;

CREATE POLICY "Owner/Admin insert registrations" ON public.registrations
FOR INSERT WITH CHECK (
  strava_athlete_id = get_my_strava_id() OR is_admin()
);

-- 7. 再次重載 Schema
NOTIFY pgrst, 'reload schema';
