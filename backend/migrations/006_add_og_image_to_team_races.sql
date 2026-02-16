-- Add og_image column to team_races table
ALTER TABLE team_races ADD COLUMN IF NOT EXISTS og_image TEXT;
