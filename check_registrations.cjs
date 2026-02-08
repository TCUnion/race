
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check129() {
    console.log('Searching for segment "129"...');
    // 1. Find the segment
    const { data: segments } = await supabase
        .from('segments')
        .select('id, name')
        .ilike('name', '%129%');

    if (!segments || segments.length === 0) {
        console.log('Segment 129 not found');
        return;
    }

    // Assuming the first match is the correct one. The user said "129 Climb to Zhongxingling"
    const targetSeg = segments.find(s => s.name.includes('Zhongxingling')) || segments[0];
    const segId = targetSeg.id;
    console.log(`Analyzing Segment: ${targetSeg.name} (ID: ${segId})`);

    // 2. Registrations
    const { data: regs, count: regCount } = await supabase
        .from('registrations')
        .select('strava_athlete_id, status')
        .eq('segment_id', segId);

    console.log(`\nRegistrations (Total: ${regs?.length || 0}):`);
    if (regs) {
        regs.forEach(r => console.log(`- Athlete ${r.strava_athlete_id} (${r.status})`));
    }

    // 3. Leaderboard View
    const { data: lb, count: lbCount } = await supabase
        .from('view_leaderboard_best')
        .select('athlete_id, athlete_name, best_time')
        .eq('segment_id', segId);

    console.log(`\nLeaderboard View Entries (Total: ${lb?.length || 0}):`);
    if (lb) {
        lb.forEach(r => console.log(`- Athlete ${r.athlete_id}: ${r.athlete_name} (${r.best_time})`));
    }

    // 4. Intersection logic simulation
    if (regs && lb) {
        const regIds = new Set(regs.map(r => r.strava_athlete_id));
        const inBoth = lb.filter(r => regIds.has(r.athlete_id));
        console.log(`\nSimulation: Leaderboard should show ${inBoth.length} entries.`);
        inBoth.forEach(r => console.log(`- ${r.athlete_name} (${r.athlete_id})`));

        const missingInReg = lb.filter(r => !regIds.has(r.athlete_id));
        if (missingInReg.length > 0) {
            console.log(`\nEntries in View but NOT Registered (Should be hidden):`);
            missingInReg.forEach(r => console.log(`- ${r.athlete_name} (${r.athlete_id})`));
        }
    }
}

check129();
