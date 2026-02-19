
const { createClient } = require('@supabase/supabase-js');

// Hardcoded creds
const supabaseUrl = 'https://db.criterium.tw';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlLWRlbW8iLCJpYXQiOjE3Njk2NjQwMzUsImV4cCI6MjA4NTAyNDAzNX0.S44xQwnUxsfj-dA38njUyabmEfbDERcWdLV76dzp0Uc';

const supabase = createClient(supabaseUrl, supabaseKey);

const TARGET_ATHLETE_ID = 2838277;
const TARGET_SEGMENT_ID = 36956152;
const TARGET_ACTIVITY_ID = 17435294623;

async function syncV2() {
    console.log(`Starting Sync for Athlete: ${TARGET_ATHLETE_ID}, Activity: ${TARGET_ACTIVITY_ID}`);

    // 1. Get Activity
    const { data: activity, error: actError } = await supabase
        .from('strava_activities')
        .select('*')
        .eq('id', TARGET_ACTIVITY_ID)
        .single();

    if (actError) {
        console.error('Error fetching activity:', actError);
        return;
    }

    const efforts = activity.segment_efforts_dump || [];
    console.log(`Activity found. Total dump efforts: ${efforts.length}`);

    // 2. Find target effort
    const targetEffort = efforts.find(e => e.segment.id === TARGET_SEGMENT_ID);
    if (!targetEffort) {
        console.error(`Target segment ${TARGET_SEGMENT_ID} not found in activity dump.`);
        return;
    }

    console.log('Found Target Effort:', {
        id: targetEffort.id,
        name: targetEffort.segment.name,
        time: targetEffort.elapsed_time,
        date: targetEffort.start_date
    });

    // 3. Prepare Insert Data for segment_efforts_v2
    const insertData = {
        id: targetEffort.id,
        segment_id: targetEffort.segment.id,
        athlete_id: activity.athlete_id, // Use activity's athlete_id
        athlete_name: 'Unknown', // Ideally fetch from registrations, but skipping for now or fetching below
        elapsed_time: targetEffort.elapsed_time,
        moving_time: targetEffort.moving_time,
        start_date: targetEffort.start_date_local,
        average_watts: targetEffort.average_watts,
        device_watts: targetEffort.device_watts,
        average_heartrate: targetEffort.average_heartrate,
        max_heartrate: targetEffort.max_heartrate,
        activity_id: activity.id
    };

    // Fetch Athlete Name from registrations to be nice
    const { data: reg } = await supabase
        .from('registrations')
        .select('athlete_name')
        .eq('strava_athlete_id', TARGET_ATHLETE_ID)
        .eq('segment_id', TARGET_SEGMENT_ID)
        .single();

    if (reg) insertData.athlete_name = reg.athlete_name;

    console.log('Inserting into segment_efforts_v2:', insertData);

    const { error: insertError } = await supabase
        .from('segment_efforts_v2')
        .upsert(insertData);

    if (insertError) {
        console.error('Error Inserting:', insertError);
    } else {
        console.log('✅ Successfully inserted into segment_efforts_v2');
    }

    // 4. Verify
    const { data: verify } = await supabase
        .from('segment_efforts_v2')
        .select('*')
        .eq('id', targetEffort.id);
    console.log('Verification Query Result:', verify);
}

syncV2();
