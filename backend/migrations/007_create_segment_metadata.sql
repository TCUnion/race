-- Create a separate metadata table for segments to store extension fields
CREATE TABLE IF NOT EXISTS segment_metadata (
    segment_id BIGINT PRIMARY KEY,
    og_image TEXT,
    team_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: We don't use FOREIGN KEY REFERENCES segments(id) here 
-- to avoid potential permission/owner issues during table creation,
-- but logic-wise this table maps 1:1 to segments via segment_id.

COMMENT ON TABLE segment_metadata IS 'Stores additional segment info like OG images and team names without modifying the core segments table.';
