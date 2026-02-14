import React, { useState, useEffect } from 'react';
import { Trophy, Crown, Activity, Clock, X, ExternalLink, ChevronUp } from 'lucide-react';
import { RaceSegment, RaceLeaderboardEntry, formatRaceTime } from '../../hooks/useRaceHistory';
import SegmentMap from '../map/SegmentMap';

interface RaceLeaderboardProps {
    race: RaceSegment;
    leaderboard: RaceLeaderboardEntry[];
    isLoading?: boolean;
    onClose?: () => void;
}

/**
 * 比賽排行榜元件
 * 顯示選手排名、最佳時間、挑戰次數
 */
const RaceLeaderboard: React.FC<RaceLeaderboardProps> = ({
    race,
    leaderboard,
    isLoading = false,
    onClose
}) => {
    const [showAll, setShowAll] = useState(false);
    const displayedEntries = showAll ? leaderboard : leaderboard.slice(0, 10);

    // 前三名樣式
    const getRankStyle = (rank: number) => {
        switch (rank) {
            case 1: return 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30';
            case 2: return 'bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-md';
            case 3: return 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md';
            default: return 'bg-slate-700 text-slate-300';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 shadow-2xl">

                {/* 關閉按鈕 */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* 地圖 Header */}
                <div className="relative h-32 sm:h-40 shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900 z-[1]" />
                    <SegmentMap polyline={race.polyline} className="w-full h-full" />

                    {/* 路段資訊 */}
                    <div className="absolute bottom-4 left-4 right-4 z-10">
                        <h2 className="text-xl font-black text-white mb-1 drop-shadow-lg">
                            {race.description || race.name}
                        </h2>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                            <span>{(race.distance / 1000).toFixed(1)}km</span>
                            <span>{race.average_grade.toFixed(1)}% 坡度</span>
                            <span>{Math.round(race.total_elevation_gain)}m 爬升</span>
                        </div>
                    </div>
                </div>

                {/* 排行榜標題 */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
                    <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        <span className="text-sm font-black text-white uppercase tracking-wider">排行榜</span>
                    </div>
                    <span className="text-xs text-slate-400">
                        共 {leaderboard.length} 位選手
                    </span>
                </div>

                {/* 排行榜列表 */}
                <div className="max-h-none">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-2 border-tcu-blue border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : leaderboard.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <Trophy className="w-12 h-12 mx-auto mb-2 opacity-30" />
                            <p className="text-sm font-bold">尚無排行榜資料</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800/50">
                            {displayedEntries.map((entry) => (
                                <div
                                    key={entry.athlete_id}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/50 transition-colors group"
                                >
                                    {/* 排名 */}
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black ${entry.rank ? getRankStyle(entry.rank) : 'bg-slate-800 text-slate-500'}`}>
                                        {entry.rank || '-'}
                                    </div>

                                    {/* 頭像 */}
                                    <div className="relative">
                                        {entry.profile_medium ? (
                                            <img
                                                src={entry.profile_medium}
                                                alt={entry.name}
                                                className="w-10 h-10 rounded-full object-cover border-2 border-slate-700"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-sm font-bold">
                                                {entry.name.charAt(0)}
                                            </div>
                                        )}
                                        {entry.is_tcu && (
                                            <Crown className="absolute -top-1 -right-1 w-4 h-4 text-amber-500 drop-shadow" />
                                        )}
                                    </div>

                                    {/* 名稱與隊伍 */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{entry.name}</p>
                                        {entry.team && (
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider truncate">{entry.team}</p>
                                        )}
                                    </div>

                                    {/* 挑戰次數 */}
                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                        <Activity className="w-3.5 h-3.5" />
                                        <span className="font-bold text-slate-300">{entry.attempt_count}</span>
                                        <span className="hidden sm:inline">次</span>
                                    </div>

                                    {/* 最佳時間 */}
                                    <div className="flex items-center gap-1.5 min-w-[80px] justify-end">
                                        <Clock className={`w-3.5 h-3.5 ${entry.best_time ? 'text-tcu-blue' : 'text-slate-600'}`} />
                                        <span className={`text-sm font-black tabular-nums ${entry.best_time ? 'text-white' : 'text-slate-600'}`}>
                                            {formatRaceTime(entry.best_time)}
                                        </span>
                                    </div>

                                    {/* 活動連結 */}
                                    {entry.activity_id && (
                                        <a
                                            href={`https://www.strava.com/activities/${entry.activity_id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 rounded-lg bg-strava-orange/10 text-strava-orange hover:bg-strava-orange hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 顯示更多 */}
                    {leaderboard.length > 10 && !showAll && (
                        <button
                            onClick={() => setShowAll(true)}
                            className="w-full py-3 text-xs font-bold text-tcu-blue uppercase tracking-wider hover:bg-slate-800/50 transition-colors"
                        >
                            顯示全部 {leaderboard.length} 位選手
                        </button>
                    )}

                    {showAll && leaderboard.length > 10 && (
                        <button
                            onClick={() => setShowAll(false)}
                            className="w-full py-3 flex items-center justify-center gap-1 text-xs font-bold text-slate-400 uppercase tracking-wider hover:bg-slate-800/50 transition-colors"
                        >
                            <ChevronUp className="w-4 h-4" />
                            收合
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RaceLeaderboard;
