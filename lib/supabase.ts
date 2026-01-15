import { createClient } from '@supabase/supabase-js';

// 這些資訊通常應該放在 .env 檔案中，但在本示範環境中我們先建立結構
// 新的 Supabase (Zeabur Kong) 端點與 Anon Key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tcusupabase.zeabur.app/';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
