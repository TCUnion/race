import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { API_BASE_URL } from '../lib/api_config';

export interface StravaAthlete {
    id: number;
    username: string;
    firstname: string;
    lastname: string;
    profile: string;
    access_token: string;
    refresh_token?: string;
    expires_at?: number;
}

const STORAGE_KEY = 'strava_athlete_data';
const AUTH_EVENT = 'strava-auth-changed';

export const useAuth = () => {
    const [athlete, setAthlete] = useState<StravaAthlete | null>(null);
    const [isBound, setIsBound] = useState(false);
    const [memberData, setMemberData] = useState<any>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // 記憶快取防止一秒內重複同步
    const lastSyncTime = useRef<number>(0);

    const loadAthleteFromStorage = useCallback(() => {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
            try {
                const athleteData = JSON.parse(savedData);
                setAthlete(athleteData);
                return athleteData;
            } catch (err) {
                console.error('Failed to parse athlete data', err);
                return null;
            }
        }
        setAthlete(null);
        return null;
    }, []);

    const syncToken = useCallback(async (athleteData: StravaAthlete) => {
        const now = Date.now();
        if (now - lastSyncTime.current < 1000) {
            console.log('[Auth] 同步冷卻中，跳過重複請求');
            return;
        }
        lastSyncTime.current = now;

        const numericId = Number(athleteData.id);
        if (athleteData.access_token && !isNaN(numericId) && numericId !== 0) {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                await fetch(`${API_BASE_URL}/api/auth/strava-token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        athlete_id: numericId,
                        access_token: athleteData.access_token,
                        refresh_token: athleteData.refresh_token || '',
                        expires_at: athleteData.expires_at || Math.floor(now / 1000) + 21600,
                        name: `${athleteData.firstname || ''} ${athleteData.lastname || ''}`.trim() || null,
                        user_id: user?.id
                    })
                });
                console.log('[Auth] Token 已同步至伺服器');
            } catch (e) {
                console.warn('[Auth] Token 同步失敗', e);
            }
        }
    }, []);

    const checkBindingStatus = useCallback(async (athleteId: number) => {
        try {
            const apiRes = await fetch(`${API_BASE_URL}/api/auth/binding-status/${athleteId}`);
            if (!apiRes.ok) throw new Error('API request failed');

            const data = await apiRes.json();
            setIsBound(data.isBound || false);
            setMemberData(data.member_data || null);

            // 如果後端回傳的名字與本地不符，或是本地有 undefined，進行修復
            if (data.strava_name) {
                const savedDataStr = localStorage.getItem(STORAGE_KEY);
                const currentAthlete = savedDataStr ? JSON.parse(savedDataStr) : null;

                const serverName = data.strava_name;
                const currentName = `${currentAthlete?.firstname || ''} ${currentAthlete?.lastname || ''}`.trim();

                if (currentName.includes('undefined') || (currentName !== serverName && serverName !== '')) {
                    console.log(`[Auth] 名稱不符 (Local: "${currentName}" vs Server: "${serverName}")，啟動更新`);
                    const newAthleteData = {
                        ...currentAthlete,
                        firstname: serverName,
                        lastname: '',
                        ts: Date.now()
                    };

                    localStorage.setItem(STORAGE_KEY, JSON.stringify(newAthleteData));
                    setAthlete(newAthleteData as StravaAthlete);

                    // 名字不符時，主動同步一次 Token 到後端以校正其 name 欄位
                    syncToken(newAthleteData as StravaAthlete);
                }
            }
        } catch (err) {
            console.warn('[Auth] 檢查綁定狀態失敗:', err);
        }
    }, [syncToken]);

    const checkAdminStatus = useCallback(async (athleteId: number) => {
        try {
            const { data, error } = await supabase
                .from('manager_roles')
                .select('role, is_active')
                .eq('athlete_id', athleteId)
                .maybeSingle();

            if (error) throw error;
            setIsAdmin(data?.role === 'admin' && data?.is_active === true);
        } catch (err) {
            console.error('Failed to check admin status', err);
            setIsAdmin(false);
        }
    }, []);

    const logout = () => {
        localStorage.removeItem(STORAGE_KEY);
        setAthlete(null);
        setIsBound(false);
        setMemberData(null);
        setIsAdmin(false);
        window.dispatchEvent(new Event(AUTH_EVENT));
    };

    // 初始化與監聽
    useEffect(() => {
        const loaded = loadAthleteFromStorage();
        if (loaded) {
            checkBindingStatus(Number(loaded.id));
            checkAdminStatus(Number(loaded.id));
            syncToken(loaded);
        } else {
            setIsLoading(false);
        }

        const handleAuthChange = () => {
            const current = loadAthleteFromStorage();
            if (current) {
                checkBindingStatus(Number(current.id));
                checkAdminStatus(Number(current.id));
                syncToken(current);
            }
        };

        window.addEventListener(AUTH_EVENT, handleAuthChange);
        window.addEventListener('storage', handleAuthChange);

        window.addEventListener('tcu-binding-success', () => {
            const current = loadAthleteFromStorage();
            if (current) checkBindingStatus(Number(current.id));
        });

        return () => {
            window.removeEventListener(AUTH_EVENT, handleAuthChange);
            window.removeEventListener('storage', handleAuthChange);
        };
    }, [loadAthleteFromStorage, checkBindingStatus, checkAdminStatus, syncToken]);

    return {
        athlete,
        isBound,
        memberData,
        isAdmin,
        isLoading,
        logout,
        refreshBinding: () => athlete?.id && checkBindingStatus(Number(athlete.id))
    };
};
