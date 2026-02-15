import { API_BASE_URL, BACKUP_API_URL } from './api_config';

interface RequestConfig extends RequestInit {
    skipBackup?: boolean; // 如果 true，則不嘗試備援伺服器
}

class ApiClient {
    private primaryUrl: string;
    private backupUrl: string;

    constructor(primaryUrl: string, backupUrl: string) {
        this.primaryUrl = primaryUrl.replace(/\/$/, ''); // Remove trailing slash
        this.backupUrl = backupUrl.replace(/\/$/, '');
    }

    private notifyStatus(status: 'up' | 'down') {
        const event = new CustomEvent('api-status-changed', { detail: { status } });
        window.dispatchEvent(event);
    }

    private async request(endpoint: string, config: RequestConfig = {}): Promise<Response> {
        const { skipBackup, ...fetchConfig } = config;

        // 確保 endpoint 以 / 開頭
        const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

        // 1. 嘗試主伺服器
        try {
            const primaryResponse = await fetch(`${this.primaryUrl}${path}`, fetchConfig);

            // 如果是 5xx 錯誤，視為伺服器故障，嘗試備援 (除非 skipBackup)
            if (primaryResponse.status >= 500 && !skipBackup && this.backupUrl) {
                console.warn(`[ApiClient] Primary server error (${primaryResponse.status}). Trying backup...`);
                // Fallthrough to backup logic
            } else {
                this.notifyStatus('up');
                return primaryResponse;
            }
        } catch (error) {
            // 網路錯誤 (TypeError)，嘗試備援
            if (!skipBackup && this.backupUrl) {
                console.warn(`[ApiClient] Primary server connection failed. Trying backup...`, error);
                // Fallthrough to backup logic
            } else {
                this.notifyStatus('down');
                throw error;
            }
        }

        // 2. 嘗試備援伺服器 (Failover)
        if (this.backupUrl) {
            try {
                const backupResponse = await fetch(`${this.backupUrl}${path}`, fetchConfig);
                this.notifyStatus('up');
                return backupResponse;
            } catch (backupError) {
                console.error(`[ApiClient] Backup server also failed.`, backupError);
                this.notifyStatus('down');
                throw backupError; // 若備援也失敗，拋出錯誤
            }
        }

        this.notifyStatus('down');
        throw new Error('Request failed and no backup server configured.');
    }

    // HTTP Methods Wrappers

    public async get(endpoint: string, config?: RequestConfig) {
        return this.request(endpoint, { ...config, method: 'GET' });
    }

    public async post(endpoint: string, body?: any, config?: RequestConfig) {
        const headers = {
            'Content-Type': 'application/json',
            ...(config?.headers || {})
        };
        return this.request(endpoint, {
            ...config,
            method: 'POST',
            body: JSON.stringify(body),
            headers
        });
    }

    public async put(endpoint: string, body?: any, config?: RequestConfig) {
        const headers = {
            'Content-Type': 'application/json',
            ...(config?.headers || {})
        };
        return this.request(endpoint, {
            ...config,
            method: 'PUT',
            body: JSON.stringify(body),
            headers
        });
    }

    public async delete(endpoint: string, config?: RequestConfig) {
        return this.request(endpoint, { ...config, method: 'DELETE' });
    }
}

// 初始化單例
// 注意：如果 BACKUP_API_URL 未設定，則只會使用 Primary
export const apiClient = new ApiClient(API_BASE_URL, BACKUP_API_URL);
