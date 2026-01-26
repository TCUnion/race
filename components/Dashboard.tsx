import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useSegmentData, formatTime } from '../hooks/useSegmentData';
import SegmentMap from './SegmentMap';
import { MOCK_SEGMENT_STATS } from '../constants';
import { Activity, ViewType } from '../types';


const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded ${className}`}></div>
);

const PerformanceCardSkeleton = () => (
  <div className="flex flex-col gap-2 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
    <Skeleton className="h-4 w-24 mb-2" />
    <Skeleton className="h-10 w-32" />
    <Skeleton className="h-4 w-20 mt-2" />
  </div>
);

const ActivitySkeleton = () => (
  <div className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
    <div className="flex items-center gap-4">
      <Skeleton className="size-10 md:size-12 rounded-full" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32 md:w-48" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
    <div className="flex items-center gap-4 md:gap-8">
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-10 w-10" />
    </div>
  </div>
);

import {
  Link2Off,
  UserCheck,
  RefreshCw,
  CheckCircle2,
  Trophy,
  Timer,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Award,
  ChevronsUp,
  Star,
  Bike,
  Info,
  Ruler,
  Mountain,
  MapPin,
  Zap,
  Gauge,
  ExternalLink
} from 'lucide-react';
import WorkshopAuthorizationInbox from './WorkshopAuthorizationInbox';

interface DashboardProps {
  onNavigate: (view: ViewType) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { segment, segments } = useSegmentData();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [athlete, setAthlete] = useState<any>(null);
  const [registeredSegments, setRegisteredSegments] = useState<any[]>([]);
  const [currentSegmentId, setCurrentSegmentId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [registrationError, setRegistrationError] = useState(false);
  const [direction, setDirection] = useState(0); // 1: next, -1: prev

  // 定義多組配色主題
  const themes = [
    {
      id: 'tcu',
      primary: 'tcu-blue',
      light: 'tcu-blue-light',
      bg: 'bg-tcu-blue-light/5',
      border: 'border-tcu-blue',
      text: 'text-tcu-blue',
      textLight: 'text-tcu-blue-light',
      shadow: 'shadow-tcu-blue/20',
      gradient: 'from-tcu-blue to-tcu-blue-light'
    },
    {
      id: 'strava',
      primary: 'strava-orange',
      light: 'strava-orange',
      bg: 'bg-strava-orange/5',
      border: 'border-strava-orange',
      text: 'text-strava-orange',
      textLight: 'text-strava-orange',
      shadow: 'shadow-strava-orange/20',
      gradient: 'from-strava-orange to-orange-400'
    },
    {
      id: 'emerald',
      primary: 'emerald-600',
      light: 'emerald-500',
      bg: 'bg-emerald-500/5',
      border: 'border-emerald-500',
      text: 'text-emerald-600',
      textLight: 'text-emerald-500',
      shadow: 'shadow-emerald-500/20',
      gradient: 'from-emerald-600 to-emerald-400'
    },
    {
      id: 'purple',
      primary: 'purple-600',
      light: 'purple-500',
      bg: 'bg-purple-500/5',
      border: 'border-purple-500',
      text: 'text-purple-600',
      textLight: 'text-purple-500',
      shadow: 'shadow-purple-500/20',
      gradient: 'from-purple-600 to-purple-400'
    },
    {
      id: 'rose',
      primary: 'rose-600',
      light: 'rose-500',
      bg: 'bg-rose-500/5',
      border: 'border-rose-500',
      text: 'text-rose-600',
      textLight: 'text-rose-500',
      shadow: 'shadow-rose-500/20',
      gradient: 'from-rose-600 to-rose-400'
    },
  ];

  const currentIdx = registeredSegments.findIndex(r => r.segment_id === currentSegmentId);
  const theme = themes[currentIdx >= 0 ? currentIdx % themes.length : 0];

  // Failsafe: Prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading && registeredSegments.length === 0) {
        console.warn('Dashboard: Loading timed out');
        setIsLoading(false);
        setRegistrationError(true);
      }
    }, 8000); // 8 seconds timeout
    return () => clearTimeout(timer);
  }, [isLoading, registeredSegments.length]);

  useEffect(() => {
    const loadAthlete = () => {
      const athleteDataString = localStorage.getItem('strava_athlete_data');
      if (athleteDataString) {
        try {
          const athleteData = JSON.parse(athleteDataString);
          setAthlete(athleteData);
          if (segments.length > 0) {
            fetchAllRegistrations(athleteData.id);
          }
        } catch (e) {
          console.error('Dashboard: Access token parse error', e);
          localStorage.removeItem('strava_athlete_data');
          setAthlete(null);
          setIsLoading(false);
        }
      } else {
        setAthlete(null);
        setIsLoading(false);
      }
    };

    loadAthlete();

    // 監聽來自其他元件的狀態變更
    window.addEventListener('strava-auth-changed', loadAthlete);
    window.addEventListener('storage', loadAthlete);

    return () => {
      window.removeEventListener('strava-auth-changed', loadAthlete);
      window.removeEventListener('storage', loadAthlete);
    };
  }, [segments]);

  const fetchAllRegistrations = async (athleteId: string | number) => {
    setIsLoading(true);
    setRegistrationError(false);

    try {
      // 抓取該選手的所有報名
      const { data, error } = await supabase
        .from('registrations')
        .select('*, segments(*)')
        .eq('strava_athlete_id', athleteId);

      if (error) throw error;

      if (data && data.length > 0) {
        setRegisteredSegments(data);
        // 預設選擇第一個報名的路段
        setCurrentSegmentId(data[0].segment_id);
      } else {
        setRegisteredSegments([]);
      }
    } catch (err) {
      console.error('檢查報名狀態失敗:', err);
      setRegistrationError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedSegment = segments.find(s => s.id === currentSegmentId) || (registeredSegments.length > 0 ? registeredSegments[0].segments : null);

  // 抓取選手在該路段的活動紀錄
  useEffect(() => {
    const fetchEfforts = async () => {
      if (!athlete || !currentSegmentId) return;

      try {
        const { data, error } = await supabase
          .from('segment_efforts')
          .select('*')
          .eq('athlete_id', athlete.id)
          .eq('segment_id', currentSegmentId)
          .order('start_date', { ascending: false });

        if (error) throw error;

        if (data) {
          const mappedActivities: Activity[] = data.map(effort => ({
            id: effort.id,
            title: effort.athlete_name || 'Segment Effort',
            date: new Date(effort.start_date).toLocaleDateString(),
            time: formatTime(effort.elapsed_time),
            power: `${Math.round(effort.average_watts || 0)}W`,
            is_pr: false
          }));
          setActivities(mappedActivities);
        }
      } catch (err) {
        console.error('抓取活動紀錄失敗:', err);
      }
    };

    if (registeredSegments.length > 0) {
      fetchEfforts();
    }
  }, [athlete, currentSegmentId, registeredSegments]);

  // 從排行榜中尋找選手的排名與最佳表現
  const { leaderboardsMap } = useSegmentData();
  const currentLeaderboard = currentSegmentId ? leaderboardsMap[currentSegmentId] || [] : [];
  const athleteEffort = currentLeaderboard.find(e => Number(e.athlete_id) === Number(athlete?.id));

  if (!athlete) {
    // ... (unchanged)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-10 text-center">
        <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md">
          <Link2Off className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-black uppercase italic mb-2">尚未連結 Strava</h2>
          <p className="text-slate-500 text-sm mb-6">請先返回首頁連結您的 Strava 帳號，以便取得您的活動數據並進行報名。</p>
          <button
            onClick={() => window.location.hash = ''}
            className="bg-tcu-blue text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-tcu-blue-light transition-all"
          >
            返回首頁
          </button>
        </div>
      </div>
    );
  }

  if (isLoading && registeredSegments.length === 0 && !registrationError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-${theme.primary}`}></div>
      </div>
    );
  }

  if (registrationError && registeredSegments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-red-400 font-bold">無法載入報名資訊</div>
        <button
          onClick={() => athlete && fetchAllRegistrations(athlete.id)}
          className="px-6 py-2 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition"
        >
          重試
        </button>
      </div>
    );
  }

  // Show warning if not registered for any segment
  if (registeredSegments.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-10 text-center">
        <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md">
          <UserCheck className={`w-16 h-16 ${theme.text} mx-auto mb-4`} />
          <h2 className="text-xl font-black uppercase italic mb-2 text-slate-900 dark:text-white">尚未報名任何路段</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">您尚未參與任何挑戰路段。請前往報名頁面選擇感興趣的路段，開始您的挑戰之旅！</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => onNavigate(ViewType.REGISTER)}
              className={`bg-${theme.primary} text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:brightness-110 transition-all shadow-lg ${theme.shadow} w-full`}
            >
              前往報名頁面
            </button>
            <button
              onClick={() => window.location.hash = ''}
              className="bg-white/10 text-white/50 px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-white/20 transition-all w-full"
            >
              返回首頁
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 處理滑動邏輯

  const handleDragEnd = (_: any, info: any) => {
    const swipeThreshold = 50;
    if (info.offset.x < -swipeThreshold) {
      // Swipe Left -> Next
      const nextIdx = (currentIdx + 1) % registeredSegments.length;
      setDirection(1);
      setCurrentSegmentId(registeredSegments[nextIdx].segment_id);
    } else if (info.offset.x > swipeThreshold) {
      // Swipe Right -> Prev
      const prevIdx = (currentIdx - 1 + registeredSegments.length) % registeredSegments.length;
      setDirection(-1);
      setCurrentSegmentId(registeredSegments[prevIdx].segment_id);
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  };

  return (
    <div className="flex flex-col items-center w-full pb-10 overflow-x-hidden">
      <div className="w-full max-w-[1200px] px-6 md:px-10 lg:px-20 py-4 flex flex-col gap-6">

        {/* Dashboard Header - Always Visible */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col gap-4">
            <div className={`flex items-center gap-2 ${theme.textLight}`}>
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">TCU Challenge Series</span>
            </div>
            <div className="flex items-center gap-5">
              {athlete && (
                <div className="relative shrink-0">
                  <img
                    src={athlete.profile_medium || athlete.profile || "https://www.strava.com/assets/users/placeholder_athlete.png"}
                    alt={athlete.firstname}
                    className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-white dark:border-slate-800 shadow-xl object-cover"
                  />
                  <div className={`absolute -bottom-1 -right-1 bg-${theme.primary} text-white rounded-full p-1.5 shadow-lg border-2 border-white dark:border-slate-900`}>
                    <UserCheck className="w-4 h-4" />
                  </div>
                </div>
              )}
              <div>
                <h1 className="text-slate-900 dark:text-white text-2xl md:text-4xl font-black leading-tight tracking-tight uppercase italic">
                  {athlete ? `${athlete.firstname || ''} ${athlete.lastname || ''}`.trim() : '個人儀表板'}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base font-bold uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  {athlete ? `Strava Athlete #${athlete.id}` : '載入中...'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 w-full md:w-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => onNavigate(ViewType.REGISTER)}
                className={`flex flex-1 sm:w-auto cursor-pointer items-center justify-center gap-2 rounded-xl h-14 md:h-12 px-6 bg-white/5 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:${theme.border} text-slate-900 dark:text-white text-base md:text-sm font-bold transition-all active:scale-95 group`}
              >
                <UserCheck className={`w-5 h-5 ${theme.textLight}`} />
                <span>管理報名 / 報名新路段</span>
              </button>

            </div>
            <div className="text-center md:text-right">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed uppercase tracking-widest font-bold">資料每小時自動更新</p>
            </div>
          </div>
        </section>

        {/* Workshop Authorization Inbox */}
        <WorkshopAuthorizationInbox />

        {/* Synchronized Slides */}
        <div className="relative min-h-[800px]">
          <AnimatePresence mode="popLayout" custom={direction} initial={false}>
            <motion.div
              key={currentSegmentId}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              className="flex flex-col gap-6 w-full cursor-grab active:cursor-grabbing touch-pan-y"
              style={{ touchAction: "pan-y" }}
            >

              {/* Indicator Dots */}
              <section className="flex flex-col gap-1 items-center">
                <h2 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">左右滑動切換路段詳情</h2>
                <div className="flex gap-1">
                  {registeredSegments.map((reg, idx) => (
                    <div
                      key={`dot-${reg.id}`}
                      className={`h-1 rounded-full transition-all duration-300 ${currentSegmentId === reg.segment_id ? `w-6 bg-${theme.primary}` : 'w-2 bg-slate-300 dark:bg-slate-700'}`}
                    />
                  ))}
                </div>
              </section>

              {/* Draggable Card Area */}
              <section className="flex justify-center">
                <div
                  className="relative w-full max-w-[400px] h-[180px] perspective-1000"
                >
                  <div className={`bg-white dark:bg-slate-900 rounded-3xl border-2 ${theme.border} p-6 shadow-2xl flex flex-col justify-between h-full relative overflow-hidden group transition-colors duration-500`}>
                    {/* Background Decoration */}
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                      <Trophy className="w-32 h-32 rotate-12" />
                    </div>

                    <div className="flex justify-between items-start relative z-10 pointer-events-none">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">#{registeredSegments[currentIdx]?.segments?.strava_id}</span>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight mt-1">{registeredSegments[currentIdx]?.segments?.description || registeredSegments[currentIdx]?.segments?.name}</h3>
                      </div>
                      <CheckCircle2 className={`w-6 h-6 ${theme.text}`} />
                    </div>

                    <div className="flex items-end justify-between relative z-10 pointer-events-none">
                      <div className="flex gap-2">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${registeredSegments[currentIdx]?.status === 'approved' ? 'bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400' : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400'}`}>
                          {registeredSegments[currentIdx]?.status === 'approved' ? '已核准' : '審核中'}
                        </span>
                        <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                          #{registeredSegments[currentIdx]?.number || '未配號'}
                        </span>
                      </div>
                      <div className="flex -space-x-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-800" />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Hint for next card */}
                  {registeredSegments.length > 1 && (
                    <div className="absolute inset-0 -z-10 translate-y-4 scale-95 opacity-40 blur-[1px] pointer-events-none">
                      <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-200 dark:border-slate-800 p-6 h-full" />
                    </div>
                  )}
                </div>
              </section>

              {/* Performance Cards - Synchronized */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                  <>
                    <PerformanceCardSkeleton />
                    <PerformanceCardSkeleton />
                    <PerformanceCardSkeleton />
                  </>
                ) : (
                  <>
                    {/* Best Time */}
                    <div className={`flex flex-col gap-2 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm transition-all duration-300 group hover:${theme.border}/50`}>
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-widest">最佳時間</p>
                        <Timer className={`w-5 h-5 ${theme.textLight} transition-colors duration-500`} />
                      </div>
                      <p className="text-slate-900 dark:text-white tracking-tight text-4xl font-black leading-none">
                        {athleteEffort ? formatTime(athleteEffort.elapsed_time) : '-'}
                      </p>
                      <div className="flex items-center gap-1 text-emerald-500 mt-2">
                        <TrendingDown className="w-4 h-4 font-bold" />
                        <p className="text-sm font-bold">{athleteEffort?.average_watts ? `${Math.round(athleteEffort.average_watts)}W` : '記錄同步中'}</p>
                      </div>
                    </div>

                    {/* Average Speed */}
                    <div className={`flex flex-col gap-2 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm transition-all duration-300 group hover:${theme.border}/50`}>
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-widest">平均時速</p>
                        <Gauge className={`w-5 h-5 ${theme.textLight} transition-colors duration-500`} />
                      </div>
                      <p className="text-slate-900 dark:text-white tracking-tight text-4xl font-black leading-none">
                        {athleteEffort?.average_speed ? (athleteEffort.average_speed * 3.6).toFixed(1) : '-'}{' '}
                        <span className="text-lg font-normal text-slate-500">km/h</span>
                      </p>
                      <div className="flex items-center gap-1 text-emerald-500 mt-2">
                        <TrendingUp className="w-4 h-4 font-bold" />
                        <p className="text-sm font-bold">目前最新數據</p>
                      </div>
                    </div>

                    {/* Current Rank */}
                    <div className={`flex flex-col gap-2 rounded-2xl p-6 border-2 ${theme.border}/50 ${theme.bg} sm:col-span-2 lg:col-span-1 shadow-inner group overflow-hidden relative transition-all duration-500`}>
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <BarChart3 className="w-24 h-24 absolute -top-4 -right-4" />
                      </div>
                      <div className="flex justify-between items-start mb-1 relative z-10">
                        <p className={`${theme.textLight} text-xs font-bold uppercase tracking-widest transition-colors duration-500`}>目前排名</p>
                        <Award className={`w-6 h-6 ${theme.textLight} transition-colors duration-500`} />
                      </div>
                      <p className="text-slate-900 dark:text-white tracking-tight text-5xl font-black leading-none relative z-10">
                        {athleteEffort ? `#${athleteEffort.rank}` : '-'}
                      </p>
                      <div className={`flex items-center gap-1 ${theme.textLight} mt-2 relative z-10`}>
                        <ChevronsUp className="w-4 h-4 font-bold" />
                        <p className="text-sm font-bold uppercase tracking-tighter">
                          {athleteEffort ? `總計 ${currentLeaderboard.length} 名挑戰者` : '努力刷新排名中'}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </section>

              {/* Goal Progress - Synchronized */}
              <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 p-6 shadow-sm backdrop-blur-sm">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <h3 className="text-slate-900 dark:text-white text-lg font-bold">挑戰進度</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">距離 Top 10 還差 1:15</p>
                    </div>
                    <p className={`${theme.textLight} text-2xl font-black transition-colors duration-500`}>85%</p>
                  </div>
                  <div className="relative w-full h-4 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`absolute top-0 left-0 h-full bg-gradient-to-r ${theme.gradient} rounded-full shadow-[0_0_12px_rgba(0,123,255,0.4)] transition-all duration-1000 ease-out`}
                      style={{ width: isLoading ? '0%' : '85%' }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-black">
                    <span>START</span>
                    <span className={theme.textLight}>TOP 10 GOAL (41:00)</span>
                  </div>
                </div>
              </section>

              {/* Recent Activities - Synchronized */}
              <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-slate-900 dark:text-white text-xl md:text-2xl font-bold leading-tight tracking-tight">近期嘗試紀錄</h2>
                  <div className="flex gap-2">
                    <button className={`${theme.bg} ${theme.textLight} px-4 py-1.5 rounded-full text-xs font-bold hover:brightness-95 transition-all`}>當月</button>
                    <button className="text-slate-500 dark:text-slate-400 px-4 py-1.5 rounded-full text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">全部</button>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {isLoading ? (
                    <>
                      <ActivitySkeleton />
                      <ActivitySkeleton />
                    </>
                  ) : activities.length > 0 ? (
                    activities.map((activity) => (
                      <div key={activity.id} className={`flex items-center justify-between p-4 rounded-2xl bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:${theme.border}/50 transition-all group shadow-sm hover:shadow-md backdrop-blur-sm`}>
                        <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                          <div className={`flex shrink-0 size-10 md:size-12 items-center justify-center rounded-full transition-transform group-hover:scale-110 ${activity.is_pr ? `${theme.bg} ${theme.textLight} shadow-inner` : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                            {activity.is_pr ? <Star className="w-5 h-5 fill-current" /> : <Bike className="w-5 h-5" />}
                          </div>
                          <div className="truncate">
                            <h4 className={`text-slate-900 dark:text-white font-bold truncate block text-sm md:text-base group-hover:${theme.textLight} transition-colors`}>{activity.title}</h4>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-medium">{activity.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 md:gap-8 text-right shrink-0">
                          <div className="hidden sm:block">
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-widest">Power</p>
                            <p className="text-slate-900 dark:text-white font-black text-sm">{activity.power}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-widest">Time</p>
                            <p className={`${theme.text} dark:${theme.textLight} font-black text-xl transition-colors duration-500`}>{activity.time}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 rounded-2xl bg-slate-50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800">
                      <Bike className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
                      <p className="text-slate-500 dark:text-slate-400 text-sm">尚未在此路段留下挑戰紀錄</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Route Info Section - Synchronized */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 h-56 md:h-64 relative group shadow-lg bg-slate-100 dark:bg-slate-900">
                  <div className="absolute inset-0 transition-transform duration-1000 group-hover:scale-105">
                    <SegmentMap polyline={selectedSegment?.polyline} />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"></div>
                  <div className="absolute bottom-6 left-6 flex flex-col gap-1 z-10">
                    <p className="text-[10px] text-white/90 font-bold uppercase tracking-widest drop-shadow-md">Route Profile</p>
                    <h4 className="text-white text-xl font-black drop-shadow-md">{selectedSegment?.description || selectedSegment?.name || '路線概況'}</h4>
                  </div>
                </div>
                <div className="rounded-2xl p-8 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex flex-col justify-center shadow-sm backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <Info className={`w-6 h-6 ${theme.textLight}`} />
                    <h4 className="text-slate-900 dark:text-white font-bold text-lg">Segment 詳細資訊</h4>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: '距離', value: selectedSegment ? `${(selectedSegment.distance / 1000).toFixed(2)} km` : MOCK_SEGMENT_STATS.distance, icon: <Ruler className="w-4 h-4" /> },
                      { label: '平均坡度', value: selectedSegment ? `${selectedSegment.average_grade}%` : MOCK_SEGMENT_STATS.grade, icon: <TrendingUp className="w-4 h-4" /> },
                      { label: '垂直爬升', value: selectedSegment ? `${selectedSegment.total_elevation_gain} m` : MOCK_SEGMENT_STATS.ascent, icon: <Mountain className="w-4 h-4" /> }
                    ].map((row, i) => (
                      <div key={i} className={`flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 ${i === 2 ? 'border-none pb-0' : ''}`}>
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          {row.icon}
                          <span className="text-xs font-bold uppercase tracking-wider">{row.label}</span>
                        </div>
                        <span className="text-slate-900 dark:text-white font-black font-mono">{row.value}</span>
                      </div>
                    ))}
                  </div>
                  {/* Strava 連結 */}
                  {selectedSegment?.link && (
                    <a
                      href={selectedSegment.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`mt-6 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r ${theme.gradient} text-white font-bold text-sm uppercase tracking-wider hover:brightness-110 transition-all shadow-lg`}
                    >
                      <ExternalLink className="w-4 h-4" />
                      在 Strava 上查看路段
                    </a>
                  )}
                </div>
              </section>

            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
