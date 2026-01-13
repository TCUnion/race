
import React from 'react';
import StravaConnect from './StravaConnect';
import SegmentMap from './SegmentMap';
import { useSegmentData, formatTime, formatDistance, formatSpeed } from '../hooks/useSegmentData';

interface LandingPageProps {
  onRegister: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onRegister }) => {
  const { segment, leaderboard, stats, weather, isLoading } = useSegmentData();

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
        <div className="relative overflow-hidden rounded-2xl bg-strava-grey-dark shadow-2xl">
          <div
            className="flex min-h-[480px] flex-col gap-6 bg-cover bg-center bg-no-repeat items-center justify-center p-8 text-center relative"
            style={{ backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4) 0%, rgba(18, 18, 18, 0.95) 100%), url("https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&q=80&w=2070")` }}
          >
            <div className="flex flex-col gap-4 max-w-3xl">
              <span className="inline-block px-4 py-1 rounded bg-tsu-blue text-white text-[10px] font-black self-center uppercase tracking-[0.2em] shadow-lg">Limited Time Challenge</span>
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
                className="flex min-w-[200px] cursor-pointer items-center justify-center rounded h-14 px-8 bg-tsu-blue text-white text-lg font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-tsu-blue/30 active:scale-95"
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
          </div>
        </div>

        {/* Dynamic Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-8">
          {dynamicStats.map((stat, i) => (
            <div key={i} className="flex flex-col gap-1 rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-tsu-blue/30 transition-colors min-h-[140px]">
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
                  {segment ? `Segment #${segment.id}` : 'Loading...'}
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
                ) : leaderboard.length > 0 ? (
                  leaderboard.slice(0, 5).map((rider) => (
                    <div key={rider.athlete_id} className="flex items-center gap-4 p-5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                      <span className={`w-8 text-center font-black text-2xl italic ${rider.rank === 1 ? 'text-tsu-blue' : 'text-slate-400'}`}>
                        {rider.rank.toString().padStart(2, '0')}
                      </span>
                      <div className="size-10 rounded-full overflow-hidden border-2 border-transparent group-hover:border-tsu-blue transition-all bg-slate-200">
                        {rider.profile_medium || rider.profile ? (
                          <img alt={rider.name} className="w-full h-full object-cover" src={rider.profile_medium || rider.profile} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-300 text-slate-600 font-bold text-sm">
                            {rider.name?.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-tight">{rider.name}</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">
                          {rider.team || `#${rider.number || rider.athlete_id}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-lg italic text-slate-900 dark:text-white">{formatTime(rider.elapsed_time)}</p>
                        <p className="text-[10px] text-slate-400 font-bold">
                          {rider.average_speed ? formatSpeed(rider.average_speed) : '-'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    <p className="text-sm">尚無排行資料</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <section className="bg-white dark:bg-slate-900 rounded-2xl p-8 border-t-4 border-tsu-blue shadow-lg relative overflow-hidden">
              <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4 uppercase italic">開始挑戰</h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-8 leading-relaxed font-medium">
                為了自動計算您的成績，請先連結您的 Strava 帳號。我們將僅讀取此活動期間的公開活動紀錄。
              </p>
              <div className="space-y-4">
                <div className="mt-8">
                  <StravaConnect />
                  <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 font-bold mt-4">
                    點擊即代表您同意本平台的 <a className="underline hover:text-tsu-blue transition-colors" href="/privacy-policy.html">服務條款</a>
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-slate-100 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 uppercase italic">路段詳情</h3>
              <ul className="space-y-3">
                {[
                  { label: '路段名稱', value: segment?.name || '-' },
                  { label: '平均坡度', value: segment ? `${segment.average_grade?.toFixed(1)}%` : '-' },
                  { label: '最陡坡度', value: segment ? `${segment.maximum_grade?.toFixed(1)}%` : '-' },
                  { label: '挑戰人數', value: segment?.athlete_count ? `${segment.athlete_count.toLocaleString()}` : '-' },
                  { label: '入場費', value: 'FREE', color: 'text-tsu-blue' }
                ].map((item, i) => (
                  <li key={i} className="flex justify-between items-center text-[11px] font-bold">
                    <span className="text-slate-500 dark:text-slate-400 uppercase tracking-widest">{item.label}</span>
                    <span className={`${item.color || 'text-slate-900 dark:text-slate-200'} uppercase truncate max-w-[120px]`}>{item.value}</span>
                  </li>
                ))}
              </ul>
              {segment?.link && (
                <a
                  href={segment.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-strava-orange text-white font-bold text-xs uppercase hover:brightness-110 transition-all"
                >
                  <span>🔗</span>
                  <span>在 Strava 查看路段</span>
                </a>
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

            <div className="rounded-2xl overflow-hidden aspect-[4/3] relative group border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer">
              <img className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" src="https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=2070" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex items-end p-6">
                <div>
                  <h4 className="text-white font-black text-sm uppercase italic">完賽專屬禮遇</h4>
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-tight">Win professional gear and more</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
