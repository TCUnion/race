-- 1. 建立 wheelsets 資料表
CREATE TABLE IF NOT EXISTS public.wheelsets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    athlete_id text NOT NULL,
    bike_id text REFERENCES public.bikes(id) ON DELETE SET NULL,
    name text NOT NULL,
    brand text,
    model text,
    distance double precision DEFAULT 0,
    is_active boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. 啟用 RLS 並設定政策
ALTER TABLE public.wheelsets ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wheelsets' AND policyname = 'Public read wheelsets') THEN
        CREATE POLICY "Public read wheelsets" ON public.wheelsets FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'wheelsets' AND policyname = 'Admin full access wheelsets') THEN
        CREATE POLICY "Admin full access wheelsets" ON public.wheelsets FOR ALL USING (true);
    END IF;
END $$;

-- 3. 在 bikes 資料表加入 active_wheelset_id 欄位（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bikes' AND column_name='active_wheelset_id') THEN
        ALTER TABLE public.bikes ADD COLUMN active_wheelset_id uuid REFERENCES public.wheelsets(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. 建立里程同步函數
CREATE OR REPLACE FUNCTION sync_wheelset_mileage()
RETURNS TRIGGER AS $$
DECLARE
    mileage_diff float8;
BEGIN
    IF NEW.active_wheelset_id IS NOT NULL AND NEW.distance IS DISTINCT FROM OLD.distance THEN
        mileage_diff := NEW.distance - OLD.distance;
        UPDATE public.wheelsets
        SET distance = distance + mileage_diff,
            updated_at = now()
        WHERE id = NEW.active_wheelset_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. 建立觸發器
DROP TRIGGER IF EXISTS trg_sync_wheelset_mileage ON public.bikes;
CREATE TRIGGER trg_sync_wheelset_mileage
AFTER UPDATE OF distance ON public.bikes
FOR EACH ROW
EXECUTE FUNCTION sync_wheelset_mileage();

-- 6. 強制重新整理 PostgREST 快取（透過通知或重置）
NOTIFY pgrst, 'reload schema';
