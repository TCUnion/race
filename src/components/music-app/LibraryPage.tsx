import { useState, useCallback, useEffect } from 'react';
import { Trophy, Flame, ChevronLeft, ChevronRight, Users, Calendar, TrendingUp, Mountain, ExternalLink, Crown, Medal, RefreshCw, ChevronDown, ChevronUp, UserPlus, CheckCircle2, Loader2 } from 'lucide-react';
import { StatusBar } from './StatusBar';

import { useRaceHistory, RaceSegment, RaceLeaderboardEntry } from '../../hooks/useRaceHistory';
import SegmentMap from '../../features/map/SegmentMap';
import AnnouncementBanner from '../../features/dashboard/AnnouncementBanner';
import { getTeamColor } from '../../utils/teamColors';
import ShareButtons from '../ui/ShareButtons';
import { API_BASE_URL } from '../../lib/api_config';
import { useRegistration } from '../../hooks/useRegistration';

// NOTE: 內嵌 SVG 預設頭像，避免外部 CDN 無法載入
const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23334155'/%3E%3Ccircle cx='50' cy='38' r='18' fill='%2394a3b8'/%3E%3Cellipse cx='50' cy='85' rx='30' ry='25' fill='%2394a3b8'/%3E%3C/svg%3E";

interface LibraryPageProps {
    onTabChange?: (tab: string) => void;
    activeTab?: string;
    initialSegmentId?: string;
}

/**
 * 比賽頁面 - V2 行動端
 * 顯示進行中與已結束的路段挑戰
 */
