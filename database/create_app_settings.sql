-- ====================================
-- 建立 app_settings 表格與 RLS 政策
-- 請在 Zeabur Supabase Studio SQL Editor 中執行此腳本
-- ====================================

-- 1. 建立表格 (如果不存在)
CREATE TABLE IF NOT EXISTS public.app_settings (
    athlete_id text NOT NULL,
    key text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT app_settings_pkey PRIMARY KEY (athlete_id, key)
);

-- 2. 啟用 Row Level Security (RLS)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 3. 清理舊政策 (避免重複建立錯誤)
DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'app_settings' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON app_settings', pol.policyname);
    END LOOP;
END $$;

-- 4. 建立寬鬆 RLS 政策 (參照這項專案的開發模式)
-- 允許所有角色 (anon, authenticated) 進行讀寫操作
-- 生產環境建議改為僅允許 authenticated 使用者操作自己的 athlete_id

-- 允許讀取 (Select)
CREATE POLICY "app_settings_select_policy" ON public.app_settings
    FOR SELECT USING (true);

-- 允許新增 (Insert)
CREATE POLICY "app_settings_insert_policy" ON public.app_settings
    FOR INSERT WITH CHECK (true);

-- 允許更新 (Update)
CREATE POLICY "app_settings_update_policy" ON public.app_settings
    FOR UPDATE USING (true);

-- 允許刪除 (Delete)
CREATE POLICY "app_settings_delete_policy" ON public.app_settings
    FOR DELETE USING (true);

-- 5. 賦予權限
GRANT ALL ON TABLE public.app_settings TO anon, authenticated, service_role;

-- 6. 建立 updated_at 自動更新觸發器 (可選，但在 Supabase 很實用)
CREATE OR REPLACE FUNCTION public.handle_new_app_settings_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_app_settings_updated ON public.app_settings;
CREATE TRIGGER on_app_settings_updated
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_app_settings_updated_at();

-- ====================================
-- 執行完成！
-- ====================================
