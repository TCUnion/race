import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * 路段歷史資料介面
 */
export interface RaceSegment {
    id: number;
    strava_id: number;
    name: string;
    description?: string;
    race_description?: string; // 比賽敘述（多行長文，從 segment_metadata 取得）
    distance: number;
    average_grade: number;
    total_elevation_gain: number;
    polyline?: string;
    link?: string;
    start_date?: string;
    end_date?: string;
    participant_count: number;
    team?: string;
    og_image?: string;
}

/**
 * 排行榜項目介面
 */
export interface RaceLeaderboardEntry {
    rank: number | null;
    athlete_id: number;
    name: string;
    profile_medium?: string;
    team?: string;
    best_time: number | null;
    achieved_at?: string;
    activity_id?: number;
    attempt_count: number;
    average_watts?: number;
    is_tcu?: boolean;
}

/**
 * Hook 回傳介面
 */
interface UseRaceHistoryReturn {
    ongoingRaces: RaceSegment[];
    endedRaces: RaceSegment[];
    isLoading: boolean;
    error: string | null;
    getLeaderboard: (segmentId: number) => Promise<RaceLeaderboardEntry[]>;
    refresh: () => void;
}

/**
 * 格式化時間（秒 → 時:分:秒）
 */
export const formatRaceTime = (seconds: number | null): string => {
    if (!seconds || seconds <= 0) return '--:--';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
};

/**
 * useRaceHistory Hook
 * 獲取進行中與已結束的比賽路段資料
 */
