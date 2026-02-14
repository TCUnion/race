
import React from 'react';
import StravaConnect from '../auth/StravaConnect';
import SegmentMap from '../map/SegmentMap';
import { useSegmentData, formatTime, formatDistance, formatSpeed } from '../../hooks/useSegmentData';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Trophy,
  Sun,
  Thermometer,
  Droplets,
  ChevronDown,
  ChevronUp,
  Map as MapIcon,
  ExternalLink,
  ChevronRight as ChevronRightIcon,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import StravaLogo from '../../components/ui/StravaLogo';

interface LandingPageProps {
  onRegister: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onRegister }) => {
  const { segments, statsMap, weather, isLoading } = useSegmentData();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const [currentIndex, setCurrentIndex] = React.useState(0);

  // 定義多組配色主題
  const themes = [
    { primary: 'bg-tcu-blue', shadow: 'shadow-tcu-blue/30', gradient: 'rgba(0, 102, 204, 0.4)' }, // 經典藍
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
    const locale = i18n.language === 'zh' ? 'zh-TW' : 'en-US';
    const s = start ? new Date(start).toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' }) : t('landing.not_set');
    const e = end ? new Date(end).toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' }) : t('landing.not_set');
    return `${s} - ${e}`;
  };

  // 使用索引選擇路段
  const segment = segments.length > 0 ? segments[currentIndex] : null;
  const stats = segment ? statsMap[segment.id] || { totalAthletes: 0, completedAthletes: 0, bestTime: null, avgTime: null, maxPower: null, avgSpeed: null } : { totalAthletes: 0, completedAthletes: 0, bestTime: null, avgTime: null, maxPower: null, avgSpeed: null };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % segments.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + segments.length) % segments.length);
  };

  // 動態統計數據
  const dynamicStats = [
    {
      label: t('landing.total_elevation'),
      value: segment ? `${Math.round(segment.total_elevation_gain || (segment.elevation_high - segment.elevation_low))} M` : (isLoading ? '...' : '-'),
      footer: segment ? `${segment.average_grade?.toFixed(1)}% ${t('landing.avg_grade')}` : (isLoading ? 'Loading...' : '-')
    },
    {
      label: t('landing.distance'),
      value: segment ? `${(segment.distance / 1000).toFixed(1)} KM` : (isLoading ? '...' : '-'),
      footer: segment?.description || segment?.name || (isLoading ? 'Loading...' : '-')
    },
    {
      label: t('landing.participants'),
      value: stats.totalAthletes > 0 ? `${stats.totalAthletes}+` : (isLoading ? '...' : '-'),
      footer: stats.completedAthletes > 0 ? `${stats.completedAthletes} ${t('landing.completed')}` : t('landing.growing_fast')
    },
    {
      label: t('landing.fastest_time'),
      value: stats.bestTime ? formatTime(stats.bestTime) : (isLoading ? '...' : '-'),
      footer: stats.avgSpeed ? `Avg ${formatSpeed(stats.avgSpeed)}` : t('landing.challenge_now')
    }
  ];

  // 根據主題計算 Hero 背景漸層
  const heroGradient = theme === 'dark'
    ? `linear-gradient(${currentTheme.gradient} 0%, rgba(18, 18, 18, 0.95) 100%)`
    : `linear-gradient(${currentTheme.gradient} 0%, rgba(248, 250, 252, 0.95) 100%)`;

  return (
    <div className="flex flex-col items-center w-full pb-10 animate-fade-in">
      {/* Hero Section */}
      <div className="w-full max-w-[1200px] px-4 py-2">
        <div className="relative overflow-hidden rounded-2xl bg-slate-100 dark:bg-strava-grey-dark shadow-2xl group transition-all duration-700">
          <div
            className="flex min-h-[280px] sm:min-h-[520px] flex-col gap-4 sm:gap-6 bg-cover bg-center bg-no-repeat items-center justify-center p-4 sm:p-8 text-center relative transition-all duration-1000"
            style={{
              backgroundImage: `${heroGradient}, url("https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&q=80&w=2070")`
            }}
          >
            {/* Pagination Controls */}
            {segments.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  aria-label={t('landing.prev_slide') || "Previous Slide"}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 border border-white/20 z-10 hover:scale-110 active:scale-90 touch-target"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={handleNext}
                  aria-label={t('landing.next_slide') || "Next Slide"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 border border-white/20 z-10 hover:scale-110 active:scale-90 touch-target"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                {/* Pagination Dots */}
                <div className="absolute bottom-6 flex gap-2">
                  {segments.map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-all duration-500 cursor-pointer ${i === currentIndex ? `${currentTheme.primary} w-6` : 'bg-white/30 hover:bg-white/50'}`}
                      onClick={() => setCurrentIndex(i)}
                    />
                  ))}
                </div>
              </>
            )}

            <div className="flex flex-col gap-3 sm:gap-4 max-w-4xl transform transition-all duration-700 delay-100 px-2">
              <h1 className={`text-xl sm:text-4xl md:text-5xl lg:text-7xl font-black leading-tight tracking-tighter uppercase italic drop-shadow-2xl font-display break-words ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {segment?.description || '台中經典挑戰：136檢定'}
              </h1>
              <p className={`text-sm sm:text-base md:text-xl font-medium leading-relaxed max-w-2xl mx-auto ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                {t('landing.subtitle')}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
              <button className={`${currentTheme.primary} flex min-w-[200px] cursor-pointer items-center justify-center rounded-xl h-14 px-8 text-white text-lg font-black uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 shadow-xl hover:-translate-y-1 group`}>
                <span className="relative z-10">{t('landing.register_now')}</span>
              </button>
              {segment?.link ? (
                <a
                  href={segment.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-[200px] cursor-pointer items-center justify-center rounded-xl h-14 px-8 glass-panel text-white text-lg font-black uppercase tracking-widest hover:bg-white/20 transition-all active:scale-95 group hover:-translate-y-1"
                >
                  <span>{t('landing.view_details')}</span>
                  <ExternalLink className="w-5 h-5 ml-2 transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </a>
              ) : (
                <button className="flex min-w-[200px] cursor-pointer items-center justify-center rounded-xl h-14 px-8 glass-panel text-white text-lg font-black uppercase tracking-widest hover:bg-white/20 transition-all active:scale-95 hover:-translate-y-1">
                  <span>{t('landing.view_details')}</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 items-center mt-6">
            <span className={`inline-block px-4 py-1 rounded ${currentTheme.primary} text-white text-xs font-black uppercase tracking-wide shadow-md transition-colors duration-700`}>{t('landing.limited_time')}</span>
            {segment && (formatDateRange(segment.start_date, segment.end_date)) && (
              <span className="text-amber-400 text-sm font-black tracking-widest uppercase animate-pulse flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {formatDateRange(segment.start_date, segment.end_date)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-4">
        {dynamicStats.map((stat, i) => (
          <div key={i} className="flex flex-col gap-1 rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-tcu-blue/30 hover:shadow-lg transition-all cursor-pointer group">
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest group-hover:text-tcu-blue transition-colors">{stat.label}</p>
            <div className="flex items-baseline gap-2">
              <p className={`text-slate-900 dark:text-white text-3xl font-black italic ${isLoading ? 'animate-pulse' : ''}`}>
                {stat.value === '-' && isLoading ? '\u00A0' : stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
        <div className="lg:col-span-2 space-y-8">
          {/* Map Section */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-wrap justify-between items-center gap-2 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <MapIcon className="w-5 h-5 text-tcu-blue flex-shrink-0" />
                <h2 className="text-slate-900 dark:text-white text-base sm:text-lg font-black uppercase tracking-tight italic">{t('landing.map_title')}</h2>
              </div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                {segment ? `Segment #${segment.strava_id}` : 'Loading...'}
              </span>
            </div>
            <div className="p-4 sm:p-6">
              <div className="w-full aspect-[3/2] sm:aspect-video rounded-xl overflow-hidden relative shadow-inner">
                <SegmentMap polyline={segment?.polyline} />
              </div>
              <div className="flex flex-wrap justify-between items-center gap-2 mt-4">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm">
                  {segment && (
                    <>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-green-500"></span>
                        <span className="text-slate-600 dark:text-slate-400 text-xs">{t('landing.start_point')} {segment.elevation_low}m</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-red-500"></span>
                        <span className="text-slate-600 dark:text-slate-400 text-xs">{t('landing.end_point')} {segment.elevation_high}m</span>
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-all group cursor-pointer">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter hidden sm:inline">{t('landing.powered_by')}</span>
                  <StravaLogo className="h-4 sm:h-5 w-auto grayscale group-hover:grayscale-0 transition-all" />
                </div>
              </div>
            </div>
          </section>

          {/* Leaderboard Preview */}
          <section className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-tcu-blue" />
                <h2 className="text-slate-900 dark:text-white text-lg font-black uppercase tracking-tight italic">{t('landing.leaderboard_preview')}</h2>
              </div>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} // 這裡應該導向 Leaderboard View 或頁面
                className="text-tcu-blue text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1 group"
              >
                {t('landing.view_full_leaderboard')}
                <ChevronRightIcon className="w-3 h-3 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <div className="p-8 text-center">
                  <RefreshCw className="w-8 h-8 text-tcu-blue animate-spin mx-auto mb-4" />
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">{t('landing.loading_leaderboard')}</p>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-500">
                  <BarChart3 className="w-12 h-12 mb-2 opacity-20 mx-auto" />
                  <p className="text-sm font-bold uppercase tracking-widest">{t('landing.check_registration')}</p>
                  <button
                    onClick={onRegister}
                    className="mt-4 text-tcu-blue text-xs font-black uppercase tracking-widest hover:brightness-110 underline decoration-2 underline-offset-4"
                  >
                    {t('landing.join_challenge')}
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <section className="bg-slate-100 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 transition-all hover:shadow-md">
            <button
              type="button"
              aria-expanded={detailsOpen}
              className="w-full flex justify-between items-center text-sm font-black text-slate-900 dark:text-white uppercase italic touch-target"
              onClick={() => setDetailsOpen(prev => !prev)}
            >
              <span>{t('landing.details_title')}</span>
              {detailsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {detailsOpen && (
              <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                <ul className="space-y-3">
                  {[
                    { label: t('landing.period'), value: (segment && formatDateRange(segment.start_date, segment.end_date)) || t('landing.not_set') },
                    { label: t('landing.segment_name'), value: segment?.name || '-' },
                    { label: t('landing.avg_grade'), value: segment ? `${segment.average_grade?.toFixed(1)}%` : '-' },
                    { label: t('landing.max_grade'), value: segment ? `${segment.maximum_grade?.toFixed(1)}%` : '-' },
                    { label: t('landing.athlete_count'), value: segment?.athlete_count ? `${segment.athlete_count.toLocaleString()}` : '-' },
                    { label: t('landing.entry_fee'), value: 'FREE', color: 'text-tcu-blue' }
                  ].map((item, i) => (
                    <li key={i} className="flex flex-col gap-1 text-[11px] font-bold py-1 border-b border-slate-200/50 dark:border-slate-800/50 last:border-0 hover:bg-white/50 dark:hover:bg-white/5 rounded px-1 transition-colors">
                      <span className="text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[9px]">{item.label}</span>
                      <span className={`${item.color || 'text-slate-900 dark:text-slate-200'} uppercase break-all`}>{item.value}</span>
                    </li>
                  ))}
                </ul>
                {segment?.link && (
                  <a
                    href={segment.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-strava-orange text-white font-black text-[10px] uppercase hover:brightness-110 transition-all shadow-md active:scale-95 group"
                  >
                    <StravaLogo className="h-3 w-auto" color="white" />
                    <span>{t('landing.view_on_strava')}</span>
                  </a>
                )}
              </div>
            )}
          </section>

          <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 border-t-4 border-tcu-blue shadow-lg relative overflow-hidden transition-all hover:shadow-xl">
            <button
              type="button"
              aria-expanded={startOpen}
              className="w-full flex justify-between items-center text-xl font-black text-slate-900 dark:text-white uppercase italic touch-target"
              onClick={() => setStartOpen(prev => !prev)}
            >
              <span>{t('landing.start_challenge')}</span>
              {startOpen ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
            </button>

            {startOpen && (
              <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-medium">
                  {t('landing.connect_notice')}
                </p>
                <div className="mt-6">
                  <StravaConnect />
                  <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 font-bold mt-4">
                    {t('landing.policy_agree')} <a className="underline hover:text-tcu-blue transition-colors" href="/privacy-policy.html">{t('landing.privacy_policy')}</a>
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* KOM / QOM 紀錄 */}
          {(segment?.KOM || segment?.QOM) && (
            <section className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 rounded-2xl p-6 border border-amber-500/30 transition-all hover:scale-[1.02]">
              <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 uppercase italic flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" /> {t('landing.record_holder')}
              </h3>
              <div className="space-y-3">
                {segment?.KOM && (
                  <div className="flex justify-between items-center group">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase group-hover:text-tcu-blue transition-colors">{t('landing.kom')}</span>
                    <span className="text-lg font-black text-strava-orange italic">{segment.KOM}</span>
                  </div>
                )}
                {segment?.QOM && (
                  <div className="flex justify-between items-center group">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase group-hover:text-pink-500 transition-colors">{t('landing.qom')}</span>
                    <span className="text-lg font-black text-pink-500 italic">{segment.QOM}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 天氣資訊 */}
          {weather && (
            <section className="bg-gradient-to-br from-sky-500/10 to-blue-500/10 dark:from-sky-500/20 dark:to-blue-500/20 rounded-2xl p-6 border border-sky-500/30 transition-all hover:scale-[1.02]">
              <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 uppercase italic flex items-center gap-2">
                <Sun className="w-5 h-5 text-sky-500" /> {weather.location || '路段'} {t('landing.weather')}
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-4xl font-black text-slate-900 dark:text-white flex items-baseline">
                    {weather.current?.temp ? `${Math.round(weather.current.temp)}` : '-'}
                    <span className="text-lg ml-0.5">°C</span>
                  </p>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 capitalize mt-1 flex items-center gap-1">
                    <Thermometer className="w-3 h-3" />
                    {weather.current?.description || weather.today?.description || '-'}
                  </p>
                </div>
                <div className="text-right text-[10px] font-bold text-slate-500 dark:text-slate-400 space-y-1">
                  {weather.today && (
                    <>
                      <p className="text-rose-500">MAX {Math.round(weather.today.max)}°C</p>
                      <p className="text-sky-500">MIN {Math.round(weather.today.min)}°C</p>
                    </>
                  )}
                  {weather.current?.humidity && (
                    <p className="flex items-center justify-end gap-1">
                      <Droplets className="w-3 h-3 text-sky-400" />
                      {t('landing.humidity')} {weather.current.humidity}%
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
};

export default LandingPage;
