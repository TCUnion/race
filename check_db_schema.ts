
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase
        .from('view_leaderboard_best')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching view_leaderboard_best:', error);
    } else if (data && data.length > 0) {
        console.log('Columns in view_leaderboard_best:', Object.keys(data[0]));
        console.log('Sample Row:', data[0]);
    } else {
        // If empty view, try querying another table to confirm connection
        const { count } = await supabase.from('athletes').select('*', { count: 'exact', head: true });
        console.log('No data found in view_leaderboard_best, but athletes count:', count);
    }
}

checkSchema();
