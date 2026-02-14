import React, { useState, useCallback } from 'react';
import { Trophy, History, RefreshCw, Flame, Clock } from 'lucide-react';
import { useRaceHistory, RaceSegment, RaceLeaderboardEntry } from '../../hooks/useRaceHistory';
import RaceHistoryCard from './RaceHistoryCard';
import RaceLeaderboard from './RaceLeaderboard';

/**
 * 比賽頁面
 * 顯示進行中與歷史挑戰的排行榜
 */
const RacePage: React.FC = () => {
    const { ongoingRaces, endedRaces, isLoading, error, getLeaderboard, refresh } = useRaceHistory();

    // 選中的比賽與排行榜狀態
    const [selectedRace, setSelectedRace] = useState<RaceSegment | null>(null);
    const [leaderboard, setLeaderboard] = useState<RaceLeaderboardEntry[]>([]);
    const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

    // 開啟排行榜
    const handleOpenLeaderboard = useCallback(async (race: RaceSegment) => {
        setSelectedRace(race);
        setIsLoadingLeaderboard(true);
        const data = await getLeaderboard(race.id);
        setLeaderboard(data);
        setIsLoadingLeaderboard(false);
    }, [getLeaderboard]);

    // 關閉排行榜
    const handleCloseLeaderboard = useCallback(() => {
        setSelectedRace(null);
        setLeaderboard([]);
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-lg border-b border-slate-800">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-strava-orange to-amber-600 shadow-lg shadow-strava-orange/20">
                            <Trophy className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight">比賽</h1>
                            <p className="text-xs text-slate-400">挑戰歷史與排行榜</p>
                        </div>
                    </div>
                    <button
                        onClick={refresh}
                        disabled={isLoading}
                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
                {/* Loading State */}
                {isLoading && ongoingRaces.length === 0 && endedRaces.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <RefreshCw className="w-10 h-10 text-tcu-blue animate-spin mb-4" />
                        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">載入中...</p>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                        載入失敗：{error}
                    </div>
                )}

                {/* 進行中挑戰 */}
                {ongoingRaces.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-strava-orange/20 border border-strava-orange/30">
                                <Flame className="w-4 h-4 text-strava-orange animate-pulse" />
                                <span className="text-sm font-black text-strava-orange uppercase tracking-wider">進行中</span>
                            </div>
                            <span className="text-xs text-slate-500">{ongoingRaces.length} 場挑戰進行中</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {ongoingRaces.map((race) => (
                                <RaceHistoryCard
                                    key={race.id}
                                    race={race}
                                    isOngoing={true}
                                    onClick={() => handleOpenLeaderboard(race)}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* 歷史挑戰 */}
                {endedRaces.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700">
                                <History className="w-4 h-4 text-slate-400" />
                                <span className="text-sm font-black text-slate-400 uppercase tracking-wider">歷史挑戰</span>
                            </div>
                            <span className="text-xs text-slate-500">{endedRaces.length} 場已結束</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {endedRaces.map((race) => (
                                <RaceHistoryCard
                                    key={race.id}
                                    race={race}
                                    isOngoing={false}
                                    onClick={() => handleOpenLeaderboard(race)}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Empty State */}
                {!isLoading && ongoingRaces.length === 0 && endedRaces.length === 0 && !error && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Clock className="w-16 h-16 text-slate-700 mb-4" />
                        <h3 className="text-lg font-bold text-slate-400 mb-2">尚無比賽資料</h3>
                        <p className="text-sm text-slate-500 max-w-md">
                            目前沒有進行中或已結束的挑戰。<br />
                            請在路段管理中設定挑戰日期。
                        </p>
                    </div>
                )}
            </div>

            {/* Leaderboard Modal */}
            {selectedRace && (
                <RaceLeaderboard
                    race={selectedRace}
                    leaderboard={leaderboard}
                    isLoading={isLoadingLeaderboard}
                    onClose={handleCloseLeaderboard}
                />
            )}
        </div>
    );
};

export default RacePage;
