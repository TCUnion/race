-- Create a view to get the latest activity date for each athlete
CREATE OR REPLACE VIEW latest_athlete_activities AS
SELECT 
    athlete_id,
    MAX(start_date) as last_activity_at
FROM 
    segment_efforts
GROUP BY 
    athlete_id;

-- Grant access to authenticated users
GRANT SELECT ON latest_athlete_activities TO authenticated;
GRANT SELECT ON latest_athlete_activities TO service_role;
