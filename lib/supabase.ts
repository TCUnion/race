import { createClient } from '@supabase/supabase-js';

// 自定義環境變數讀取與備援邏輯
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tcusupabase.zeabur.app/';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 檢查金鑰是否存在，若缺失則輸出警告訊息
if (!supabaseAnonKey) {
    console.warn(
        "⚠️ 偵測到 Supabase Anon Key 缺失！應用程式將切換至唯讀/受限模式。\n" +
        "請確保已在 GitHub Secrets 或 .env 中設定 VITE_SUPABASE_ANON_KEY。"
    );
}

/**
 * 建立 Supabase 客戶端實例。
 * 如果金鑰缺失，我們提供一個空字串作為備援，這樣 createClient 可能會產生警告，
 * 但比直接回傳 null 導致組件存取 supabase.auth 時崩潰更安全。
 */
export const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey || 'MISSING_KEY'
);

