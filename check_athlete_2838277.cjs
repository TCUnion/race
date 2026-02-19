
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();


const supabaseUrl = 'https://db.criterium.tw';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlLWRlbW8iLCJpYXQiOjE3Njk2NjQwMzUsImV4cCI6MjA4NTAyNDAzNX0.S44xQwnUxsfj-dA38njUyabmEfbDERcWdLV76dzp0Uc';


const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAthlete(athleteId) {
    console.log(`Checking status for athlete: ${athleteId}`);

    // 1. Check Registrations
    const { data: regs, error: regError } = await supabase
        .from('registrations')
        .select('*')
        .eq('strava_athlete_id', athleteId);

    if (regError) console.error('Registration Error:', regError);
    console.log('Registrations:', regs);

    // 2. Check Strava Activities (Recent)
    // Note: strava_activities table might not be directly accessible via anon key if RLS is on, 
    // but we can try view_leaderboard_best first as it is exposed.


    // 3. Check View Leaderboard Best (Recent 2026)
    const { data: viewData, error: viewError } = await supabase
        .from('view_leaderboard_best')
        .select('*')
        .eq('athlete_id', athleteId)
        .gt('achieved_at', '2026-02-01T00:00:00')
        .order('achieved_at', { ascending: false });

    if (viewError) console.error('View Leaderboard Best Error:', viewError);
    console.log('Recent View Entries (Feb 2026):', viewData);


    // 5. Check specific activity details
    const targetActivityId = 17435294623;
    const { data: activityDetail, error: detailError } = await supabase
        .from('strava_activities')
        .select('id, name, segment_efforts_dump')
        .eq('id', targetActivityId)
        .single();

    if (detailError) {
        console.log('Error fetching activity detail:', detailError.message);
    } else {
        const efforts = activityDetail.segment_efforts_dump || [];
        console.log(`Activity ${targetActivityId} has ${efforts.length} segment efforts.`);

        // List all segment names in this activity
        const effortNames = efforts.map(e => ({
            id: e.segment.id,
            name: e.segment.name,
            elapsed_time: e.elapsed_time
        }));
        console.log('Segment Efforts in Activity:', effortNames);
    }

    // 6. Check for "Guanyin" segments
    console.log('--- Checking for "觀音" ---');

    // In Activity
    const activityEfforts = activityDetail.segment_efforts_dump || [];
    const matchedEfforts = activityEfforts.filter(e => e.segment && e.segment.name.includes('觀音'));
    console.log('Matched Efforts in Activity:', matchedEfforts.map(e => ({
        id: e.segment.id,
        name: e.segment.name,
        time: e.elapsed_time
    })));


    // In Segments Table
    const { data: dbSegments } = await supabase
        .from('segments')
        .select('*')
        .ilike('name', '%觀音%');
    console.log('Segments in DB matching "觀音":', dbSegments);

    // In Team Races Table
    const { data: teamRaces } = await supabase
        .from('team_races')
        .select('*')
        .ilike('name', '%觀音%');
    console.log('Team Races in DB matching "觀音":', teamRaces);


    // 7. Check by Segment IDs found in activity
    const activitySegmentIds = matchedEfforts.map(e => e.segment.id);
    console.log('Checking if these Segment IDs exist in DB:', activitySegmentIds);

    const { data: existingSegments } = await supabase
        .from('segments')
        .select('*')
        .in('id', activitySegmentIds);
    console.log('Existing Segments in DB matching Activity IDs:', existingSegments);


    // 8. Search for "King", "國王", "馬年"
    const keywords = ['國王', '馬年', 'King', 'KOM'];
    console.log(`--- Searching for keywords: ${keywords.join(', ')} ---`);

    for (const kw of keywords) {
        const { data: tr } = await supabase
            .from('team_races')
            .select('*')
            .ilike('name', `%${kw}%`);
        if (tr && tr.length > 0) console.log(`Team Races matching "${kw}":`, tr.map(s => ({ id: s.segment_id, name: s.name })));

        const { data: seg } = await supabase
            .from('segments')
            .select('*')
            .ilike('name', `%${kw}%`);
        if (seg && seg.length > 0) console.log(`Segments matching "${kw}":`, seg.map(s => ({ id: s.id, name: s.name })));
    }





    // 4. Check strava_activities (Recent)
    const { data: activities, error: activityError } = await supabase
        .from('strava_activities')
        .select('id, name, start_date')
        .eq('athlete_id', athleteId)
        .order('start_date', { ascending: false })
        .limit(5);


    if (activityError) {
        console.log('Cannot access strava_activities directly (likely RLS):', activityError.message);
    } else {
        console.log('Recent 5 Activities in DB:', activities);
    }


    // 9. Check specific Segment ID 36956152 provided by user
    const targetSegId = 36956152;
    console.log(`--- Analyzing Target Segment ID: ${targetSegId} ---`);

    // Check Registration
    const { data: targetReg } = await supabase
        .from('registrations')
        .select('*')
        .eq('strava_athlete_id', athleteId)
        .eq('segment_id', targetSegId);
    console.log('Registration for 36956152:', targetReg);

    // Check segment_efforts_v2
    const { data: v2Efforts, error: v2Error } = await supabase
        .from('segment_efforts_v2')
        .select('*')
        .eq('athlete_id', athleteId)
        .eq('segment_id', targetSegId)
        .order('start_date', { ascending: false });

    if (v2Error) {
        console.log('Error querying segment_efforts_v2:', v2Error.message);
    } else {
        console.log(`segment_efforts_v2 data for ${targetSegId} (Count: ${v2Efforts.length}):`);
        v2Efforts.forEach(e => {
            console.log(`- Time: ${e.elapsed_time}s, Date: ${e.start_date}, Activity: ${e.activity_id}`);
        });
    }

    // Check View Leaderboard
    const { data: targetLb } = await supabase
        .from('view_leaderboard_best')
        .select('*')
        .eq('athlete_id', athleteId)
        .eq('segment_id', targetSegId);
    console.log('Leaderboard Entry for 36956152:', targetLb);


    // 10. Check Segment Dates
    const { data: segDates } = await supabase
        .from('segments')
        .select('start_date, end_date')
        .eq('id', targetSegId)
        .single();
    console.log('Segment Dates:', segDates);

    if (targetEffort && segDates) {
        const effortDate = new Date(targetEffort.start_date);
        const startDate = segDates.start_date ? new Date(segDates.start_date) : null;
        const endDate = segDates.end_date ? new Date(segDates.end_date) : null;

        console.log(`Effort Date: ${effortDate.toISOString()}`);
        console.log(`Segment Start: ${startDate ? startDate.toISOString() : 'None'}`);
        console.log(`Segment End: ${endDate ? endDate.toISOString() : 'None'}`);

        let isValid = true;
        if (startDate && effortDate < startDate) {
            console.log('❌ Effort is BEFORE start date!');
            isValid = false;
        }
        if (endDate && effortDate > endDate) {
            console.log('❌ Effort is AFTER end date!');
            isValid = false;
        }
        if (isValid) console.log('✅ Effort is within date range.');
    }
}

checkAthlete(2838277);


