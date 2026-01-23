
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tcusupabase2.zeabur.app/';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
    const { data, error } = await supabase
        .from('strava_tokens')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching strava_tokens:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns in strava_tokens:', Object.keys(data[0]));
    } else {
        console.log('No data in strava_tokens');
    }
}

checkSchema();
