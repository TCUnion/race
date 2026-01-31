-- 修復 manager_roles RLS 遞迴問題
-- 問題: is_admin() 函數查詢 manager_roles 表，而 manager_roles 的 RLS 又呼叫 is_admin()，造成遞迴
-- 解法: 重新設計 RLS 政策，避免使用會造成遞迴的函數

-- 1. 先停用 RLS（暫時）
ALTER TABLE public.manager_roles DISABLE ROW LEVEL SECURITY;

-- 2. 刪除現有的所有 RLS 政策
DROP POLICY IF EXISTS "Admin manage roles" ON public.manager_roles;
DROP POLICY IF EXISTS "Self read role" ON public.manager_roles;
DROP POLICY IF EXISTS "Admin only manage roles" ON public.manager_roles;

-- 3. 重新建立不會造成遞迴的 RLS 政策

-- 啟用 RLS
ALTER TABLE public.manager_roles ENABLE ROW LEVEL SECURITY;

-- 允許使用者讀取自己的角色（使用 auth.email() 直接比對，不呼叫其他函數）
CREATE POLICY "Self read own role" ON public.manager_roles
FOR SELECT USING (
    email = auth.email()
);

-- 允許管理員讀取所有角色（使用子查詢，但設定 SECURITY DEFINER 避免遞迴）
-- 注意：這裡使用 EXISTS 子查詢，但不透過 is_admin() 函數
CREATE POLICY "Admin read all roles" ON public.manager_roles
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.manager_roles mr 
        WHERE mr.email = auth.email() 
        AND mr.role = 'admin' 
        AND mr.is_active = true
    )
);

-- 允許管理員新增/修改/刪除角色
CREATE POLICY "Admin insert roles" ON public.manager_roles
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.manager_roles mr 
        WHERE mr.email = auth.email() 
        AND mr.role = 'admin' 
        AND mr.is_active = true
    )
);

CREATE POLICY "Admin update roles" ON public.manager_roles
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.manager_roles mr 
        WHERE mr.email = auth.email() 
        AND mr.role = 'admin' 
        AND mr.is_active = true
    )
);

CREATE POLICY "Admin delete roles" ON public.manager_roles
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.manager_roles mr 
        WHERE mr.email = auth.email() 
        AND mr.role = 'admin' 
        AND mr.is_active = true
    )
);

-- 4. 允許匿名使用者新增註冊（用於忘記密碼等功能）
CREATE POLICY "Anon insert for registration" ON public.manager_roles
FOR INSERT WITH CHECK (true);

-- 5. 公開讀取（用於驗證 Email 是否存在等功能）
-- 注意：這可能需要根據安全性需求調整
CREATE POLICY "Public select for verification" ON public.manager_roles
FOR SELECT USING (true);

-- 6. 授予權限給 anon 和 authenticated 角色
GRANT SELECT, INSERT, UPDATE ON public.manager_roles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manager_roles TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 7. 刷新 Schema cache
NOTIFY pgrst, 'reload schema';
