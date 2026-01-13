import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

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
    KOM?: string;
    QOM?: string;
    link?: string;
    description?: string;
    athlete_count?: number;
    athlete_count?: number;
}

export interface WeatherData {
    location: string;
    current?: {
        temp: number;
        description: string;
        humidity: number;
        wind_speed: number;
    };
    today?: {
        min: number;
        max: number;
        description: string;
    };
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
    segments: StravaSegment[];
    leaderboard: LeaderboardEntry[];
    stats: SegmentStats;
    leaderboardsMap: Record<number, LeaderboardEntry[]>;
    statsMap: Record<number, SegmentStats>;
    weather: WeatherData | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => void;
}

const CONFIG = {
    // 使用 n8n webhook 作為排行榜 API（支援 GitHub Pages 靜態網站）
    apiUrl: 'https://n8n.criterium.tw/webhook/136leaderboard-cached',
    refreshInterval: 60000, // 60 秒自動刷新
};

// 136 路段 fallback 資料（當 API 未回傳 segment 時使用）
// 資料來源：Strava Segment ID 4928093
const FALLBACK_SEGMENT: StravaSegment = {
    id: 4928093,
    name: '136 正上',
    distance: 14459.6,
    average_grade: 3.7,
    maximum_grade: 19.8,
    elevation_low: 135.2,
    elevation_high: 667.4,
    total_elevation_gain: 579.8,
    activity_type: 'Ride',
    // 正確的 136 路線 polyline（Strava Segment 4928093）
    polyline: 'edhrCqs|_VLQRm@^}ABu@Cy@DwICyD@{BRuCL{BPoATy@^k@^YjDeAZUtGkG~B}AxDgDrAeAfB_A|@]bA_@nA_@fASHEPSbAuAbAoAl@eAb@m@h@_@RUvAiAfB_B~@eAf@s@^kAHm@P_DA[Q}@OU_@[c@g@MUEg@Hk@Vq@ZmA^k@bAiA\\WpA_@~AYbCSlAD|@TZAd@OPOR]Fc@@i@AoA@e@BSPc@fAwBjDmGx@oA`D_GnAcBl@Wp@HNFfAp@hAb@NCb@a@vCuDb@g@\\UtA[dEiAt@]zAmA~AgAtDoBx@[j@M^AlBDd@KnAOLEl@[t@g@nCsBTUP[Rk@PkBpA}CvBaGrA}C|AuDL[Pw@Di@AkAMcACq@BmCIk@_@m@s@YkAG]@qCd@cA?OAMGEs@FWAi@Q_@{@cAEO@iBCOWk@wDqEe@s@_@u@g@{BMWOQa@SQOa@c@aAoAg@g@SEgA@IACKGIAM?MHg@f@eAx@_AlB_BzAq@`@e@`@w@f@kBb@wBj@sA^q@NOZQ`@M^U^OXUh@cA|@{Dr@mAXWPKd@Mn@MnBIvA[`AKJCb@]`@k@@K?U]mBE[BUJ]HOJMbCcAJOB_@La@pAUt@IVIdAi@p@q@b@KtAIXMv@i@HOP_Bv@gCDU@YAMMs@c@e@mAkAo@u@Mg@YyBEg@_@mCCa@`@qAEiAO}@Ca@ISQQMGYCUGi@GW@SDi@PKCk@_@WIwAaAuAm@sAa@y@u@gAg@c@_@IMAW@_@X{BASc@}AA]D_@\\cAn@sATo@LcA?g@DMLOTKt@FNCHEVYFU?aBZyAd@_BBQ?SCQ_@iAYaBIe@G}@i@aBAQ@QFMZAfAT^Pd@Zv@?ZS\\QhAOd@HV@PCn@c@Pa@K[e@k@?ICEFYCGHIB[b@uBf@s@Re@TqCFUHKN@JHHLl@fDBj@Pp@HJRPh@R\\Hj@TRB`AXV?JENSD_@CIGEo@QYMYU]g@?s@JSJCT?@DB?@FCLR^NJFCPWB?@EMy@@CGECI?YFGPBLJd@x@b@b@PGHYEWGEm@o@OUM[CK@SH]d@{A?WCIGm@@GJKRCPHHHJb@BhBHVPPv@f@fAx@f@j@NBTMDI@OCc@EWA{@SqAOa@q@{B]o@IGEQC_@AoAGgAV}@DWAWGOa@_@MSCw@He@Va@PCv@AfDTVEp@[r@e@\\[LWFa@JaBBOPKLCH?@LXp@Hv@Pt@RLJADCB]AiAEk@Ko@Oa@[k@CK@EDK\\a@fAo@XW`@k@FONOj@Kb@@^FtBBl@C`AOz@Fj@Ib@UNQJQPq@RWdAc@|@i@rA_@POHW?UG]?[@WFGF@ZPFLDHXtBLZ\\h@n@h@RJh@FREPIj@S~@KVKV]X_AHe@Do@Ty@NOp@c@JE'
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
    const [segment, setSegment] = useState<StravaSegment | null>(FALLBACK_SEGMENT);
    const [segments, setSegments] = useState<StravaSegment[]>([]);
    const [leaderboardsMap, setLeaderboardsMap] = useState<Record<number, LeaderboardEntry[]>>({});
    const [statsMap, setStatsMap] = useState<Record<number, SegmentStats>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const segmentsRef = useRef<StravaSegment[]>([]);
    const isFetching = useRef(false);

    // 計算統計數據的輔助函數
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

    // 從 Supabase 載入啟用中的路段
    const fetchSegmentsFromSupabase = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('segments')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Fetch segments error:', error);
                return [];
            }

            if (data && data.length > 0) {
                const mappedSegments: StravaSegment[] = data.map(s => ({
                    id: s.strava_id,
                    name: s.name,
                    distance: s.distance || 0,
                    average_grade: s.average_grade || 0,
                    maximum_grade: s.maximum_grade || 0,
                    elevation_low: s.elevation_low || 0,
                    elevation_high: s.elevation_high || 0,
                    total_elevation_gain: s.total_elevation_gain || 0,
                    activity_type: 'Ride',
                    polyline: s.polyline,
                    link: s.link,
                    description: s.description,
                    internal_id: s.id,
                }));
                setSegments(mappedSegments);
                segmentsRef.current = mappedSegments;
                setSegment(prev => prev || mappedSegments[0]);
                return mappedSegments;
            }
            return [];
        } catch (e) {
            console.error('Error fetching segments from Supabase:', e);
            return [];
        }
    }, []);

    const fetchData = useCallback(async (isInitialLoad = false, specificSegments: StravaSegment[] | null = null) => {
        if (isFetching.current && !isInitialLoad) return;

        try {
            if (isInitialLoad) setIsLoading(true);
            isFetching.current = true;
            setError(null);

            const activeSegments = specificSegments || segmentsRef.current;
            if (activeSegments.length === 0) {
                if (isInitialLoad) setIsLoading(false);
                isFetching.current = false;
                return;
            }

            // 為所有路段進行並發請求
            const results = await Promise.all(activeSegments.map(async (seg) => {
                try {
                    const url = `${CONFIG.apiUrl}?segment_id=${seg.id}`;
                    const response = await fetch(url);
                    if (!response.ok) return { id: seg.id, error: true };
                    const data = await response.json();
                    return { id: seg.id, data };
                } catch (e) {
                    return { id: seg.id, error: true };
                }
            }));

            const newLeaderboardsMap: Record<number, LeaderboardEntry[]> = {};
            const newStatsMap: Record<number, SegmentStats> = {};
            let firstWeather: WeatherData | null = null;

            results.forEach((res) => {
                if ('data' in res && res.data) {
                    const data = res.data;
                    // 處理排行榜
                    if (Array.isArray(data.leaderboard)) {
                        const sorted = [...data.leaderboard].sort((a, b) => {
                            if (!a.elapsed_time) return 1;
                            if (!b.elapsed_time) return -1;
                            return a.elapsed_time - b.elapsed_time;
                        });
                        const ranked = sorted.map((entry, index) => ({
                            ...entry,
                            rank: index + 1,
                        }));
                        newLeaderboardsMap[res.id] = ranked;
                        newStatsMap[res.id] = calculateStats(ranked);
                    }
                    // 取得氣象（通常各個路段氣象差異不大，取第一個成功的）
                    if (data.weather && !firstWeather) {
                        firstWeather = data.weather;
                    }
                }
            });

            setLeaderboardsMap(newLeaderboardsMap);
            setStatsMap(newStatsMap);
            if (firstWeather) setWeather(firstWeather);

        } catch (err) {
            console.error('載入資料失敗:', err);
            setError(err instanceof Error ? err.message : '載入失敗');
        } finally {
            if (isInitialLoad) setIsLoading(false);
            isFetching.current = false;
        }
    }, []);

    // 初始載入：先拿 segments 再拿排行榜
    useEffect(() => {
        const init = async () => {
            const loadedSegments = await fetchSegmentsFromSupabase();
            if (loadedSegments.length > 0) {
                await fetchData(true, loadedSegments);
            } else {
                setIsLoading(false);
            }
        };
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 自動刷新
    useEffect(() => {
        const timer = setInterval(() => fetchData(), CONFIG.refreshInterval);
        return () => clearInterval(timer);
    }, [fetchData]);

    // 為了舊程式碼相容性，提供第一個路段的資料
    const firstSegmentId = segments[0]?.id;
    const currentLeaderboard = firstSegmentId ? leaderboardsMap[firstSegmentId] || [] : [];
    const currentStats = firstSegmentId ? statsMap[firstSegmentId] || {
        totalAthletes: 0,
        completedAthletes: 0,
        bestTime: null,
        avgTime: null,
        maxPower: null,
        avgSpeed: null,
    } : {
        totalAthletes: 0,
        completedAthletes: 0,
        bestTime: null,
        avgTime: null,
        maxPower: null,
        avgSpeed: null,
    };

    return {
        segment, // 這裡的 segment 為了相容性保持目前的狀態，Dashboard 可能會切換它
        segments,
        leaderboard: currentLeaderboard,
        stats: currentStats,
        leaderboardsMap,
        statsMap,
        weather,
        isLoading,
        error,
        refresh: () => fetchData(),
    };
};
