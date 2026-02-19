
-- 修正 view_leaderboard_best 邏輯
-- 問題: 原本只取 "歷史最佳" (DISTINCT ON ... ORDER BY elapsed_time ASC)，未考慮活動日期是否在賽事區間內。
-- 導致選手若有舊成績比現在快，會取舊成績，結果被前端日期過濾掉，顯示無成績。

-- 修正: 在取 Distinct 之前，先加入 WHERE 條件，只選取符合路段 start_date / end_date 範圍內的成績。

DROP VIEW IF EXISTS view_leaderboard_best;

CREATE OR REPLACE VIEW view_leaderboard_best AS

SELECT 
    DISTINCT ON (v.segment_id, v.athlete_id)
    v.athlete_id,
    v.segment_id,
    v.elapsed_time as best_time,
    v.start_date as achieved_at,
    v.average_watts as power,
    v.activity_id,
    v.activity_name,
    COALESCE(reg.athlete_name, auth.firstname || ' ' || auth.lastname, 'Unknown') as athlete_name,
    COALESCE(reg.athlete_profile, auth.profile) as profile,
    auth.profile_medium,
    reg.team,
    reg.number
FROM 
    view_all_segment_efforts v
-- 加入 Segments 表以取得日期限制
JOIN segments s ON s.id = v.segment_id
JOIN registrations reg ON reg.strava_athlete_id = v.athlete_id AND reg.segment_id = v.segment_id
LEFT JOIN athletes auth ON auth.id = v.athlete_id
WHERE



    -- 關鍵修正: 過濾日期 (使用 effort_start_date 以符合當地時間比較)
    (s.start_date IS NULL OR v.effort_start_date::timestamp >= s.start_date::timestamp)
    AND (s.end_date IS NULL OR v.effort_start_date::timestamp <= s.end_date::timestamp)

ORDER BY 
    v.segment_id, v.athlete_id, v.elapsed_time ASC;

-- 重新授予權限 (重要!)
GRANT SELECT ON view_leaderboard_best TO anon, authenticated, service_role;


