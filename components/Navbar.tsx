
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
  RefreshCw,
  Shield,
  UserCheck,
  Zap,
  Sparkles,
  Users2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import StravaLogo from './StravaLogo';
import { useAuth, StravaAthlete } from '../hooks/useAuth';
import { API_BASE_URL } from '../lib/api_config';

interface NavbarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
}

const CONFIG = {
  stravaAuthUrl: 'https://n8n.criterium.tw/webhook/strava/auth/start',
  storageKey: 'strava_athlete_data', // 與 useAuth 一致
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
  ]
};

const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { athlete, isBound, isAdmin, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const authWindowRef = useRef<Window | null>(null);

  const saveAndSetAthlete = async (athleteData: any) => {
    // 規範化資料
    const normalizedData = {
      ...athleteData,
      firstname: athleteData.firstname || athleteData.firstName || '',
      lastname: athleteData.lastname || athleteData.lastName || '',
      ts: Date.now()
    };
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(normalizedData));

    // 同步 Token 到後端
    if (athleteData.access_token) {
      try {
        await fetch(`${API_BASE_URL}/api/auth/strava-token`, {
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

    // 發送事件通知 useAuth 內容內容內容內容內容內容。
    window.dispatchEvent(new Event('strava-auth-changed'));
    setIsLoading(false);
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
      try {
        if (authWindowRef.current && authWindowRef.current.closed) {
          checkStoredData();
          stopPolling();
          return;
        }
      } catch (e) { }
      checkStoredData();
    }, CONFIG.pollingInterval);
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!CONFIG.allowedOrigins.includes(event.origin) && event.origin !== "null") return;
      if (event.data?.type === 'STRAVA_AUTH_SUCCESS' && event.data.athlete) {
        stopPolling();
        saveAndSetAthlete(event.data.athlete);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleNavigate = (view: ViewType) => {
    onNavigate(view);
    setIsMenuOpen(false);
  };

  const handleConnect = () => {
    setIsLoading(true);
    setIsMenuOpen(false);
    localStorage.removeItem(CONFIG.storageKey + '_temp');
    const width = 600, height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    const url = `${CONFIG.stravaAuthUrl}?return_url=${encodeURIComponent(window.location.href)}`;
    authWindowRef.current = window.open(url, 'strava_auth', `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`);
    if (!authWindowRef.current) {
      window.location.href = url;
    } else {
      startPolling();
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-solid border-slate-800 bg-[#242424]/95 backdrop-blur-md transition-all duration-300">
      <div className="flex items-center justify-between px-4 sm:px-6 md:px-20 py-4 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 cursor-pointer group min-w-0 flex-shrink" onClick={() => handleNavigate(ViewType.LANDING)}>
          <img src="/tsu-logo.png" alt="TCU Logo" className="h-8 w-auto flex-shrink-0 transform transition-transform group-hover:scale-110" />
          <h2 className="hidden min-[270px]:block text-white text-base sm:text-lg font-black leading-tight tracking-tighter uppercase font-display italic group-hover:text-tsu-blue transition-colors truncate">TCU STRAVA RANK</h2>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex flex-1 justify-end gap-8 items-center">
          <nav className="flex items-center gap-8">
            <button
              onClick={() => handleNavigate(ViewType.LANDING)}
              className={`text-xs font-black uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 flex items-center gap-1 px-2 py-1 ${currentView === ViewType.LANDING ? 'text-tsu-blue border-b-2 border-tsu-blue pb-1' : 'text-slate-400 hover:text-tsu-blue'}`}
            >
              探索活動
            </button>
            <button
              onClick={() => handleNavigate(ViewType.LEADERBOARD)}
              className={`text-xs font-black uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 flex items-center gap-1 ${currentView === ViewType.LEADERBOARD ? 'text-tsu-blue border-b-2 border-tsu-blue pb-1' : 'text-slate-400 hover:text-tsu-blue'}`}
            >
              排行榜
            </button>
            <button
              onClick={() => handleNavigate(ViewType.DASHBOARD)}
              className={`text-xs font-black uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 flex items-center gap-1 ${currentView === ViewType.DASHBOARD ? 'text-tsu-blue border-b-2 border-tsu-blue pb-1' : 'text-slate-400 hover:text-tsu-blue'}`}
            >
              個人儀表板
            </button>
            <button
              onClick={() => handleNavigate(ViewType.MAINTENANCE)}
              className={`text-xs font-black uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 flex items-center gap-1 ${currentView === ViewType.MAINTENANCE ? 'text-tsu-blue border-b-2 border-tsu-blue pb-1' : 'text-slate-400 hover:text-tsu-blue'}`}
            >
              保養紀錄
            </button>
            <button
              onClick={() => handleNavigate(ViewType.MEMBER_BINDING)}
              className={`text-xs font-black uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 flex items-center gap-1 px-2 py-1 ${currentView === ViewType.MEMBER_BINDING
                ? (isBound === false ? 'text-yellow-400 border-b-2 border-yellow-400 pb-1' : 'text-tsu-blue border-b-2 border-tsu-blue pb-1')
                : (isBound === false ? 'text-yellow-400/90 hover:text-yellow-400' : 'text-slate-400 hover:text-tsu-blue')
                } ${isBound === false ? 'ring-2 ring-yellow-400 animate-glow-yellow' : ''} ${isBound === null ? 'opacity-50 grayscale pointer-events-none' : ''}`}
            >
              {isBound === true ? 'TCU 會員資料' : 'TCU 綁定'}
            </button>
            {isBound && (
              <button
                onClick={() => onNavigate(ViewType.TEAM_DASHBOARD)}
                className={`text-xs font-black uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 flex items-center gap-1 ${currentView === ViewType.TEAM_DASHBOARD ? 'text-tsu-blue border-b-2 border-tsu-blue pb-1' : 'text-slate-400 hover:text-tsu-blue'}`}
              >
                <Users2 className="w-3 h-3" />
                我的車隊
              </button>
            )}
            {isBound && (
              <button
                onClick={() => handleNavigate(ViewType.AI_COACH)}
                className={`text-xs font-black uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 flex items-center gap-1 ${currentView === ViewType.AI_COACH ? 'text-tsu-blue border-b-2 border-tsu-blue pb-1' : 'text-slate-400 hover:text-tsu-blue'}`}
              >
                <Zap className="w-3 h-3" />
                AI 功率訓練教室
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => handleNavigate(ViewType.ADMIN)}
                className={`text-xs font-black uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 flex items-center gap-1 ${currentView === ViewType.ADMIN ? 'text-red-600 border-b-2 border-red-600 pb-1' : 'text-red-400 hover:text-red-600'}`}
              >
                ADMIN
              </button>
            )}
          </nav>

          <div className="flex items-center gap-4 pl-4 border-l border-slate-800">
            {isLoading ? (
              <div className="flex items-center gap-2 text-tsu-blue">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest">授權中</span>
              </div>
            ) : athlete ? (
              <div className="flex items-center gap-3 pl-4 border-l border-slate-800 group">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-white uppercase tracking-wider group-hover:text-tsu-blue transition-colors">
                    {athlete.firstname} {athlete.lastname}
                  </span>
                  <div className="flex items-center gap-1">
                    {isAdmin && <Shield className="w-2 h-2 text-red-500" />}
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                      {isAdmin ? 'TCU ADMIN' : isBound ? 'TCU MEMBER' : 'Guest'}
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <img
                    src={athlete.profile || "/placeholder-avatar.png"}
                    alt="Athlete"
                    className="w-8 h-8 rounded-full border-2 border-slate-800 group-hover:border-tsu-blue transition-all cursor-pointer"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                  />
                  {isBound && (
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5 border-2 border-[#242424]">
                      <UserCheck className="w-2 h-2 text-white" />
                    </div>
                  )}
                </div>
                <button
                  onClick={logout}
                  className="text-[10px] font-black text-slate-500 hover:text-red-500 uppercase tracking-widest transition-colors"
                >
                  登出
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                className="group relative flex items-center gap-2 bg-white hover:bg-tsu-blue text-black hover:text-white px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-white/5 active:shadow-none"
              >
                <StravaLogo className="w-4 h-4 transition-transform group-hover:rotate-12" />
                <span>連結 STRAVA</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-4">
          {!athlete && !isLoading && (
            <button
              onClick={handleConnect}
              className="bg-white text-black p-2 rounded-full shadow-lg active:scale-95"
            >
              <StravaLogo className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-white hover:text-tsu-blue transition-colors p-1"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 h-[calc(100vh-70px)] overflow-y-auto bg-[#1a1a1a] border-b border-slate-800 animate-in slide-in-from-top duration-300 pb-10">
          <nav className="flex flex-col p-4 gap-2">
            {athlete && (
              <div className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-2xl mb-4 border border-slate-800">
                <img src={athlete.profile} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-tsu-blue" />
                <div className="flex-1">
                  <div className="text-white font-black uppercase text-sm">{athlete.firstname} {athlete.lastname}</div>
                  <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                    {isAdmin && <Shield className="w-3 h-3 text-red-500" />}
                    {isAdmin ? 'Administrator' : isBound ? 'TCU Certified' : 'Strava Connected'}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => handleNavigate(ViewType.LANDING)}
              className={`flex items-center px-6 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${currentView === ViewType.LANDING ? 'bg-tsu-blue/10 text-tsu-blue' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <Compass className="w-5 h-5 mr-3" />
              探索活動
            </button>
            <button
              onClick={() => handleNavigate(ViewType.LEADERBOARD)}
              className={`flex items-center px-6 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${currentView === ViewType.LEADERBOARD ? 'bg-tsu-blue/10 text-tsu-blue' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <BarChart3 className="w-5 h-5 mr-3" />
              排行榜
            </button>
            <button
              onClick={() => handleNavigate(ViewType.DASHBOARD)}
              className={`flex items-center px-6 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${currentView === ViewType.DASHBOARD ? 'bg-tsu-blue/10 text-tsu-blue' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <LayoutDashboard className="w-5 h-5 mr-3" />
              個人儀表板
            </button>
            <button
              onClick={() => handleNavigate(ViewType.MAINTENANCE)}
              className={`flex items-center px-6 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${currentView === ViewType.MAINTENANCE ? 'bg-tsu-blue/10 text-tsu-blue' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <Wrench className="w-5 h-5 mr-3" />
              保養紀錄
            </button>
            <button
              onClick={() => handleNavigate(ViewType.MEMBER_BINDING)}
              className={`flex items-center px-6 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${currentView === ViewType.MEMBER_BINDING
                ? (isBound === false ? 'bg-yellow-400/10 text-yellow-400' : 'bg-tsu-blue/10 text-tsu-blue')
                : (isBound === false ? 'text-yellow-400/90 hover:bg-yellow-400/5' : 'text-slate-400 hover:bg-slate-800')
                } ${isBound === false ? 'ring-2 ring-yellow-400 animate-glow-yellow ring-inset mx-2' : ''}`}
            >
              <UserCheck className="w-5 h-5 mr-3" />
              {isBound ? 'TCU 會員資料' : 'TCU 綁定'}
            </button>
            {isBound && (
              <button
                onClick={() => {
                  onNavigate(ViewType.TEAM_DASHBOARD);
                  setIsMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${currentView === ViewType.TEAM_DASHBOARD
                  ? 'bg-tsu-blue/10 text-tsu-blue'
                  : 'text-slate-500 hover:bg-slate-50'
                  }`}
              >
                <Users2 className="w-5 h-5" />
                <span>我的車隊</span>
              </button>
            )}

            {isBound && (
              <button
                onClick={() => handleNavigate(ViewType.AI_COACH)}
                className={`flex items-center px-6 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${currentView === ViewType.AI_COACH ? 'bg-tsu-blue/10 text-tsu-blue' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                <Zap className="w-5 h-5 mr-3" />
                AI 功率訓練教室
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => handleNavigate(ViewType.ADMIN)}
                className={`flex items-center px-6 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${currentView === ViewType.ADMIN ? 'bg-red-600/10 text-red-600' : 'text-red-400 hover:bg-red-600/5'}`}
              >
                <Shield className="w-5 h-5 mr-3" />
                ADMIN PANEL
              </button>
            )}

            {!athlete && !isLoading && (
              <button
                onClick={handleConnect}
                className="mt-4 flex items-center justify-center gap-3 bg-white text-black py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl active:scale-95"
              >
                <StravaLogo theme="dark" className="w-6 h-6" />
                連結 STRAVA
              </button>
            )}

            {athlete && (
              <button
                onClick={logout}
                className="mt-4 flex items-center justify-center gap-3 bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-slate-700/50 py-4 rounded-xl font-bold uppercase tracking-widest transition-all"
              >
                <span>登出系統</span>
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
