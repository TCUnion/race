import { useState, useEffect, useCallback } from 'react';

export interface StravaSegment {
    id: number;
    name: string;
    distance: number;
    average_grade: number;
    maximum_grade: number;
    elevation_low: number;
    elevation_high: number;
    total_elevation_gain: number;
    activity_type: string;
    polyline?: string;
}

export interface LeaderboardEntry {
    rank: number;
    athlete_id: number;
    name: string;
    firstname?: string;
    lastname?: string;
    profile?: string;
    profile_medium?: string;
    team?: string;
    number?: string;
    elapsed_time: number;
    moving_time?: number;
    distance?: number;
    average_speed?: number;
    average_watts?: number;
    average_heartrate?: number;
    activity_id?: number;
    start_date?: string;
}

export interface SegmentStats {
    totalAthletes: number;
    completedAthletes: number;
    bestTime: number | null;
    avgTime: number | null;
    maxPower: number | null;
    avgSpeed: number | null;
}

interface UseSegmentDataReturn {
    segment: StravaSegment | null;
    leaderboard: LeaderboardEntry[];
    stats: SegmentStats;
    isLoading: boolean;
    error: string | null;
    refresh: () => void;
}

const CONFIG = {
    apiUrl: 'https://n8n.criterium.tw/webhook/136leaderboard-cached',
    refreshInterval: 60000, // 60 秒自動刷新
};

// 136 路段 fallback 資料（當 API 未回傳 segment 時使用）
const FALLBACK_SEGMENT: StravaSegment = {
    id: 10034836,
    name: '136 正上',
    distance: 14460,
    average_grade: 3.7,
    maximum_grade: 19.8,
    elevation_low: 135,
    elevation_high: 667,
    total_elevation_gain: 532,
    activity_type: 'Ride',
    // 136 路線 polyline（從 Strava 取得）
    polyline: 'qxqwCgdxdVo@iBGQq@gBe@sAc@gAm@eBe@qAc@gAa@gAWs@Sq@Sq@Qs@Os@Mo@Ms@Ks@Iq@Gs@Gs@Es@Cs@Cs@As@As@@s@Bu@Ds@Fs@Hs@Js@Ls@Ns@Ps@Rs@Ts@Vu@Xs@Zs@\\s@^s@`@s@b@q@d@q@f@q@h@o@j@o@l@o@n@m@p@m@r@k@t@k@v@i@x@i@z@g@|@g@~@e@`Ae@bAc@dAc@fAa@hA_@jA_@lA]nA]pA[rAYtAYvAWxAUzAU|ASbBQ`BQbBOdBMfBMhBKjBIlBInBGpBEpBErBCrBAtB@tB@vBBvBDxBDxBFzBH|BH|BJ~BL~BLbCN`CNbCPdCPdCRfCRhCThCTjCVjCVlCXnCXnCZpC\\pC\\rC^tC^tC`@vC`@xCb@xCb@zCd@zCd@|Cf@~Cf@~Ch@bDh@`Dj@bDj@dDl@dDl@fDn@fDn@hDp@jDp@jDr@lDr@lDt@nDt@pDv@pDv@rDx@rDx@tDz@vDz@vD|@xD|@xD~@zD~@|DbA|DbA~D'
};

// 格式化時間（秒 → 時:分:秒）
export const formatTime = (seconds: number | null): string => {
    if (!seconds || seconds <= 0) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

// 格式化距離（公尺 → 公里）
export const formatDistance = (meters: number | null): string => {
    if (!meters) return '-';
    return (meters / 1000).toFixed(2) + ' km';
};

// 格式化速度（m/s → km/h）
export const formatSpeed = (metersPerSec: number | null): string => {
    if (!metersPerSec) return '-';
    return (metersPerSec * 3.6).toFixed(1) + ' km/h';
};

export const useSegmentData = (): UseSegmentDataReturn => {
    const [segment, setSegment] = useState<StravaSegment | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [stats, setStats] = useState<SegmentStats>({
        totalAthletes: 0,
        completedAthletes: 0,
        bestTime: null,
        avgTime: null,
        maxPower: null,
        avgSpeed: null,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const calculateStats = (data: LeaderboardEntry[]): SegmentStats => {
        const completed = data.filter(e => e.elapsed_time > 0);
        const times = completed.map(e => e.elapsed_time).filter(t => t > 0);
        const powers = completed.map(e => e.average_watts || 0).filter(p => p > 0);
        const speeds = completed.map(e => e.average_speed || 0).filter(s => s > 0);

        return {
            totalAthletes: data.length,
            completedAthletes: completed.length,
            bestTime: times.length > 0 ? Math.min(...times) : null,
            avgTime: times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null,
            maxPower: powers.length > 0 ? Math.max(...powers) : null,
            avgSpeed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null,
        };
    };

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch(CONFIG.apiUrl);
            if (!response.ok) {
                throw new Error(`API 錯誤: ${response.status}`);
            }

            const data = await response.json();

            // 處理 Segment 資料（使用 API 回傳或 fallback）
            if (data.segment && data.segment.id) {
                setSegment(data.segment);
            } else {
                // API 未回傳 segment，使用 fallback
                setSegment(FALLBACK_SEGMENT);
            }

            // 處理排行榜資料
            if (Array.isArray(data.leaderboard)) {
                // 依完成時間排序
                const sorted = [...data.leaderboard].sort((a, b) => {
                    if (!a.elapsed_time) return 1;
                    if (!b.elapsed_time) return -1;
                    return a.elapsed_time - b.elapsed_time;
                });

                // 加入排名
                const ranked = sorted.map((entry, index) => ({
                    ...entry,
                    rank: index + 1,
                }));

                setLeaderboard(ranked);
                setStats(calculateStats(ranked));
            }
        } catch (err) {
            console.error('載入 Segment 資料失敗:', err);
            setError(err instanceof Error ? err.message : '載入失敗');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 初始載入
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // 自動刷新
    useEffect(() => {
        const timer = setInterval(fetchData, CONFIG.refreshInterval);
        return () => clearInterval(timer);
    }, [fetchData]);

    return {
        segment,
        leaderboard,
        stats,
        isLoading,
        error,
        refresh: fetchData,
    };
};
