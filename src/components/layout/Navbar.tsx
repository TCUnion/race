
import React, { useState, useEffect, useRef } from 'react';
import { ViewType } from '../../types';
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
  Users2,
  Store
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import StravaLogo from '../ui/StravaLogo';
import ThemeToggle from '../ui/ThemeToggle';
import LanguageSwitcher from '../ui/LanguageSwitcher';
import { useAuth, StravaAthlete } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useFontSize, FontSize } from '../../hooks/useFontSize';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../../lib/api_config';
import { useMemberAuthorizations } from '../../hooks/useMemberAuthorizations';

interface NavbarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
}

const CONFIG = {
  stravaAuthUrl: 'https://service.criterium.tw/webhook/strava/auth/start',
  storageKey: 'strava_athlete_data', // 與 useAuth 一致
  pollingInterval: 1000,
  pollingTimeout: 120000,
  allowedOrigins: [
    'https://n8n.criterium.tw',
    'https://service.criterium.tw',
    'https://criterium.tw',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
  ]
};

const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { athlete, isBound, isAdmin, logout } = useAuth();
  const { theme } = useTheme();
  const { fontSize, setFontSize } = useFontSize();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const authWindowRef = useRef<Window | null>(null);
  const { pendingAuthorizations } = useMemberAuthorizations();

  // 監聽 postMessage (確保 Navbar 也能收到)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'STRAVA_AUTH_SUCCESS') {

        // 合併 athlete 物件到頂層，確保 firstname/lastname 可被存取
        const fullData = {
          ...event.data,
          ...(event.data.athlete || {})
        };
        saveAndSetAthlete(fullData);
        stopPolling();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // 根據主題選擇 Logo
  const logoSrc = theme === 'dark' ? '/tcu-logo-light.png' : '/tcu-logo-dark.png';

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
    const numericId = Number(athleteData.id);
    if (athleteData.access_token && !isNaN(numericId) && numericId !== 0) {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        await fetch(`${API_BASE_URL}/api/auth/strava-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            athlete_id: numericId,
            access_token: athleteData.access_token,
            refresh_token: (athleteData as any).refresh_token || '',
            expires_at: (athleteData as any).expires_at || Math.floor(Date.now() / 1000) + 21600,
            user_id: user?.id
          })
        }).catch(err => console.warn('Navbar: 後端同步失敗', err));
      } catch (e) {
        console.error('Navbar: 儲存 Token 到後端過程發生錯誤', e);
      }
    }

    // 發送事件通知 useAuth
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

  // 3. Lock body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  // Restore functions
  const handleNavigate = (view: ViewType) => {
    onNavigate(view);
    setIsMenuOpen(false);
  };

  const handleConnect = () => {
    setIsLoading(true);
    setIsMenuOpen(false);
    localStorage.removeItem(CONFIG.storageKey + '_temp');

    const width = 600;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    const url = `${CONFIG.stravaAuthUrl}?return_url=${encodeURIComponent(window.location.href)}`;

    authWindowRef.current = window.open(
      url,
      'strava_auth',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );

    if (authWindowRef.current) {
      authWindowRef.current.focus();
      startPolling();
    } else {
      setIsLoading(false);
      alert(t('common.enable_popup', '請允許彈出視窗以進行 Strava 授權'));
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-solid border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#242424]/95 backdrop-blur-md transition-all duration-300">
      <div className="flex items-center justify-between px-4 sm:px-6 md:px-20 py-4 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 cursor-pointer group min-w-0 flex-shrink" onClick={() => handleNavigate(ViewType.LANDING)}>
          <img src={logoSrc} alt="TCU Logo" className="h-8 w-auto flex-shrink-0 transform transition-transform group-hover:scale-110" />
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex flex-1 justify-end gap-x-4 lg:gap-x-6 xl:gap-x-8 items-center">
          <nav className="flex items-center gap-x-3 lg:gap-x-5 xl:gap-x-8">
            <button
              onClick={() => handleNavigate(ViewType.LANDING)}
              className={`text-[10px] xl:text-xs font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 flex items-center gap-1 px-2 py-1 whitespace-nowrap ${currentView === ViewType.LANDING ? 'text-tcu-blue border-b-2 border-tcu-blue pb-1' : 'text-slate-400 hover:text-tcu-blue'}`}
            >
              {t('nav.explore')}
            </button>
            <button
              onClick={() => handleNavigate(ViewType.LEADERBOARD)}
              className={`text-[10px] xl:text-xs font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 flex items-center gap-1 whitespace-nowrap ${currentView === ViewType.LEADERBOARD ? 'text-tcu-blue border-b-2 border-tcu-blue pb-1' : 'text-slate-400 hover:text-tcu-blue'}`}
            >
              {t('nav.ranking')}
            </button>
            <button
              onClick={() => handleNavigate(ViewType.DASHBOARD)}
              className={`relative text-[10px] xl:text-xs font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 flex items-center gap-1 whitespace-nowrap ${currentView === ViewType.DASHBOARD ? 'text-tcu-blue border-b-2 border-tcu-blue pb-1' : 'text-slate-400 hover:text-tcu-blue'}`}
            >
              {t('nav.dashboard')}
              {pendingAuthorizations.length > 0 && (
                <span className="absolute -top-1 -right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </button>
            <button
              onClick={() => handleNavigate(ViewType.MAINTENANCE)}
              className={`text-[10px] xl:text-xs font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 flex items-center gap-1 whitespace-nowrap ${currentView === ViewType.MAINTENANCE ? 'text-tcu-blue border-b-2 border-tcu-blue pb-1' : 'text-slate-400 hover:text-tcu-blue'}`}
            >
              {t('nav.records')}
            </button>
            <button
              onClick={() => handleNavigate(ViewType.MEMBER_BINDING)}
              className={`text-[10px] xl:text-xs font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 flex items-center gap-1 px-2 py-1 whitespace-nowrap ${currentView === ViewType.MEMBER_BINDING
                ? (isBound === false ? 'text-yellow-400 border-b-2 border-yellow-400 pb-1' : 'text-tcu-blue border-b-2 border-tcu-blue pb-1')
                : (isBound === false ? 'text-yellow-400/90 hover:text-yellow-400' : 'text-slate-400 hover:text-tcu-blue')
                } ${isBound === false ? 'ring-2 ring-yellow-400 animate-glow-yellow' : ''} ${isBound === null ? 'opacity-50 grayscale pointer-events-none' : ''}`}
            >
              {isBound === true ? t('nav.members') : t('nav.members_bind')}
            </button>
            {isBound && (
              <button
                onClick={() => onNavigate(ViewType.TEAM_DASHBOARD)}
                className={`text-[10px] xl:text-xs font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 flex items-center gap-1 whitespace-nowrap ${currentView === ViewType.TEAM_DASHBOARD ? 'text-yellow-500 border-b-2 border-yellow-500 pb-1' : 'text-slate-400 hover:text-yellow-500'}`}
              >
                <Users2 className="w-3 h-3" />
                {t('nav.my_team')}
              </button>
            )}
            {isBound && (
              <button
                onClick={() => handleNavigate(ViewType.AI_COACH)}
                className={`text-[10px] xl:text-xs font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 flex items-center gap-1 whitespace-nowrap ${currentView === ViewType.AI_COACH ? 'text-tcu-blue border-b-2 border-tcu-blue pb-1' : 'text-slate-400 hover:text-tcu-blue'}`}
              >
                <Zap className="w-3 h-3" />
                {t('nav.ai_coach')}
              </button>
            )}

            <button
              onClick={() => handleNavigate(ViewType.SETTINGS)}
              className={`text-[10px] xl:text-xs font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 flex items-center gap-1 whitespace-nowrap ${currentView === ViewType.SETTINGS ? 'text-tcu-blue border-b-2 border-tcu-blue pb-1' : 'text-slate-400 hover:text-tcu-blue'}`}
            >
              設定
            </button>


            {isAdmin && (
              <div className="hidden"></div>
            )}

          </nav>

          <div className="flex items-center gap-4 pl-4 border-l border-slate-200 dark:border-slate-800">
            <LanguageSwitcher />
            <ThemeToggle />
            {isLoading ? (
              <div className="flex items-center gap-2 text-tcu-blue">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest">{t('common.authorizing')}</span>
              </div>
            ) : athlete ? (
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800 group">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider group-hover:text-tcu-blue transition-colors">
                    {(() => {
                      const name = `${athlete.firstname || ''} ${athlete.lastname || ''}`.trim();
                      return (name && !name.toLowerCase().includes('undefined')) ? name : 'Guest';
                    })()}
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
                    className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-slate-800 group-hover:border-tcu-blue transition-all cursor-pointer"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                  />
                  {isBound && (
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5 border-2 border-white dark:border-[#242424]">
                      <UserCheck className="w-2 h-2 text-white" />
                    </div>
                  )}
                </div>
                <button
                  onClick={logout}
                  className="text-[10px] font-black text-slate-500 hover:text-red-500 uppercase tracking-widest transition-colors"
                >
                  {t('nav.logout')}
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                className="group relative flex items-center gap-2 bg-white hover:bg-tcu-blue text-black hover:text-white px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-white/5 active:shadow-none"
              >
                <StravaLogo className="w-4 h-4 transition-transform group-hover:rotate-12" />
                <span>{t('common.connect_strava').toUpperCase()}</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex lg:hidden items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
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
            className="text-slate-700 dark:text-white hover:text-tcu-blue transition-colors p-1 relative"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            {pendingAuthorizations.length > 0 && !isMenuOpen && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-white dark:border-[#242424]"></span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 h-[calc(100dvh-70px)] overflow-y-auto bg-white dark:bg-[#1a1a1a] border-b border-slate-200 dark:border-slate-800 animate-in slide-in-from-top duration-300 pb-10 shadow-2xl z-40">
          <nav className="flex flex-col p-4 gap-2">
            {athlete && (
              <div className="flex items-center gap-4 p-4 bg-slate-100 dark:bg-slate-900/50 rounded-2xl mb-4 border border-slate-200 dark:border-slate-800">
                <img src={athlete.profile} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-tcu-blue" />
                <div className="flex-1">
                  <div className="text-slate-900 dark:text-white font-black uppercase text-sm">{athlete.firstname} {athlete.lastname}</div>
                  <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                    {isAdmin && <Shield className="w-3 h-3 text-red-500" />}
                    {isAdmin ? 'Administrator' : isBound ? 'TCU Certified' : 'Strava Connected'}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => handleNavigate(ViewType.LANDING)}
              className={`flex items-center px-6 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${currentView === ViewType.LANDING ? 'bg-tcu-blue/10 text-tcu-blue' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <Compass className="w-5 h-5 mr-3" />
              {t('nav.explore')}
            </button>
            <button
              onClick={() => handleNavigate(ViewType.LEADERBOARD)}
              className={`flex items-center px-6 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${currentView === ViewType.LEADERBOARD ? 'bg-tcu-blue/10 text-tcu-blue' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <BarChart3 className="w-5 h-5 mr-3" />
              {t('nav.ranking')}
            </button>
            <button
              onClick={() => handleNavigate(ViewType.DASHBOARD)}
              className={`relative flex items-center px-6 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${currentView === ViewType.DASHBOARD ? 'bg-tcu-blue/10 text-tcu-blue' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <LayoutDashboard className="w-5 h-5 mr-3" />
              {t('nav.dashboard')}
              {pendingAuthorizations.length > 0 && (
                <span className="ml-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </button>
            <button
              onClick={() => handleNavigate(ViewType.MAINTENANCE)}
              className={`flex items-center px-6 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${currentView === ViewType.MAINTENANCE ? 'bg-tcu-blue/10 text-tcu-blue' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <Wrench className="w-5 h-5 mr-3" />
              {t('nav.records')}
            </button>
            <button
              onClick={() => handleNavigate(ViewType.MEMBER_BINDING)}
              className={`flex items-center px-6 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${currentView === ViewType.MEMBER_BINDING
                ? (isBound === false ? 'bg-yellow-400/10 text-yellow-400' : 'bg-tcu-blue/10 text-tcu-blue')
                : (isBound === false ? 'text-yellow-400/90 hover:bg-yellow-400/5' : 'text-slate-400 hover:bg-slate-800')
                } ${isBound === false ? 'ring-2 ring-yellow-400 animate-glow-yellow ring-inset mx-2' : ''}`}
            >
              <UserCheck className="w-5 h-5 mr-3" />
              {isBound ? t('nav.members') : t('nav.members_bind')}
            </button>
            {isBound && (
              <button
                onClick={() => {
                  onNavigate(ViewType.TEAM_DASHBOARD);
                  setIsMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${currentView === ViewType.TEAM_DASHBOARD
                  ? 'bg-yellow-500/10 text-yellow-500'
                  : 'text-slate-500 hover:bg-slate-50'
                  }`}
              >
                <Users2 className="w-5 h-5" />
                <span>{t('nav.my_team')}</span>
              </button>
            )}

            {isBound && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleNavigate(ViewType.AI_COACH)}
                  className={`flex items-center px-6 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${currentView === ViewType.AI_COACH ? 'bg-tcu-blue/10 text-tcu-blue' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  <Zap className="w-5 h-5 mr-3" />
                  {t('nav.ai_coach')}
                </button>
                {/* Font Size Adjustment - Only shown when in AI Coach view for better context, or always in Bound mode */}
                {isBound && (
                  <div className="flex flex-col gap-2 px-2 py-3 bg-slate-50 dark:bg-slate-900/30 rounded-2xl mx-2 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between px-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">字型大小</span>
                      <span className="text-[8px] font-bold text-tcu-blue bg-tcu-blue/10 px-1.5 py-0.5 rounded uppercase">{fontSize}</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">
                      {(['xs', 'sm', 'base', 'lg', 'xl'] as FontSize[]).map((size) => (
                        <button
                          key={size}
                          onClick={() => setFontSize(size)}
                          className={`h-9 rounded-lg flex items-center justify-center text-[10px] font-black transition-all active:scale-90 ${fontSize === size
                            ? 'bg-tcu-blue text-white shadow-lg'
                            : 'text-slate-400 hover:text-tcu-blue hover:bg-slate-50 dark:hover:bg-slate-700/50'
                            }`}
                        >
                          {size.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => handleNavigate(ViewType.SETTINGS)}
              className={`flex items-center px-6 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${currentView === ViewType.SETTINGS ? 'bg-tcu-blue/10 text-tcu-blue' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <Users2 className="w-5 h-5 mr-3" />
              設定
            </button>

            {/* Admin Button Removed from original position */}

            {!athlete && !isLoading && (
              <button
                onClick={handleConnect}
                className="mt-4 flex items-center justify-center gap-3 bg-white text-black py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl active:scale-95"
              >
                <StravaLogo theme="dark" className="w-6 h-6" />
                {t('common.connect_strava').toUpperCase()}
              </button>
            )}

            {athlete && (
              <button
                onClick={logout}
                className="mt-4 flex items-center justify-center gap-3 bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-slate-700/50 py-4 rounded-xl font-bold uppercase tracking-widest transition-all"
              >
                <span>{t('nav.logout_system')}</span>
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => handleNavigate(ViewType.ADMIN)}
                className={`mt-4 w-full flex items-center justify-center px-6 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${currentView === ViewType.ADMIN ? 'bg-red-600/10 text-red-600' : 'text-red-400 hover:bg-red-600/5'}`}
              >
                <Shield className="w-5 h-5 mr-3" />
                {t('nav.admin')} PANEL
              </button>
            )}

            <button
              onClick={() => setIsMenuOpen(false)}
              className="mt-8 w-full flex items-center justify-center px-6 py-4 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5 mr-2" />
              關閉選單
            </button>

          </nav>
        </div >
      )}
    </header >
  );
};

export default Navbar;