export const useRaceHistory = (): UseRaceHistoryReturn => {
    const [ongoingRaces, setOngoingRaces] = useState<RaceSegment[]>([]);
    const [endedRaces, setEndedRaces] = useState<RaceSegment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const isFetching = useRef(false);

    /**
     * 載入所有有設定日期的路段並分類
     */
    const fetchRaces = useCallback(async () => {
        if (isFetching.current) return;
        isFetching.current = true;

        try {
            setError(null);

            // 取得所有啟用且有設定 start/end_date 的路段
            const { data: segments, error: segmentError } = await supabase
                .from('segments')
                .select('*')
                .eq('is_active', true)
                .not('start_date', 'is', null)
                .not('end_date', 'is', null)
                .order('start_date', { ascending: false });

            if (segmentError) throw segmentError;

            // 取得所有進行中的車隊賽事以標記主辦車隊
            const { data: teamRaces } = await supabase
                .from('team_races')
                .select('segment_id, team_name, name, og_image')
                .eq('is_active', true);

            const teamRaceMap = new Map<number, { name: string, team: string, og_image?: string }>();
            if (teamRaces) {
                teamRaces.forEach(r => {
                    teamRaceMap.set(r.segment_id, { name: r.name, team: r.team_name, og_image: r.og_image });
                });
            }

            // 取得路段擴充資訊 (race_description 等)
            const { data: segmentMeta } = await supabase
                .from('segment_metadata')
                .select('segment_id, race_description');

            const metaMap = new Map<number, any>();
            if (segmentMeta) {
                segmentMeta.forEach(m => metaMap.set(Number(m.segment_id), m));
            }

            if (!segments || segments.length === 0) {
                setOngoingRaces([]);
                setEndedRaces([]);
                return;
            }

            // 取得每個路段的報名人數
            const segmentIds = segments.map(s => s.id);
            const { data: registrations } = await supabase
                .from('registrations')
                .select('segment_id')
                .in('segment_id', segmentIds)
                .eq('status', 'approved');

            // 計算每個路段的參與人數
            const countMap = new Map<number, number>();
            registrations?.forEach(r => {
                countMap.set(r.segment_id, (countMap.get(r.segment_id) || 0) + 1);
            });

            const now = new Date();
            const ongoing: RaceSegment[] = [];
            const ended: RaceSegment[] = [];

            segments.forEach(s => {
                const teamRaceInfo = teamRaceMap.get(s.id);
                // 優先順序：車隊賽事名稱 > 路段敘述 > 路段名稱
                // 如果是車隊賽事，使用其名稱作為敘述顯示
                const displayDescription = teamRaceInfo?.name || s.description;

                const race: RaceSegment = {
                    id: s.id,
                    strava_id: s.strava_id || s.id,
                    name: s.name,
                    description: displayDescription,
                    race_description: metaMap.get(s.id)?.race_description,
                    distance: s.distance || 0,
                    average_grade: s.average_grade || 0,
                    total_elevation_gain: s.elevation_gain || 0,
                    polyline: s.polyline,
                    link: s.link,
                    start_date: s.start_date,
                    end_date: s.end_date,
                    participant_count: countMap.get(s.id) || 0,
                    team: s.team_name || teamRaceInfo?.team,
                    og_image: teamRaceInfo?.og_image,
                };

                const startDate = new Date(s.start_date);
                const endDate = new Date(s.end_date);

                if (startDate <= now && endDate >= now) {
                    ongoing.push(race);
                } else if (endDate < now) {
                    ended.push(race);
                }
            });

            setOngoingRaces(ongoing);
            setEndedRaces(ended);
        } catch (err) {
            console.error('載入比賽資料失敗:', err);
            setError(err instanceof Error ? err.message : '載入失敗');
        } finally {
            setIsLoading(false);
            isFetching.current = false;
        }
    }, []);

    /**
     * 取得特定路段的排行榜（含挑戰次數）
     */
    /**
     * 取得特定路段的排行榜（含挑戰次數，包含所有已報名選手）
     */
    const getLeaderboard = useCallback(async (segmentId: number): Promise<RaceLeaderboardEntry[]> => {
        try {
            // 1. 取得該路段的已報名選手
            const { data: registrations } = await supabase
                .from('registrations')
                .select('strava_athlete_id, tcu_id, team, registered_at, athlete_name')
                .eq('segment_id', segmentId)
                .eq('status', 'approved');

            if (!registrations || registrations.length === 0) return [];

            const athleteIds = registrations.map(r => r.strava_athlete_id);
            const registrationMap = new Map(registrations.map(r => [r.strava_athlete_id, r]));
            const tcuSet = new Set(registrations.filter(r => r.tcu_id).map(r => r.strava_athlete_id));

            // 1.5 取得路段日期資訊以進行篩選
            const { data: segment } = await supabase
                .from('segments')
                .select('start_date, end_date')
                .eq('id', segmentId)
                .single();

            // 2. 取得排行榜資料（只取已報名選手）
            const { data: leaderboardData } = await supabase
                .from('view_leaderboard_best')
                .select('*')
                .eq('segment_id', segmentId)
                .in('athlete_id', athleteIds);

            // 建立排行榜 Map 方便查詢
            const leaderboardMap = new Map(leaderboardData?.map(l => [l.athlete_id, l]));

            // 3. 取得每位選手的挑戰次數
            const { data: attempts } = await supabase
                .from('segment_efforts_v2')
                .select('athlete_id')
                .eq('segment_id', segmentId)
                .in('athlete_id', athleteIds);

            const attemptMap = new Map<number, number>();
            attempts?.forEach(a => {
                attemptMap.set(a.athlete_id, (attemptMap.get(a.athlete_id) || 0) + 1);
            });

            // 4. 取得所有報名選手的姓名與頭像 (因為 view_leaderboard_best 只會有有成績的人)
            const { data: athletes } = await supabase
                .from('athletes')
                .select('id, firstname, lastname, profile_medium, profile')
                .in('id', athleteIds);

            const athleteInfoMap = new Map<number, { name: string, profile: string }>();
            athletes?.forEach(a => {
                const name = [a.firstname, a.lastname].filter(Boolean).join(' ');
                const profile = a.profile_medium || a.profile;
                athleteInfoMap.set(a.id, { name, profile });
            });

            // 5. 組合最終排行榜資料
            // 策略：遍歷所有報名選手，如果有排行榜成績則使用，否則使用預設值
            let combinedLeaderboard: RaceLeaderboardEntry[] = registrations.map(reg => {
                const athleteId = reg.strava_athlete_id;
                const leaderboardEntry = leaderboardMap.get(athleteId);
                const athleteInfo = athleteInfoMap.get(athleteId);
                const regInfo = registrationMap.get(athleteId);

                // 檢查是否在日期範圍內 (如果有成績的話)
                let isValidEntry = true;
                if (leaderboardEntry && segment?.start_date && segment?.end_date) {
                    if (leaderboardEntry.achieved_at) {
                        const achievedAt = new Date(leaderboardEntry.achieved_at);
                        const startDate = new Date(segment.start_date);
                        const endDate = new Date(segment.end_date);
                        if (achievedAt < startDate || achievedAt > endDate) {
                            isValidEntry = false; // 成績不在範圍內
                        }
                    }
                }

                // 如果成績有效，使用成績資料；否則視為無成績 (DNS)
                const entryData = (isValidEntry && leaderboardEntry) ? leaderboardEntry : null;

                return {
                    rank: 0, // 稍後重新計算
                    athlete_id: athleteId,
                    // NOTE: 優先使用 Strava 帳號名稱（athletes 表），其次才是報名時的名稱
                    name: athleteInfo?.name || entryData?.athlete_name || regInfo?.athlete_name || `選手 ${athleteId}`,
                    profile_medium: entryData?.profile_medium || entryData?.profile || athleteInfo?.profile,
                    team: entryData?.team || regInfo?.team,
                    best_time: entryData?.best_time || null, // 無成績為 null
                    achieved_at: entryData?.achieved_at,
                    activity_id: entryData?.activity_id,
                    attempt_count: attemptMap.get(athleteId) || 0,
                    average_watts: entryData?.power,
                    is_tcu: tcuSet.has(athleteId),
                };
            });

            // 6. 排序與計算排名
            // 規則：有成績者按時間排序 (null 為無限大)，無成績者按報名 ID 或字母排序
            combinedLeaderboard.sort((a, b) => {
                // 兩者都有成績：比時間
                if (a.best_time !== null && b.best_time !== null) {
                    return a.best_time - b.best_time;
                }
                // a 有成績，b 無成績 -> a 排前面
                if (a.best_time !== null && b.best_time === null) return -1;
                // a 無成績，b 有成績 -> b 排前面
                if (a.best_time === null && b.best_time !== null) return 1;

                // 兩者都無成績：按挑戰次數排序 (活躍度)
                if (a.attempt_count !== b.attempt_count) {
                    return b.attempt_count - a.attempt_count;
                }

                // 最後按名字排序
                return a.name.localeCompare(b.name);
            });

            // 重新填寫 Rank
            // 有成績的人才有排名，無成績的人 Rank 為 null (-1 或 0 識別)
            let currentRank = 1;
            combinedLeaderboard = combinedLeaderboard.map((entry, index) => {
                if (entry.best_time !== null) {
                    return { ...entry, rank: currentRank++ };
                }
                return { ...entry, rank: null as any }; // 在 Interface 修改前暫時用 any，稍後會更新 interface
            });

            return combinedLeaderboard;
        } catch (err) {
            console.error('載入排行榜失敗:', err);
            return [];
        }
    }, []);

    // 初始載入
    useEffect(() => {
        fetchRaces();
    }, [fetchRaces]);

    return {
        ongoingRaces,
        endedRaces,
        isLoading,
        error,
        getLeaderboard,
        refresh: fetchRaces,
    };
};
