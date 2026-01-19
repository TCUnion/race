-- 修復輪組里程同步功能

-- 1. 確保 bikes 資料表有 active_wheelset_id 欄位
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bikes' AND column_name='active_wheelset_id') THEN
        ALTER TABLE public.bikes ADD COLUMN active_wheelset_id uuid REFERENCES public.wheelsets(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. 建立里程同步函數
CREATE OR REPLACE FUNCTION sync_wheelset_mileage()
RETURNS TRIGGER AS $$
DECLARE
    mileage_diff float8;
BEGIN
    -- 只有當單車有設定使用中的輪組，且里程數有變化時才執行
    IF NEW.active_wheelset_id IS NOT NULL AND NEW.distance IS DISTINCT FROM OLD.distance THEN
        -- 計算里程差額 (新里程 - 舊里程)
        mileage_diff := NEW.distance - OLD.distance;
        
        -- 更新對應輪組的累積里程
        UPDATE public.wheelsets
        SET distance = COALESCE(distance, 0) + mileage_diff,
            updated_at = now()
        WHERE id = NEW.active_wheelset_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. 建立觸發器 (先移除舊的以確保更新)
DROP TRIGGER IF EXISTS trg_sync_wheelset_mileage ON public.bikes;

CREATE TRIGGER trg_sync_wheelset_mileage
AFTER UPDATE OF distance ON public.bikes
FOR EACH ROW
EXECUTE FUNCTION sync_wheelset_mileage();

-- 4. 刷新 Schema
NOTIFY pgrst, 'reload schema';
