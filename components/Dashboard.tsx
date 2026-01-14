import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useSegmentData } from '../hooks/useSegmentData';
import { MOCK_SEGMENT_STATS, MOCK_ACTIVITIES } from '../constants';
import { Activity } from '../types';

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

import { ViewType } from '../types';

interface DashboardProps {
  onNavigate: (view: ViewType) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { segment } = useSegmentData();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [athlete, setAthlete] = useState<any>(null);
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [registrationError, setRegistrationError] = useState(false);

  // Failsafe: Prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading && isRegistered === null) {
        console.warn('Dashboard: Loading timed out');
        setIsLoading(false);
        setRegistrationError(true);
      }
    }, 8000); // 8 seconds timeout
    return () => clearTimeout(timer);
  }, [isLoading, isRegistered]);

  useEffect(() => {
    const savedData = localStorage.getItem('strava_athlete_meta');
    if (savedData) {
      try {
        const athleteData = JSON.parse(savedData);
        setAthlete(athleteData);
        if (segment) {
          checkRegistration(athleteData.id);
        } else {
          console.log('Dashboard: Segment not ready yet, waiting...');
        }
      } catch (e) {
        console.error('Dashboard: Access token parse error', e);
        localStorage.removeItem('strava_athlete_meta');
        setAthlete(null);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [segment]);

  const checkRegistration = async (athleteId: string | number) => {
    if (!segment) return;

    // 只有在還不知道是否報名時才顯示初始載入狀態
    if (isRegistered === null) {
      setIsLoading(true);
    }
    setRegistrationError(false);

    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('strava_athlete_id', athleteId)
        .eq('segment_id', segment.id)
        .limit(1);

      if (error) {
        console.error('Supabase 查詢錯誤 (檢查報名狀態):', error);
        throw error;
      }

      setIsRegistered(data && data.length > 0);
    } catch (err) {
      console.error('檢查報名狀態失敗:', err);
      // 發生錯誤時不應預設為未報名，而是顯示重試
      setRegistrationError(true);
      if (isRegistered === null) setIsRegistered(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (!athlete) {
    // ... (unchanged)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-10 text-center">
        <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md">
          <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">link_off</span>
          <h2 className="text-xl font-black uppercase italic mb-2">尚未連結 Strava</h2>
          <p className="text-slate-500 text-sm mb-6">請先返回首頁連結您的 Strava 帳號，以便取得您的活動數據並進行報名。</p>
          <button
            onClick={() => window.location.hash = ''}
            className="bg-tsu-blue text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-tsu-blue-light transition-all"
          >
            返回首頁
          </button>
        </div>
      </div>
    );
  }

  if (isLoading && isRegistered === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tsu-blue"></div>
      </div>
    );
  }

  if (registrationError && isRegistered === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-red-400 font-bold">無法載入報名資訊</div>
        <button
          onClick={() => athlete && checkRegistration(athlete.id)}
          className="px-6 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition"
        >
          重試
        </button>
      </div>
    );
  }

  // Show warning if not registered but allow navigating
  if (isRegistered === false && segment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-10 text-center">
        <div className="bg-slate-900 p-10 rounded-3xl border border-slate-800 shadow-xl max-w-md">
          <span className="material-symbols-outlined text-6xl text-tsu-blue mb-4">how_to_reg</span>
          <h2 className="text-xl font-black uppercase italic mb-2 text-white">尚未完成報名</h2>
          <p className="text-slate-400 text-sm mb-6">您需要先完成報名程序才能查看個人儀表板與排名。若您已報名，請確認您的 Strava 帳號是否正確。</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => onNavigate(ViewType.REGISTER)}
              className="bg-tsu-blue text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-tsu-blue-light transition-all shadow-lg shadow-tsu-blue/20 w-full"
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

  return (
    <div className="flex flex-col items-center w-full pb-20">
      <div className="w-full max-w-[1200px] px-6 md:px-10 lg:px-20 py-10 flex flex-col gap-10">

        {/* Dashboard Header */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-tsu-blue-light">
              <span className="material-symbols-outlined text-sm">mountain_flag</span>
              <span className="text-[10px] font-bold uppercase tracking-widest">TSU Challenge Series</span>
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              {segment ? `Segment #${segment.strava_id}` : 'Loading...'}
            </span>
            <h1 className="text-slate-900 dark:text-white text-2xl md:text-4xl font-black leading-tight tracking-tight">
              {segment ? `Segment: ${segment.name}` : '載入路段中...'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base font-normal">
              {segment?.description || '持續超越極限，爭奪榮耀排位。'}
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full md:w-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => onNavigate(ViewType.REGISTER)}
                className="flex flex-1 sm:w-auto cursor-pointer items-center justify-center gap-2 rounded-xl h-14 md:h-12 px-6 bg-white/5 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-tsu-blue-light text-slate-900 dark:text-white text-base md:text-sm font-bold transition-all active:scale-95 group"
              >
                <span className="material-symbols-outlined text-xl text-tsu-blue-light">how_to_reg</span>
                <span>管理報名 / 報名新路段</span>
              </button>
              <button className="flex flex-1 sm:w-auto cursor-pointer items-center justify-center gap-2 rounded-xl h-14 md:h-12 px-6 bg-tsu-blue hover:bg-tsu-blue-light text-white text-base md:text-sm font-bold transition-all shadow-lg shadow-tsu-blue/20 active:scale-95 group">
                <span className="material-symbols-outlined text-xl group-hover:rotate-180 transition-transform duration-500">sync</span>
                <span>立即同步數據</span>
              </button>
            </div>
            <div className="text-center md:text-right">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed uppercase tracking-widest font-bold">資料每小時自動更新</p>
            </div>
          </div>
        </section>

        {/* Performance Cards */}
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
              <div className="flex flex-col gap-2 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm hover:border-tsu-blue-light/50 transition-all duration-300">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-widest">最佳時間</p>
                  <span className="material-symbols-outlined text-tsu-blue-light text-xl">timer</span>
                </div>
                <p className="text-slate-900 dark:text-white tracking-tight text-4xl font-black leading-none">42:15</p>
                <div className="flex items-center gap-1 text-emerald-500 mt-2">
                  <span className="material-symbols-outlined text-sm font-bold">trending_down</span>
                  <p className="text-sm font-bold">-1:30 (PR)</p>
                </div>
              </div>

              {/* Average VAM */}
              <div className="flex flex-col gap-2 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm hover:border-tsu-blue-light/50 transition-all duration-300">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-widest">平均 VAM</p>
                  <span className="material-symbols-outlined text-tsu-blue-light text-xl">speed</span>
                </div>
                <p className="text-slate-900 dark:text-white tracking-tight text-4xl font-black leading-none">1,250 <span className="text-lg font-normal text-slate-500">m/h</span></p>
                <div className="flex items-center gap-1 text-emerald-500 mt-2">
                  <span className="material-symbols-outlined text-sm font-bold">trending_up</span>
                  <p className="text-sm font-bold">+24 m/h</p>
                </div>
              </div>

              {/* Current Rank */}
              <div className="flex flex-col gap-2 rounded-2xl p-6 border-2 border-tsu-blue-light/50 bg-tsu-blue-light/5 sm:col-span-2 lg:col-span-1 shadow-inner group overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <span className="material-symbols-outlined text-9xl absolute -top-8 -right-8">leaderboard</span>
                </div>
                <div className="flex justify-between items-start mb-1 relative z-10">
                  <p className="text-tsu-blue-light text-xs font-bold uppercase tracking-widest">目前排名</p>
                  <span className="material-symbols-outlined text-tsu-blue-light text-2xl">workspace_premium</span>
                </div>
                <p className="text-slate-900 dark:text-white tracking-tight text-5xl font-black leading-none relative z-10">#14</p>
                <div className="flex items-center gap-1 text-tsu-blue-light mt-2 relative z-10">
                  <span className="material-symbols-outlined text-sm font-bold">keyboard_double_arrow_up</span>
                  <p className="text-sm font-bold uppercase tracking-tighter">Top 5% 挑戰者</p>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Goal Progress */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 p-6 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-slate-900 dark:text-white text-lg font-bold">挑戰進度</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">距離 Top 10 還差 1:15</p>
              </div>
              <p className="text-tsu-blue-light text-2xl font-black">85%</p>
            </div>
            <div className="relative w-full h-4 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-tsu-blue to-tsu-blue-light rounded-full shadow-[0_0_12px_rgba(0,123,255,0.4)] transition-all duration-1000 ease-out"
                style={{ width: isLoading ? '0%' : '85%' }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-black">
              <span>START</span>
              <span className="text-tsu-blue-light">TOP 10 GOAL (41:00)</span>
            </div>
          </div>
        </section>

        {/* Recent Activities */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-slate-900 dark:text-white text-xl md:text-2xl font-bold leading-tight tracking-tight">近期嘗試紀錄</h2>
            <div className="flex gap-2">
              <button className="bg-tsu-blue/10 text-tsu-blue-light px-4 py-1.5 rounded-full text-xs font-bold hover:bg-tsu-blue/20 transition-colors">當月</button>
              <button className="text-slate-500 dark:text-slate-400 px-4 py-1.5 rounded-full text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">全部</button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {isLoading ? (
              <>
                <ActivitySkeleton />
                <ActivitySkeleton />
              </>
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/80 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-tsu-blue-light/50 transition-all group shadow-sm hover:shadow-md backdrop-blur-sm">
                  <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                    <div className={`flex shrink-0 size-10 md:size-12 items-center justify-center rounded-full transition-transform group-hover:scale-110 ${activity.is_pr ? 'bg-tsu-blue/10 text-tsu-blue-light shadow-inner shadow-tsu-blue/5' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                      <span className="material-symbols-outlined">{activity.is_pr ? 'star' : 'directions_bike'}</span>
                    </div>
                    <div className="truncate">
                      <h4 className="text-slate-900 dark:text-white font-bold truncate block text-sm md:text-base group-hover:text-tsu-blue-light transition-colors">{activity.title}</h4>
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
                      <p className="text-tsu-blue dark:text-tsu-blue-light font-black text-xl">{activity.time}</p>
                    </div>
                    <button className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                      <span className="material-symbols-outlined text-tsu-blue-light">chevron_right</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Route Info Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 h-56 md:h-64 relative group shadow-lg">
            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=2070')" }}></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
            <div className="absolute bottom-6 left-6 flex flex-col gap-1">
              <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest">Route Profile</p>
              <h4 className="text-white text-xl font-black">{segment?.name || '路線概況'}</h4>
            </div>
          </div>
          <div className="rounded-2xl p-8 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex flex-col justify-center shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-tsu-blue-light">info</span>
              <h4 className="text-slate-900 dark:text-white font-bold text-lg">Segment 詳細資訊</h4>
            </div>
            <div className="space-y-4">
              {[
                { label: '距離', value: segment ? `${(segment.distance / 1000).toFixed(2)} km` : MOCK_SEGMENT_STATS.distance, icon: 'straighten' },
                { label: '平均坡度', value: segment ? `${segment.average_grade}%` : MOCK_SEGMENT_STATS.grade, icon: 'trending_up' },
                { label: '垂直爬升', value: segment ? `${segment.total_elevation_gain} m` : MOCK_SEGMENT_STATS.ascent, icon: 'elevation' }
              ].map((row, i) => (
                <div key={i} className={`flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 ${i === 2 ? 'border-none pb-0' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-slate-400">{row.icon}</span>
                    <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">{row.label}</span>
                  </div>
                  <span className="text-slate-900 dark:text-white text-sm font-black">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default Dashboard;
