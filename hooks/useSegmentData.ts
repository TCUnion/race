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
    leaderboard: LeaderboardEntry[];
    stats: SegmentStats;
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
    const [weather, setWeather] = useState<WeatherData | null>(null);

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

    const fetchData = useCallback(async (isInitialLoad = false) => {
        try {
            // 僅在首次載入時顯示 loading 狀態，避免自動刷新時閃爍
            if (isInitialLoad) setIsLoading(true);
            setError(null);

            const response = await fetch(CONFIG.apiUrl);
            if (!response.ok) {
                throw new Error(`API 錯誤: ${response.status}`);
            }

            const data = await response.json();

            // 處理 Segment 資料（使用 API 回傳或 fallback）
            if (data.segment && data.segment.id) {
                // 正規化 polyline 位置：API 可能在 segment.map 或 segment.polyline
                const segmentData = { ...data.segment };

                // 如果 polyline 在 map 欄位（字串格式）
                if (typeof segmentData.map === 'string' && !segmentData.polyline) {
                    segmentData.polyline = segmentData.map;
                }
                // 如果 polyline 在 map.polyline 物件格式
                else if (segmentData.map?.polyline && !segmentData.polyline) {
                    segmentData.polyline = segmentData.map.polyline;
                }

                setSegment(segmentData);
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

            // 處理天氣資料
            if (data.weather) {
                setWeather(data.weather);
            }
        } catch (err) {
            console.error('載入 Segment 資料失敗，使用 Fallback:', err);
            setError(err instanceof Error ? err.message : '載入失敗');
            // 發生錯誤時也確保有基本資料
            if (!segment) setSegment(FALLBACK_SEGMENT);
        } finally {
            setIsLoading(false);
            // 確保 isLoading 結束後一定有 segment
            setSegment(prev => prev || FALLBACK_SEGMENT);
        }
    }, [segment]);

    // 初始載入
    useEffect(() => {
        fetchData(true);
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
        weather,
        isLoading,
        error,
        refresh: fetchData,
    };
};
