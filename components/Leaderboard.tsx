
import React, { useState, useEffect, useRef, useMemo } from 'react';
import SegmentMap from './SegmentMap';
import { useSegmentData, formatTime, LeaderboardEntry, StravaSegment, SegmentStats } from '../hooks/useSegmentData';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import MapIcon from 'lucide-react/dist/esm/icons/map';
import Search from 'lucide-react/dist/esm/icons/search';
import Filter from 'lucide-react/dist/esm/icons/filter';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import ChevronUp from 'lucide-react/dist/esm/icons/chevron-up';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import BarChart3 from 'lucide-react/dist/esm/icons/bar-chart-3';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Dna from 'lucide-react/dist/esm/icons/dna';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import SearchX from 'lucide-react/dist/esm/icons/search-x';
import Users from 'lucide-react/dist/esm/icons/users';
import Crown from 'lucide-react/dist/esm/icons/crown';
import StravaLogo from './StravaLogo';

const CONFIG = {
  stravaActivityBase: 'https://www.strava.com/activities/'
};

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
  const [isTableExpanded, setIsTableExpanded] = useState(true);

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
    'border-tcu-blue',     // 藍
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
    <div className="w-full mb-8 sm:mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 標題與統計 */}
      <div className="w-full py-6 sm:py-8 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 mb-4 sm:mb-6 p-4 sm:p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 sm:mb-8">
          <div className={`flex items-start gap-3 sm:gap-4 border-l-4 sm:border-l-8 ${barColor} pl-3 sm:pl-6 w-full`}>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter font-display break-words leading-tight">
                {segment.name}
              </h2>
              <div className="flex flex-wrap items-center gap-y-1 gap-x-2 sm:gap-x-3 mt-1">
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  {segment.activity_type}
                </span>
                <span className="text-slate-400 text-xs font-bold flex items-center gap-1">
                  <MapIcon className="w-3 h-3" />
                  {(segment.distance / 1000).toFixed(2)}km
                </span>
                <span className="text-slate-400 text-xs font-bold hidden sm:inline">
                  · {segment.average_grade}% Avg
                </span>
                {segment.start_date && (
                  <span className="text-amber-500 text-[9px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />
                    <span className="hidden xs:inline">{formatDate(segment.start_date)} - </span>
                    {formatDate(segment.end_date)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsTableExpanded(!isTableExpanded)}
              className="text-slate-400 hover:text-tcu-blue transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {isTableExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-6 sm:mb-8">
          {[
            { label: '參賽', value: stats.totalAthletes ?? '-', color: 'text-slate-900', icon: Users },
            { label: '完成', value: stats.completedAthletes ?? '-', color: 'text-tcu-blue', icon: Trophy },
            { label: '最快', value: formatTime(stats.bestTime), color: 'text-red-500', icon: Zap },
            { label: '均時', value: formatTime(stats.avgTime), color: 'text-slate-900', icon: Dna },
            { label: '功率', value: stats.maxPower ? `${stats.maxPower}W` : '-', color: 'text-orange-500', icon: Zap },
            { label: '速度', value: stats.avgSpeed ? `${(stats.avgSpeed * 3.6).toFixed(1)}` : '-', color: 'text-slate-900', icon: BarChart3 },
          ].map((stat, i) => (
            <div key={i} className="bg-slate-50 dark:bg-slate-800/50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-50 dark:border-slate-800 flex flex-col items-center justify-center text-center group hover:border-tcu-blue/30 transition-all cursor-pointer">
              <stat.icon className="w-3 h-3 sm:w-4 sm:h-4 text-slate-300 group-hover:text-tcu-blue mb-1 sm:mb-2 transition-colors" />
              <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-wider sm:tracking-widest mb-0.5 sm:mb-1">{stat.label}</span>
              <span className={`text-sm sm:text-base font-black italic ${stat.color} dark:text-white`}>
                {stat.value}
              </span>
            </div>
          ))}
        </div>

        {/* 地圖區域 */}
        <div className="w-full h-[180px] sm:h-[220px] mb-6 sm:mb-8 bg-slate-100 dark:bg-slate-800 rounded-xl sm:rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 relative group">
          <SegmentMap polyline={segment.polyline} />
          <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 z-10 opacity-70 group-hover:opacity-100 transition-all pointer-events-none">
            <StravaLogo className="h-5 sm:h-6 w-auto grayscale group-hover:grayscale-0 transition-all" />
          </div>
        </div>

        {/* 表格區塊 */}
        {isTableExpanded && (
          <div className="w-full border-t border-slate-50 dark:border-slate-800 pt-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">
                    <th className="pb-4 w-16">Rank</th>
                    <th className="pb-4 text-left">Athlete</th>
                    <th className="pb-4">Number</th>
                    <th className="pb-4">Time</th>
                    <th className="pb-4 hidden md:table-cell">Speed</th>
                    <th className="pb-4 hidden md:table-cell">Power</th>
                    <th className="pb-4 hidden lg:table-cell">Date</th>
                    <th className="pb-4 w-16">Strava</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {processedData.map((p) => (
                    <tr key={`${p.athlete_id}-${p.activity_id}`} className="hover:bg-slate-50 dark:hover:bg-tcu-blue/5 transition-colors group cursor-pointer">
                      <td className="py-4 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-black text-xs italic shadow-sm ${p.rank === 1 ? 'bg-amber-400 text-white shadow-amber-400/20' :
                          p.rank === 2 ? 'bg-slate-300 text-slate-700 shadow-slate-300/20' :
                            p.rank === 3 ? 'bg-amber-700 text-amber-100 shadow-amber-700/20' : 'text-slate-400 dark:text-slate-500'
                          }`}>
                          {p.rank}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <img src={p.profile_medium || p.profile || "https://www.strava.com/assets/users/placeholder_athlete.png"} alt={p.name} className="w-10 h-10 rounded-full border-2 border-slate-200 dark:border-slate-700 group-hover:border-tcu-blue transition-colors" />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-tcu-blue transition-colors flex items-center gap-1.5">
                              {p.name}
                              {p.is_tcu && <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" title="TCU 會員" />}
                            </div>
                            {p.team && <span className="text-[9px] font-black text-tcu-blue/70 dark:text-tcu-blue uppercase tracking-widest">{p.team}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-center font-bold text-slate-500 text-xs">#{p.number || '-'}</td>
                      <td className="py-4 text-center">
                        <span className="font-black italic text-sm text-slate-900 dark:text-white">{formatTime(p.elapsed_time)}</span>
                      </td>
                      <td className="py-4 text-center font-bold text-slate-700 dark:text-slate-300 text-xs hidden md:table-cell">{(p.average_speed * 3.6).toFixed(1)} <span className="text-[9px] opacity-50 uppercase">km/h</span></td>
                      <td className="py-4 text-center font-bold text-slate-700 dark:text-slate-300 text-xs hidden md:table-cell">{Math.round(p.average_watts || 0)} <span className="text-[9px] opacity-50 uppercase">W</span></td>
                      <td className="py-4 text-center text-[10px] font-bold text-slate-500 hidden lg:table-cell">{new Date(p.start_date || 0).toLocaleDateString()}</td>
                      <td className="py-4 text-center">
                        {p.activity_id && (
                          <a href={`${CONFIG.stravaActivityBase}${p.activity_id}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-strava-orange hover:text-white transition-all active:scale-90">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {processedData.length === 0 && (
              <div className="py-20 text-center">
                <SearchX className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">目前的搜尋條件無任何結果</p>
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <RefreshCw className="w-16 h-16 text-tcu-blue animate-spin" />
        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] italic animate-pulse">
          Synchronizing Data
        </h2>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full pb-20 px-4 md:px-6 lg:px-8 max-w-[1200px] mx-auto animate-fade-in">
      {/* 頁面標題 */}
      <div className="w-full py-8 sm:py-16 text-center">
        <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-slate-900 dark:text-white mb-4 sm:mb-6 italic uppercase tracking-tighter font-display">
          <span className="block sm:inline">Global</span> <span className="text-tcu-blue">Leaderboard</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs md:text-sm font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-4 gap-y-2 px-4">
          <span>Real-time</span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 hidden sm:block"></span>
          <span className="hidden sm:inline">Multi-segment Tracking</span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 hidden md:block"></span>
          <span className="flex items-center gap-2">
            <span className="text-[10px] opacity-60 hidden sm:inline">Verified by</span>
            <StravaLogo className="h-4 w-auto grayscale opacity-50" />
          </span>
        </p>
      </div>

      {/* 全局篩選與排序 */}
      <div className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl shadow-tcu-blue/5 mb-8 sm:mb-16 z-30">
        <div className="flex flex-col gap-4 sm:gap-6">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-tcu-blue transition-colors" />
            <input
              type="text"
              placeholder="搜尋選手..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 sm:h-14 pl-12 pr-4 bg-slate-50 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-950 focus:border-tcu-blue focus:ring-4 focus:ring-tcu-blue/10 rounded-xl sm:rounded-2xl text-sm font-bold transition-all text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative group flex-1 sm:min-w-[160px] sm:max-w-[200px]">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-tcu-blue transition-colors" />
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="w-full h-12 sm:h-14 pl-10 pr-10 bg-slate-50 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-950 focus:border-tcu-blue focus:ring-4 focus:ring-tcu-blue/10 rounded-xl sm:rounded-2xl text-xs font-black uppercase tracking-widest appearance-none cursor-pointer dark:text-white text-slate-900"
              >
                <option value="">全部車隊</option>
                {teams.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 p-1 rounded-xl sm:rounded-2xl flex border border-slate-100 dark:border-slate-700 flex-1 sm:min-w-[180px] sm:max-w-[240px]">
              {[
                { id: 'time', label: '時間' },
                { id: 'power', label: '功率' },
                { id: 'speed', label: '速度' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSortBy(opt.id)}
                  className={`flex-1 h-10 sm:h-12 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all ${sortBy === opt.id ? 'bg-white dark:bg-slate-700 text-tcu-blue shadow-md' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => refresh()}
              className="h-12 sm:h-14 px-6 sm:px-8 rounded-xl sm:rounded-2xl bg-tcu-blue text-white font-black uppercase text-xs tracking-[0.15em] sm:tracking-[0.2em] hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-tcu-blue/20 flex items-center justify-center gap-2 sm:gap-3"
            >
              <RefreshCw className="w-4 h-4" />
              刷新
            </button>
          </div>
        </div>
      </div>

      {/* 路段排行榜列表 */}
      <div className="w-full space-y-12">
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
          <div className="py-32 text-center bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800 shadow-inner">
            <SearchX className="w-20 h-20 text-slate-100 dark:text-slate-800 mx-auto mb-6" />
            <h3 className="text-xl font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em] italic">
              No active segments found
            </h3>
            <p className="text-slate-400 text-xs mt-2 uppercase tracking-widest">Only participating segments will appear here.</p>
          </div>
        )}
      </div>

      {/* Global Call to Action */}
      <div className="mt-24 p-12 md:p-20 rounded-[3rem] bg-slate-900 dark:bg-slate-900/50 border border-slate-800 text-center relative overflow-hidden group w-full max-w-4xl shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-tcu-blue/20 to-strava-orange/10 transform scale-150 -rotate-12 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 bg-tcu-blue/10 rounded-3xl flex items-center justify-center mb-8 rotate-3 group-hover:rotate-12 transition-transform duration-500">
            <Trophy className="w-10 h-10 text-tcu-blue" />
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter font-display mb-6">
            Ready to claim your <span className="text-tcu-blue">Crown</span>?
          </h2>
          <p className="text-slate-400 font-medium mb-12 max-w-md mx-auto leading-relaxed">
            連結你的 Strava 帳號即可參與各項賽事挑戰，自動同步數據，展示你的最強實力。
          </p>
          <div className="flex flex-col sm:flex-row gap-6">
            <button className="h-16 px-12 rounded-2xl bg-tcu-blue text-white font-black uppercase text-sm tracking-[0.2em] hover:brightness-110 active:scale-95 transition-all shadow-2xl shadow-tcu-blue/30 group/btn">
              Join Challenge
              <ChevronRight className="inline-block w-4 h-4 ml-2 transform group-hover/btn:translate-x-1 transition-transform" />
            </button>
            <div className="flex items-center gap-4 px-8 py-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Powered by</span>
              <StravaLogo className="h-6 w-auto" color="white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
