/**
 * 會員端授權管理 Hook
 * 用於一般車友查看並回應管理者的授權請求
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { UserAuthorization, AuthorizationStatus } from '../types';

export function useMemberAuthorizations() {
    const [authorizations, setAuthorizations] = useState<UserAuthorization[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const getAthleteId = useCallback(() => {
        const data = localStorage.getItem('strava_athlete_data');
        if (!data) return null;
        try {
            const parsed = JSON.parse(data);
            return parsed.id;
        } catch (e) {
            return null;
        }
    }, []);

    const fetchAuthorizations = useCallback(async () => {
        const athleteId = getAthleteId();
        if (!athleteId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('user_authorizations')
                .select('*')
                .eq('athlete_id', athleteId)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setAuthorizations(data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [getAthleteId]);

    const updateStatus = async (authId: string, status: AuthorizationStatus) => {
        try {
            const { error: updateError } = await supabase
                .from('user_authorizations')
                .update({
                    status,
                    updated_at: new Date().toISOString(),
                    approved_at: status === 'approved' ? new Date().toISOString() : null
                })
                .eq('id', authId);

            if (updateError) throw updateError;

            // 樂觀更新狀態
            setAuthorizations(prev =>
                prev.map(auth => auth.id === authId ? { ...auth, status } : auth)
            );

            // 發送更新事件，通知其他組件 (如 Navbar)
            window.dispatchEvent(new Event('authorization-updated'));
        } catch (err: any) {
            setError(err.message);
            throw err;
        }
    };

    useEffect(() => {
        fetchAuthorizations();

        // 監聽狀態變更
        window.addEventListener('strava-auth-changed', fetchAuthorizations);
        window.addEventListener('authorization-updated', fetchAuthorizations);

        return () => {
            window.removeEventListener('strava-auth-changed', fetchAuthorizations);
            window.removeEventListener('authorization-updated', fetchAuthorizations);
        };
    }, [fetchAuthorizations]);

    return {
        authorizations,
        pendingAuthorizations: authorizations.filter(a => a.status === 'pending'),
        loading,
        error,
        refresh: fetchAuthorizations,
        approve: (id: string) => updateStatus(id, 'approved'),
        reject: (id: string) => updateStatus(id, 'rejected')
    };
}
