import { createClient } from '@supabase/supabase-js';

// 自定義環境變數讀取與備援邏輯
// 回報：暫時還原為原始服務地址
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tcusupabase.zeabur.app/';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 檢查金鑰是否存在，若缺失則輸出警告訊息
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
    supabaseAnonKey || 'MISSING_KEY'
);

