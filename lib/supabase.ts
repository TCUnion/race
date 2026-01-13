import { createClient } from '@supabase/supabase-js';

// 這些資訊通常應該放在 .env 檔案中，但在本示範環境中我們先建立結構
const supabaseUrl = 'https://eknotpyeqfupzijjrleg.supabase.co';
const supabaseAnonKey = 'sb_publishable_fqLdTKkcFBVct8BvZty8hA_tAYzbw-z';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
