import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

/**
 * 共用報名 Hook
 * 
 * 提供檢查報名狀態、執行報名、取消報名等功能，
 * 可嵌入排行榜、儀表板或任何需要報名功能的元件。
 */

interface Registration {
    id: string;
    segment_id: number;
    strava_athlete_id: number;
    athlete_name: string;
    team?: string;
    tcu_id?: string;
    status: string;
}

interface UseRegistrationReturn {
    /** 已報名的路段 ID 集合 */
    registeredSegmentIds: Set<number>;
    /** 報名處理中的路段 ID */
    processingSegmentId: number | null;
    /** 是否正在載入報名資料 */
    isLoading: boolean;
    /** 錯誤訊息 */
    error: string | null;
    /** 是否已登入 Strava */
    isAuthenticated: boolean;
    /** 檢查特定路段是否已報名 */
    isRegistered: (segmentId: number) => boolean;
    /** 執行報名 */
    register: (segmentId: number) => Promise<boolean>;
    /** 取消報名 */
    unregister: (segmentId: number) => Promise<boolean>;
    /** 重新載入報名資料 */
    refresh: () => Promise<void>;
}

// UUID Generator（與 RegistrationForm 相同邏輯）
const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export const useRegistration = (): UseRegistrationReturn => {
    const { athlete, isBound, memberData } = useAuth();
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [registeredSegmentIds, setRegisteredSegmentIds] = useState<Set<number>>(new Set());
    const [processingSegmentId, setProcessingSegmentId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isAuthenticated = !!athlete;

    // NOTE: 從 Strava 或 TCU 會員資料取得選手姓名
    const getAthleteName = useCallback(() => {
        if (isBound && memberData?.real_name) {
            return memberData.real_name;
        }
        if (athlete) {
            const fname = athlete.firstname || '';
            const lname = athlete.lastname || '';
            return `${fname} ${lname}`.trim() || `選手 ${athlete.id}`;
        }
        return '未知選手';
    }, [athlete, isBound, memberData]);

    const getTeam = useCallback(() => {
        if (isBound && memberData?.team) {
            return memberData.team;
        }
        return '';
    }, [isBound, memberData]);

    // 載入所有報名資料
    const fetchRegistrations = useCallback(async () => {
        if (!athlete?.id) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const { data, error: fetchError } = await supabase
                .from('registrations')
                .select('id, segment_id, strava_athlete_id, athlete_name, team, tcu_id, status')
                .eq('strava_athlete_id', athlete.id);

            if (fetchError) throw fetchError;

            const regs = data || [];
            setRegistrations(regs);
            setRegisteredSegmentIds(new Set(regs.map(r => r.segment_id)));
        } catch (err) {
            console.error('載入報名資料失敗:', err);
            setError(err instanceof Error ? err.message : '載入報名資料失敗');
        } finally {
            setIsLoading(false);
        }
    }, [athlete?.id]);

    // 初始載入
    useEffect(() => {
        fetchRegistrations();
    }, [fetchRegistrations]);

    const isRegistered = useCallback((segmentId: number): boolean => {
        return registeredSegmentIds.has(segmentId);
    }, [registeredSegmentIds]);

    // 執行報名
    const register = useCallback(async (segmentId: number): Promise<boolean> => {
        if (!athlete?.id) {
            setError('請先連結 Strava 帳號');
            return false;
        }

        if (registeredSegmentIds.has(segmentId)) {
            return true; // 已報名，直接返回成功
        }

        setProcessingSegmentId(segmentId);
        setError(null);

        try {
            const payload = {
                id: generateUUID(),
                segment_id: segmentId,
                strava_athlete_id: athlete.id,
                athlete_name: getAthleteName(),
                athlete_profile: athlete.profile || '',
                team: getTeam(),
                tcu_id: memberData?.tcu_id || null,
                status: 'approved'
            };

            const { error: insertError } = await supabase
                .from('registrations')
                .insert(payload);

            if (insertError) throw insertError;

            // 更新本地狀態
            setRegistrations(prev => [...prev, payload as unknown as Registration]);
            setRegisteredSegmentIds(prev => new Set([...prev, segmentId]));

            return true;
        } catch (err) {
            console.error('報名失敗:', err);
            setError(err instanceof Error ? err.message : '報名失敗');
            return false;
        } finally {
            setProcessingSegmentId(null);
        }
    }, [athlete, registeredSegmentIds, getAthleteName, getTeam, memberData]);

    // 取消報名
    const unregister = useCallback(async (segmentId: number): Promise<boolean> => {
        if (!athlete?.id) return false;

        setProcessingSegmentId(segmentId);
        setError(null);

        try {
            const { error: deleteError } = await supabase
                .from('registrations')
                .delete()
                .eq('strava_athlete_id', athlete.id)
                .eq('segment_id', segmentId);

            if (deleteError) throw deleteError;

            // 更新本地狀態
            setRegistrations(prev => prev.filter(r => r.segment_id !== segmentId));
            setRegisteredSegmentIds(prev => {
                const next = new Set(prev);
                next.delete(segmentId);
                return next;
            });

            return true;
        } catch (err) {
            console.error('取消報名失敗:', err);
            setError(err instanceof Error ? err.message : '取消報名失敗');
            return false;
        } finally {
            setProcessingSegmentId(null);
        }
    }, [athlete]);

    return {
        registeredSegmentIds,
        processingSegmentId,
        isLoading,
        error,
        isAuthenticated,
        isRegistered,
        register,
        unregister,
        refresh: fetchRegistrations,
    };
};
