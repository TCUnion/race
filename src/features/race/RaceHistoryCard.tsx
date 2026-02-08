import React from 'react';
import { MapPin, Users, Calendar, ChevronRight, TrendingUp, Mountain } from 'lucide-react';
import SegmentMap from '../map/SegmentMap';
import { RaceSegment } from '../../hooks/useRaceHistory';

interface RaceHistoryCardProps {
    race: RaceSegment;
    isOngoing?: boolean;
    onClick?: () => void;
}

/**
 * 比賽歷史卡片元件
 * 顯示路段封面（Polyline）、標題、距離、坡度、爬升等資訊
 */
const RaceHistoryCard: React.FC<RaceHistoryCardProps> = ({ race, isOngoing = false, onClick }) => {
    // 格式化日期範圍
    const formatDateRange = (start?: string, end?: string) => {
        if (!start || !end) return '';
        const s = new Date(start).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' });
        const e = new Date(end).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' });
        return `${s} - ${e}`;
    };

    return (
        <div
            className={`
        group relative overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer
        ${isOngoing
                    ? 'bg-gradient-to-br from-slate-900 to-slate-800 border-strava-orange/30 hover:border-strava-orange/60 hover:shadow-xl hover:shadow-strava-orange/10'
                    : 'bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700/50 hover:border-slate-600 hover:shadow-lg'
                }
      `}
            onClick={onClick}
        >
            {/* 進行中標籤 */}
            {isOngoing && (
                <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-strava-orange text-white text-[10px] font-black uppercase tracking-wider shadow-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    進行中
                </div>
            )}

            {/* 地圖封面 */}
            <div className="relative h-32 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/80 z-[1]" />
                <SegmentMap
                    polyline={race.polyline}
                    className="w-full h-full"
                />

                {/* 日期標籤 */}
                <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded bg-black/50 backdrop-blur-sm text-[10px] text-slate-300">
                    <Calendar className="w-3 h-3" />
                    {formatDateRange(race.start_date, race.end_date)}
                </div>
            </div>

            {/* 內容區 */}
            <div className="p-4 space-y-3">
                {/* 標題 */}
                <h3 className="text-lg font-black text-white tracking-tight line-clamp-1 group-hover:text-strava-orange transition-colors">
                    {race.description || race.name}
                </h3>

                {/* 統計數據 */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-tcu-blue" />
                        {(race.distance / 1000).toFixed(1)}km
                    </span>
                    <span className="flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                        {race.average_grade.toFixed(1)}%
                    </span>
                    <span className="flex items-center gap-1">
                        <Mountain className="w-3.5 h-3.5 text-amber-500" />
                        {Math.round(race.total_elevation_gain)}m
                    </span>
                </div>

                {/* 底部資訊 */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Users className="w-3.5 h-3.5" />
                        <span className="font-bold text-white">{race.participant_count}</span>
                        <span>人參與</span>
                    </div>

                    <button className="flex items-center gap-1 text-[10px] font-bold text-tcu-blue uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                        排行榜
                        <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Hover 效果 */}
            <div className="absolute inset-0 bg-gradient-to-t from-strava-orange/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
    );
};

export default RaceHistoryCard;
