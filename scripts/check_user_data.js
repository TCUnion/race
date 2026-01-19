
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tcusupabase2.zeabur.app/';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    const { data, error } = await supabase
        .from('bike_maintenance')
        .select('*')
        .eq('athlete_id', '2838277')
        .limit(10); // Check 10 records

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Records found:', data.length);
        console.log(JSON.stringify(data, null, 2));
    }
}

checkData();
