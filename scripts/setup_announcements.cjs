
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://db.criterium.tw';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixPermissions() {
    console.log('Applying RLS Policy fixes for "announcements" table...');

    const sql = `
-- 1. 允許所有人(匿名+已登入)讀取「已啟用」的公告
DROP POLICY IF EXISTS "Public read active" ON public.announcements;
CREATE POLICY "Public read active"
    ON public.announcements
    FOR SELECT
    USING (is_active = true);

-- 2. 允許 Authenticated Admin 進行寫入
DROP POLICY IF EXISTS "Admin full access" ON public.announcements;
CREATE POLICY "Admin full access"
    ON public.announcements
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.manager_roles mr
            WHERE mr.email = auth.email() 
            AND mr.role IN ('admin', 'shop_owner') 
            AND mr.is_active = true
        )
    );

-- 3. 確保 Service Role (後台) 永遠有權限 (雖然通常預設就有，但顯式宣告更保險)
DROP POLICY IF EXISTS "Service Role full access" ON public.announcements;
CREATE POLICY "Service Role full access"
    ON public.announcements
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

GRANT SELECT ON public.announcements TO anon, authenticated;
GRANT ALL ON public.announcements TO service_role;
GRANT ALL ON public.announcements TO authenticated;
  `;

    console.log('\n--- SQL TO RUN IN SUPABASE SQL EDITOR ---\n');
    console.log(sql);
    console.log('\n-----------------------------------------\n');

    // Verify if we can write as service role
    const testId = '00000000-0000-0000-0000-000000000000';
    const { error } = await supabase.from('announcements').delete().eq('id', testId);

    if (error) {
        console.log('Verification failed: Service Role write test faced error:', error.message);
    } else {
        console.log('Verification: Service Role seems to have write access (delete test passed without RLS error).');
    }
}

fixPermissions();
