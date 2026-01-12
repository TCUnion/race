import { useState, useEffect, useRef, useCallback } from 'react';

export interface StravaAthlete {
    id: string | number;
    username?: string;
    firstname?: string;
    lastname?: string;
    profile?: string;
    profile_medium?: string;
    access_token?: string;
}

const CONFIG = {
    stravaAuthUrl: 'https://n8n.criterium.tw/webhook/strava/auth/start',
    storageKey: 'strava_athlete_meta',
    pollingInterval: 1000,
    pollingTimeout: 120000,
};

export const useStravaAuth = () => {
    const [athlete, setAthlete] = useState<StravaAthlete | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
    const authWindowRef = useRef<Window | null>(null);

    // Initialize from localStorage
    useEffect(() => {
        const savedData = localStorage.getItem(CONFIG.storageKey);
        if (savedData) {
            try {
                setAthlete(JSON.parse(savedData));
            } catch (e) {
                console.error('Failed to parse stored Strava data', e);
            }
        }
    }, []);

    const stopPolling = useCallback(() => {
        if (pollingTimerRef.current) {
            clearInterval(pollingTimerRef.current);
            pollingTimerRef.current = null;
        }
        if (authWindowRef.current && !authWindowRef.current.closed) {
            authWindowRef.current.close();
        }
        authWindowRef.current = null;
        setIsLoading(false);
    }, []);

    const checkStoredData = useCallback(() => {
        const tempData = localStorage.getItem(CONFIG.storageKey + '_temp');
        if (tempData) {
            try {
                const athleteData = JSON.parse(tempData);
                localStorage.removeItem(CONFIG.storageKey + '_temp');

                const fullData = {
                    ...athleteData,
                    ts: Date.now()
                };
                localStorage.setItem(CONFIG.storageKey, JSON.stringify(fullData));

                setAthlete(fullData);
                stopPolling();
                return true;
            } catch (e) {
                console.error('Failed to process auth temp data', e);
            }
        }
        return false;
    }, [stopPolling]);

    const startPolling = useCallback(() => {
        const startTime = Date.now();
        pollingTimerRef.current = setInterval(() => {
            if (Date.now() - startTime > CONFIG.pollingTimeout) {
                stopPolling();
                alert('授權超時，請重試');
                return;
            }

            if (authWindowRef.current && authWindowRef.current.closed) {
                const found = checkStoredData();
                if (!found) {
                    stopPolling();
                    alert('授權已取消或未完成');
                }
                return;
            }

            checkStoredData();
        }, CONFIG.pollingInterval);
    }, [stopPolling, checkStoredData]);

    const handleConnect = useCallback(() => {
        setIsLoading(true);
        localStorage.removeItem(CONFIG.storageKey + '_temp');

        const width = 600;
        const height = 700;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        const returnUrl = encodeURIComponent(window.location.href);
        const url = `${CONFIG.stravaAuthUrl}?return_url=${returnUrl}`;

        authWindowRef.current = window.open(
            url,
            'strava_auth',
            `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
        );

        if (!authWindowRef.current) {
            window.location.href = url;
            return;
        }

        startPolling();
    }, [startPolling]);

    const handleDisconnect = useCallback(() => {
        if (!window.confirm('確定要中斷與 Strava 的連結嗎？')) return;

        localStorage.removeItem(CONFIG.storageKey);
        localStorage.removeItem(CONFIG.storageKey + '_temp');
        setAthlete(null);
    }, []);

    return {
        athlete,
        isLoading,
        handleConnect,
        handleDisconnect
    };
};
