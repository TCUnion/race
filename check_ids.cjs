const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIds() {
    const target = 'TCU-zvnrqonh9coqy4kq';
    const { data, error } = await supabase
        .from('tcu_members')
        .select('*')
        .eq('tcu_id', target);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Search result for', target);
    console.log(JSON.stringify(data, null, 2));
}

checkIds();
