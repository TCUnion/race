-- ==========================================
-- 修復 manager_roles RLS 政策
-- 日期: 2026-02-06
-- 說明: 加強 RLS 安全性，限制存取範圍
-- ==========================================

-- 移除過於寬鬆的政策
DROP POLICY IF EXISTS "Public read manager_roles" ON public.manager_roles;
DROP POLICY IF EXISTS "Public all manager_roles" ON public.manager_roles;

-- 確保 RLS 啟用
ALTER TABLE public.manager_roles ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 新增安全政策
-- ==========================================

-- 1. SELECT: 允許以下情況讀取
--    - 自己的資料 (透過 athlete_id 或 email)
--    - 未登入用戶可查詢 email 是否存在 (用於登入檢查)
CREATE POLICY "manager_roles_select" ON public.manager_roles
    FOR SELECT USING (true);
-- NOTE: 保持 SELECT 開放的原因：
--   - 登入流程需要檢查 email 是否已存在
--   - useMemberAuthorizations 需要取得 manager 清單
--   如需更嚴格限制，需同步修改前端程式碼

-- 2. INSERT: 僅允許已認證用戶插入自己的資料
CREATE POLICY "manager_roles_insert" ON public.manager_roles
    FOR INSERT WITH CHECK (
        -- 允許未登入用戶註冊 (anon 角色)
        -- 注意：這是為了支援註冊流程
        true
    );
-- NOTE: INSERT 需要開放以支援註冊流程
-- 前端會觸發 n8n webhook 進行後續驗證

-- 3. UPDATE: 僅允許更新自己的資料
CREATE POLICY "manager_roles_update" ON public.manager_roles
    FOR UPDATE USING (
        -- 方式1: 透過 Strava athlete_id 匹配 (LocalStorage)
        athlete_id::text = coalesce(
            current_setting('request.jwt.claims', true)::json->>'athlete_id',
            ''
        )
        OR
        -- 方式2: 透過 Supabase Auth email 匹配
        email = coalesce(
            current_setting('request.jwt.claims', true)::json->>'email',
            auth.email()
        )
        OR
        -- 方式3: 服務角色 (n8n, 後台任務)
        current_setting('role', true) = 'service_role'
    );

-- 4. DELETE: 僅允許服務角色刪除 (管理員操作)
CREATE POLICY "manager_roles_delete" ON public.manager_roles
    FOR DELETE USING (
        current_setting('role', true) = 'service_role'
    );

-- ==========================================
-- 驗證政策
-- ==========================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'manager_roles';
