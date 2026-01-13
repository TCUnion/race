import { createClient } from '@supabase/supabase-js';

// 這些資訊通常應該放在 .env 檔案中，但在本示範環境中我們先建立結構
// 新的 Supabase (Zeabur Kong) 端點與 Anon Key
const supabaseUrl = 'https://eknotpyeqfupzijjrleg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrbm90cHllcWZ1cHppampybGVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDY1ODIsImV4cCI6MjA4MzY4MjU4Mn0.iI_rsidmAeQ3G_7md_QOl2W3_2E0rpKJbvZnGXBKa-c';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
