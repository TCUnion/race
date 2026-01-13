import { createClient } from '@supabase/supabase-js';

// 這些資訊通常應該放在 .env 檔案中，但在本示範環境中我們先建立結構
// 新的 Supabase (Zeabur Kong) 端點與 Anon Key
const supabaseUrl = 'https://tcusupabase.zeabur.app/';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
