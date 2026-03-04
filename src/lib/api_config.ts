export const getApiBaseUrl = () => {
    // 在生產環境中，如果設定了 VITE_API_URL環境變數，則使用它
    // 否則預設為空字串 (使用相對路徑，依賴同網域代理或 Nginx 設定)
    return import.meta.env.VITE_API_URL || '';
};

export const getBackupApiUrl = () => {
    return import.meta.env.VITE_BACKUP_API_URL || '';
};

export const API_BASE_URL = getApiBaseUrl();
export const BACKUP_API_URL = getBackupApiUrl();

// 支援透過 VITE_ALLOWED_ORIGINS (逗號分隔) 覆蓋允許的來源，預設為安全的開發與生產網域
export const ALLOWED_ORIGINS = import.meta.env.VITE_ALLOWED_ORIGINS
    ? import.meta.env.VITE_ALLOWED_ORIGINS.split(',').map((o: string) => o.trim())
    : [
        'https://service.criterium.tw',
        'https://criterium.tw',
        'https://strava.criterium.tw',
        'http://localhost:3000',
        'http://localhost:5173',
        API_BASE_URL,
    ].filter(Boolean);

