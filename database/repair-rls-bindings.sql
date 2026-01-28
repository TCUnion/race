-- ==========================================
-- RLS 強效修復腳本 (V3 - 純 Athlete ID 導向)
-- 用途：不依賴 Email，改用 strava_tokens 中的 athlete_id 建立安全連結
-- ==========================================

-- 1. 修復 strava_bindings 連結 (根據 strava_tokens 的多對一關係)
-- 如果目前已有綁定資料但缺乏 user_id，則從 strava_tokens 中找出該 athlete_id 對應的 Supabase 使用者
UPDATE public.strava_bindings sb
SET user_id = st.user_id
FROM public.strava_tokens st
WHERE sb.strava_id::bigint = st.athlete_id
AND sb.user_id IS NULL;

-- 2. 重新實作 get_my_strava_id 函數
-- 邏輯：直接去 strava_tokens 查目前登入的 auth.uid() 擁有哪些 athlete_id
-- 這樣即使沒做 bindings 也能對應到，只要他有登入 Strava
CREATE OR REPLACE FUNCTION public.get_my_strava_id()
RETURNS bigint AS $$
BEGIN
  RETURN (
    SELECT athlete_id 
    FROM public.strava_tokens 
    WHERE user_id = auth.uid() 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. 更新 registrations INSERT 政策
-- 本人報名：strava_athlete_id 必須等於 strava_tokens 裡的記錄
DROP POLICY IF EXISTS "Owner/Admin insert registrations" ON public.registrations;

CREATE POLICY "Owner/Admin insert registrations" ON public.registrations
FOR INSERT WITH CHECK (
  strava_athlete_id = get_my_strava_id() OR is_admin()
);

-- 再次重載 Schema
NOTIFY pgrst, 'reload schema';
