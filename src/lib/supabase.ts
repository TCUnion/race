import { createClient } from '@supabase/supabase-js';

// 自定義環境變數讀取與備援邏輯
// 更新紀錄：已套用 samkhlin 帳號之新金鑰
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tcudb.zeabur.app/';
// 如果環境變數中沒有金鑰，則 supabaseAnonKey 為 undefined，後續會觸發警告
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

/**
 * 建立獨立的 Admin Supabase 客戶端。
 * 使用自定義 storageKey ('sb-admin-auth-token') 來與一般會員/Manager 的 Session 隔離。
 * 這樣允許同一瀏覽器同時登入 Admin 和 Manager。
 */
export const supabaseAdmin = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
        auth: {
            storageKey: 'sb-admin-auth-token',
            persistSession: true,
            detectSessionInUrl: true, // 允許 Strava OAuth 登入後自動讀取 Session
        }
    }
);

/**
 * [DEV ONLY] 使用 Service Role Key 的客戶端，可繞過 RLS 政策。
 * 僅用於開發環境和 Admin Panel。
 * 警告：請勿在前端生產環境使用 Service Role Key！
 */
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseServiceRole = serviceRoleKey ? createClient(
    supabaseUrl,
    serviceRoleKey,
    {
        auth: {
            storageKey: 'sb-service-role',
            autoRefreshToken: false,
            persistSession: false
        }
    }
) : null;
