
import React, { useState, useEffect, useRef } from 'react';
import { ViewType } from '../types';

interface StravaAthlete {
  id: string | number;
  firstname?: string;
  lastname?: string;
  profile?: string;
  profile_medium?: string;
}

interface NavbarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
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

const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const [athlete, setAthlete] = useState<StravaAthlete | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const authWindowRef = useRef<Window | null>(null);

  // 初始化時從 localStorage 讀取
  useEffect(() => {
    const loadAthlete = () => {
      const savedData = localStorage.getItem(CONFIG.storageKey);
      if (savedData) {
        try {
          setAthlete(JSON.parse(savedData));
        } catch (e) {
          console.error('解析 Strava 資料失敗', e);
          setAthlete(null);
        }
      } else {
        setAthlete(null);
      }
    };

    loadAthlete();

    // 監聽來自 StravaConnect 的狀態變更事件
    window.addEventListener('strava-auth-changed', loadAthlete);
    window.addEventListener('storage', loadAthlete);

    return () => {
      window.removeEventListener('strava-auth-changed', loadAthlete);
      window.removeEventListener('storage', loadAthlete);
    };
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

  const saveAndSetAthlete = (athleteData: StravaAthlete) => {
    const fullData = {
      ...athleteData,
      ts: Date.now()
    };
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(fullData));
    setAthlete(fullData);
    setIsLoading(false);

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
      if (Date.now() - startTime > CONFIG.pollingTimeout) {
        stopPolling();
        return;
      }

      if (authWindowRef.current && authWindowRef.current.closed) {
        checkStoredData();
        stopPolling();
        return;
      }

      checkStoredData();
    }, CONFIG.pollingInterval);
  };

  const handleConnect = () => {
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
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-solid border-slate-200 dark:border-slate-800 px-6 md:px-20 py-4 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate(ViewType.LANDING)}>
        <img src="https://www.tsu.com.tw/images/logo.png" alt="TCU Logo" className="h-8 w-auto" />
        <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight uppercase">TCU STRAVA RANK</h2>
      </div>

      <div className="hidden md:flex flex-1 justify-end gap-8 items-center">
        <nav className="flex items-center gap-8">
          <button
            onClick={() => onNavigate(ViewType.LANDING)}
            className={`text-sm font-bold uppercase tracking-wide transition-colors ${currentView === ViewType.LANDING ? 'text-tsu-blue border-b-2 border-tsu-blue' : 'text-slate-600 dark:text-slate-300 hover:text-tsu-blue'}`}
          >
            探索活動
          </button>
          <button
            onClick={() => onNavigate(ViewType.LEADERBOARD)}
            className={`text-sm font-bold uppercase tracking-wide transition-colors ${currentView === ViewType.LEADERBOARD ? 'text-tsu-blue border-b-2 border-tsu-blue' : 'text-slate-600 dark:text-slate-300 hover:text-tsu-blue'}`}
          >
            排行榜
          </button>
          <button
            onClick={() => onNavigate(ViewType.DASHBOARD)}
            className={`text-sm font-bold uppercase tracking-wide transition-colors ${currentView === ViewType.DASHBOARD ? 'text-tsu-blue border-b-2 border-tsu-blue' : 'text-slate-600 dark:text-slate-300 hover:text-tsu-blue'}`}
          >
            個人儀表板
          </button>
        </nav>

        {athlete ? (
          <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-700">
            <div className="text-right">
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">{athlete.firstname}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Connected</p>
            </div>
            <img
              src={athlete.profile_medium || athlete.profile || "https://www.strava.com/assets/users/placeholder_athlete.png"}
              alt={athlete.firstname || 'Profile'}
              className="w-10 h-10 rounded-full border-2 border-strava-orange"
            />
          </div>
        ) : (
          <button
            onClick={handleConnect}
            disabled={isLoading}
            className="flex min-w-[100px] cursor-pointer items-center justify-center rounded px-5 h-10 bg-strava-orange text-white text-sm font-bold uppercase tracking-widest hover:brightness-110 transition-all shadow-md shadow-strava-orange/20 disabled:opacity-70 disabled:cursor-wait"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <span>Connect Strava</span>
            )}
          </button>
        )}
      </div>

      <div className="md:hidden">
        <span className="material-symbols-outlined text-3xl">menu</span>
      </div>
    </header>
  );
};

export default Navbar;
