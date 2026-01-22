CREATE TABLE IF NOT EXISTS strava_streams (
    activity_id BIGINT PRIMARY KEY,
    streams JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
