import React, { useState, useEffect, useRef } from 'react';
import Check from 'lucide-react/dist/esm/icons/check';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import { API_BASE_URL } from '../../lib/api_config';
import StravaLogo from '../../components/ui/StravaLogo';
import { supabase } from '../../lib/supabase';

interface StravaAthlete {
    id: string | number;
    username?: string;
    firstname?: string;
    lastname?: string;
    firstName?: string; // 補強相容性
    lastName?: string;  // 補強相容性
    profile?: string;
    profile_medium?: string;
    access_token?: string;
}

const CONFIG = {
    stravaAuthUrl: 'https://service.criterium.tw/webhook/strava/auth/start',
    storageKey: 'strava_athlete_data',
    pollingInterval: 1000,
    pollingTimeout: 120000,
    allowedOrigins: [
        'https://n8n.criterium.tw',
        'https://criterium.tw',
        'https://strava.criterium.tw',
        'https://race.criterium.tw',
        'https://tcu.criterium.tw',
        'https://www.criterium.tw',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
        'http://localhost:5173',
        API_BASE_URL,
        'https://service.criterium.tw' // Explicity allow service domain
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
                if (event.data?.type?.startsWith('STRAVA_')) {

                }
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

    const saveAndSetAthlete = async (athleteData: StravaAthlete) => {
        const fullData = {
            ...athleteData,
            firstname: athleteData.firstname || athleteData.firstName || '',
            lastname: athleteData.lastname || athleteData.lastName || '',
            ts: Date.now()
        };
        localStorage.setItem(CONFIG.storageKey, JSON.stringify(fullData));
        setAthlete(fullData);
        setIsLoading(false);

        // 同步 Token 到後端
        if (athleteData.access_token) {
            try {
                // 取得當前 Supabase 使用者 ID
                const { data: { user } } = await supabase.auth.getUser();

                const athleteId = Number(athleteData.id);
                if (isNaN(athleteId)) {
                    console.error('Invalid athlete ID:', athleteData.id);
                    return;
                }

                const payload = {
                    athlete_id: athleteId, // 確保為數字
                    access_token: athleteData.access_token || '', // 確保非空字串 (雖然應該要是有的)
                    refresh_token: (athleteData as any).refresh_token || '', // 若無 refresh token 則給空字串
                    expires_at: Number((athleteData as any).expires_at) || Math.floor(Date.now() / 1000) + 21600, // 確保為數字
                    user_id: user?.id || null // 若無 user 則為 null
                };

                console.log('[StravaConnect] Syncing token to backend:', payload);

                await fetch(`${API_BASE_URL}/api/auth/strava-token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } catch (e) {
                console.error('儲存 Token 到後端失敗', e);
            }
        }

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

            // 用 try-catch 處理 COOP (Cross-Origin-Opener-Policy) 錯誤
            try {
                if (authWindowRef.current && authWindowRef.current.closed) {

                    const found = checkStoredData();
                    if (found) {

                    }
                    stopPolling();
                    return;
                }
            } catch (e) {
                // COOP 阻擋了 window.closed 檢查，這是正常的
                // 繼續依賴 postMessage 或 localStorage 輪詢
            }

            // 無論視窗檢查是否成功，都持續檢查 localStorage
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
            setIsLoading(false);
            alert('請允許彈出視窗以進行 Strava 授權');
            return;
        }

        startPolling();
    };

    const handleDisconnect = async () => {
        if (athlete) {
            try {
                // 發送 Webhook 通知的邏輯
                await fetch('https://n8n.criterium.tw/webhook/strava/auth/cancel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        athlete_id: athlete.id
                    })
                });
            } catch (e) {
                console.error('發送取消連結 Webhook 失敗', e);
            }
        }

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
                        <div className="absolute -bottom-1 -right-1 bg-tcu-blue text-white rounded-full p-0.5 shadow-sm">
                            <Check className="w-3 h-3" />
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-slate-900 dark:text-white font-black text-base uppercase truncate leading-tight">
                            {(athlete.firstname || athlete.lastname)
                                ? `${athlete.firstname || ''} ${athlete.lastname || ''}`.trim()
                                : (athlete.firstName || athlete.lastName)
                                    ? `${athlete.firstName || ''} ${athlete.lastName || ''}`.trim()
                                    : `Athlete #${athlete.id}`}
                        </h4>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                            Strava ID: {athlete.id}
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
                    <StravaLogo className="h-4 w-auto grayscale opacity-50" color="currentColor" />
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
                    <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                    <StravaLogo className="h-5 w-auto" color="white" />
                )}
                <span className="text-sm font-black uppercase tracking-wider">
                    {isLoading ? '授權中...' : 'Connect with Strava'}
                </span>
            </button>

            <div className="flex justify-center pt-2">
                <StravaLogo className="h-5 w-auto" />
            </div>
        </div>
    );
};

export default StravaConnect;
