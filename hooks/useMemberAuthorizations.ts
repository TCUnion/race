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

            // 取得相關的管理員角色資訊 (同時支援 Athlete ID 與 Email)
            const authorizationsList = (data || []) as UserAuthorization[];
            const managerAthleteIds = [...new Set(authorizationsList.map(a => Number(a.manager_athlete_id)).filter(id => id !== null && !isNaN(id) && id !== 0))] as number[];
            const managerEmails = [...new Set(authorizationsList.map(a => a.manager_email).filter(email => email !== null && email !== undefined && email !== ''))] as string[];



            if (managerAthleteIds.length > 0 || managerEmails.length > 0) {
                let query = supabase.from('manager_roles').select('athlete_id, role, email');

                // 構建 or 條件
                const conditions: string[] = [];
                if (managerAthleteIds.length > 0) {
                    conditions.push(`athlete_id.in.(${managerAthleteIds.join(',')})`);
                }
                if (managerEmails.length > 0) {
                    conditions.push(`email.in.(${managerEmails.map(e => `"${e}"`).join(',')})`);
                }

                if (conditions.length > 0) {
                    const { data: rolesData, error: rolesError } = await query.or(conditions.join(','));

                    if (rolesError) {
                        console.error('Error fetching manager roles:', rolesError);
                    } else if (rolesData) {


                        // 建立角色地圖 (優先使用 ID，其次使用 Email)
                        const rolesMapById = new Map(rolesData.filter(r => r.athlete_id).map((r: any) => [r.athlete_id, r.role]));
                        const rolesMapByEmail = new Map(rolesData.filter(r => r.email).map((r: any) => [r.email.toLowerCase(), r.role]));

                        authorizationsList.forEach(auth => {
                            // 先嘗試 ID 匹配，再嘗試 Email 匹配
                            if (auth.manager_athlete_id) {
                                auth.manager_role = rolesMapById.get(auth.manager_athlete_id);
                            }
                            if (!auth.manager_role && auth.manager_email) {
                                auth.manager_role = rolesMapByEmail.get(auth.manager_email.toLowerCase());
                            }

                        });
                    }
                }
            }

            setAuthorizations(authorizationsList);
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
