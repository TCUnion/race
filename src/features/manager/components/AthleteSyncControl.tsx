import React, { useState, useMemo, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { StravaActivity } from '../../../types';
import { usePowerAnalysis } from '../../../hooks/usePowerAnalysis';

interface AthleteSyncControlProps {
    athleteId: string;
    activities: StravaActivity[];
    range: number | 'all';
}

export const AthleteSyncControl: React.FC<AthleteSyncControlProps> = ({ athleteId, activities, range }) => {
    const { checkStreamsAvailability } = usePowerAnalysis();

    // Global sync stats state
    const [globalSyncStats, setGlobalSyncStats] = useState<{ syncedCount: number; pendingIds: number[] }>({
        syncedCount: 0,
        pendingIds: []
    });

    // Sync execution state
    const [isSyncingAll, setIsSyncingAll] = useState(false);
    const [syncAllMessage, setSyncAllMessage] = useState<string | null>(null);

    // 1. Calculate filtered activities based on range
    const visibleActivities = useMemo(() => {
        if (range === 'all') return activities;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - Number(range));
        return activities.filter(a => new Date(a.start_date) >= cutoff);
    }, [activities, range]);

    // 2. Calculate derived stats based on visible activities
    const syncStats = useMemo(() => {
        const synced = globalSyncStats.syncedCount;
        const pending = globalSyncStats.pendingIds.length;
        const pendingIds = globalSyncStats.pendingIds;

        // Estimated time: ~2s per activity (conservative)
        const estimatedSeconds = pending * 2;
        const formatEstimate = (secs: number) => {
            if (secs < 60) return `${secs} 秒`;
            return `${Math.ceil(secs / 60)} 分鐘`;
        };

        return { synced, pending, pendingIds, estimatedTimeStr: formatEstimate(estimatedSeconds) };
    }, [globalSyncStats]);

    // Check availability on mount or when activities change
    useEffect(() => {
        const checkAvailability = async () => {
            if (!visibleActivities.length) {
                setGlobalSyncStats({ syncedCount: 0, pendingIds: [] });
                return;
            }

            const allIds = visibleActivities.map(a => a.id);
            const availableIds = await checkStreamsAvailability(allIds);
            const availableSet = new Set(availableIds.map(String));

            const syncedCount = availableIds.length;
            const pendingIds = allIds.filter(id => !availableSet.has(String(id)));

            setGlobalSyncStats({
                syncedCount,
                pendingIds
            });
        };

        checkAvailability();
    }, [visibleActivities, checkStreamsAvailability]);

    // Helper: Fetch with retry
    const fetchWithRetry = async (url: string, options: any, retries = 3) => {
        for (let i = 0; i < retries; i++) {
            try {
                const res = await fetch(url, options);
                if (res.ok) return res;
            } catch (err) {
                if (i === retries - 1) throw err;
            }
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        throw new Error('超過重試次數');
    };

    // Handle "Sync All" logic
    const handleSyncAllActivities = async () => {
        if (isSyncingAll) return;

        if (syncStats.pending === 0) {
            alert('所有活動皆已同步完成！');
            return;
        }

        const confirmMsg = `確定要同步 ${syncStats.pending} 個活動嗎？\n預估時間：${syncStats.estimatedTimeStr}\n優化模式：啟用併發處理與自動重試。`;
        if (!confirm(confirmMsg)) return;

        setIsSyncingAll(true);
        const total = syncStats.pendingIds.length;
        const chunkSize = 20;
        const chunks = [];
        for (let i = 0; i < total; i += chunkSize) {
            chunks.push(syncStats.pendingIds.slice(i, i + chunkSize));
        }

        try {
            let processedCount = 0;
            const CONCURRENCY = 2; // Process 2 chunks concurrently

            for (let i = 0; i < chunks.length; i += CONCURRENCY) {
                const batchPromises = chunks.slice(i, i + CONCURRENCY).map(async (currentChunk, idx) => {
                    await fetchWithRetry('https://service.criterium.tw/webhook/strava-sync-all', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            athlete_id: Number(athleteId),
                            activity_ids: currentChunk,
                            is_chunk: true,
                            requested_at: new Date().toISOString()
                        })
                    });

                    // Update progress
                    processedCount += currentChunk.length;
                    const percent = Math.round((processedCount / total) * 100);
                    setSyncAllMessage(`正在同步中: ${percent}% (${processedCount}/${total})`);

                    // Update local stats optimistically
                    setGlobalSyncStats(prev => {
                        const newPending = prev.pendingIds.filter(id => !currentChunk.includes(id));
                        return {
                            syncedCount: prev.syncedCount + (prev.pendingIds.length - newPending.length),
                            pendingIds: newPending
                        };
                    });
                });

                await Promise.all(batchPromises);
            }

            setSyncAllMessage('🎉 全量同步任務圓滿達成！');
            setTimeout(() => {
                setSyncAllMessage(null);
                setIsSyncingAll(false);
            }, 3000);

        } catch (error) {
            console.error('優化同步失敗:', error);
            setSyncAllMessage('同步中斷，已保存現有進度。請確認網路後重試。');
            setTimeout(() => {
                setIsSyncingAll(false);
            }, 5000);
        }
    };

    return (
        <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-emerald-400">已同步: {syncStats.synced}</span>
            <span className="text-slate-600 text-xs">|</span>
            <span className={`text-xs font-bold ${syncStats.pending > 0 ? 'text-orange-400' : 'text-slate-500'}`}>
                待同步: {syncStats.pending}
            </span>

            <button
                onClick={handleSyncAllActivities}
                disabled={isSyncingAll || syncStats.pending === 0}
                className={`
                    flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-all
                    ${(isSyncingAll || syncStats.pending === 0)
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'}
                `}
            >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
                <span>
                    {isSyncingAll ? '同步中...' : syncStats.pending === 0 ? '已全部同步' : '同步全部'}
                </span>
            </button>

            {syncStats.pending > 0 && !isSyncingAll && (
                <span className="text-[10px] text-slate-500 hidden sm:inline">
                    (預估 {syncStats.estimatedTimeStr})
                </span>
            )}

            {syncAllMessage && (
                <span className="text-xs text-blue-400 animate-pulse">
                    {syncAllMessage}
                </span>
            )}
        </div>
    );
};
