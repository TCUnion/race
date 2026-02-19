import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useSegmentData, formatTime } from '../../hooks/useSegmentData';
import { useRaceHistory, RaceSegment, RaceLeaderboardEntry } from '../../hooks/useRaceHistory';
import RaceLeaderboard from '../race/RaceLeaderboard';
import { MOCK_SEGMENT_STATS } from '../../constants';
import { Activity, ViewType } from '../../types';

// 動態載入地圖組件以減少初始 Bundle Size
const SegmentMap = React.lazy(() => import('../map/SegmentMap'));


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
  Calendar,
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
import WorkshopAuthorizationInbox from '../admin/WorkshopAuthorizationInbox';
import AnnouncementBanner from './AnnouncementBanner';

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

  // Leaderboard Modal State
  const { getLeaderboard } = useRaceHistory();
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<RaceLeaderboardEntry[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [selectedLeaderboardRace, setSelectedLeaderboardRace] = useState<RaceSegment | null>(null);

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
      // 抓取該選手的所有報名（不使用 embedded relationship 避免 PGRST200 錯誤）
      const { data: regData, error: regError } = await supabase
        .from('registrations')
        .select('*')
        .eq('strava_athlete_id', athleteId);

      if (regError) throw regError;

      if (regData && regData.length > 0) {
        // 取得所有相關的 segment_ids
        const segmentIds = regData.map(r => r.segment_id).filter(Boolean);

        // 分別查詢 segments 資料
        const { data: segmentsData, error: segError } = await supabase
          .from('segments')
          .select('*')
          .in('id', segmentIds);

        if (segError) throw segError;

        // 合併資料
        const segmentsMap = new Map(segmentsData?.map(s => [s.id, s]) || []);
        const mergedData = regData.map(reg => ({
          ...reg,
          segments: segmentsMap.get(reg.segment_id) || null
        }));

        setRegisteredSegments(mergedData);
        // 預設選擇第一個報名的路段
        setCurrentSegmentId(regData[0].segment_id);
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

  const handleOpenLeaderboard = async () => {
    if (!currentSegmentId || !selectedSegment) return;

    // Construct RaceSegment object from selectedSegment
    // Note: selectedSegment in Dashboard might lack some fields like participant_count, 
    // but we can pass minimum required or mock/calculate them.
    // For now we map available fields.
    const raceSegment: RaceSegment = {
      id: selectedSegment.id,
      strava_id: selectedSegment.strava_id,
      name: selectedSegment.name,
      description: selectedSegment.description,
      distance: selectedSegment.distance,
      average_grade: selectedSegment.average_grade,
      total_elevation_gain: selectedSegment.elevation_gain || 0,
      polyline: selectedSegment.polyline,
      // Map other fields if available in selectedSegment or fallback
      participant_count: 0, // Not available directly here, but maybe not critical for modal header
      start_date: selectedSegment.start_date,
      end_date: selectedSegment.end_date,
    };

    setSelectedLeaderboardRace(raceSegment);
    setIsLeaderboardOpen(true);
    setIsLoadingLeaderboard(true);

    try {
      const data = await getLeaderboard(currentSegmentId);
      setLeaderboardData(data);
    } catch (error) {
      console.error("Failed to load leaderboard", error);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  // Handle URL query parameters for deep linking
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const segmentIdParam = params.get('segment_id');
    if (segmentIdParam && registeredSegments.length > 0) {
      const targetId = Number(segmentIdParam);
      const exists = registeredSegments.some(r => r.segment_id === targetId);
      if (exists) {
        setCurrentSegmentId(targetId);
        // Clear param to keep URL clean (optional, keeping it allows refresh)
        // window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [registeredSegments]);

  const selectedSegment = segments.find(s => s.id === currentSegmentId) || (registeredSegments.length > 0 ? registeredSegments[0].segments : null);

  // 抓取選手在該路段的活動紀錄
  useEffect(() => {
    const fetchEfforts = async () => {
      if (!athlete || !currentSegmentId) return;

      try {
        const { data, error } = await supabase
          .from('segment_efforts_v2')
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
        <div className="bg-card text-card-foreground p-10 rounded-3xl border border-border shadow-xl max-w-md">
          <Link2Off className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-black uppercase italic mb-2">尚未連結 Strava</h2>
          <p className="text-muted-foreground text-sm mb-6">請先返回首頁連結您的 Strava 帳號，以便取得您的活動數據並進行報名。</p>
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
        <div className="bg-card text-card-foreground p-10 rounded-3xl border border-border shadow-xl max-w-md">
          <UserCheck className={`w-16 h-16 ${theme.text} mx-auto mb-4`} />
          <h2 className="text-xl font-black uppercase italic mb-2 text-foreground">尚未報名任何路段</h2>
          <p className="text-muted-foreground text-sm mb-6">您尚未參與任何挑戰路段。請前往報名頁面選擇感興趣的路段，開始您的挑戰之旅！</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => onNavigate?.(ViewType.REGISTER)}
              className={`bg-${theme.primary} text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:brightness-110 transition-all shadow-lg ${theme.shadow} w-full`}
            >
              前往報名頁面
            </button>
            <button
              onClick={() => onNavigate(ViewType.LANDING)}
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
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div className={`flex items-center gap-2 ${theme.textLight}`}>
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">TCU Challenge Series</span>
            </div>
            <div className="flex items-center gap-4">
              {athlete && (
                <div className="relative shrink-0">
                  <img
                    src={athlete?.profile}
                    alt={athlete?.lastname}
                    className="w-14 h-14 md:w-20 md:h-20 rounded-full border-4 border-white dark:border-slate-800 shadow-xl object-cover"
                    loading="lazy"
                  />
                  <div className={`absolute -bottom-1 -right-1 bg-${theme.primary} text-white rounded-full p-1 shadow-lg border-2 border-white dark:border-slate-900`}>
                    <UserCheck className="w-3 h-3" />
                  </div>
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <h1 className="text-foreground text-[10px] font-black leading-none tracking-tight uppercase italic drop-shadow-sm">
                  {athlete ? `${athlete.firstname || ''} ${athlete.lastname || ''}`.trim() : '報名'}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary/10 border border-border">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                      {athlete ? `ATHLETE #${athlete.id}` : 'LOADING...'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>


          <div className="flex flex-col gap-4">
            <button
              onClick={() => onNavigate?.(ViewType.REGISTER)}
              className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl h-12 px-6 bg-secondary/10 border border-border hover:${theme.border} text-foreground transition-all active:scale-95 group shadow-sm`}
            >
              <UserCheck className={`w-4 h-4 ${theme.textLight}`} />
              <span className="text-[11px] font-black uppercase tracking-[0.2em]">管理報名 / 報名新路段</span>
            </button>
            <div className="text-center">
              <p className="text-[9px] text-muted-foreground leading-relaxed uppercase tracking-widest font-bold">目前系統顯示為最新同步數據</p>
            </div>
          </div>
        </section>

        {/* Announcement Banner */}
        <AnnouncementBanner />

        {/* Workshop Authorization Inbox */}
        <WorkshopAuthorizationInbox />

        {/* Synchronized Slides */}
        <div className="relative min-h-[600px]">
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

              {/* Draggable Card Area - Integrated Map & Info */}
              <section className="flex justify-center">
                <div className="relative w-full max-w-[450px]">
                  <div className={`bg-card rounded-3xl border-2 ${theme.border} shadow-2xl flex flex-col h-[280px] relative overflow-hidden group transition-all duration-500`}>

                    {/* Integrated Map Section (Higher visibility) */}
                    <div className="absolute inset-0 opacity-80 dark:opacity-60 pointer-events-none">
                      <Suspense fallback={<div className="w-full h-full bg-muted animate-pulse" />}>
                        <SegmentMap polyline={selectedSegment?.polyline} minimal={true} />
                      </Suspense>
                    </div>

                    <div className="relative z-10 flex flex-col h-full p-6 bg-gradient-to-b from-white/80 via-white/20 to-white/80 dark:from-slate-900/80 dark:via-slate-900/20 dark:to-slate-900/80 pointer-events-none">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col max-w-[70%]">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">STRAVA ID: {registeredSegments[currentIdx]?.segments?.strava_id}</span>
                          <h3 className="text-xl md:text-2xl font-black text-foreground leading-tight mt-1 mb-2 drop-shadow-sm">
                            {registeredSegments[currentIdx]?.segments?.description || registeredSegments[currentIdx]?.segments?.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!currentSegmentId) return;
                              const url = `${window.location.origin}${window.location.pathname}?segment_id=${currentSegmentId}`;
                              navigator.clipboard.writeText(url).then(() => {
                                alert('賽事連結已複製！');
                              });
                            }}
                            className={`size-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white shadow-lg border border-white/20 transition-all`}
                            title="分享賽事連結"
                          >
                            <ExternalLink className="w-5 h-5" />
                          </button>
                          <div className={`size-10 rounded-full flex items-center justify-center ${theme.bg} ${theme.text} shadow-lg border border-white/20`}>
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                        </div>
                      </div>

                      {/* Integrated Detailed Stats */}
                      <div className="grid grid-cols-3 gap-2 my-auto">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">距離</span>
                          <span className="text-lg font-black text-foreground">
                            {selectedSegment ? (selectedSegment.distance / 1000).toFixed(2) : '--'} <span className="text-[10px] font-normal opacity-60">km</span>
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">坡度</span>
                          <span className="text-lg font-black text-foreground">
                            {selectedSegment ? selectedSegment.average_grade : '--'} <span className="text-[10px] font-normal opacity-60">%</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-black italic uppercase text-card-foreground tracking-tighter">
                            {athleteEffort ? formatTime(athleteEffort.elapsed_time) : '--:--'}
                          </h3>
                          <div className={`px-2 py-0.5 rounded bg-${theme.primary}/10 border border-${theme.primary}/20`}>
                            <span className={`text-[10px] font-bold ${theme.text}`}>
                              PR
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Footer - Date & Link */}
                      <div className="flex items-center justify-between pt-4 border-t border-border mt-auto">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span className="text-[10px] font-medium tracking-wider">
                            {athleteEffort ? new Date((athleteEffort as any).start_date_local || (athleteEffort as any).start_date).toLocaleDateString('zh-TW') : '--'}
                          </span>
                        </div>
                        {selectedSegment?.strava_id && (
                          <a
                            href={`https://www.strava.com/activities/${athleteEffort?.activity_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`p-1.5 rounded-lg hover:bg-${theme.primary}/10 text-muted-foreground hover:${theme.text} transition-colors ${!athleteEffort ? 'pointer-events-none opacity-50' : ''}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Performance Cards - Synchronized */}
              <section className="grid grid-cols-2 gap-3">
                {isLoading ? (
                  <>
                    <PerformanceCardSkeleton />
                    <PerformanceCardSkeleton />
                    <PerformanceCardSkeleton />
                  </>
                ) : (
                  <>
                    {/* Best Time */}
                    <div className={`flex flex-col gap-2 rounded-2xl p-4 border border-border bg-card/50 backdrop-blur-sm transition-all duration-300 group hover:${theme.border}/50 shadow-sm`}>
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest whitespace-nowrap">最佳時間</p>
                        <Timer className={`w-4 h-4 ${theme.textLight} transition-colors duration-500`} />
                      </div>
                      <p className="text-foreground tracking-tight text-3xl font-black leading-none truncate">
                        {athleteEffort ? formatTime(athleteEffort.elapsed_time) : '-'}
                      </p>
                      <div className="flex items-center gap-1 text-emerald-500 mt-1">
                        <TrendingDown className="w-3 h-3 font-bold" />
                        <p className="power-value whitespace-nowrap !text-xs">
                          {athleteEffort?.average_watts ? `${Math.round(athleteEffort.average_watts)}W` : '紀錄同步中'}
                        </p>
                      </div>
                    </div>

                    {/* Average Speed */}
                    <div className={`flex flex-col gap-2 rounded-2xl p-4 border border-border bg-card/50 backdrop-blur-sm transition-all duration-300 group hover:${theme.border}/50 shadow-sm`}>
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest whitespace-nowrap">平均時速</p>
                        <Gauge className={`w-4 h-4 ${theme.textLight} transition-colors duration-500`} />
                      </div>
                      <p className="text-foreground tracking-tight text-3xl font-black leading-none truncate">
                        {athleteEffort?.average_speed ? (athleteEffort.average_speed * 3.6).toFixed(1) : '-'}{' '}
                        <span className="text-sm font-normal text-muted-foreground uppercase">km/h</span>
                      </p>
                      <div className="flex items-center gap-1 text-emerald-500 mt-1">
                        <TrendingUp className="w-3 h-3 font-bold" />
                        <p className="text-xs font-bold whitespace-nowrap">數據保持穩定</p>
                      </div>
                    </div>

                    {/* Rank Card Removed */}
                  </>
                )}
              </section>

              {/* Goal Progress - Synchronized */}
              <section className="rounded-2xl border border-border bg-card/50 p-5 shadow-sm backdrop-blur-sm">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-end">
                    <div>
                      <h3 className="text-foreground text-base font-black uppercase tracking-tight">挑戰目標進度</h3>
                      <p className="text-muted-foreground text-[10px] font-bold">距離前 10% 僅差一步之遙</p>
                    </div>
                    <p className={`${theme.textLight} text-2xl font-black transition-colors duration-500`}>85%</p>
                  </div>
                  <div className="relative w-full h-3 rounded-full bg-secondary/20 overflow-hidden">
                    <div
                      className={`absolute top-0 left-0 h-full bg-gradient-to-r ${theme.gradient} rounded-full shadow-[0_0_8px_rgba(0,123,255,0.3)] transition-all duration-1000 ease-out`}
                      style={{ width: isLoading ? '0%' : '85%' }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[8px] text-muted-foreground uppercase tracking-widest font-black">
                    <span>START</span>
                    <span className={theme.textLight}>TOP 10% GOAL</span>
                  </div>
                </div>
              </section>

              {/* Recent Activities - Synchronized */}
              <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-foreground text-lg font-black leading-tight tracking-tight uppercase italic">近期嘗試紀錄</h2>
                </div>

                <div className="flex flex-col gap-3">
                  {isLoading ? (
                    <>
                      <ActivitySkeleton />
                      <ActivitySkeleton />
                    </>
                  ) : activities.length > 0 ? (
                    activities.map((activity) => (
                      <div
                        key={activity.id}
                        onClick={handleOpenLeaderboard}
                        className={`flex items-center justify-between p-4 rounded-2xl bg-card border border-border hover:${theme.border}/50 transition-all group shadow-sm hover:shadow-md backdrop-blur-sm cursor-pointer`}
                      >
                        <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                          <div className={`flex shrink-0 size-10 md:size-12 items-center justify-center rounded-full transition-transform group-hover:scale-110 ${activity.is_pr ? `${theme.bg} ${theme.textLight} shadow-inner` : 'bg-muted text-muted-foreground'}`}>
                            {activity.is_pr ? <Star className="w-5 h-5 fill-current" /> : <Bike className="w-5 h-5" />}
                          </div>
                          <div className="truncate">
                            <h4 className={`text-foreground font-bold truncate block text-sm md:text-base group-hover:${theme.textLight} transition-colors`}>{activity.title}</h4>
                            <p className="text-muted-foreground text-[10px] md:text-xs font-medium">{activity.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 md:gap-8 text-right shrink-0">
                          <div>
                            <p className="text-muted-foreground text-[9px] uppercase font-bold tracking-widest">Time</p>
                            <p className={`${theme.text} dark:${theme.textLight} font-black text-xl transition-colors duration-500`}>{activity.time}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 rounded-2xl bg-slate-50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800">
                      <Bike className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-3" />
                      <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">尚未在此路段留下紀錄</p>
                    </div>
                  )}
                </div>
              </section>

            </motion.div>
          </AnimatePresence>
        </div>

      </div >
      {/* Leaderboard Modal */}
      {isLeaderboardOpen && selectedLeaderboardRace && (
        <RaceLeaderboard
          race={selectedLeaderboardRace}
          leaderboard={leaderboardData}
          isLoading={isLoadingLeaderboard}
          onClose={() => setIsLeaderboardOpen(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
