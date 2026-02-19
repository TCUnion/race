
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://db.criterium.tw';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlLWRlbW8iLCJpYXQiOjE3Njk2NjQwMzUsImV4cCI6MjA4NTAyNDAzNX0.S44xQwnUxsfj-dA38njUyabmEfbDERcWdLV76dzp0Uc';

const supabase = createClient(supabaseUrl, supabaseKey);

const ATHLETE_ID = 2838277;
const SEGMENT_ID = 36956152;

async function debugView() {
    console.log(`--- Debugging View Logic for Ath: ${ATHLETE_ID}, Seg: ${SEGMENT_ID} ---`);

    // 1. Check Raw View Data (view_all_segment_efforts)
    console.log('Querying view_all_segment_efforts...');
    const { data: rawEfforts, error: rawError } = await supabase
        .from('view_all_segment_efforts')
        .select('*')
        .eq('athlete_id', ATHLETE_ID)
        .eq('segment_id', SEGMENT_ID);

    if (rawError) console.error('Raw View Error:', rawError);
    else {
        console.log(`Found ${rawEfforts.length} efforts in RAW VIEW.`);
        rawEfforts.forEach(e => {
            console.log(`- Time: ${e.elapsed_time}, StartDate: ${e.start_date} (Type: ${typeof e.start_date})`);
        });
    }

    // 2. Check Segment Dates
    console.log('Querying segments table...');
    const { data: seg } = await supabase
        .from('segments')
        .select('*')
        .eq('id', SEGMENT_ID)
        .single();

    if (seg) {
        console.log(`Segment Dates: Start=${seg.start_date}, End=${seg.end_date}`);

        // Simulate Comparison
        rawEfforts.forEach(e => {
            // JS Comparison (Mocking SQL)
            const vDate = new Date(e.start_date); // Note: JS assumes UTC for ISO string ending in Z, or Local if not.
            // SQL timestamp without timezone is "abstract".

            console.log(`Comparing Effort ${e.start_date} vs Segment Start ${seg.start_date}`);
            // Note: We can't perfectly simulate SQL timestamp behavior in JS easily without knowing exactly how Supabase returns it.
            // But we can check if string formats differ wildly.
        });
    }

    // 3. Check view_leaderboard_best (The problematic one)
    console.log('Querying view_leaderboard_best...');
    const { data: lb, error: lbError } = await supabase
        .from('view_leaderboard_best')
        .select('*')
        .eq('athlete_id', ATHLETE_ID)
        .eq('segment_id', SEGMENT_ID);

    if (lbError) console.error('Leaderboard View Error:', lbError);
    else console.log('Leaderboard Result:', lb);

}

debugView();
