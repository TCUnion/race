-- 1. 基礎架構更新: 綁定 Supabase Auth User ID
ALTER TABLE public.strava_bindings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 建立索引以優化 RLS 效能
CREATE INDEX IF NOT EXISTS idx_strava_bindings_user_id ON public.strava_bindings(user_id);

-- 2. 安全輔助函數 (SQL Functions)
-- 取得目前登入者綁定的 Strava ID
CREATE OR REPLACE FUNCTION public.get_my_strava_id()
RETURNS bigint AS $$
BEGIN
  RETURN (SELECT strava_id FROM public.strava_bindings WHERE user_id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 檢查目前登入者是否為管理員
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.manager_roles 
    WHERE email = auth.email() AND role = 'admin' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. 重構 RLS 政策

-- ==========================================
-- registrations 表格
-- ==========================================
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "registrations_select_policy" ON public.registrations;
DROP POLICY IF EXISTS "registrations_insert_policy" ON public.registrations;
DROP POLICY IF EXISTS "registrations_update_all_policy" ON public.registrations;
DROP POLICY IF EXISTS "registrations_delete_all_policy" ON public.registrations;

-- 任何人可讀取報名資訊 (公開挑戰賽)
CREATE POLICY "Public read registrations" ON public.registrations
FOR SELECT USING (true);

-- 僅限本人新增報名 (Strava ID 必須匹配)
CREATE POLICY "Owner insert registrations" ON public.registrations
FOR INSERT WITH CHECK (
  strava_athlete_id = get_my_strava_id()
);

-- 僅限本人或管理員修改/刪除
CREATE POLICY "Owner/Admin update registrations" ON public.registrations
FOR UPDATE USING (
  strava_athlete_id = get_my_strava_id() OR is_admin()
);

CREATE POLICY "Owner/Admin delete registrations" ON public.registrations
FOR DELETE USING (
  strava_athlete_id = get_my_strava_id() OR is_admin()
);

-- ==========================================
-- tcu_members 表格 (包含 PII)
-- ==========================================
ALTER TABLE public.tcu_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read tcu_members" ON public.tcu_members;

-- 僅限本人（根據 Email）或管理員讀取
CREATE POLICY "Owner/Admin read tcu_members" ON public.tcu_members
FOR SELECT USING (
  email = auth.email() OR is_admin()
);

-- ==========================================
-- strava_tokens 表格 (極度敏感)
-- ==========================================
ALTER TABLE public.strava_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin only strava_tokens" ON public.strava_tokens;

-- 僅限本人或管理員訪問
CREATE POLICY "Owner/Admin access strava_tokens" ON public.strava_tokens
FOR ALL USING (
  athlete_id = get_my_strava_id() OR is_admin()
);

-- ==========================================
-- manager_roles 表格
-- ==========================================
ALTER TABLE public.manager_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin only manage roles" ON public.manager_roles;

-- 僅限管理員管理角色，或本人讀取自己的角色
CREATE POLICY "Admin manage roles" ON public.manager_roles
FOR ALL USING (is_admin());

CREATE POLICY "Self read role" ON public.manager_roles
FOR SELECT USING (email = auth.email());

-- 再次重載 Schema
NOTIFY pgrst, 'reload schema';
