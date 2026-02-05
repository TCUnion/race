-- ==========================================
-- TCU Database Views for Leaderboards
-- ==========================================

-- 1. 建立基礎成績表 (View)
-- 用途：將 JSONB 格式的 segment_efforts 展開為關聯式表格結構，作為所有查詢的基礎
CREATE OR REPLACE VIEW view_all_segment_efforts AS
SELECT 
    sa.athlete_id,
    sa.id AS activity_id,
    sa.name AS activity_name,
    sa.start_date::timestamp AS start_date,
    (effort -> 'segment' ->> 'id')::bigint AS segment_id,
    effort -> 'segment' ->> 'name' AS segment_name,
    (effort ->> 'elapsed_time')::int AS elapsed_time,
    (effort ->> 'moving_time')::int AS moving_time,
    (effort ->> 'average_watts')::float AS average_watts,
    effort ->> 'start_date_local' AS effort_start_date
FROM 
    strava_activities sa,
    jsonb_array_elements(sa.segment_efforts_dump) AS effort
WHERE 
    sa.segment_efforts_dump IS NOT NULL 
    AND jsonb_array_length(sa.segment_efforts_dump) > 0;

-- 2. 建立首頁排行榜 View (每人一筆最佳成績)
-- 用途：首頁排行榜、頒獎
-- 邏輯：針對每個路段與選手，只取一筆最佳時間 (elapsed_time 最小)
CREATE OR REPLACE VIEW view_leaderboard_best AS
SELECT 
    DISTINCT ON (segment_id, athlete_id)
    v.athlete_id,
    v.segment_id,
    v.elapsed_time as best_time,
    v.start_date as achieved_at,
    v.average_watts as power,
    v.activity_id,
    v.activity_name,
    COALESCE(t.name, 'Unknown') as athlete_name,
    t.profile
FROM 
    view_all_segment_efforts v
LEFT JOIN strava_tokens t ON t.athlete_id = v.athlete_id
ORDER BY 
    segment_id, athlete_id, elapsed_time ASC; -- 這裡的排序決定了 DISTINCT 取哪一筆 (取最快的)

-- 3. 建立個人全紀錄 View (所有成績)
-- 用途：個人儀表板、歷程分析
-- 邏輯：列出所有成績，不進行過濾
CREATE OR REPLACE VIEW view_athlete_segment_history AS
SELECT 
    v.*,
    COALESCE(t.name, 'Unknown') as athlete_name,
    t.profile
FROM 
    view_all_segment_efforts v
LEFT JOIN strava_tokens t ON t.athlete_id = v.athlete_id;

-- 權限設定 (允許 API 讀取)
GRANT SELECT ON view_all_segment_efforts TO postgres, anon, authenticated, service_role;
GRANT SELECT ON view_leaderboard_best TO postgres, anon, authenticated, service_role;
GRANT SELECT ON view_athlete_segment_history TO postgres, anon, authenticated, service_role;
