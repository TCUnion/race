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


// 若有需要 Admin 與 Manager 隔離瀏覽器 Session 狀態，
// 建議直接在各自的系統入口創建自帶不同 storageKey 的 Supabase Client，
// 而非在 `src/lib/supabase.ts` 中導出 `supabaseAdmin` 造成語意混淆（讓人以為是使用 Service Role Key）。
