import { useState, useEffect } from 'react';

export interface StravaAthlete {
    id: number;
    firstname: string;
    lastname: string;
    profile: string;
    [key: string]: any;
}

export interface MemberData {
    real_name: string;
    tcu_id: string;
    email: string;
    strava_id: string;
    account?: string;
    member_name?: string;
    bound_at?: string;
    [key: string]: any;
}

const STORAGE_KEY = 'strava_athlete_data';
const ADMIN_ATHLETE_IDS = ['2838277'];

export const useAuth = () => {
    const [athlete, setAthlete] = useState<StravaAthlete | null>(null);
    const [memberData, setMemberData] = useState<MemberData | null>(null);
    const [isBound, setIsBound] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadAthleteFromStorage = () => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                setAthlete(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse athlete data', e);
                setAthlete(null);
            }
        } else {
            setAthlete(null);
        }
    };

    const checkBindingStatus = async (athleteId: number) => {
        try {
            // 使用新的 binding-status API 查詢 strava_bindings 表格
            const response = await fetch(`/api/auth/binding-status/${athleteId}`);
            const data = await response.json();

            if (data.isBound) {
                setMemberData({
                    real_name: data.member_name || '',
                    tcu_id: data.tcu_account || '',
                    email: data.email || '',
                    strava_id: athleteId.toString(),
                    account: data.tcu_account,
                    member_name: data.member_name,
                    bound_at: data.bound_at
                });
                setIsBound(true);
            } else {
                setMemberData(null);
                setIsBound(false);
            }
        } catch (e) {
            console.error('Failed to check binding status', e);
            setIsBound(false);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadAthleteFromStorage();

        const handleAuthChange = () => loadAthleteFromStorage();
        window.addEventListener('strava-auth-changed', handleAuthChange);
        window.addEventListener('storage', handleAuthChange);
        window.addEventListener('tcu-binding-success', () => athlete && checkBindingStatus(athlete.id));

        return () => {
            window.removeEventListener('strava-auth-changed', handleAuthChange);
            window.removeEventListener('storage', handleAuthChange);
        };
    }, []);

    useEffect(() => {
        if (athlete?.id) {
            setIsLoading(true);
            checkBindingStatus(athlete.id);
        } else {
            setMemberData(null);
            setIsBound(null);
            setIsLoading(false);
        }
    }, [athlete?.id]);

    const logout = () => {
        localStorage.removeItem(STORAGE_KEY);
        setAthlete(null);
        setMemberData(null);
        setIsBound(null);
        window.dispatchEvent(new Event('strava-auth-changed'));
    };

    return {
        athlete,
        memberData,
        isBound,
        isAdmin: athlete?.id ? ADMIN_ATHLETE_IDS.includes(athlete.id.toString()) : false,
        isLoading,
        logout,
        refreshBinding: () => athlete && checkBindingStatus(athlete.id)
    };
};
