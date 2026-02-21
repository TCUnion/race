import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(url, key)

query = """
WITH active_periods AS (
  SELECT 
    MIN(start_date) AS min_start_date, 
    MAX(end_date) AS max_end_date
  FROM (
    SELECT start_date::timestamptz, end_date::timestamptz FROM team_races WHERE is_active = true
    UNION ALL
    SELECT start_date::timestamptz, end_date::timestamptz FROM segments WHERE is_active = true
  ) all_races
),
approved_athletes AS (
  SELECT DISTINCT strava_athlete_id AS athlete_id
  FROM registrations
  WHERE status = 'approved' AND strava_athlete_id IS NOT NULL
)
SELECT 
  sa.id AS activity_id, 
  sa.athlete_id 
FROM strava_activities sa
JOIN approved_athletes aa ON sa.athlete_id = aa.athlete_id
CROSS JOIN active_periods ap
WHERE 
  sa.start_date::timestamptz >= ap.min_start_date 
  AND sa.start_date::timestamptz <= COALESCE(ap.max_end_date, NOW())
  AND sa.segment_efforts_dump IS NULL
ORDER BY sa.start_date DESC 
LIMIT 50;
"""

try:
    print(supabase.rpc('exec_sql', {'sql': query}).execute())
except Exception as e:
    print("Error:", e)
