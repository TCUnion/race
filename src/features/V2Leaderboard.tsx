import React, { useState, useEffect, TouchEvent } from 'react';
import { ArrowLeft, Crown, Filter, ChevronLeft, ChevronRight, Users, ExternalLink } from 'lucide-react';
import { useSegmentData, formatTime } from '../hooks/useSegmentData';
import { StatusBar } from '../components/music-app/StatusBar';
import { getTeamColor } from '../utils/teamColors';

interface V2LeaderboardProps {
    onBack: () => void;
    initialSegmentId?: string;
}

export function V2Leaderboard({ onBack, initialSegmentId }: V2LeaderboardProps) {
    const { segments, leaderboardsMap, statsMap, isLoading } = useSegmentData();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeId, setActiveId] = useState<string | null>(initialSegmentId || null);

    // Initial load logic: if no activeId, default to first available segment
    useEffect(() => {
        if (!activeId && segments.length > 0) {
            setActiveId(String(segments[0].id));
        }
    }, [segments, activeId]);

    // Current data derivations
    const currentIndex = segments.findIndex(s => String(s.id) === activeId);
    const currentSegment = segments[currentIndex !== -1 ? currentIndex : 0];
    const currentLeaderboard = currentSegment ? leaderboardsMap[Number(currentSegment.id)] || [] : [];
    const currentStats = currentSegment ? statsMap[Number(currentSegment.id)] : null;

    // Color palette for dynamic styling (Sync with HomePage)
    const TAG_COLORS = [
        '#FC5200', // Strava Orange
        '#0EA5E9', // Sky Blue
        '#10B981', // Emerald
        '#8B5CF6', // Violet
        '#F59E0B', // Amber
        '#EC4899', // Pink
    ];
    const currentColor = TAG_COLORS[currentIndex !== -1 ? currentIndex % TAG_COLORS.length : 0];

    const filteredParticipants = currentLeaderboard.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Swipe Handling
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const minSwipeDistance = 50;

    const onTouchStart = (e: TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const handlePrev = () => {
        if (segments.length <= 1) return;
        const idx = segments.findIndex(s => String(s.id) === activeId);
        if (idx === -1) return;
        const prevIndex = (idx - 1 + segments.length) % segments.length;
        setActiveId(String(segments[prevIndex].id));
    };

    const handleNext = () => {
        if (segments.length <= 1) return;
        const idx = segments.findIndex(s => String(s.id) === activeId);
        if (idx === -1) return;
        const nextIndex = (idx + 1) % segments.length;
        setActiveId(String(segments[nextIndex].id));
    };

    const handleSwipe = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            handleNext();
        } else if (isRightSwipe) {
            handlePrev();
        }
    };

    const onTouchEnd = () => {
        handleSwipe();
    };


    // Countdown Logic
    const getDaysRemaining = (endDateStr?: string) => {
        if (!endDateStr) return null;
        try {
            const end = new Date(endDateStr);
            const now = new Date();
            const diffTime = end.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays > 0 ? diffDays : 0; // Return 0 if expired
        } catch (e) {
            return null;
        }
    };

    const remainingDays = getDaysRemaining(currentSegment?.end_date);
    const isUrgent = remainingDays !== null && remainingDays <= 3;
    const warningColor = '#EF4444'; // Red-500

    return (
        <div className="flex flex-col w-full min-h-screen bg-bg overflow-hidden relative">
            <StatusBar />

            {/* Header */}
            <header
                className="px-5 py-4 flex flex-col gap-4 touch-pan-y"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <div className="flex justify-between items-center">
                    <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-bg-card rounded-full border border-white/5 active:scale-95 transition-transform">
                        <ChevronLeft className="text-white" size={20} />
                    </button>
                    <h2 className="text-white text-lg font-bold">賽段排行榜</h2>
                    <button className="w-10 h-10 flex items-center justify-center bg-bg-card rounded-full border border-white/5">
                        <Filter className="text-white" size={18} />
                    </button>
                </div>

                {/* Segment Info Card */}
                {currentSegment && (
                    <div
                        className="relative border border-white/10 rounded-2xl p-4 transition-all duration-300 overflow-hidden"
                        style={{
                            background: `linear-gradient(135deg, ${isUrgent ? warningColor : currentColor}20 0%, rgba(255,255,255,0.05) 100%)`,
                            borderColor: isUrgent ? `${warningColor}60` : `${currentColor}40`,
                            boxShadow: isUrgent ? `0 0 20px ${warningColor}20` : 'none'
                        }}
                    >
                        {/* Swipe Indicators */}
                        <div className="absolute inset-y-0 left-0 flex items-center justify-center w-8 text-white/20 hover:text-white/60 cursor-pointer z-10" onClick={(e) => { e.stopPropagation(); handlePrev(); }}>
                            <ChevronLeft size={24} />
                        </div>
                        <div className="absolute inset-y-0 right-0 flex items-center justify-center w-8 text-white/20 hover:text-white/60 cursor-pointer z-10" onClick={(e) => { e.stopPropagation(); handleNext(); }}>
                            <ChevronRight size={24} />
                        </div>

                        <div className="flex justify-between items-start mb-2 px-6">
                            <div>
                                <h3 className="text-white text-sm font-bold truncate max-w-[180px]">{currentSegment.description || currentSegment.name}</h3>
                                <div className="flex items-center gap-2">
                                    <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: `${currentColor}aa` }}>
                                        {currentSegment.distance ? (currentSegment.distance / 1000).toFixed(1) : '--'} KM · {currentSegment.total_elevation_gain ? Math.round(currentSegment.total_elevation_gain) : '--'}M 爬升 · {currentSegment.average_grade}%
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-2">
                                    {currentSegment.team && (
                                        <div
                                            className="px-2 py-1 rounded-lg flex items-center gap-1"
                                            style={{ backgroundColor: getTeamColor(currentSegment.team) }}
                                        >
                                            <Users className="w-2.5 h-2.5 text-white" />
                                            <span className="text-white text-[10px] font-black">{currentSegment.team}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-4 mt-2 px-6">
                            <div className="flex flex-col">
                                <span className="text-white/40 text-[9px] uppercase font-bold">最佳成績</span>
                                <span className="text-white text-xs font-bold">{currentStats?.bestTime ? formatTime(currentStats.bestTime) : '--'}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-white/40 text-[9px] uppercase font-bold">報名人數</span>
                                <span className="text-white text-xs font-bold">{currentStats?.registeredCount || 0}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-white/40 text-[9px] uppercase font-bold">完成人數</span>
                                <span className="text-white text-xs font-bold">{currentStats?.completedAthletes || 0}</span>
                            </div>

                            {/* Countdown Display */}
                            {remainingDays !== null && (
                                <div className="flex flex-col">
                                    <span className={`text-[9px] uppercase font-bold ${isUrgent ? 'text-red-400 animate-pulse' : 'text-white/40'}`}>
                                        剩餘時間
                                    </span>
                                    <span className={`text-xs font-bold ${isUrgent ? 'text-red-500' : 'text-white'}`}>
                                        {remainingDays} 天
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Swipe Indicator Dots */}
                        <div className="flex justify-center gap-1 mt-3">
                            {segments.map((s, idx) => (
                                <div
                                    key={s.id}
                                    className={`w-1 h-1 rounded-full transition-colors duration-300 ${String(s.id) === activeId ? 'bg-white' : 'bg-white/10'}`}
                                    style={String(s.id) === activeId ? { backgroundColor: isUrgent ? warningColor : currentColor } : {}}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </header>

            {/* Ranking List */}
            <main className="flex-1 overflow-y-auto px-5 pb-10 scrollbar-hide">
                <div className="flex flex-col gap-2">
                    {isLoading ? (
                        Array(8).fill(0).map((_, i) => (
                            <div key={i} className="h-16 bg-bg-card animate-pulse rounded-2xl border border-white/5" />
                        ))
                    ) : filteredParticipants.length > 0 ? (
                        filteredParticipants.map((p, index) => (
                            <div
                                key={p.rank}
                                className={`flex items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-2xl border transition-all active:scale-[0.98] ${index === 0
                                    ? 'bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/20'
                                    : 'bg-bg-card border-white/5'
                                    }`}
                            >
                                <div className="w-5 sm:w-6 text-center flex-shrink-0">
                                    <span className={`text-sm font-black italic ${p.rank === 1 ? 'text-yellow-500' :
                                        p.rank === 2 ? 'text-gray-400' :
                                            p.rank === 3 ? 'text-amber-600' : 'text-white/30'
                                        }`}>
                                        {p.rank}
                                    </span>
                                </div>
                                <img src={p.profile_medium || 'default_avatar_url'} alt={p.name} referrerPolicy="no-referrer" className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-bg border border-white/10 flex-shrink-0" />
                                <div className="flex-1 min-w-0 overflow-hidden">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <h4 className="text-white text-xs sm:text-sm font-bold truncate">{p.name}</h4>
                                        {p.is_tcu && <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />}
                                    </div>
                                    <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                        <p className="text-white/40 text-[9px] sm:text-[10px] uppercase font-medium whitespace-nowrap">{p.team || '個人'}</p>
                                        {p.attempt_count !== undefined && p.attempt_count > 0 && (
                                            <span className="text-white/30 text-[9px] sm:text-[10px] whitespace-nowrap">· 挑戰{p.attempt_count}次</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end flex-shrink-0">
                                    <span className="text-white/40 text-[8px] sm:text-[9px] uppercase font-bold whitespace-nowrap">最佳完成時間</span>
                                    <span className="text-white text-xs sm:text-sm font-bold tracking-tight whitespace-nowrap">{formatTime(p.elapsed_time)}</span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-white/40 text-[9px] sm:text-[10px] whitespace-nowrap">{p.start_date ? new Date(p.start_date).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }) : ''}</span>
                                        <span className="text-primary text-[9px] sm:text-[10px] font-bold whitespace-nowrap">{p.average_watts || '--'}W</span>
                                    </div>
                                </div>
                                {/* Strava 連結 */}
                                {p.activity_id && (
                                    <a
                                        href={`https://www.strava.com/activities/${p.activity_id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-1 sm:p-1.5 rounded-lg bg-primary/10 text-primary active:scale-95 flex-shrink-0"
                                    >
                                        <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    </a>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="py-20 text-center">
                            <p className="text-white/30 text-sm">暫無排行榜數據</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