export function LibraryPage({ onTabChange, activeTab = 'library', initialSegmentId }: LibraryPageProps) {
    const { ongoingRaces, endedRaces, isLoading, error, getLeaderboard, refresh } = useRaceHistory();

    // Tab 狀態：進行中 / 歷史挑戰
    const [activeSection, setActiveSection] = useState<'ongoing' | 'ended'>('ongoing');

    // 排行榜 Modal 狀態
    const [selectedRace, setSelectedRace] = useState<RaceSegment | null>(null);
    const [leaderboard, setLeaderboard] = useState<RaceLeaderboardEntry[]>([]);
    const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
    const [showAllEntries, setShowAllEntries] = useState(false);
    const [showDescription, setShowDescription] = useState(false);

    // 報名功能
    const { isAuthenticated, isRegistered, register, unregister, processingSegmentId } = useRegistration();

    // 開啟排行榜
    const handleOpenLeaderboard = useCallback(async (race: RaceSegment) => {
        setSelectedRace(race);
        setIsLoadingLeaderboard(true);
        setShowAllEntries(false);
        const data = await getLeaderboard(race.id);
        setLeaderboard(data);
        setIsLoadingLeaderboard(false);
    }, [getLeaderboard]);

    // NOTE: 從首頁跳轉過來時，自動開啟指定挑戰的排行榜
    useEffect(() => {
        if (!initialSegmentId || isLoading) return;
        const allRaces = [...ongoingRaces, ...endedRaces];
        const targetRace = allRaces.find(r => String(r.id) === initialSegmentId);
        if (targetRace) {
            handleOpenLeaderboard(targetRace);
        }
    }, [initialSegmentId, isLoading, ongoingRaces, endedRaces, handleOpenLeaderboard]);

    // 關閉排行榜
    const handleCloseLeaderboard = useCallback(() => {
        setSelectedRace(null);
        setLeaderboard([]);
    }, []);

    // 格式化時間
    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // 格式化日期
    const formatDateRange = (start?: string, end?: string) => {
        if (!start) return '';
        const startDate = new Date(start);
        const formatDate = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;

        if (!end) {
            return formatDate(startDate);
        }

        const endDate = new Date(end);
        return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    };

    // 排名顯示元素
    const getRankDisplay = (rank: number | null) => {
        if (!rank) return <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-xs">-</div>;
        if (rank === 1) return <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-yellow-500/30">1</div>;
        if (rank === 2) return <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-slate-400/30">2</div>;
        if (rank === 3) return <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-amber-600/30">3</div>;
        return <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-xs">{rank}</div>;
    };

    // 當前顯示的比賽列表
    const currentRaces = activeSection === 'ongoing' ? ongoingRaces : endedRaces;



    // ... existing code ...

    // 渲染比賽卡片 - 符合 mockup 設計
    const renderRaceCard = (race: RaceSegment, isOngoing: boolean) => (
        <button
            key={race.id}
            onClick={() => handleOpenLeaderboard(race)}
            className={`relative w-full text-left rounded-2xl overflow-hidden transition-all active:scale-[0.97] ${isOngoing
                ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-strava-orange/30 shadow-lg shadow-strava-orange/10'
                : 'bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50'
                }`}
            style={{ backdropFilter: 'blur(12px)' }}
        >
            {/* Polyline Map Cover - 使用 SegmentMap 渲染實際路線 */}
            <div className="relative h-28 overflow-hidden">
                {race.polyline ? (
                    <SegmentMap polyline={race.polyline} className="w-full h-full" minimal={true} />
                ) : (
                    <div className={`w-full h-full ${isOngoing
                        ? 'bg-gradient-to-br from-strava-orange/20 via-amber-900/10 to-slate-900'
                        : 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900'
                        }`} />
                )}

                {/* 漸層遮罩 */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />

                {/* 進行中標籤 - 右上角 */}
                {isOngoing && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-strava-orange rounded-full shadow-lg z-10">
                        <Flame className="w-2.5 h-2.5 text-white" />
                        <span className="text-[9px] font-bold text-white">進行中</span>
                    </div>
                )}

                {/* 主辦車隊標籤 - 左上角 */}
                {race.team && (
                    <div
                        className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full shadow-lg z-10 border border-white/10"
                        style={{ backgroundColor: getTeamColor(race.team) }}
                    >
                        <Users className="w-2.5 h-2.5 text-white" />
                        <span className="text-[9px] font-bold text-white shadow-black drop-shadow-sm">{race.team}</span>
                    </div>
                )}
            </div>

            {/* 資訊區 - 符合 mockup 佈局 */}
            <div className="p-3">
                {/* 標題 - 優先使用敘述欄位（對應首頁標題） */}
                <h3 className="text-white font-bold text-sm mb-2 line-clamp-1">{race.description || race.name}</h3>

                {/* 統計資料行 */}
                <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-2">
                    <span className="font-medium">{(race.distance / 1000).toFixed(1)} km</span>
                    <span className="text-slate-600">•</span>
                    <span>{race.average_grade.toFixed(1)}% avg</span>
                    <span className="text-slate-600">•</span>
                    <span>{Math.round(race.total_elevation_gain)} m</span>
                </div>

                {/* 底部 - 參與人數 + 日期 */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[10px]">
                        <Trophy className="w-3 h-3 text-yellow-500" />
                        <span className="text-yellow-500 font-bold">{race.participant_count}</span>
                        <span className="text-slate-500">人</span>
                    </div>
                    <div className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${isOngoing
                        ? 'bg-strava-orange/20 text-strava-orange border border-strava-orange/30'
                        : 'bg-slate-700/50 text-slate-400 border border-slate-600/30'
                        }`}>
                        {formatDateRange(race.start_date, race.end_date)}
                    </div>
                </div>
            </div>
        </button>
    );

    return (
        <div className="flex flex-col w-full h-full bg-bg overflow-hidden relative">
            <div className="md:hidden">
                <StatusBar />
            </div>

            {/* Header */}
            <header className="flex justify-between items-center px-5 py-3">
                <h1 className="text-white text-2xl md:text-3xl font-bold">挑戰</h1>
                <button
                    onClick={refresh}
                    disabled={isLoading}
                    className="p-2 rounded-full bg-white/10 text-white/60 active:scale-95"
                >
                    <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </header>

            {/* Tab 切換 - 進行中 / 歷史挑戰 */}
            <div className="px-5 mb-4">
                <div className="flex items-center bg-slate-800/50 rounded-full p-1">
                    <button
                        onClick={() => setActiveSection('ongoing')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-bold transition-all ${activeSection === 'ongoing'
                            ? 'bg-strava-orange text-white shadow-lg'
                            : 'text-slate-400'
                            }`}
                    >
                        <Flame className={`w-3.5 h-3.5 ${activeSection === 'ongoing' ? 'animate-pulse' : ''}`} />
                        進行中
                        {ongoingRaces.length > 0 && (
                            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${activeSection === 'ongoing' ? 'bg-white/20' : 'bg-slate-700'
                                }`}>
                                {ongoingRaces.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveSection('ended')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-bold transition-all ${activeSection === 'ended'
                            ? 'bg-slate-600 text-white shadow-lg'
                            : 'text-slate-400'
                            }`}
                    >
                        歷史挑戰
                        {endedRaces.length > 0 && (
                            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${activeSection === 'ended' ? 'bg-white/20' : 'bg-slate-700'
                                }`}>
                                {endedRaces.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* 可滾動內容區 */}
            <main className="flex-1 overflow-y-auto px-5 pb-24 md:pb-6 scrollbar-hide">
                {/* Announcement Banner */}
                <div className="-mx-5 mb-4">
                    <AnnouncementBanner />
                </div>

                {/* Loading State */}
                {isLoading && currentRaces.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16">
                        <RefreshCw className="w-8 h-8 text-primary animate-spin mb-3" />
                        <p className="text-slate-400 text-sm">載入中...</p>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
                        載入失敗：{error}
                    </div>
                )}

                {/* 比賽卡片網格 - 響應式佈局 */}
                {currentRaces.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {currentRaces.map((race) => renderRaceCard(race, activeSection === 'ongoing'))}
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && currentRaces.length === 0 && !error && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Trophy className="w-12 h-12 text-slate-700 mb-3" />
                        <h3 className="text-base font-bold text-slate-400 mb-1">
                            {activeSection === 'ongoing' ? '尚無進行中的挑戰' : '尚無歷史挑戰'}
                        </h3>
                        <p className="text-sm text-slate-500 max-w-[280px]">
                            {activeSection === 'ongoing'
                                ? '目前沒有進行中的比賽。'
                                : '還沒有已結束的比賽記錄。'
                            }
                        </p>
                    </div>
                )}
            </main>

            {/* 排行榜 Modal - 全螢幕，模糊透明背景 */}
            {selectedRace && (
                <div className="fixed inset-0 z-50 animate-in slide-in-from-right duration-300 bg-black/80 backdrop-blur-xl overflow-y-auto">
                    {/* Modal 全頁面可滑動 */}
                    <div className="relative">
                        {/* Map Header */}
                        <div className="h-48 sm:h-64 md:h-80 relative overflow-hidden">
                            {selectedRace.polyline ? (
                                <SegmentMap polyline={selectedRace.polyline} className="w-full h-full" minimal={true} />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-transparent" />
                        </div>

                        {/* 返回按鈕 - 左上角 */}
                        <button
                            onClick={handleCloseLeaderboard}
                            className="absolute top-10 left-4 flex items-center gap-1 px-3 py-2 bg-black/50 backdrop-blur-md rounded-full text-white active:scale-95"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span className="text-xs font-medium">返回挑戰</span>
                        </button>

                        {/* Share Button - 右上角 */}
                        <div className="absolute top-10 right-4 z-10">
                            <ShareButtons
                                title={selectedRace.name}
                                description={selectedRace.description}
                                url={`${(API_BASE_URL || 'https://service.criterium.tw').replace(/\/$/, '')}/api/share/race/${selectedRace.id}`}
                                size="sm"
                                showLabels={false}
                                className="bg-black/50 backdrop-blur-md rounded-full px-2 py-1"
                            />
                        </div>

                        {/* 標題區 */}
                        <div className="absolute bottom-4 left-4 right-4">
                            <div className="flex items-center justify-between mb-1">
                                <h2 className="text-white text-lg font-bold line-clamp-1 flex-1 mr-2">{selectedRace.description || selectedRace.name}</h2>
                                {selectedRace.team && (
                                    <div
                                        className="flex items-center gap-1 px-2 py-1 rounded-full shadow-lg border border-white/10 shrink-0"
                                        style={{ backgroundColor: getTeamColor(selectedRace.team) }}
                                    >
                                        <Users className="w-3 h-3 text-white" />
                                        <span className="text-[10px] font-bold text-white shadow-black drop-shadow-sm">{selectedRace.team}</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-400">
                                <span>{(selectedRace.distance / 1000).toFixed(1)} km</span>
                                <span>•</span>
                                <span>{selectedRace.average_grade.toFixed(1)}%</span>
                                <span>•</span>
                                <span>{Math.round(selectedRace.total_elevation_gain)} m</span>
                                {(selectedRace.start_date) && (
                                    <>
                                        <span>•</span>
                                        <span className="font-bold text-sm" style={{ color: '#FC5200' }}>
                                            {formatDateRange(selectedRace.start_date, selectedRace.end_date)}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 排行榜標題 */}
                    <div className="px-4 py-3 border-b border-slate-800">
                        <div className="flex items-center justify-between">
                            <h3 className="text-white font-bold text-sm">排行榜</h3>
                            <span className="text-xs text-slate-500">{leaderboard.length} 位參賽者</span>
                        </div>

                        {/* 比賽敘述卡片 */}
                        {selectedRace.race_description && (
                            <div className="mt-3">
                                <button
                                    onClick={() => setShowDescription(!showDescription)}
                                    className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-all active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                            <Mountain className="w-4 h-4 text-amber-400" />
                                        </div>
                                        <span className="text-sm font-bold text-amber-300">挑戰內容</span>
                                    </div>
                                    {showDescription ? <ChevronUp size={16} className="text-amber-400" /> : <ChevronDown size={16} className="text-amber-400" />}
                                </button>
                                {showDescription && (
                                    <div className="mt-2 text-sm text-white/80 leading-relaxed whitespace-pre-wrap bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
                                        {selectedRace.race_description}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 報名按鈕 */}
                        {(() => {
                            const segId = selectedRace.id;
                            const isProcessing = processingSegmentId === segId;
                            const registered = isRegistered(segId);

                            if (!isAuthenticated) {
                                return (
                                    <div className="mt-2 text-center text-[10px] text-white/40 py-1.5">
                                        請先連結 Strava 帳號以報名
                                    </div>
                                );
                            }

                            if (registered) {
                                return (
                                    <div className="mt-2">
                                        <div className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                                            <CheckCircle2 className="w-3 h-3" />
                                            <span>已報名 ✓</span>
                                        </div>
                                        <p className="text-center text-[10px] text-white/30 mt-1">如需取消報名，請前往報名頁面操作</p>
                                    </div>
                                );
                            }

                            return (
                                <button
                                    onClick={() => register(segId)}
                                    disabled={isProcessing}
                                    className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-strava-orange/30 bg-strava-orange/10 hover:bg-strava-orange/20 text-white text-xs font-bold transition-all active:scale-[0.98]"
                                >
                                    {isProcessing ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <>
                                            <UserPlus className="w-3 h-3" />
                                            <span>立即報名</span>
                                        </>
                                    )}
                                </button>
                            );
                        })()}
                    </div>

                    {/* 排行榜內容 - 不再限制高度，跟隨頁面滑動 */}
                    <div>
                        {isLoadingLeaderboard ? (
                            <div className="flex items-center justify-center py-16">
                                <RefreshCw className="w-6 h-6 text-primary animate-spin" />
                            </div>
                        ) : leaderboard.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <Medal className="w-10 h-10 text-slate-700 mb-2" />
                                <p className="text-slate-400 text-sm">尚無排行資料</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-800/50">
                                {(showAllEntries ? leaderboard : leaderboard.slice(0, 100)).map((entry) => (
                                    <div key={entry.athlete_id} className={`flex items-center gap-2 sm:gap-3 px-4 py-3 active:bg-slate-800/30 ${entry.rank === 1 ? 'bg-gradient-to-r from-yellow-500/10 to-transparent' : ''}`}>
                                        {/* 排名 */}
                                        <div className="w-5 text-center flex-shrink-0">
                                            {getRankDisplay(entry.rank)}
                                        </div>

                                        {/* 頭像 */}
                                        <div className="relative flex-shrink-0">
                                            <img
                                                src={entry.profile_medium || DEFAULT_AVATAR}
                                                alt=""
                                                referrerPolicy="no-referrer"
                                                onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
                                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover border border-white/10"
                                            />
                                            {entry.is_tcu && (
                                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center border border-bg">
                                                    <Crown className="w-2.5 h-2.5 text-white" />
                                                </div>
                                            )}
                                        </div>

                                        {/* 名稱 */}
                                        <div className="flex-1 min-w-0 overflow-hidden">
                                            <div className="text-white font-bold text-xs sm:text-sm truncate">{entry.name}</div>
                                            <div className="flex items-center gap-1 flex-wrap">
                                                <span className="text-white/40 text-[9px] sm:text-[10px] uppercase font-medium whitespace-nowrap">{entry.team || '個人'}</span>
                                                {entry.attempt_count !== undefined && entry.attempt_count > 0 && (
                                                    <span className="text-white/30 text-[9px] sm:text-[10px] whitespace-nowrap">· 挑戰{entry.attempt_count}次</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* 最佳成績與日期 */}
                                        <div className="text-right flex-shrink-0">
                                            <div className="text-white/40 text-[8px] sm:text-[9px] uppercase font-bold whitespace-nowrap">最佳完成時間</div>
                                            <div className="text-white font-mono font-bold text-xs sm:text-sm whitespace-nowrap">{formatTime(entry.best_time)}</div>
                                            <div className="flex items-center justify-end gap-1">
                                                <span className="text-white/40 text-[9px] sm:text-[10px] whitespace-nowrap">
                                                    {entry.achieved_at ? new Date(entry.achieved_at).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }) : '--'}
                                                </span>
                                                {entry.average_watts && (
                                                    <span className="text-primary text-[9px] sm:text-[10px] font-bold whitespace-nowrap">{entry.average_watts}W</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Strava 連結 */}
                                        {entry.activity_id && (
                                            <a
                                                href={`https://www.strava.com/activities/${entry.activity_id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-1 sm:p-1.5 rounded-lg bg-primary/10 text-primary active:scale-95 flex-shrink-0"
                                            >
                                                <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Show More/Less */}
                        {leaderboard.length > 100 && (
                            <button
                                onClick={() => setShowAllEntries(!showAllEntries)}
                                className="w-full py-4 text-center text-sm font-medium text-primary active:bg-slate-800/30"
                            >
                                {showAllEntries ? '收合' : `查看全部 ${leaderboard.length} 筆`}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
