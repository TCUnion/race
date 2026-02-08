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
    distance: number;
    average_grade: number;
    total_elevation_gain: number;
    polyline?: string;
    link?: string;
    start_date?: string;
    end_date?: string;
    participant_count: number;
    team?: string;
}

/**
 * 排行榜項目介面
 */
export interface RaceLeaderboardEntry {
    rank: number;
    athlete_id: number;
    name: string;
    profile_medium?: string;
    team?: string;
    best_time: number;
    achieved_at?: string;
    activity_id?: number;
    attempt_count: number;
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
    if (!seconds || seconds <= 0) return '-';
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
                .select('segment_id, team_name')
                .eq('is_active', true);

            const teamRaceMap = new Map<number, string>();
            if (teamRaces) {
                teamRaces.forEach(r => {
                    teamRaceMap.set(r.segment_id, r.team_name);
                });
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
                const race: RaceSegment = {
                    id: s.id,
                    strava_id: s.strava_id || s.id,
                    name: s.name,
                    description: s.description,
                    distance: s.distance || 0,
                    average_grade: s.average_grade || 0,
                    total_elevation_gain: s.elevation_gain || 0,
                    polyline: s.polyline,
                    link: s.link,
                    start_date: s.start_date,
                    end_date: s.end_date,
                    participant_count: countMap.get(s.id) || 0,
                    team: teamRaceMap.get(s.id), // Add team info
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
    const getLeaderboard = useCallback(async (segmentId: number): Promise<RaceLeaderboardEntry[]> => {
        try {
            // 1. 取得該路段的已報名選手
            const { data: registrations } = await supabase
                .from('registrations')
                .select('strava_athlete_id, tcu_id')
                .eq('segment_id', segmentId)
                .eq('status', 'approved');

            if (!registrations || registrations.length === 0) return [];

            const athleteIds = registrations.map(r => r.strava_athlete_id);
            const tcuSet = new Set(registrations.filter(r => r.tcu_id).map(r => r.strava_athlete_id));

            // 2. 取得排行榜資料（只取已報名選手）
            const { data: leaderboard } = await supabase
                .from('view_leaderboard_best')
                .select('*')
                .eq('segment_id', segmentId)
                .in('athlete_id', athleteIds)
                .order('best_time', { ascending: true });

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

            // 4. 取得選手姓名
            const { data: athletes } = await supabase
                .from('athletes')
                .select('id, firstname, lastname')
                .in('id', athleteIds);

            const nameMap = new Map<number, string>();
            athletes?.forEach(a => {
                nameMap.set(a.id, [a.firstname, a.lastname].filter(Boolean).join(' '));
            });

            // 5. 組合排行榜資料
            return (leaderboard || []).map((row, index) => ({
                rank: index + 1,
                athlete_id: row.athlete_id,
                name: nameMap.get(row.athlete_id) || row.athlete_name || `選手 ${row.athlete_id}`,
                profile_medium: row.profile_medium || row.profile,
                team: row.team,
                best_time: row.best_time,
                achieved_at: row.achieved_at,
                activity_id: row.activity_id,
                attempt_count: attemptMap.get(row.athlete_id) || 0,
                is_tcu: tcuSet.has(row.athlete_id),
            }));
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
