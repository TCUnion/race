const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
const envPath = path.resolve(__dirname, '../.env');
console.log(`Loading .env from ${envPath}`);
const result = dotenv.config({ path: envPath });
if (result.error) {
    console.warn("Could not load .env file, checking process.env");
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://tcudb.zeabur.app/';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log(`URL: ${supabaseUrl}`);
console.log(`Key: ${supabaseAnonKey ? 'Present' : 'Missing'}`);

if (!supabaseAnonKey) {
    console.error('Missing VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    console.log('Fetching tcu_members columns...');
    try {
        const { data, error } = await supabase
            .from('tcu_members')
            .select('*')
            .limit(1);

        if (error) {
            console.error('Supabase Error:', error);
        } else {
            console.log('Data fetch successful.');
            if (data && data.length > 0) {
                console.log('Columns found:', Object.keys(data[0]));

                // Check for specific columns
                const columns = Object.keys(data[0]);
                ['status', 'team', 'member_type', 'account'].forEach(col => {
                    console.log(`Column '${col}': ${columns.includes(col) ? 'Exists' : 'MISSING'}`);
                });

            } else {
                console.log('No data found in tcu_members (Empty Table).');
            }
        }
    } catch (e) {
        console.error('Exception:', e);
    }
}

check();
