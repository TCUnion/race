-- =============================================================================
-- MIGRATION: Setup Manager Verification Tokens
-- 用途：儲存 n8n 產生的驗證 Token，用於激活帳號。
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.manager_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    token TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    is_used BOOLEAN DEFAULT FALSE
);

-- 加快查詢速度
CREATE INDEX IF NOT EXISTS idx_mv_token ON public.manager_verifications(token);
CREATE INDEX IF NOT EXISTS idx_mv_email ON public.manager_verifications(email);

-- 權限
ALTER TABLE public.manager_verifications ENABLE ROW LEVEL SECURITY;
-- 僅允許特定 Service Role 或 n8n 存取 (由您的 API 設定決定)
GRANT ALL ON public.manager_verifications TO service_role;
GRANT ALL ON public.manager_verifications TO postgres;

SELECT 'Verification tokens table setup completed.' as status;
