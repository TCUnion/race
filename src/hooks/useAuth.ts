import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../lib/api_config';

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
// 從環境變數讀取 Admin IDs，格式為逗號分隔字串
const ADMIN_ATHLETE_IDS = (import.meta.env.VITE_ADMIN_ATHLETE_IDS || '').split(',').map((id: string) => id.trim()).filter(Boolean);

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
            const apiUrl = `${API_BASE_URL}/api/auth/binding-status/${athleteId}`;
            const response = await fetch(apiUrl);

            // 檢查是否為 JSON (避免 404/500 返回 HTML 導致 SyntaxError)
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await response.text();
                if (text.includes("<!DOCTYPE html>") || text.includes("<html")) {
                    console.error("Detected HTML fallback on API route. Proxy configuration might be missing.");
                    throw new Error("伺服器設定錯誤：API 路由未正確轉發 (得到 HTML)。");
                }
                throw new Error("Received non-JSON response from server");
            }

            const data = await response.json();

            // 如果後端有回傳 strava_name，更新本地 Athlete 資料 (User Request)
            if (data.strava_name) {
                const currentAthlete = localStorage.getItem(STORAGE_KEY);
                let athleteObj = currentAthlete ? JSON.parse(currentAthlete) : {};

                // 檢查是否需要更新 (避免無限迴圈或不必要寫入)
                // 這裡簡單假設 strava_name 為全名，塞入 firstname，lastname 清空
                // 除非 strava_name 包含空白，可嘗試分割

                const serverName = data.strava_name.trim();
                const currentName = `${athleteObj.firstname || ''} ${athleteObj.lastname || ''}`.trim();

                // 如果本地名字是 undefined 或 'Undefined Undefined' 或 與伺服器不符
                if (currentName.includes('undefined') || currentName !== serverName) {

                    // 簡單策略：將 serverName 當作 firstname
                    const newAthleteData = {
                        ...athleteObj,
                        id: athleteId, // 確保 ID 存在
                        firstname: serverName,
                        lastname: ''
                    };

                    localStorage.setItem(STORAGE_KEY, JSON.stringify(newAthleteData));
                    // 手動觸發更新
                    setAthlete(newAthleteData as StravaAthlete);
                }
            }

            if (data.isBound) {
                const apiMemberData = data.member_data || {};
                setMemberData({
                    real_name: apiMemberData.real_name || data.member_name || '',
                    tcu_id: apiMemberData.tcu_id || data.tcu_account || '',
                    email: apiMemberData.email || data.email || '',
                    strava_id: athleteId.toString(),
                    account: apiMemberData.account || data.tcu_account,
                    member_name: apiMemberData.real_name || data.member_name,
                    bound_at: data.bound_at,
                    member_type: apiMemberData.member_type,
                    ...apiMemberData
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
        window.addEventListener('tcu-binding-success', async () => {

            // 立即嘗試更新
            if (athlete?.id) {
                await checkBindingStatus(athlete.id);
            }
            // 500ms 後再次嘗試，確保資料庫寫入完成並同步
            setTimeout(() => {
                if (athlete?.id) checkBindingStatus(athlete.id);
            }, 500);
        });

        return () => {
            window.removeEventListener('strava-auth-changed', handleAuthChange);
            window.removeEventListener('storage', handleAuthChange);
        };
    }, []);

    useEffect(() => {
        if (athlete?.id && String(athlete.id) !== 'undefined' && athlete.id !== 0) {
            setIsLoading(true);
            checkBindingStatus(Number(athlete.id));
        } else {
            setMemberData(null);
            setIsBound(null);
            setIsLoading(false);
        }
    }, [athlete]); // 監聽整個 athlete 物件的變動 (包含 ts)

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
