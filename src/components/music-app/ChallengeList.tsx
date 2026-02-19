import React, { Suspense } from 'react';
import { Play, Clock } from 'lucide-react';
import { getTeamColor } from '../../utils/teamColors';

const SegmentMap = React.lazy(() => import('../../features/map/SegmentMap'));

const TinyMapLoading = () => (
    <div className="w-full h-full bg-slate-800 animate-pulse" />
);

interface Challenge {
    id: string;
    name: string;
    distance: string;
    gradient: string;
    imageUrl: string;
    polyline?: string;
    team?: string;
    endDate?: string;
}

interface ChallengeListProps {
    challenges: Challenge[];
    onChallengeClick?: (id: string) => void;
}

/**
 * 計算剩餘天數
 * @param endDate 結束日期（ISO 字串或 YYYY-MM-DD）
 * @returns 剩餘天數，null 代表無結束日期，負數代表已過期
 */
function getDaysRemaining(endDate?: string): number | null {
    if (!endDate) return null;
    try {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) return null;
        const now = new Date();
        return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    } catch {
        return null;
    }
}

/**
 * 近期挑戰列表
 * - 依剩餘天數由大到小排列
 * - 進行中顯示剩餘天數（發光效果）
 * - 已結束灰色 + 「已結束」標籤
 * - 點擊跳轉至該挑戰的詳情頁
 */
export function ChallengeList({ challenges, onChallengeClick }: ChallengeListProps) {
    // NOTE: 依剩餘天數排列，由大到小（活躍在前，已結束在後）
    const sortedChallenges = [...challenges].sort((a, b) => {
        const daysA = getDaysRemaining(a.endDate) ?? 999;
        const daysB = getDaysRemaining(b.endDate) ?? 999;
        return daysB - daysA;
    });

    return (
        <div className="w-full px-5">
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-white text-lg font-bold">近期挑戰</h2>
            </div>

            <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
                {sortedChallenges.map((challenge) => {
                    const daysRemaining = getDaysRemaining(challenge.endDate);
                    // NOTE: 剩餘天數 <= 0 或有結束日期但已過期 → 已結束
                    const isExpired = daysRemaining !== null && daysRemaining <= 0;

                    return (
                        <button
                            key={challenge.id}
                            onClick={() => onChallengeClick?.(challenge.id)}
                            className={`flex items-center gap-3 p-3 text-left w-full rounded-3xl border transition-all ${isExpired
                                ? 'bg-white/[0.03] border-white/5 opacity-50'
                                : 'card-glow'
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 relative bg-bg-darker ${isExpired ? 'grayscale' : ''}`}>
                                {challenge.polyline ? (
                                    <Suspense fallback={<TinyMapLoading />}>
                                        <SegmentMap
                                            polyline={challenge.polyline}
                                            className="w-full h-full !min-h-0 pointer-events-none"
                                            minimal={true}
                                        />
                                    </Suspense>
                                ) : (
                                    <img
                                        src={challenge.imageUrl}
                                        alt={challenge.name}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                )}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <h3 className={`text-[15px] font-medium truncate ${isExpired ? 'text-white/40' : 'text-white'}`}>
                                        {challenge.name}
                                    </h3>
                                    {isExpired ? (
                                        <span className="text-[10px] font-bold text-white/30 bg-white/10 px-1.5 py-0.5 rounded-full shrink-0">
                                            已結束
                                        </span>
                                    ) : daysRemaining !== null ? (
                                        /* NOTE: 剩餘天數發光顯示 */
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 text-emerald-300 bg-emerald-500/15 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                                            <Clock size={10} />
                                            {daysRemaining}天
                                        </span>
                                    ) : null}
                                    {!isExpired && challenge.team && (
                                        <div
                                            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full shrink-0"
                                            style={{ backgroundColor: getTeamColor(challenge.team) }}
                                        >
                                            <span className="text-[9px] font-bold text-white shadow-black drop-shadow-sm">{challenge.team}</span>
                                        </div>
                                    )}
                                </div>
                                <p className={`text-[13px] ${isExpired ? 'text-white/20' : 'text-text-secondary'}`}>
                                    {challenge.distance} · {challenge.gradient}
                                </p>
                            </div>
                            <div className={`w-8 h-8 flex items-center justify-center rounded-full shrink-0 ${isExpired ? 'bg-white/5' : 'bg-primary-soft'
                                }`}>
                                <Play size={14} className={isExpired ? 'text-white/20 ml-0.5' : 'text-primary ml-0.5'} fill="currentColor" />
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
