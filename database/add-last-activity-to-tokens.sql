-- Add last_activity_at column to strava_tokens table
-- This column is intended to be updated via Webhooks (e.g. n8n) when a new activity is received.

ALTER TABLE strava_tokens 
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN strava_tokens.last_activity_at IS 'The timestamp of the latest activity received via Webhook';
