-- Create announcements table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    image_url TEXT,
    target_group TEXT DEFAULT 'all', -- 'all', 'bound', 'unbound'
    button_text TEXT DEFAULT '查看詳情',
    button_url TEXT,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- 1. 允許所有人(匿名+已登入)讀取「已啟用」的公告
--    這是給前台 User / Dashboard 顯示用的
DROP POLICY IF EXISTS "Public read active" ON public.announcements;
CREATE POLICY "Public read active"
    ON public.announcements
    FOR SELECT
    USING (is_active = true);

-- 2. 允許 Service Role (後台) 完全存取 (增刪改查)
--    理論上 Service Role 可繞過 RLS，但明確寫出這條 Policy 可避免使用非 Service Role 連線時出錯
--    (例如當 Admin Panel 透過 Authenticated Role 操作但持有特定 Claim 時)
--    最保險的方式是給予 authenticated 角色特定權限，但這裡我們假設後台使用 service_role key
--    或者我們開放給已登入的管理員 (須根據專案驗權機制調整)

--    若 AdminPanel 是以前端身分(Authenticated)登入並操作，則需要額外 Policy：
DROP POLICY IF EXISTS "Admin full access" ON public.announcements;
CREATE POLICY "Admin full access"
    ON public.announcements
    FOR ALL
    TO authenticated
    USING (
        -- 檢查是否為管理員 (假設這是一個常見的檢查方式)
        -- 這邊使用比較寬鬆的驗證：只要是 authenticated 就可以操作 (需依賴前端頁面權限控管)
        -- 或者更嚴謹：檢查 manager_roles 表
        EXISTS (
            SELECT 1 FROM public.manager_roles mr
            WHERE mr.email = auth.email() 
            AND mr.role IN ('admin', 'shop_owner') 
            AND mr.is_active = true
        )
         OR 
        -- 或是 Service Role
        (auth.jwt() ->> 'role') = 'service_role'
    );

-- Grant access to roles
GRANT SELECT ON public.announcements TO anon, authenticated;
GRANT ALL ON public.announcements TO service_role;
GRANT ALL ON public.announcements TO authenticated; -- 讓有權限的 User 也能寫入
