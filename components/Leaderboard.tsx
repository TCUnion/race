
import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useSegmentData, formatTime, LeaderboardEntry, StravaSegment, SegmentStats } from '../hooks/useSegmentData';

declare global {
  interface Window {
    L: any;
  }
}

const CONFIG = {
  stravaActivityBase: 'https://www.strava.com/activities/'
};

// Polyline 解碼工具
function decodePolyline(encoded: string): [number, number][] {
  if (!encoded) return [];
  let points: [number, number][] = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

// 子元件：單一路段排行榜
interface SegmentLeaderboardProps {
  segment: StravaSegment;
  leaderboard: LeaderboardEntry[];
  stats: SegmentStats;
  sortBy: string;
  searchQuery: string;
  teamFilter: string;
}

const SegmentLeaderboard: React.FC<SegmentLeaderboardProps> = ({
  segment,
  leaderboard,
  stats,
  sortBy,
  searchQuery,
  teamFilter
}) => {
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isTableExpanded, setIsTableExpanded] = useState(true);

  // 地圖初始化邏輯
  useEffect(() => {
    if (!segment || !mapContainerRef.current || !window.L) return;

    if (!mapRef.current) {
      mapRef.current = window.L.map(mapContainerRef.current, {
        scrollWheelZoom: false
      });
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapRef.current);
    }

    if (segment.polyline) {
      const points = decodePolyline(segment.polyline);
      if (points.length > 0) {
        // 清除舊的線條
        mapRef.current.eachLayer((layer: any) => {
          if (layer instanceof window.L.Polyline && !(layer instanceof window.L.TileLayer)) {
            mapRef.current.removeLayer(layer);
          }
        });

        const polyline = window.L.polyline(points, {
          color: '#FC5200',
          weight: 4,
          opacity: 0.8
        }).addTo(mapRef.current);

        // 確保地圖尺寸正確計算
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.invalidateSize();
            mapRef.current.fitBounds(polyline.getBounds(), { padding: [20, 20] });
          }
        }, 100);
      }
    }
  }, [segment]);

  // 過濾與排序邏輯
  const processedData = useMemo(() => {
    if (!leaderboard) return [];

    let result = leaderboard.filter(p => {
      const pName = p.name || '';
      const pNumber = p.number || '';
      const matchesSearch = pName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pNumber.includes(searchQuery);
      const matchesTeam = !teamFilter || p.team === teamFilter;
      return matchesSearch && matchesTeam;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case 'time': return (a.elapsed_time || 0) - (b.elapsed_time || 0);
        case 'power': return (b.average_watts || 0) - (a.average_watts || 0);
        case 'speed': return (b.average_speed || 0) - (a.average_speed || 0);
        case 'hr': return (a.average_heartrate || 0) - (b.average_heartrate || 0);
        case 'date': return new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime();
        default: return 0;
      }
    });

    return result.map((p, index) => ({ ...p, rank: index + 1 }));
  }, [leaderboard, searchQuery, teamFilter, sortBy]);

  // 定義主題色
  const barColors = [
    'border-tsu-blue',     // 藍
    'border-strava-orange', // 橘
    'border-emerald-500',   // 綠
    'border-purple-500',   // 紫
    'border-rose-500',     // 紅
  ];
  const barColor = barColors[segment.id % barColors.length];

  // 日期格式化
  const formatDate = (date?: string) => {
    if (!date) return '未設定';
    return new Date(date).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  return (
    <div className="w-full mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 標題與統計 */}
      <div className="w-full py-8 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 mb-6 p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          <div className={`flex items-center gap-4 border-l-8 ${barColor} pl-6`}>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white italic uppercase tracking-tight">
                {segment.name}
              </h2>
              <div className="flex flex-wrap items-center gap-y-1 gap-x-3 mt-1">
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  {segment.activity_type}
                </span>
                <span className="text-slate-400 text-xs font-bold">
                  {(segment.distance / 1000).toFixed(2)}km · {segment.average_grade}% Avg
                </span>
                {segment.start_date && (
                  <span className="text-amber-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                    {formatDate(segment.start_date)} - {formatDate(segment.end_date)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsTableExpanded(!isTableExpanded)}
            className="text-slate-400 hover:text-tsu-blue transition-colors md:hidden"
          >
            <span className="material-symbols-outlined text-3xl">
              {isTableExpanded ? 'expand_less' : 'expand_more'}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-8">
          {[
            { label: '參賽人數', value: stats.totalAthletes || '-', color: 'text-slate-900' },
            { label: '完成人數', value: stats.completedAthletes || '-', color: 'text-tsu-blue' },
            { label: '最快時間', value: formatTime(stats.bestTime), color: 'text-red-500' },
            { label: '平均時間', value: formatTime(stats.avgTime), color: 'text-slate-900' },
            { label: '最高功率', value: stats.maxPower ? `${stats.maxPower} W` : '-', color: 'text-orange-500' },
            { label: '平均速度', value: stats.avgSpeed ? `${(stats.avgSpeed * 3.6).toFixed(1)} km/h` : '-', color: 'text-slate-900' },
          ].map((stat, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-50 dark:border-slate-800 flex flex-col items-center justify-center text-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</span>
              <span className={`text-base font-black italic ${stat.color} dark:text-white`}>
                {stat.value}
              </span>
            </div>
          ))}
        </div>

        {/* 地圖區域 */}
        <div className="w-full h-[200px] mb-8 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
          <div ref={mapContainerRef} className="w-full h-full z-0"></div>
        </div>

        {/* 表格區塊 */}
        {isTableExpanded && (
          <div className="w-full border-t border-slate-50 dark:border-slate-800 pt-6">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                    <th className="pb-4">排名</th>
                    <th className="pb-4 text-left">選手資訊</th>
                    <th className="pb-4">號碼</th>
                    <th className="pb-4">完成時間</th>
                    <th className="pb-4">平均速度</th>
                    <th className="pb-4">平均功率</th>
                    <th className="pb-4">日期</th>
                    <th className="pb-4">Strava</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {processedData.map((p) => (
                    <tr key={`${p.athlete_id}-${p.activity_id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                      <td className="py-4 text-center">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-xs italic ${p.rank === 1 ? 'bg-amber-400 text-amber-900' :
                          p.rank === 2 ? 'bg-slate-300 text-slate-700' :
                            p.rank === 3 ? 'bg-amber-700 text-amber-100' : 'text-slate-300 dark:text-slate-700'
                          }`}>
                          {p.rank}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <img src={p.profile_medium || p.profile} alt={p.name} className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm" />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-sm">{p.name}</div>
                            {p.team && <span className="text-[9px] font-black text-tsu-blue/70 dark:text-tsu-blue uppercase">{p.team}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-center font-bold text-slate-500 text-xs">#{p.number || '-'}</td>
                      <td className="py-4 text-center font-black italic text-sm text-green-600 dark:text-green-400">{formatTime(p.elapsed_time)}</td>
                      <td className="py-4 text-center font-bold text-slate-700 dark:text-slate-300 text-xs">{(p.average_speed * 3.6).toFixed(1)} km/h</td>
                      <td className="py-4 text-center font-bold text-slate-700 dark:text-slate-300 text-xs">{Math.round(p.average_watts || 0)}W</td>
                      <td className="py-4 text-center text-[10px] font-bold text-slate-500">{new Date(p.start_date || 0).toLocaleDateString()}</td>
                      <td className="py-4 text-center">
                        {p.activity_id && (
                          <a href={`${CONFIG.stravaActivityBase}${p.activity_id}`} target="_blank" rel="noreferrer" className="text-tsu-blue hover:text-tsu-blue/80">
                            <span className="material-symbols-outlined text-lg">open_in_new</span>
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {processedData.map((p) => (
                <div key={`${p.athlete_id}-${p.activity_id}`} className="py-4">
                  <div className="flex items-center gap-3 justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] italic ${p.rank === 1 ? 'bg-amber-400 text-amber-900' :
                        p.rank === 2 ? 'bg-slate-300 text-slate-700' :
                          p.rank === 3 ? 'bg-amber-700 text-amber-100' : 'text-slate-300 dark:text-slate-700'
                        }`}>
                        {p.rank}
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{p.name}</h4>
                        <p className="text-[9px] font-bold text-slate-400">#{p.number || '-'} · {Math.round(p.average_watts || 0)}W</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-black italic text-green-600 dark:text-green-400">{formatTime(p.elapsed_time)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {processedData.length === 0 && (
              <div className="py-10 text-center">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">無符合條件的數據</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const Leaderboard: React.FC = () => {
  const {
    segments,
    leaderboardsMap,
    statsMap,
    isLoading: isGlobalLoading,
    refresh
  } = useSegmentData();

  const [sortBy, setSortBy] = useState('time');
  const [teamFilter, setTeamFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const teams = useMemo(() => {
    const allTeams = new Set<string>();
    Object.values(leaderboardsMap).forEach(lb => {
      lb.forEach(p => {
        if (p.team) allTeams.add(p.team);
      });
    });
    return Array.from(allTeams).sort();
  }, [leaderboardsMap]);

  if (isGlobalLoading && segments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <div className="w-12 h-12 border-4 border-tsu-blue/20 border-t-tsu-blue rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">正在載入排行榜資料...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full pb-20 px-4 md:px-6 lg:px-8 max-w-[1200px] mx-auto">
      {/* 頁面標題 */}
      <div className="w-full py-12 text-center">
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 italic uppercase tracking-tighter">
          賽事<span className="text-tsu-blue">排行榜</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-widest">
          即時路段計時數據 · 多段同步更新 (Powered by Strava)
        </p>
      </div>

      {/* 全局篩選與排序 */}
      <div className="w-full bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl mb-12">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">排序依據</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold p-3 dark:text-white focus:ring-2 focus:ring-tsu-blue transition-all"
              >
                <option value="time">完成時間</option>
                <option value="power">平均功率</option>
                <option value="speed">平均速度</option>
                <option value="hr">平均心率</option>
                <option value="date">活動日期</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">車隊過濾</label>
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold p-3 dark:text-white focus:ring-2 focus:ring-tsu-blue transition-all"
              >
                <option value="">所有車隊</option>
                {teams.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">搜尋選手</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                <input
                  type="text"
                  placeholder="姓名或號碼..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold p-3 pl-10 dark:text-white focus:ring-2 focus:ring-tsu-blue transition-all"
                />
              </div>
            </div>
          </div>
          <button
            onClick={() => refresh()}
            className="w-full md:w-auto bg-tsu-blue hover:brightness-110 text-white font-black uppercase text-xs tracking-widest py-4 px-8 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-tsu-blue/30"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            刷更新
          </button>
        </div>
      </div>

      {/* 路段排行榜列表 */}
      <div className="w-full space-y-4">
        {segments.map((seg) => (
          <SegmentLeaderboard
            key={seg.id}
            segment={seg}
            leaderboard={leaderboardsMap[seg.id] || []}
            stats={statsMap[seg.id] || {
              totalAthletes: 0,
              completedAthletes: 0,
              bestTime: null,
              avgTime: null,
              maxPower: null,
              avgSpeed: null,
            }}
            sortBy={sortBy}
            searchQuery={searchQuery}
            teamFilter={teamFilter}
          />
        ))}

        {segments.length === 0 && (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            <span className="material-symbols-outlined text-6xl text-slate-200 dark:text-slate-800 mb-4">route</span>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">目前無任何活動中路段</p>
          </div>
        )}
      </div>

      <div className="mt-12 flex justify-center">
        <img src="https://strava.criterium.tw/api_logo_pwrdBy_strava_horiz_white.png" alt="Powered by Strava" className="h-8 opacity-40 dark:opacity-30 invert dark:invert-0" />
      </div>
    </div>
  );
};

export default Leaderboard;
