
import React, { useState, useEffect, useRef } from 'react';
import { ViewType } from '../types';
import {
  Menu,
  X,
  Compass,
  LayoutDashboard,
  BarChart3,
  Wrench,
  UserCircle,
  RefreshCw
} from 'lucide-react';
import StravaLogo from './StravaLogo';

interface StravaAthlete {
  id: string | number;
  firstname?: string;
  lastname?: string;
  firstName?: string; // 補強相容性
  lastName?: string;  // 補強相容性
  profile?: string;
  profile_medium?: string;
  access_token?: string; // 補強同步用
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
    'https://criterium.tw',
    'https://strava.criterium.tw',
    'https://strava.criterium.tw',
    'https://race.criterium.tw',
    'https://tcu.criterium.tw',
    'https://www.criterium.tw',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:5173',
  ]
};

const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const [athlete, setAthlete] = useState<StravaAthlete | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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

  // 監聽 postMessage
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const isAllowedOrigin = event.origin && CONFIG.allowedOrigins.includes(event.origin);
      const isNullOriginSafeSuccess =
        event.origin === "null" &&
        event.data?.type === "STRAVA_AUTH_SUCCESS" &&
        event.data?.athlete?.id;

      if (!isAllowedOrigin && !isNullOriginSafeSuccess) {
        if (event.data?.type?.startsWith('STRAVA_')) {
          console.log('Navbar: 收到 Strava 相關訊息但來源未授權:', event.origin, event.data);
        }
        return;
      }

      console.log('Navbar: 收到授權訊息:', event.data);

      if (event.data.type === 'STRAVA_AUTH_SUCCESS' && event.data.athlete) {
        stopPolling();
        saveAndSetAthlete(event.data.athlete);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const saveAndSetAthlete = async (athleteData: StravaAthlete) => {
    // 規範化資料
    const normalizedData = {
      ...athleteData,
      firstname: athleteData.firstname || (athleteData as any).firstName || '',
      lastname: athleteData.lastname || (athleteData as any).lastName || '',
      ts: Date.now()
    };
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(normalizedData));
    setAthlete(normalizedData);
    setIsLoading(false);

    // 同步 Token 到後端
    if (athleteData.access_token) {
      try {
        await fetch('https://strava.criterium.tw/api/auth/strava-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            athlete_id: Number(athleteData.id),
            access_token: athleteData.access_token,
            refresh_token: (athleteData as any).refresh_token || '',
            expires_at: (athleteData as any).expires_at || Math.floor(Date.now() / 1000) + 21600
          })
        }).catch(err => console.warn('Navbar: 後端同步失敗', err));
      } catch (e) {
        console.error('Navbar: 儲存 Token 到後端過程發生錯誤', e);
      }
    }

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
        console.log('Navbar: 授權超時，停止輪詢');
        stopPolling();
        return;
      }

      // 用 try-catch 處理 COOP (Cross-Origin-Opener-Policy) 錯誤
      // 當授權視窗來自不同 origin 時，無法檢查 window.closed 狀態
      try {
        if (authWindowRef.current && authWindowRef.current.closed) {
          console.log('Navbar: 授權視窗已關閉，檢查暫存資料');
          const found = checkStoredData();
          if (found) {
            console.log('Navbar: 成功從暫存取得資料');
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

  const handleNavigate = (view: ViewType) => {
    onNavigate(view);
    setIsMenuOpen(false);
  };

  const handleConnect = () => {
    setIsLoading(true);
    setIsMenuOpen(false); // 開始授權時關閉選單

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
    <header className="sticky top-0 z-50 border-b border-solid border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md transition-all duration-300">
      <div className="flex items-center justify-between px-6 md:px-20 py-4">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => handleNavigate(ViewType.LANDING)}>
          <img src="/tsu-logo.png" alt="TCU Logo" className="h-8 w-auto transform transition-transform group-hover:scale-110" />
          <h2 className="text-slate-900 dark:text-white text-lg font-black leading-tight tracking-tighter uppercase font-display italic group-hover:text-tsu-blue transition-colors">TCU STRAVA RANK</h2>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex flex-1 justify-end gap-8 items-center">
          <nav className="flex items-center gap-8">
            <button
              onClick={() => handleNavigate(ViewType.LANDING)}
              className={`text-xs font-black uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 flex items-center gap-1 ${currentView === ViewType.LANDING ? 'text-tsu-blue border-b-2 border-tsu-blue pb-1' : 'text-slate-500 dark:text-slate-400 hover:text-tsu-blue'}`}
            >
              探索活動
            </button>
            <button
              onClick={() => handleNavigate(ViewType.LEADERBOARD)}
              className={`text-xs font-black uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 flex items-center gap-1 ${currentView === ViewType.LEADERBOARD ? 'text-tsu-blue border-b-2 border-tsu-blue pb-1' : 'text-slate-500 dark:text-slate-400 hover:text-tsu-blue'}`}
            >
              排行榜
            </button>
            <button
              onClick={() => handleNavigate(ViewType.DASHBOARD)}
              className={`text-xs font-black uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 flex items-center gap-1 ${currentView === ViewType.DASHBOARD ? 'text-tsu-blue border-b-2 border-tsu-blue pb-1' : 'text-slate-500 dark:text-slate-400 hover:text-tsu-blue'}`}
            >
              個人儀表板
            </button>
            <button
              onClick={() => handleNavigate(ViewType.MAINTENANCE)}
              className={`text-xs font-black uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 flex items-center gap-1 ${currentView === ViewType.MAINTENANCE ? 'text-tsu-blue border-b-2 border-tsu-blue pb-1' : 'text-slate-500 dark:text-slate-400 hover:text-tsu-blue'}`}
            >
              保養紀錄
            </button>
          </nav>

          {athlete ? (
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800">
              <div className="flex flex-col items-end">
                <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tighter transition-all">
                  {(athlete.firstname || athlete.lastname) ? `${athlete.firstname || ''} ${athlete.lastname || ''}`.trim() : athlete.id}
                </p>
                <p className="text-[8px] text-green-500 font-bold uppercase tracking-widest leading-none">Connected</p>
              </div>
              <img
                src={athlete.profile_medium || athlete.profile || "https://www.strava.com/assets/users/placeholder_athlete.png"}
                alt={athlete.firstname || 'Profile'}
                className="w-10 h-10 rounded-full border-2 border-tsu-blue shadow-md cursor-pointer hover:scale-110 transition-transform"
                onClick={() => onNavigate(ViewType.DASHBOARD)}
              />
            </div>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isLoading}
              className="group flex min-w-[140px] cursor-pointer items-center justify-center gap-2 rounded-lg px-5 h-10 bg-strava-orange text-white text-xs font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-strava-orange/20 disabled:opacity-70 disabled:cursor-wait"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <StravaLogo className="h-4 w-auto" color="white" />
                  <span>Connect</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Mobile Toggle */}
        <div className="md:hidden flex items-center">
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-slate-900 dark:text-white p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            {isMenuOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xl animate-in slide-in-from-top duration-300 overflow-hidden">
          <nav className="flex flex-col p-4 space-y-2">
            <button
              onClick={() => handleNavigate(ViewType.LANDING)}
              className={`flex items-center px-4 py-3 rounded-xl text-left font-bold transition-all active:scale-[0.98] ${currentView === ViewType.LANDING ? 'bg-tsu-blue/10 text-tsu-blue' : 'text-slate-600 dark:text-slate-300'}`}
            >
              <Compass className="w-5 h-5 mr-3" />
              探索活動
            </button>
            <button
              onClick={() => handleNavigate(ViewType.LEADERBOARD)}
              className={`flex items-center px-4 py-3 rounded-xl text-left font-bold transition-all active:scale-[0.98] ${currentView === ViewType.LEADERBOARD ? 'bg-tsu-blue/10 text-tsu-blue' : 'text-slate-600 dark:text-slate-300'}`}
            >
              <BarChart3 className="w-5 h-5 mr-3" />
              排行榜
            </button>
            <button
              onClick={() => handleNavigate(ViewType.DASHBOARD)}
              className={`flex items-center px-4 py-3 rounded-xl text-left font-bold transition-all active:scale-[0.98] ${currentView === ViewType.DASHBOARD ? 'bg-tsu-blue/10 text-tsu-blue' : 'text-slate-600 dark:text-slate-300'}`}
            >
              <UserCircle className="w-5 h-5 mr-3" />
              個人儀表板
            </button>
            <button
              onClick={() => handleNavigate(ViewType.MAINTENANCE)}
              className={`flex items-center px-4 py-3 rounded-xl text-left font-bold transition-all active:scale-[0.98] ${currentView === ViewType.MAINTENANCE ? 'bg-tsu-blue/10 text-tsu-blue' : 'text-slate-600 dark:text-slate-300'}`}
            >
              <Wrench className="w-5 h-5 mr-3" />
              保養紀錄
            </button>

            <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
              {athlete ? (
                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                  <img
                    src={athlete.profile_medium || athlete.profile || "https://www.strava.com/assets/users/placeholder_athlete.png"}
                    alt={athlete.firstname || 'Profile'}
                    className="w-12 h-12 rounded-full border-2 border-strava-orange"
                  />
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase transition-all">
                      {(athlete.firstname || athlete.lastname) ? `${athlete.firstname || ''} ${athlete.lastname || ''}`.trim() : athlete.id}
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                      Athlete Connected
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 bg-strava-orange text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-strava-orange/20 active:scale-[0.98] transition-all"
                >
                  {isLoading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <StravaLogo className="h-5 w-auto" color="white" />
                      <span>Connect Strava</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
