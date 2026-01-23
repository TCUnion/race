import { createClient } from '@supabase/supabase-js';

// 自定義環境變數讀取與備援邏輯
// 更新紀錄：已套用 samkhlin 帳號之新金鑰
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tcusupabase2.zeabur.app/';
// 如果環境變數中沒有金鑰，則 supabaseAnonKey 為 undefined，後續會觸發警告
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

// 檢查金鑰是否仍為空或異常
if (!supabaseAnonKey || supabaseAnonKey === 'MISSING_KEY') {
    console.warn(
        "⚠️ 偵測到 Supabase Anon Key 缺失或網址不正確！\n" +
        "目前的網址: " + supabaseUrl + "\n" +
        "請前往 GitHub Secrets 確認 VITE_SUPABASE_URL 與 VITE_SUPABASE_ANON_KEY 是否正確。"
    );
}

/**
 * 建立 Supabase 客戶端實例。
 */
export const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey
);

