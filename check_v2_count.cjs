
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://db.criterium.tw';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlLWRlbW8iLCJpYXQiOjE3Njk2NjQwMzUsImV4cCI6MjA4NTAyNDAzNX0.S44xQwnUxsfj-dA38njUyabmEfbDERcWdLV76dzp0Uc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCount() {
    const { count, error } = await supabase
        .from('segment_efforts_v2')
        .select('*', { count: 'exact', head: true });

    if (error) console.error('Error:', error);
    else console.log('Total segment_efforts_v2 count:', count);
}

checkCount();
