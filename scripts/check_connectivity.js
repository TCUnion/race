import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tcusupabase2.zeabur.app';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkConnection() {
    console.log('Checking connection to public table...');
    const { data, error } = await supabase.from('notification_settings').select('count', { count: 'exact', head: true });

    if (error) {
        console.error('Error connecting to public table:', error);
    } else {
        console.log('Connection to public table successful. Count result:', data, ' (null is expected for head request)');
    }
}

checkConnection();
