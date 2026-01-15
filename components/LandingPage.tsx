
import React from 'react';
import StravaConnect from './StravaConnect';
import SegmentMap from './SegmentMap';
import { useSegmentData, formatTime, formatDistance, formatSpeed } from '../hooks/useSegmentData';

interface LandingPageProps {
  onRegister: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onRegister }) => {
  const { segments, statsMap, weather, isLoading } = useSegmentData();
  const [currentIndex, setCurrentIndex] = React.useState(0);

  // 定義多組配色主題
  const themes = [
    { primary: 'bg-tsu-blue', shadow: 'shadow-tsu-blue/30', gradient: 'rgba(0, 102, 204, 0.4)' }, // 經典藍
    { primary: 'bg-strava-orange', shadow: 'shadow-strava-orange/30', gradient: 'rgba(252, 76, 2, 0.4)' }, // Strava 橘
    { primary: 'bg-emerald-600', shadow: 'shadow-emerald-600/30', gradient: 'rgba(5, 150, 105, 0.4)' }, // 森林綠
    { primary: 'bg-purple-600', shadow: 'shadow-purple-600/30', gradient: 'rgba(124, 58, 237, 0.4)' }, // 幻影紫
    { primary: 'bg-rose-600', shadow: 'shadow-rose-600/30', gradient: 'rgba(225, 29, 72, 0.4)' }, // 競速紅
  ];

  const currentTheme = themes[currentIndex % themes.length];
  // 手風琴狀態
  const [detailsOpen, setDetailsOpen] = React.useState(true);
  const [startOpen, setStartOpen] = React.useState(true);

  // 5 秒自動輪播
  React.useEffect(() => {
    if (segments.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % segments.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [segments.length]);

  // 輔助函式：格式化日期
  const formatDateRange = (start?: string, end?: string) => {
    if (!start && !end) return null;
    const s = start ? new Date(start).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '未設定';
    const e = end ? new Date(end).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '未設定';
    return `${s} - ${e}`;
  };

  // 使用索引選擇路段
  const segment = segments.length > 0 ? segments[currentIndex] : null;
  const stats = segment ? statsMap[segment.id] || { totalAthletes: 0, completedAthletes: 0, bestTime: null, avgTime: null, maxPower: null, avgSpeed: null } : { totalAthletes: 0, completedAthletes: 0, bestTime: null, avgTime: null, maxPower: null, avgSpeed: null };
  const leaderboard = [];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % segments.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + segments.length) % segments.length);
  };

  // 動態統計數據
  const dynamicStats = [
    {
      label: '總爬升高度',
      value: segment ? `${Math.round(segment.total_elevation_gain || (segment.elevation_high - segment.elevation_low))} M` : (isLoading ? '...' : '-'),
      footer: segment ? `${segment.average_grade?.toFixed(1)}% Avg Grade` : (isLoading ? 'Loading...' : '-')
    },
    {
      label: '路段距離',
      value: segment ? `${(segment.distance / 1000).toFixed(1)} KM` : (isLoading ? '...' : '-'),
      footer: segment?.name || (isLoading ? 'Loading...' : '-')
    },
    {
      label: '參賽人數',
      value: stats.totalAthletes > 0 ? `${stats.totalAthletes}+` : (isLoading ? '...' : '-'),
      footer: stats.completedAthletes > 0 ? `${stats.completedAthletes} 已完成` : 'Growing Fast'
    },
    {
      label: '最快時間',
      value: stats.bestTime ? formatTime(stats.bestTime) : (isLoading ? '...' : '-'),
      footer: stats.avgSpeed ? `Avg ${formatSpeed(stats.avgSpeed)}` : 'Challenge Now'
    }
  ];

  return (
    <div className="flex flex-col items-center w-full pb-20">
      {/* Hero Section */}
      <div className="w-full max-w-[1200px] px-4 py-8">
        <div className="relative overflow-hidden rounded-2xl bg-strava-grey-dark shadow-2xl group transition-all duration-700">
          <div
            className="flex min-h-[380px] sm:min-h-[520px] flex-col gap-6 bg-cover bg-center bg-no-repeat items-center justify-center p-8 text-center relative transition-all duration-1000"
            style={{ 
              backgroundImage: `linear-gradient(${currentTheme.gradient} 0%, rgba(18, 18, 18, 0.95) 100%), url("https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&q=80&w=2070")` 
            }}
          >
            {/* Pagination Controls */}
            {segments.length > 1 && (
              <>
                <button 
                  onClick={handlePrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 border border-white/20 z-10"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button 
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 border border-white/20 z-10"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
                
                {/* Pagination Dots */}
                <div className="absolute bottom-6 flex gap-2">
                  {segments.map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-2 h-2 rounded-full transition-all duration-500 ${i === currentIndex ? `${currentTheme.primary} w-6` : 'bg-white/30'}`}
                    />
                  ))}
                </div>
              </>
            )}

            <div className="flex flex-col gap-4 max-w-3xl transform transition-all duration-700 delay-100">
              <h1 className="text-white text-4xl md:text-6xl font-black leading-tight tracking-tight uppercase italic drop-shadow-md">
                {segment?.description || '台中經典挑戰：136檢定'}
              </h1>
              <p className="text-slate-300 text-base md:text-xl font-medium leading-relaxed max-w-2xl mx-auto">
                連結你的 Strava，挑戰經典路段，與全台頂尖好手一決高下。
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <button
                onClick={onRegister}
                className={`flex min-w-[200px] cursor-pointer items-center justify-center rounded h-14 px-8 ${currentTheme.primary} text-white text-lg font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-xl ${currentTheme.shadow} active:scale-95 duration-700`}
              >
                <span>立即報名</span>
              </button>
              {segment?.link ? (
                <a
                  href={segment.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-[200px] cursor-pointer items-center justify-center rounded h-14 px-8 bg-white/10 text-white border border-white/20 text-lg font-black uppercase tracking-widest backdrop-blur-sm hover:bg-white/20 transition-all active:scale-95"
                >
                  <span>查看詳情</span>
                </a>
              ) : (
                <button className="flex min-w-[200px] cursor-pointer items-center justify-center rounded h-14 px-8 bg-white/10 text-white border border-white/20 text-lg font-black uppercase tracking-widest backdrop-blur-sm hover:bg-white/20 transition-all active:scale-95">
                  <span>查看詳情</span>
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 items-center mt-6">
              <span className={`inline-block px-4 py-1 rounded ${currentTheme.primary} text-white text-xs font-black uppercase tracking-wide shadow-md transition-colors duration-700`}>Limited Time Challenge</span>
              {segment && (formatDateRange(segment.start_date, segment.end_date)) && (
                <span className="text-amber-400 text-sm font-bold tracking-widest uppercase animate-pulse">
                   🗓️ {formatDateRange(segment.start_date, segment.end_date)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-8">
          {dynamicStats.map((stat, i) => (
            <div key={i} className="flex flex-col gap-1 rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-tsu-blue/30 hover:shadow-lg hover:-translate-y-1 transition-colors min-h-[140px]">
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
              <div className="h-10 flex items-center">
                <p className={`text-slate-900 dark:text-white text-3xl font-black italic ${isLoading ? 'animate-pulse' : ''}`}>
                  {stat.value === '-' && isLoading ? '\u00A0' : stat.value}
                </p>
              </div>
              <p className={`text-tsu-blue text-xs font-bold uppercase mt-2 truncate ${isLoading ? 'animate-pulse' : ''}`}>
                {stat.footer}
              </p>
            </div>
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
          <div className="lg:col-span-2 space-y-8">
            {/* Map Section */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <h2 className="text-slate-900 dark:text-white text-lg font-black uppercase tracking-tight italic">挑戰路段地圖</h2>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  {segment ? `Segment #${segment.strava_id}` : 'Loading...'}
                </span>
              </div>
              <div className="p-6">
                <div className="w-full aspect-video rounded-xl overflow-hidden relative shadow-inner">
                  <SegmentMap polyline={segment?.polyline} />
                </div>
                <div className="flex justify-between items-center mt-4">
                  <div className="flex items-center gap-4 text-sm">
                    {segment && (
                      <>
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full bg-green-500"></span>
                          <span className="text-slate-600 dark:text-slate-400 text-xs">起點 {segment.elevation_low}m</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full bg-red-500"></span>
                          <span className="text-slate-600 dark:text-slate-400 text-xs">終點 {segment.elevation_high}m</span>
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-all">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Powered by</span>
                    <span className="text-strava-orange font-black italic text-lg">STRAVA</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Leaderboard Preview */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <h2 className="text-slate-900 dark:text-white text-lg font-black uppercase tracking-tight italic">目前排行榜</h2>
                <a
                  href="https://status.criterium.tw/136leaderboard.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tsu-blue text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1"
                >
                  查看完整榜單
                </a>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <div className="p-8 text-center">
                    <div className="w-8 h-8 border-4 border-tsu-blue/20 border-t-tsu-blue rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500 text-sm">載入排行榜...</p>
                  </div>
                ) : (
                  <div className="p-12 text-center text-slate-500">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-20">leaderboard</span>
                    <p className="text-sm">前往各路段儀表板查看即時排行</p>
                    <button 
                      onClick={onRegister}
                      className="mt-4 text-tsu-blue text-xs font-bold hover:underline"
                    >
                      立即加入挑戰
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <section className="bg-slate-100 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
              <button 
                type="button" 
                className="w-full flex justify-between items-center text-sm font-black text-slate-900 dark:text-white uppercase italic" 
                onClick={() => setDetailsOpen(prev => !prev)}
              >
                <span>路段詳情</span>
                <span className="material-symbols-outlined transition-transform duration-300" style={{ transform: detailsOpen ? 'rotate(0deg)' : 'rotate(180deg)' }}>
                  expand_less
                </span>
              </button>
              
              {detailsOpen && (
                <div className="mt-4 space-y-4">
                  <ul className="space-y-3">
                    {[
                      { label: '挑戰期間', value: (segment && formatDateRange(segment.start_date, segment.end_date)) || '未設定' },
                      { label: '路段名稱', value: segment?.name || '-' },
                      { label: '平均坡度', value: segment ? `${segment.average_grade?.toFixed(1)}%` : '-' },
                      { label: '最陡坡度', value: segment ? `${segment.maximum_grade?.toFixed(1)}%` : '-' },
                      { label: '挑戰人數', value: segment?.athlete_count ? `${segment.athlete_count.toLocaleString()}` : '-' },
                      { label: '入場費', value: 'FREE', color: 'text-tsu-blue' }
                    ].map((item, i) => (
                      <li key={i} className="flex flex-col gap-1 text-[11px] font-bold py-1 border-b border-slate-200/50 dark:border-slate-800/50 last:border-0">
                        <span className="text-slate-500 dark:text-slate-400 uppercase tracking-widest">{item.label}</span>
                        <span className={`${item.color || 'text-slate-900 dark:text-slate-200'} uppercase break-all`}>{item.value}</span>
                      </li>
                    ))}
                  </ul>
                  {segment?.link && (
                    <a
                      href={segment.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-strava-orange text-white font-bold text-xs uppercase hover:brightness-110 transition-all"
                    >
                      <span>🔗</span>
                      <span>在 Strava 查看路段</span>
                    </a>
                  )}
                </div>
              )}
            </section>

            <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border-t-4 border-tsu-blue shadow-lg relative overflow-hidden">
              <button 
                type="button" 
                className="w-full flex justify-between items-center text-xl font-black text-slate-900 dark:text-white uppercase italic" 
                onClick={() => setStartOpen(prev => !prev)}
              >
                <span>開始挑戰</span>
                <span className="material-symbols-outlined transition-transform duration-300" style={{ transform: startOpen ? 'rotate(0deg)' : 'rotate(180deg)' }}>
                  expand_less
                </span>
              </button>
              
              {startOpen && (
                <div className="mt-4 space-y-4">
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-medium">
                    為了自動計算您的成績，請先連結您的 Strava 帳號。我們將僅讀取此活動期間的公開活動紀錄。
                  </p>
                  <div className="mt-6">
                    <StravaConnect />
                    <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 font-bold mt-4">
                      點擊即代表您同意本平台的 <a className="underline hover:text-tsu-blue transition-colors" href="/privacy-policy.html">服務條款</a>
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* KOM / QOM 紀錄 */}
            {(segment?.KOM || segment?.QOM) && (
              <section className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 rounded-2xl p-6 border border-amber-500/30">
                <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 uppercase italic flex items-center gap-2">
                  <span>🏆</span> 紀錄保持者
                </h3>
                <div className="space-y-3">
                  {segment?.KOM && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">KOM (男子紀錄)</span>
                      <span className="text-lg font-black text-strava-orange italic">{segment.KOM}</span>
                    </div>
                  )}
                  {segment?.QOM && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">QOM (女子紀錄)</span>
                      <span className="text-lg font-black text-pink-500 italic">{segment.QOM}</span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* 天氣資訊 */}
            {weather && (
              <section className="bg-gradient-to-br from-sky-500/10 to-blue-500/10 dark:from-sky-500/20 dark:to-blue-500/20 rounded-2xl p-6 border border-sky-500/30">
                <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 uppercase italic flex items-center gap-2">
                  <span>🌤️</span> {weather.location || '路段'} 天氣
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-4xl font-black text-slate-900 dark:text-white">
                      {weather.current?.temp ? `${Math.round(weather.current.temp)}°C` : '-'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize mt-1">
                      {weather.current?.description || weather.today?.description || '-'}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-500 dark:text-slate-400 space-y-1">
                    {weather.today && (
                      <>
                        <p>最高 {Math.round(weather.today.max)}°C</p>
                        <p>最低 {Math.round(weather.today.min)}°C</p>
                      </>
                    )}
                    {weather.current?.humidity && (
                      <p>濕度 {weather.current.humidity}%</p>
                    )}
                  </div>
                </div>
              </section>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
