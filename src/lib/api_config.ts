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

