
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Participant,
  SegmentData,
  LeaderboardStats,
  LeaderboardResponse
} from '../types';

declare global {
  interface Window {
    L: any;
  }
}

const CONFIG = {
  apiUrl: 'https://n8n.criterium.tw/webhook/136leaderboard',
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

const Leaderboard: React.FC = () => {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState('time');
  const [teamFilter, setTeamFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(CONFIG.apiUrl);
      const json: LeaderboardResponse = await response.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  // 地圖初始化邏輯
  useEffect(() => {
    if (!data?.segment || !mapContainerRef.current || !window.L) return;

    if (!mapRef.current) {
      mapRef.current = window.L.map(mapContainerRef.current, {
        scrollWheelZoom: false
      });
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapRef.current);
    }

    if (data.segment.map?.polyline) {
      const points = decodePolyline(data.segment.map.polyline);
      if (points.length > 0) {
        // 清除舊的線條 (如果有的話)
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
        mapRef.current.fitBounds(polyline.getBounds(), { padding: [20, 20] });
      }
    }
  }, [data, mapContainerRef]);

  // 過濾與排序邏輯
  const filteredAndSortedData = useMemo(() => {
    if (!data?.leaderboard) return [];

    let result = data.leaderboard.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.number && p.number.includes(searchQuery));
      const matchesTeam = !teamFilter || p.team === teamFilter;
      return matchesSearch && matchesTeam;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case 'time': return (a.time_seconds || 0) - (b.time_seconds || 0);
        case 'power': return (b.avg_power_value || 0) - (a.avg_power_value || 0);
        case 'speed': return (b.speed_kmh || 0) - (a.speed_kmh || 0);
        case 'hr': return (a.heart_rate_avg || 0) - (b.heart_rate_avg || 0);
        case 'date': return new Date(b.date).getTime() - new Date(a.date).getTime();
        default: return 0;
      }
    });

    return result.map((p, index) => ({ ...p, rank: index + 1 }));
  }, [data, searchQuery, teamFilter, sortBy]);

  const teams = useMemo(() => {
    if (!data?.leaderboard) return [];
    const t = new Set(data.leaderboard.map(p => p.team).filter(Boolean));
    return Array.from(t);
  }, [data]);

  if (isLoading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <div className="w-12 h-12 border-4 border-tsu-blue/20 border-t-tsu-blue rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold animate-pulse">正在載入排行榜資料...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full pb-20 px-4 md:px-6 lg:px-8 max-w-[1400px] mx-auto">
      {/* 標題與統計 */}
      <div className="w-full py-8 md:py-12 bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 mb-8 p-6 md:p-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-3 italic uppercase tracking-tight">
            TCU 136檢定 <span className="text-tsu-blue">排行榜</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            即時更新 Strava 活動數據 | 路段計時 | 功率分析 (Powered by Strava)
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: '參賽人數', value: data?.stats.total_athletes || '-', color: 'text-slate-900' },
            { label: '完成人數', value: data?.stats.completed_athletes || '-', color: 'text-tsu-blue' },
            { label: '最快時間', value: data?.stats.best_time || '-', color: 'text-red-500' },
            { label: '平均時間', value: data?.stats.avg_time || '-', color: 'text-slate-900' },
            { label: '最高功率', value: `${data?.stats.max_power || '-'} W`, color: 'text-orange-500' },
            { label: '平均速度', value: `${data?.stats.avg_speed || '-'} km/h`, color: 'text-slate-900' },
          ].map((stat, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</span>
              <span className={`text-xl font-black italic ${stat.color} dark:text-white`}>{stat.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 賽段資訊與地圖 */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/20 dark:shadow-none">
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-xl font-black text-slate-900 dark:text-white italic uppercase">路段資訊</h2>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
              {data?.segment.activity_type || 'Ride'}
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mb-8 border-l-4 border-tsu-blue pl-4">
            {data?.segment.name || '136 正上'}
          </div>
          <div className="grid grid-cols-2 gap-y-6 gap-x-4">
            {[
              { label: '距離', value: `${(data?.segment.distance || 0) / 1000} km` },
              { label: '平均坡度', value: `${data?.segment.average_grade}%` },
              { label: '最陡坡度', value: `${data?.segment.maximum_grade}%` },
              { label: '海拔範圍', value: `${data?.segment.elevation_low}m → ${data?.segment.elevation_high}m` },
            ].map((item, i) => (
              <div key={i}>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 p-2 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-lg shadow-slate-200/20 dark:shadow-none flex flex-col min-h-[300px]">
          <div ref={mapContainerRef} className="flex-1 w-full rounded-2xl overflow-hidden z-0"></div>
        </div>
      </div>

      {/* 篩選與排序 */}
      <div className="w-full bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-md mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">排序方式</label>
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
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">車隊篩選</label>
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
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">選手搜尋</label>
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
            onClick={fetchLeaderboard}
            className="w-full md:w-auto self-end bg-tsu-blue hover:brightness-110 text-white font-black uppercase text-xs tracking-widest py-4 px-8 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-tsu-blue/30"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            重新整理
          </button>
        </div>
      </div>

      {/* 排行榜表格 */}
      <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-200/40 dark:shadow-none overflow-hidden">
        <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-lg font-black text-slate-900 dark:text-white italic uppercase">🏆 即時排行榜</h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase">
            最後更新: {data?.last_updated || '-'}
          </span>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/30 dark:bg-slate-800/30">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">排名</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">選手資訊</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">號碼</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">完成時間</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">平均速度</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">平均功率</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">平均心率</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">日期</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Strava</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredAndSortedData.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                  <td className="px-6 py-5 text-center">
                    <div className="flex justify-center">
                      {p.rank <= 3 ? (
                        <span className={`flex items-center justify-center w-8 h-8 rounded-full font-black text-sm italic ${p.rank === 1 ? 'bg-amber-400 text-amber-900' :
                            p.rank === 2 ? 'bg-slate-300 text-slate-700' :
                              'bg-amber-700 text-amber-100'
                          }`}>
                          {p.rank}
                        </span>
                      ) : (
                        <span className="font-black text-lg italic text-slate-300 dark:text-slate-700 group-hover:text-tsu-blue transition-colors">
                          {p.rank < 10 ? `0${p.rank}` : p.rank}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <img src={p.avatar} alt={p.name} className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-700 shadow-sm" />
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-sm">{p.name}</div>
                        {p.team && (
                          <span className="text-[10px] font-black text-tsu-blue/70 dark:text-tsu-blue uppercase">{p.team}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center font-bold text-slate-500 text-xs">#{p.number || '-'}</td>
                  <td className="px-6 py-5 text-center font-black italic text-base text-green-600 dark:text-green-400">{p.time}</td>
                  <td className="px-6 py-5 text-center font-bold text-slate-700 dark:text-slate-300 text-sm">{p.speed}</td>
                  <td className="px-6 py-5 text-center">
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{p.avg_power || '-'}</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase">Watts</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center font-bold text-slate-700 dark:text-slate-300 text-sm">{p.heart_rate || '-'} bpm</td>
                  <td className="px-6 py-5 text-center text-[10px] font-bold text-slate-500">{p.date}</td>
                  <td className="px-6 py-5 text-center">
                    {p.strava_activity_id && (
                      <a
                        href={`${CONFIG.stravaActivityBase}${p.strava_activity_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center p-2 rounded-lg bg-orange-50 dark:bg-orange-500/10 text-strava-orange hover:bg-strava-orange hover:text-white transition-all shadow-sm"
                      >
                        <span className="material-symbols-outlined text-base">open_in_new</span>
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
          {filteredAndSortedData.map((p) => (
            <div key={p.id} className="p-4 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  {p.rank <= 3 && (
                    <div className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center z-10 shadow-lg ${p.rank === 1 ? 'bg-amber-400 text-amber-900' :
                        p.rank === 2 ? 'bg-slate-300 text-slate-700' :
                          'bg-amber-700 text-amber-100'
                      }`}>
                      <span className="text-[10px] font-black">{p.rank}</span>
                    </div>
                  )}
                  <img src={p.avatar} alt={p.name} className="w-14 h-14 rounded-full border-2 border-slate-100 dark:border-slate-800 shadow-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white text-base truncate">{p.name}</h4>
                      {p.team && <p className="text-[10px] font-black text-tsu-blue uppercase">{p.team}</p>}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">#{p.number || '-'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black italic text-green-600 dark:text-green-400 leading-none mb-1">{p.time}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.speed}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl mb-3">
                <div className="text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Power</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white italic">{p.avg_power || '-'}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">H-Rate</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white italic">{p.heart_rate || '-'}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Date</p>
                  <p className="text-[10px] font-bold text-slate-500">{p.date.split(' ')[0]}</p>
                </div>
              </div>
              {p.strava_activity_id && (
                <a
                  href={`${CONFIG.stravaActivityBase}${p.strava_activity_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full h-12 flex items-center justify-center gap-2 bg-orange-50 dark:bg-orange-500/10 text-strava-orange rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all"
                >
                  <span className="text-strava-orange font-black italic">STRAVA</span>
                  查看活動詳情
                </a>
              )}
            </div>
          ))}
        </div>

        {filteredAndSortedData.length === 0 && (
          <div className="p-20 text-center">
            <span className="material-symbols-outlined text-6xl text-slate-200 dark:text-slate-800 mb-4">person_search</span>
            <p className="text-slate-400 font-bold uppercase tracking-widest">找不到符合條件的選手</p>
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-center">
        <img src="https://status.criterium.tw/api_logo_pwrdBy_strava_horiz_white.png" alt="Powered by Strava" className="h-10 opacity-60 dark:opacity-40 invert dark:invert-0" />
      </div>
    </div>
  );
};

export default Leaderboard;
