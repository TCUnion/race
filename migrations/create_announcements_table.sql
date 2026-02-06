-- Create announcements table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    image_url TEXT,
    target_group TEXT DEFAULT 'all', -- 'all', 'bound', 'unbound'
    button_text TEXT DEFAULT '查看詳情',
    button_url TEXT,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public (anon + authenticated) to query ACTIVE announcements
-- Note: 'is_active' check is good practice. Frontend additionally filters by target_group.
CREATE POLICY "Public read active"
    ON public.announcements
    FOR SELECT
    USING (is_active = true);

-- Policy: Allow Service Role (backend/admin) full access
-- Service Role bypasses RLS by default, but having explicit policy is sometimes safer if context changes.
-- However, strict RLS would block service_role if we don't allow it explicitly ONLY IF we are using a client that respects RLS.
-- Supabase service_role key normally bypasses RLS.
-- But if we use 'postgres' role or similar in direct SQL, it applies.
-- Let's add a policy for authenticated users with 'admin' role if needed, but the AdminPanel uses service_role key.
-- So we primarily need to ensure the table AND policies exist.

-- Grant access to anon and authenticated roles
GRANT SELECT ON public.announcements TO anon, authenticated;
GRANT ALL ON public.announcements TO service_role;
