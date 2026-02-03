-- 建立比賽活動表
CREATE TABLE IF NOT EXISTS race_events (
    id BIGSERIAL PRIMARY KEY,
    created_by_manager_id UUID REFERENCES manager_roles(id) ON DELETE CASCADE,
    created_by_email TEXT NOT NULL,
    
    -- 比賽基本資訊
    race_name TEXT NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    
    -- 賽事路段 (不使用外鍵約束，因為 segments 表可能缺少主鍵)
    segment_id BIGINT,
    
    -- 時間設定
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- 審核狀態
    approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approved_by_admin_id UUID REFERENCES manager_roles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- 系統欄位
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_race_events_creator ON race_events(created_by_manager_id);
CREATE INDEX IF NOT EXISTS idx_race_events_status ON race_events(approval_status);
CREATE INDEX IF NOT EXISTS idx_race_events_dates ON race_events(start_date, end_date);

-- 建立預設圖片表
CREATE TABLE IF NOT EXISTS race_default_images (
    id SERIAL PRIMARY KEY,
    image_name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    theme TEXT, -- 'mountain', 'city', 'coastal', 'abstract'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 註解說明
COMMENT ON TABLE race_events IS '比賽活動資料表';
COMMENT ON COLUMN race_events.approval_status IS '審核狀態: pending(待審核), approved(已通過), rejected(已拒絕)';
COMMENT ON TABLE race_default_images IS '比賽預設封面圖片庫';
