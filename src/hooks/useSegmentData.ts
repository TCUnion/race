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
    start_date?: string;
    end_date?: string;
    team?: string;
    og_image?: string;
    race_description?: string; // 比賽敘述（多行長文）
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
    is_tcu?: boolean;
    attempt_count?: number;
}

export interface SegmentStats {
    totalAthletes: number;
    completedAthletes: number;
    registeredCount: number;
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
    apiUrl: 'https://service.criterium.tw/webhook/136leaderboard-cached',
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
    const calculateStats = (data: LeaderboardEntry[], registeredCount: number): SegmentStats => {
        const completed = data.filter(e => e.elapsed_time > 0);
        const times = completed.map(e => e.elapsed_time).filter(t => t > 0);
        const powers = completed.map(e => e.average_watts || 0).filter(p => p > 0);
        const speeds = completed.map(e => e.average_speed || 0).filter(s => s > 0);

        return {
            totalAthletes: data.length,
            completedAthletes: completed.length,
            registeredCount: registeredCount,
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

            // 取得所有進行中的車隊賽事以標記主辦車隊和賽事名稱
            const { data: teamRaces } = await supabase
                .from('team_races')
                .select('segment_id, team_name, name, og_image')
                .eq('is_active', true);

            // [NEW] 取得路段擴充資訊 (OG Image, Team Name)
            const { data: segmentMeta } = await supabase
                .from('segment_metadata')
                .select('*');

            const teamRaceMap = new Map<number, { team: string, name: string, og_image?: string }>();
            if (teamRaces) {
                teamRaces.forEach(r => {
                    teamRaceMap.set(Number(r.segment_id), { team: r.team_name, name: r.name, og_image: r.og_image });
                });
            }

            const metaMap = new Map<number, any>();
            if (segmentMeta) {
                segmentMeta.forEach(m => metaMap.set(Number(m.segment_id), m));
            }

            if (data && data.length > 0) {
                const mappedSegments: StravaSegment[] = data.map(s => {
                    const raceInfo = teamRaceMap.get(Number(s.id));
                    const meta = metaMap.get(Number(s.id));

                    return {
                        id: s.id, // Supabase PK
                        strava_id: s.strava_id || s.id, // Fallback if strava_id is null
                        name: s.name,
                        distance: s.distance || 0,
                        average_grade: s.average_grade || 0,
                        maximum_grade: s.maximum_grade || 0,
                        elevation_low: s.elevation_low || 0,
                        elevation_high: s.elevation_high || 0,
                        total_elevation_gain: s.elevation_gain || 0,
                        activity_type: 'Ride',
                        polyline: s.polyline,
                        link: s.link,
                        description: raceInfo?.name || s.description, // 優先使用賽事名稱，否則使用資料庫描述
                        start_date: s.start_date,
                        end_date: s.end_date,
                        team: s.team_name || meta?.team_name || raceInfo?.team, // 優先使用 segments 表的 team_name，其次是擴充表，最後是 team_races
                        og_image: meta?.og_image || raceInfo?.og_image || s.og_image,
                        race_description: meta?.race_description, // 比賽敘述（從 segment_metadata 取得）
                    };
                });
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

            const segmentIds = Array.from(new Set(activeSegments.map(s => Number(s.id)).filter(id => !isNaN(id) && id !== 0)));

            if (segmentIds.length === 0) {
                if (isInitialLoad) setIsLoading(false);
                isFetching.current = false;
                return;
            }

            // 1. 從 View 直接取得排行榜資料 (已排序、已去重、已包含名字與隊伍)
            const { data: leaderboardData, error: viewError } = await supabase
                .from('view_leaderboard_best')
                .select('*')
                .in('segment_id', segmentIds)
                .order('best_time', { ascending: true }); // View 雖然有預設排序，但這裡再排一次保險

            // 2. 額外查詢 Registrations 以取得 tcu_id (判斷是否為會員)
            const { data: regData } = await supabase
                .from('registrations')
                .select('segment_id, strava_athlete_id, tcu_id, athlete_name')
                .in('segment_id', segmentIds)
                .eq('status', 'approved');

            if (viewError) throw viewError;

            // 建立已報名清單與 TCU 會員查找表
            const registeredSet = new Set<string>(); // key: `${segmentId}_${athleteId}`
            const tcuMap = new Map<string, string>(); // key: `${segmentId}_${athleteId}`, value: tcu_id
            const athleteIdsToCheck = new Set<number>();

            if (regData) {
                regData.forEach(r => {
                    const key = `${r.segment_id}_${r.strava_athlete_id}`;
                    registeredSet.add(key);
                    if (r.tcu_id) tcuMap.set(key, r.tcu_id);
                    athleteIdsToCheck.add(r.strava_athlete_id);
                });
            }

            // 3. 查詢 Athletes 表取得 Strava 真實姓名
            const { data: athletesData } = await supabase
                .from('athletes')
                .select('id, firstname, lastname')
                .in('id', Array.from(athleteIdsToCheck));

            const athleteNameMap = new Map<number, string>();
            if (athletesData) {
                athletesData.forEach(a => {
                    const fullName = [a.firstname, a.lastname].filter(Boolean).join(' ');
                    athleteNameMap.set(a.id, fullName);
                });
            }

            // 4. 查詢每位選手在各路段的挑戰次數
            const { data: attemptsData } = await supabase
                .from('segment_efforts_v2')
                .select('segment_id, athlete_id')
                .in('segment_id', segmentIds)
                .in('athlete_id', Array.from(athleteIdsToCheck));

            const attemptMap = new Map<string, number>(); // key: `${segmentId}_${athleteId}`, value: count
            if (attemptsData) {
                attemptsData.forEach(a => {
                    const key = `${a.segment_id}_${a.athlete_id}`;
                    attemptMap.set(key, (attemptMap.get(key) || 0) + 1);
                });
            }

            const newLeaderboards: Record<number, LeaderboardEntry[]> = {};
            const newStats: Record<number, SegmentStats> = {};

            // 3. 整理資料
            activeSegments.forEach(seg => {
                // 找出此路段的所有報名選手
                const segmentRegistrations = (regData || []).filter(r => r.segment_id === seg.id);

                // 建立選手成績 Map (key: athlete_id)
                const performanceMap = new Map<number, any>();
                (leaderboardData || []).forEach(row => {
                    if (Number(row.segment_id) === Number(seg.id)) {
                        // 日期檢查：如果有設定挑戰期間，成績必須在期間內
                        if (seg.start_date && seg.end_date && row.achieved_at) {
                            const achievedAt = new Date(row.achieved_at);
                            const startDate = new Date(seg.start_date);
                            const endDate = new Date(seg.end_date);
                            // 包含開始與結束當天
                            if (achievedAt >= startDate && achievedAt <= endDate) {
                                performanceMap.set(Number(row.athlete_id), row);
                            }
                        } else {
                            performanceMap.set(Number(row.athlete_id), row);
                        }
                    }
                });

                // 合併報名資料與成績資料
                const ranked: LeaderboardEntry[] = segmentRegistrations.map(reg => {
                    const aid = reg.strava_athlete_id;
                    const perf = performanceMap.get(aid);
                    const tcuId = tcuMap.get(`${seg.id}_${aid}`);
                    // NOTE: 優先使用 Strava 帳號名稱，其次是報名名稱，最後是 ID
                    const fullName = athleteNameMap.get(aid) || reg.athlete_name || `選手 ${aid}`;

                    return {
                        rank: 0, // 稍後排序後重新計算
                        athlete_id: aid,
                        name: perf?.athlete_name || fullName,
                        profile_medium: perf?.profile_medium || perf?.profile || "",
                        profile: perf?.profile || "",
                        team: perf?.team || "", // 这里可能需要从 regData 或其他地方补充车队信息，如果 perf 没有
                        number: perf?.number || "",
                        elapsed_time: perf?.best_time || 0,
                        moving_time: perf?.best_time || 0,
                        average_speed: perf ? seg.distance / (perf.best_time || 1) : 0,
                        average_watts: perf?.power || 0,
                        average_heartrate: 0,
                        start_date: perf?.achieved_at,
                        activity_id: perf?.activity_id,
                        is_tcu: !!tcuId,
                        attempt_count: attemptMap.get(`${seg.id}_${aid}`) || 0
                    };
                });

                // 排序：有成績的在前 (時間短優先)，沒成績的在後
                ranked.sort((a, b) => {
                    if (a.elapsed_time > 0 && b.elapsed_time > 0) {
                        return a.elapsed_time - b.elapsed_time;
                    }
                    if (a.elapsed_time > 0) return -1;
                    if (b.elapsed_time > 0) return 1;
                    return 0;
                });

                // 填寫排名 (只對有成績的排名)
                let currentRank = 1;
                ranked.forEach((entry, index) => {
                    if (entry.elapsed_time > 0) {
                        entry.rank = currentRank++;
                    } else {
                        entry.rank = 0; // 無成績
                    }
                });

                newLeaderboards[seg.id] = ranked;
                newStats[seg.id] = calculateStats(ranked, segmentRegistrations.length);
            });

            setLeaderboardsMap(newLeaderboards);
            setStatsMap(newStats);

        } catch (err) {
            console.error('載入資料失敗:', err);
            setError(err instanceof Error ? err.message : '載入失敗');
        } finally {
            if (isInitialLoad) setIsLoading(false);
            isFetching.current = false;
        }
    }, [calculateStats]);

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
