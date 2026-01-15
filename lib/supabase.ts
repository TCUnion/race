import { createClient } from '@supabase/supabase-js';

// 自定義環境變數讀取與備援邏輯
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tcusupabase.zeabur.app/';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseAnonKey) {
    console.error(
        "❌ 偵測到 Supabase Anon Key 缺失！\n" +
        "1. 請確保 GitHub Repository Secrets 已設定 VITE_SUPABASE_ANON_KEY。\n" +
        "2. 請確認您已將目前的修正代碼推送 (push) 至 GitHub。\n" +
        "目前的應用程式將無法正常運行。"
    );
}

// 只有在金鑰存在時才初始化，避免 supabase-js 拋出 'supabaseKey is required' 造成 JS 崩潰
export const supabase = supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null as any;

