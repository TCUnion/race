-- TCU 密碼重設 Token 表格
-- 用於儲存管理員密碼重設的驗證 Token

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引以加速查詢
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON password_reset_tokens(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);

-- RLS 政策
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- 允許所有人讀取和插入 (Webhook 需要)
CREATE POLICY "允許讀取 Token" ON password_reset_tokens
    FOR SELECT USING (true);

CREATE POLICY "允許插入 Token" ON password_reset_tokens
    FOR INSERT WITH CHECK (true);

CREATE POLICY "允許更新 Token" ON password_reset_tokens
    FOR UPDATE USING (true);

-- 自動清理過期 Token 的函數
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM password_reset_tokens 
    WHERE expires_at < NOW() OR used_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 註解
COMMENT ON TABLE password_reset_tokens IS '管理員密碼重設 Token 儲存表';
COMMENT ON COLUMN password_reset_tokens.email IS '管理員 Email';
COMMENT ON COLUMN password_reset_tokens.token IS '重設用的唯一 Token';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Token 過期時間';
COMMENT ON COLUMN password_reset_tokens.used_at IS 'Token 使用時間 (已使用則不為 NULL)';
