import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface StravaSegment {
    id: number; // Supabase PK
    strava_id: number; // Strava ID
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
    id: 1,
    strava_id: 4928093,
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
                    id: s.id, // Supabase PK
                    strava_id: s.strava_id || s.id, // Fallback if strava_id is null
                    name: s.name,
                    distance: s.distance || 0,
                    average_grade: s.average_grade || 0,
                    maximum_grade: s.maximum_grade || 0,
                    elevation_low: 0,
                    elevation_high: 0,
                    total_elevation_gain: s.elevation_gain || 0,
                    activity_type: 'Ride',
                    polyline: s.polyline,
                    link: s.link,
                    description: s.description,
                }));
                setSegments(mappedSegments);
                segmentsRef.current = mappedSegments;
                // 如果目前的路段是預設的 fallback (id: 1) 或者還沒設定，就換成第一個抓到的路段
                setSegment(prev => (!prev || prev.id === 1) ? mappedSegments[0] : prev);
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
                    const sid = seg.strava_id || seg.id;
                    const url = `${CONFIG.apiUrl}?segment_id=${sid}`;
                    const response = await fetch(url);
                    if (!response.ok) return { id: seg.id, error: true };
                    const data = await response.json();
                    return { id: seg.id, data };
                } catch (e) {
                    return { id: seg.id, error: true };
                }
            }));

            // 1. 先從 Webhook 取得所有排行榜基礎數據 (同步處理)
            const baseLeaderboards: Record<number, LeaderboardEntry[]> = {};
            const baseStats: Record<number, SegmentStats> = {};
            let firstWeather: WeatherData | null = null;

            results.forEach((res) => {
                if ('data' in res && res.data) {
                    const data = res.data;
                    if (data.weather && !firstWeather) firstWeather = data.weather;

                    if (Array.isArray(data.leaderboard)) {
                        const sorted = [...data.leaderboard].sort((a, b) => (a.elapsed_time || 999999) - (b.elapsed_time || 999999));
                        const ranked = sorted.map((entry, index) => ({ ...entry, rank: index + 1 }));
                        baseLeaderboards[res.id] = ranked;
                        baseStats[res.id] = calculateStats(ranked);
                    }
                }
            });

            // 立即顯示基礎數據，避免畫面空白
            setLeaderboardsMap(baseLeaderboards);
            setStatsMap(baseStats);
            if (firstWeather) setWeather(firstWeather);

            // 2. 🚀 批量抓取報名資料進行「增強」(Enrichment)
            const segmentIds = activeSegments.map(s => s.id);
            const { data: allRegData } = await supabase
                .from('registrations')
                .select('segment_id, strava_athlete_id, number, team')
                .in('segment_id', segmentIds);

            if (allRegData && allRegData.length > 0) {
                // 按 segment_id 分組報名資料
                const regMapBySegment: Record<number, Map<number, any>> = {};
                allRegData.forEach(reg => {
                    const sid = Number(reg.segment_id);
                    if (!regMapBySegment[sid]) regMapBySegment[sid] = new Map();
                    regMapBySegment[sid].set(Number(reg.strava_athlete_id), reg);
                });

                // 更新地圖
                setLeaderboardsMap(prev => {
                    const updated = { ...prev };
                    Object.keys(baseLeaderboards).forEach(key => {
                        const sid = Number(key);
                        const leaderboard = baseLeaderboards[sid];
                        const regMap = regMapBySegment[sid];

                        if (regMap && leaderboard) {
                            updated[sid] = leaderboard.map(entry => {
                                const reg = regMap.get(Number(entry.athlete_id));
                                return {
                                    ...entry,
                                    number: reg?.number || entry.number,
                                    team: reg?.team || entry.team
                                };
                            });
                        }
                    });
                    return updated;
                });
            }

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
