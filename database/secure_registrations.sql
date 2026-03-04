-- ==============================================================================
-- 報名安全性防護：防止報名已過期的挑戰路段
-- ==============================================================================

-- 建立檢查函式
CREATE OR REPLACE FUNCTION check_segment_expiration()
RETURNS TRIGGER AS $$
DECLARE
    seg_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- 取得目標路段的截止日期 (end_date)
    SELECT end_date INTO seg_end_date
    FROM public.segments
    WHERE id = NEW.segment_id;

    -- 如果有設定截止日期，且目前時間已超過截止日期（當日 23:59:59 視為結束，因此直接與現在比較即可）
    -- 為了嚴謹，這裡將 end_date 視為當天的結束時間
    IF seg_end_date IS NOT NULL THEN
        IF current_timestamp > (date_trunc('day', seg_end_date) + interval '23 hours 59 minutes 59 seconds') THEN
            RAISE EXCEPTION 'Cannot register or update registration for an expired segment (Segment ID: %)', NEW.segment_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 使用 SECURITY DEFINER 確保觸發器有權限讀取 segments 表，即使執行者權限受限

-- 使用 EXCEPT 區塊，防止權限不足時卡死，但會給出警告。
DO $$
BEGIN
    -- 確保先移除舊的 Trigger，避免重複建立
    DROP TRIGGER IF EXISTS trg_check_segment_expiration ON public.registrations;

    -- 建立 Trigger，在 INSERT 或 UPDATE 之前執行檢查
    CREATE TRIGGER trg_check_segment_expiration
    BEFORE INSERT OR UPDATE ON public.registrations
    FOR EACH ROW
    EXECUTE FUNCTION check_segment_expiration();
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Cannot create trigger on registrations: % (You must be owner of the table)', SQLERRM;
END
$$;
