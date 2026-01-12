
import React, { useState, useEffect, useRef } from 'react';

interface StravaAthlete {
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
    allowedOrigins: [
        'https://n8n.criterium.tw',
        'https://status.criterium.tw',
        'https://criterium.tw'
    ]
};

const StravaConnect: React.FC = () => {
    const [athlete, setAthlete] = useState<StravaAthlete | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
    const authWindowRef = useRef<Window | null>(null);

    // 初始化時從 localStorage 讀取已儲存的資料
    useEffect(() => {
        const savedData = localStorage.getItem(CONFIG.storageKey);
        if (savedData) {
            try {
                setAthlete(JSON.parse(savedData));
            } catch (e) {
                console.error('解析已儲存的 Strava 資料失敗', e);
            }
        }
    }, []);

    // 監聽 postMessage（與 136.html 相同）
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const isAllowedOrigin = event.origin && CONFIG.allowedOrigins.includes(event.origin);
            const isNullOriginSafeSuccess =
                event.origin === "null" &&
                event.data?.type === "STRAVA_AUTH_SUCCESS" &&
                event.data?.athlete?.id;

            if (!isAllowedOrigin && !isNullOriginSafeSuccess) {
                return;
            }

            if (event.data.type === 'STRAVA_AUTH_SUCCESS' && event.data.athlete) {
                stopPolling();
                saveAndSetAthlete(event.data.athlete);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // 監聽來自其他元件的狀態變更
    useEffect(() => {
        const handleAuthChange = () => {
            const savedData = localStorage.getItem(CONFIG.storageKey);
            if (savedData) {
                try {
                    setAthlete(JSON.parse(savedData));
                } catch (e) {
                    setAthlete(null);
                }
            } else {
                setAthlete(null);
            }
        };

        window.addEventListener('strava-auth-changed', handleAuthChange);
        window.addEventListener('storage', handleAuthChange);
        return () => {
            window.removeEventListener('strava-auth-changed', handleAuthChange);
            window.removeEventListener('storage', handleAuthChange);
        };
    }, []);

    const saveAndSetAthlete = (athleteData: StravaAthlete) => {
        const fullData = {
            ...athleteData,
            ts: Date.now()
        };
        localStorage.setItem(CONFIG.storageKey, JSON.stringify(fullData));
        setAthlete(fullData);
        setIsLoading(false);

        // 通知其他元件狀態已更新
        window.dispatchEvent(new Event('strava-auth-changed'));
    };

    const stopPolling = () => {
        if (pollingTimerRef.current) {
            clearInterval(pollingTimerRef.current);
            pollingTimerRef.current = null;
        }
        if (authWindowRef.current && !authWindowRef.current.closed) {
            authWindowRef.current.close();
        }
        authWindowRef.current = null;
        setIsLoading(false);
    };

    const checkStoredData = () => {
        const tempData = localStorage.getItem(CONFIG.storageKey + '_temp');
        if (tempData) {
            try {
                const athleteData = JSON.parse(tempData);
                localStorage.removeItem(CONFIG.storageKey + '_temp');
                saveAndSetAthlete(athleteData);
                stopPolling();
                return true;
            } catch (e) {
                console.error('處理授權暫存資料失敗', e);
            }
        }
        return false;
    };

    const startPolling = () => {
        const startTime = Date.now();
        pollingTimerRef.current = setInterval(() => {
            // 超時檢查
            if (Date.now() - startTime > CONFIG.pollingTimeout) {
                stopPolling();
                alert('授權超時，請重試');
                return;
            }

            // 視窗關閉檢查
            if (authWindowRef.current && authWindowRef.current.closed) {
                const found = checkStoredData();
                if (!found) {
                    stopPolling();
                    // 不顯示錯誤，可能是透過 postMessage 接收
                }
                return;
            }

            checkStoredData();
        }, CONFIG.pollingInterval);
    };

    const handleConnect = () => {
        setIsLoading(true);

        // 清除舊的暫存
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
    };

    const handleDisconnect = () => {
        if (!window.confirm('確定要中斷與 Strava 的連結嗎？')) return;

        localStorage.removeItem(CONFIG.storageKey);
        localStorage.removeItem(CONFIG.storageKey + '_temp');
        setAthlete(null);

        // 通知其他元件狀態已更新
        window.dispatchEvent(new Event('strava-auth-changed'));
    };

    if (athlete) {
        return (
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="relative">
                        <img
                            src={athlete.profile_medium || athlete.profile || "https://www.strava.com/assets/users/placeholder_athlete.png"}
                            alt="Profile"
                            className="w-12 h-12 rounded-full border-2 border-strava-orange shadow-sm"
                        />
                        <div className="absolute -bottom-1 -right-1 bg-strava-orange text-white rounded-full p-0.5 shadow-sm">
                            <span className="material-symbols-outlined text-[12px] block">check</span>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-slate-900 dark:text-white font-black text-sm uppercase truncate">
                            {athlete.firstname} {athlete.lastname}
                        </h4>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                            Athlete ID: {athlete.id}
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleDisconnect}
                    className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors"
                >
                    中斷連結
                </button>
                <div className="flex justify-center">
                    <img
                        src="https://status.criterium.tw/logo_pwrdBy_strava_horiz_orange.png"
                        alt="Powered by Strava"
                        className="h-6 opacity-80"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <button
                onClick={handleConnect}
                disabled={isLoading}
                className={`w-full flex items-center justify-center gap-3 bg-strava-orange text-white py-4 px-6 rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
            >
                {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                    <span className="material-symbols-outlined">sync</span>
                )}
                <span className="text-sm font-black uppercase tracking-wider">
                    {isLoading ? '授權中...' : 'Connect with Strava'}
                </span>
            </button>

            <div className="flex justify-center">
                <img
                    src="https://status.criterium.tw/logo_pwrdBy_strava_horiz_orange.png"
                    alt="Powered by Strava"
                    className="h-8"
                />
            </div>
        </div>
    );
};

export default StravaConnect;
