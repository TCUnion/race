import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../lib/api_config';

export type ApiStatus = 'up' | 'down' | 'checking';

/**
 * 監控 API 伺服器狀態的 Hook
 */
export function useApiStatus() {
    const [status, setStatus] = useState<ApiStatus>('checking');

    useEffect(() => {
        const handleStatusChange = (event: any) => {
            const newStatus = event.detail.status as ApiStatus;
            setStatus(newStatus);
        };

        // 監聽來自 apiClient 的全域事件
        window.addEventListener('api-status-changed', handleStatusChange);

        // 主動健康檢查 (Ping)
        const checkStatus = async () => {
            try {
                // 使用原生 fetch 避免觸發 apiClient 的遞迴事件或備援邏輯
                const response = await fetch(`${API_BASE_URL}/`, {
                    method: 'GET',
                    mode: 'cors',
                    cache: 'no-cache'
                });

                if (response.ok) {
                    setStatus('up');
                } else {
                    setStatus('down');
                }
            } catch (error) {
                setStatus('down');
            }
        };

        // 首次 ping
        checkStatus();

        // 每一分鐘主動檢查一次
        const interval = setInterval(checkStatus, 60000);

        return () => {
            window.removeEventListener('api-status-changed', handleStatusChange);
            clearInterval(interval);
        };
    }, []);

    return status;
}
