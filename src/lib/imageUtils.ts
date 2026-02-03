
/**
 * 解析頭像 URL
 * 如果是完整 URL (http/https) 則直接回傳
 * 如果是相對路徑，則加上 Supabase Storage 的 Base URL
 */
export const resolveAvatarUrl = (url: string | null | undefined): string | null => {
    if (!url || url.trim() === '') return null;

    // 如果是完整 URL 或 Data URI，直接回傳
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
    }

    // 修正：使用者回報頭像位於 tsu.com.tw
    // 例如：https://www.tsu.com.tw/upload-files/avatars/TCU-dl7b3balevu6xpry-250405090020.jpg
    const tsuBaseUrl = 'https://www.tsu.com.tw';

    // 確保路徑開頭沒有斜線
    const cleanPath = url.startsWith('/') ? url.slice(1) : url;

    // 如果路徑中已經包含 upload-files，則直接串接，否則視情況補充 (目前的範例看起來是包含的)

    // 如果路徑中已經包含 upload-files，則直接串接，否則視情況補充 (目前的範例看起來是包含的)
    return `${tsuBaseUrl}/${cleanPath}`;
};
