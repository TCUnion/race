/**
 * 管理後台資料 Hook
 * 提供授權車友資料、保養報表、活動報表與統計功能
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
    UserAuthorization,
    NotificationSetting,
    NotificationLog,
    ManagerRoleData,
    AthleteMaintenanceSummary,
    ActivitySummary,
    MaintenanceStatistics,
    AuthorizationStatus,
    AuthorizationType,
} from '../types';

// 車友基本資訊
interface AthleteInfo {
    id: number;
    firstname?: string;
    lastname?: string;
    profile?: string;
    city?: string;
}

// 車輛與保養狀態
interface BikeWithMaintenance {
    id: string;
    name: string;
    distance: number;
    converted_distance: number;
    maintenanceRecords: any[];
    maintenanceReminders: any[];
}

// Hook 回傳型別
interface UseManagerDataReturn {
    // 狀態
    loading: boolean;
    error: string | null;
    isManager: boolean;
    isAuthenticated: boolean; // 新增：是否已登入
    managerRole: ManagerRoleData | null;

    // 授權車友資料
    authorizations: UserAuthorization[];
    authorizedAthletes: AthleteInfo[];

    // 報表資料
    maintenanceSummaries: AthleteMaintenanceSummary[];
    activitySummaries: ActivitySummary[];
    maintenanceStatistics: MaintenanceStatistics[];

    // 通知設定
    notificationSettings: NotificationSetting[];
    notificationLogs: NotificationLog[];

    // 功能方法
    refresh: () => Promise<void>;
    addAuthorization: (athleteId: number, type: AuthorizationType, notes?: string) => Promise<void>;
    updateAuthorizationStatus: (id: string, status: AuthorizationStatus) => Promise<void>;
    removeAuthorization: (id: string) => Promise<void>;
    deleteAuthorization: (id: string) => Promise<void>;
    updateNotificationSetting: (setting: Partial<NotificationSetting>) => Promise<void>;
    sendNotification: (athleteId: number, message: string, channel: string) => Promise<void>;
    registerAsManager: (role: string, shopName?: string) => Promise<void>;
    checkAthleteExistence: (athleteId: string) => Promise<any>;
}

export function useManagerData(): UseManagerDataReturn {
    // 狀態
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isManager, setIsManager] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false); // 新增
    const [managerRole, setManagerRole] = useState<ManagerRoleData | null>(null);

    // 資料
    const [authorizations, setAuthorizations] = useState<UserAuthorization[]>([]);
    const [authorizedAthletes, setAuthorizedAthletes] = useState<AthleteInfo[]>([]);
    const [maintenanceSummaries, setMaintenanceSummaries] = useState<AthleteMaintenanceSummary[]>([]);
    const [activitySummaries, setActivitySummaries] = useState<ActivitySummary[]>([]);
    const [maintenanceStatistics, setMaintenanceStatistics] = useState<MaintenanceStatistics[]>([]);
    const [notificationSettings, setNotificationSettings] = useState<NotificationSetting[]>([]);
    const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);

    // 取得當前用戶 ID (優先從 Strava LocalStorage，其次從 Supabase Auth Email)
    const getAthleteId = useCallback(async (): Promise<{ id?: string; email?: string } | null> => {
        // 1. 優先檢查 Strava LocalStorage (Legacy / OAuth)
        const stravaData = localStorage.getItem('strava_athlete_meta');
        if (stravaData) {
            try {
                const parsed = JSON.parse(stravaData);
                return { id: String(parsed.id) };
            } catch (e) {
                console.error('解析 Strava 資料失敗', e);
            }
        }

        // 2. 檢查 Supabase Auth Session (Email/Password Login)
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
            return { email: session.user.email };
        }

        return null;
    }, []);

    // 檢查是否為管理者
    const checkManagerRole = useCallback(async (identity: { id?: string; email?: string }) => {
        try {
            let query = supabase.from('manager_roles').select('*'); // 移除 is_active 限制，允許查詢未啟用帳號

            if (identity.id) {
                query = query.eq('athlete_id', identity.id);
            } else if (identity.email) {
                query = query.eq('email', identity.email);
            } else {
                return null;
            }

            const { data, error: roleError } = await query.maybeSingle();

            if (roleError) {
                console.warn('檢查管理者角色失敗:', roleError);
                return null;
            }

            return data as ManagerRoleData | null;
        } catch (err) {
            console.error('檢查管理者角色錯誤:', err);
            return null;
        }
    }, []);

    // 載入授權車友清單
    const loadAuthorizations = useCallback(async (managerAthleteId?: string, managerEmail?: string) => {
        let query = supabase.from('user_authorizations').select('*');

        if (managerAthleteId && managerEmail) {
            query = query.or(`manager_athlete_id.eq.${managerAthleteId},manager_email.eq.${managerEmail}`);
        } else if (managerAthleteId) {
            query = query.eq('manager_athlete_id', managerAthleteId);
        } else if (managerEmail) {
            query = query.eq('manager_email', managerEmail);
        } else {
            return [];
        }

        const { data, error: authError } = await query
            .order('created_at', { ascending: false });

        if (authError) {
            throw authError;
        }

        return (data || []) as UserAuthorization[];
    }, []);

    // 載入車友基本資訊
    const loadAthleteInfo = useCallback(async (athleteIds: number[]) => {
        if (athleteIds.length === 0) return [];

        // 去重並確保 ID 為數字
        const uniqueIds = Array.from(new Set(athleteIds.map(id => Number(id)).filter(id => !isNaN(id))));
        if (uniqueIds.length === 0) return [];

        try {
            const { data, error: athleteError } = await supabase
                .from('athletes')
                .select('id, firstname, lastname, profile')
                .in('id', uniqueIds);

            if (athleteError) {
                console.error('批量載入車友資訊失敗:', athleteError);
                return [];
            }

            return (data || []) as AthleteInfo[];
        } catch (err) {
            console.error('loadAthleteInfo 發生異常:', err);
            return [];
        }
    }, []);

    // 載入保養摘要
    const loadMaintenanceSummaries = useCallback(async (athleteIds: number[]) => {
        if (athleteIds.length === 0) return [];

        const summaries: AthleteMaintenanceSummary[] = [];

        // 載入全域共用的資料
        const { data: allTypes } = await supabase
            .from('maintenance_types')
            .select('*')
            .order('sort_order');

        if (!allTypes) return [];

        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        for (const athleteId of athleteIds) {
            // 載入該車友的所有相關資料
            const [bikesResult, recordsResult, settingsResult, activitiesResult] = await Promise.all([
                supabase.from('bikes').select('*').eq('athlete_id', athleteId).eq('retired', false),
                supabase.from('bike_maintenance').select('*').eq('athlete_id', athleteId).order('service_date', { ascending: false }),
                supabase.from('bike_maintenance_settings').select('*').eq('athlete_id', athleteId),
                supabase.from('strava_activities').select('*').eq('athlete_id', athleteId).gte('start_date', oneYearAgo.toISOString())
            ]);

            const bikes = bikesResult.data || [];
            const records = recordsResult.data || [];
            const settings = settingsResult.data || [];
            const activities = activitiesResult.data || [];

            // 載入車友資訊
            const { data: athlete } = await supabase
                .from('athletes')
                .select('firstname, lastname, profile')
                .eq('id', athleteId)
                .maybeSingle();

            if (bikes.length === 0) continue;

            let totalOverdue = 0;
            let totalDueSoon = 0;

            const bikeSummaries = bikes.map((bike: any) => {
                const currentMileageKm = bike.converted_distance || (bike.distance / 1000);
                const bikeRecords = records.filter((r: any) => r.bike_id === bike.id);
                const lastRecord = bikeRecords[0];

                const items: any[] = [];
                let bikeOverdue = 0;
                let bikeDueSoon = 0;

                // 過濾與同步個人端的項目清單
                allTypes
                    .filter(type =>
                        type.id !== 'full_service' &&
                        type.id !== 'wheel_check' &&
                        !type.name.includes('輪框檢查')
                    )
                    .forEach((type: any) => {
                        // 找出此項目的最後保養
                        const lastTypeRecord = bikeRecords.find((r: any) => {
                            const types = r.maintenance_type.split(', ').map((t: string) => t.trim());
                            return types.includes(type.id) || types.includes('full_service') || types.includes('全車保養');
                        });

                        const lastServiceDate = lastTypeRecord?.service_date;
                        let mileageSince = 0;

                        if (lastServiceDate) {
                            // 使用活動里程加總 (與個人端邏輯一致)
                            const start = new Date(lastServiceDate);
                            const validActivities = activities.filter((a: any) => {
                                if (a.gear_id !== bike.id) return false;
                                return new Date(a.start_date) > start;
                            });
                            mileageSince = validActivities.reduce((sum: number, a: any) => sum + (a.distance || 0), 0) / 1000;
                        } else {
                            mileageSince = currentMileageKm;
                        }

                        // 取得保養間隔 (優先順序: 自訂 > 預估 > 預設)
                        const setting = settings.find((s: any) => s.bike_id === bike.id && s.maintenance_type_id === type.id);
                        const intervalKm = setting ? setting.custom_interval_km : (type.estimated_lifespan_km || type.default_interval_km);

                        // 如果里程間隔為 0，則視為不適用的項目，不加入清單
                        if (intervalKm === 0) return;

                        const percentage = (mileageSince / intervalKm) * 100;

                        let status: 'ok' | 'due_soon' | 'overdue' = 'ok';
                        if (percentage >= 100) {
                            bikeOverdue++;
                            status = 'overdue';
                        } else if (percentage >= 85) {
                            bikeDueSoon++;
                            status = 'due_soon';
                        }

                        items.push({
                            type_id: type.id,
                            name: type.id === 'gear_replacement' || type.name === '器材更換' ? '其他' : type.name,
                            percentage,
                            mileageSince,
                            interval: intervalKm,
                            status
                        });
                    });

                totalOverdue += bikeOverdue;
                totalDueSoon += bikeDueSoon;

                return {
                    id: bike.id,
                    name: bike.name || bike.nickname || '未命名車輛',
                    distance: currentMileageKm,
                    maintenanceStatus: (bikeOverdue > 0 ? 'overdue' : bikeDueSoon > 0 ? 'due_soon' : 'ok') as "overdue" | "due_soon" | "ok",
                    dueSoonCount: bikeDueSoon,
                    overdueCount: bikeOverdue,
                    lastServiceDate: lastRecord?.service_date,
                    items
                };
            });

            summaries.push({
                athlete_id: athleteId,
                athlete_name: `${athlete?.firstname || ''} ${athlete?.lastname || ''}`.trim() || `Athlete ${athleteId}`,
                athlete_profile: athlete?.profile,
                bikes: bikeSummaries,
                totalOverdue,
                totalDueSoon,
            });
        }

        return summaries;
    }, []);

    // 載入活動摘要
    const loadActivitySummaries = useCallback(async (athleteIds: number[]) => {
        if (athleteIds.length === 0) return [];

        const summaries: ActivitySummary[] = [];
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        for (const athleteId of athleteIds) {
            // 載入活動紀錄
            const { data: activities } = await supabase
                .from('strava_activities')
                .select('*')
                .eq('athlete_id', athleteId)
                .gte('start_date', oneYearAgo.toISOString())
                .order('start_date', { ascending: false });

            // 載入車友資訊
            const { data: athlete } = await supabase
                .from('athletes')
                .select('firstname, lastname')
                .eq('id', athleteId)
                .maybeSingle();

            // 載入車輛資訊
            const { data: bikes } = await supabase
                .from('bikes')
                .select('id, name')
                .eq('athlete_id', athleteId);

            if (!activities || activities.length === 0) continue;

            // 計算統計
            // 計算統計
            const totalDistance = activities.reduce((sum: number, a: any) => sum + (a.distance || 0), 0) / 1000;
            const totalElevation = activities.reduce((sum: number, a: any) => sum + (a.total_elevation_gain || 0), 0);
            const totalTime = activities.reduce((sum: number, a: any) => sum + (a.moving_time || 0), 0) / 3600;

            // 功率與心率統計
            const activitiesWithPower = activities.filter((a: any) => a.average_watts > 0);
            const avgWatts = activitiesWithPower.length > 0
                ? activitiesWithPower.reduce((sum: number, a: any) => sum + (a.average_watts || 0), 0) / activitiesWithPower.length
                : undefined;

            const maxWatts = activities.reduce((max: number, a: any) => Math.max(max, a.max_watts || 0), 0);

            const activitiesWithHR = activities.filter((a: any) => a.average_heartrate > 0);
            const avgHeartRate = activitiesWithHR.length > 0
                ? activitiesWithHR.reduce((sum: number, a: any) => sum + (a.average_heartrate || 0), 0) / activitiesWithHR.length
                : undefined;

            const maxHeartRate = activities.reduce((max: number, a: any) => Math.max(max, a.max_heartrate || 0), 0);

            const activitiesWithCadence = activities.filter((a: any) => a.average_cadence > 0);
            const avgCadence = activitiesWithCadence.length > 0
                ? activitiesWithCadence.reduce((sum: number, a: any) => sum + (a.average_cadence || 0), 0) / activitiesWithCadence.length
                : undefined;

            // 最近 100 筆活動 (配合前端最大分頁選項)
            const recentActivities = activities.slice(0, 100);

            // 車輛使用統計
            const bikeUsage: Record<string, { distance: number; count: number }> = {};
            activities.forEach((a: any) => {
                if (a.gear_id) {
                    if (!bikeUsage[a.gear_id]) {
                        bikeUsage[a.gear_id] = { distance: 0, count: 0 };
                    }
                    bikeUsage[a.gear_id].distance += (a.distance || 0) / 1000;
                    bikeUsage[a.gear_id].count += 1;
                }
            });

            const bikesUsed = Object.entries(bikeUsage).map(([bikeId, usage]) => {
                const bike = bikes?.find((b: any) => b.id === bikeId);
                return {
                    bike_id: bikeId,
                    bike_name: bike?.name || bikeId,
                    distance: usage.distance,
                    activity_count: usage.count,
                };
            });

            summaries.push({
                athlete_id: athleteId,
                athlete_name: `${athlete?.firstname || ''} ${athlete?.lastname || ''}`.trim() || `Athlete ${athleteId}`,
                total_activities: activities.length,
                total_distance: totalDistance,
                total_elevation: totalElevation,
                total_time: totalTime,
                bikes_used: bikesUsed,
                most_active_region: undefined, // 需要額外的地理分析
                avg_watts: avgWatts,
                max_watts: maxWatts || undefined,
                avg_heartrate: avgHeartRate,
                max_heartrate: maxHeartRate || undefined,
                avg_cadence: avgCadence,
                recent_activities: recentActivities,
            });
        }

        return summaries;
    }, []);

    // 載入保養統計
    const loadMaintenanceStatistics = useCallback(async (athleteIds: number[]) => {
        if (athleteIds.length === 0) return [];

        // 載入所有保養紀錄
        const { data: records } = await supabase
            .from('bike_maintenance')
            .select('*')
            .in('athlete_id', athleteIds);

        // 載入保養類型
        const { data: types } = await supabase
            .from('maintenance_types')
            .select('*');

        if (!records || !types) return [];

        const statistics: MaintenanceStatistics[] = [];

        types.forEach((type: any) => {
            const typeRecords = records.filter((r: any) =>
                r.maintenance_type.includes(type.id)
            );

            if (typeRecords.length === 0) return;

            const totalCost = typeRecords.reduce((sum: number, r: any) => sum + (r.cost || 0), 0);
            const uniqueAthletes = new Set(typeRecords.map((r: any) => r.athlete_id));

            // 計算平均間隔 (簡化版)
            let avgInterval = type.default_interval_km;

            statistics.push({
                type_id: type.id,
                type_name: type.name,
                total_count: typeRecords.length,
                total_cost: totalCost,
                avg_interval_km: avgInterval,
                athletes_count: uniqueAthletes.size,
            });
        });

        return statistics.sort((a, b) => b.total_count - a.total_count);
    }, []);

    // 載入通知設定
    const loadNotificationSettings = useCallback(async (managerAthleteId?: string, managerEmail?: string) => {
        let query = supabase.from('notification_settings').select('*');

        if (managerAthleteId && managerEmail) {
            query = query.or(`manager_athlete_id.eq.${managerAthleteId},manager_email.eq.${managerEmail}`);
        } else if (managerAthleteId) {
            query = query.eq('manager_athlete_id', managerAthleteId);
        } else if (managerEmail) {
            query = query.eq('manager_email', managerEmail);
        } else {
            return [];
        }

        const { data, error: settingsError } = await query;
        if (settingsError) {
            console.warn('載入通知設定失敗:', settingsError);
            return [];
        }

        return (data || []) as NotificationSetting[];
    }, []);

    // 載入通知記錄
    const loadNotificationLogs = useCallback(async (managerAthleteId?: string, managerEmail?: string) => {
        let query = supabase.from('notification_logs').select('*');

        if (managerAthleteId && managerEmail) {
            query = query.or(`manager_athlete_id.eq.${managerAthleteId},manager_email.eq.${managerEmail}`);
        } else if (managerAthleteId) {
            query = query.eq('manager_athlete_id', managerAthleteId);
        } else if (managerEmail) {
            query = query.eq('manager_email', managerEmail);
        } else {
            return [];
        }

        const { data, error: logsError } = await query
            .order('created_at', { ascending: false })
            .limit(100);

        if (logsError) {
            console.warn('載入通知記錄失敗:', logsError);
            return [];
        }

        return (data || []) as NotificationLog[];
    }, []);

    // 主要載入函數
    const refresh = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const identity = await getAthleteId();
            setIsAuthenticated(!!identity); // 設定登入狀態

            if (!identity) {
                // 回傳 null 讓 UI 顯示登入畫面
                setLoading(false);
                return;
            }

            // 檢查管理者角色
            const role = await checkManagerRole(identity);

            setManagerRole(role);

            // 只有啟用中才視為有效管理員
            const isActiveManager = !!role && role.is_active;
            setIsManager(isActiveManager);

            if (!role) {
                // 非管理者，清空資料
                setAuthorizations([]);
                setAuthorizedAthletes([]);
                setMaintenanceSummaries([]);
                setActivitySummaries([]);
                setMaintenanceStatistics([]);
                setNotificationSettings([]);
                setNotificationLogs([]);
                setLoading(false);
                return;
            }

            // 若帳號未啟用，不載入敏感資料，直接返回
            if (!role.is_active) {
                setLoading(false);
                return;
            }

            // 若沒有 athlete_id (純 Email 管理者)，能做的事情有限，但仍可執行管理功能
            // 這裡暫時使用 role.athlete_id 作為後續查詢的依據 (若 DB 中為 null 則可能會有問題，需注意)
            // 如果 role.athlete_id 為空，則無法載入 "依賴 athlete_id" 的資料

            // 修正：如果沒有 athlete_id，則無法載入需要 manager_athlete_id 的關聯資料
            // 我們可以使用 role.id 作為替代嗎？目前 user_authorizations 使用 manager_athlete_id INT
            // TODO: schema 應該也要更新 user_authorizations，允許綁定 manager_role_id 或 email
            // 暫時解法：如果沒有 athlete_id，則跳過載入 authorizations

            // 改進：無論是否有 athlete_id，只要進入此處（role 存在）就嘗試載入資料
            const managerAthleteId = role.athlete_id ? String(role.athlete_id) : undefined;
            const managerEmail = role.email || identity.email;

            try {
                // 載入授權清單
                const auths = await loadAuthorizations(managerAthleteId, managerEmail);
                setAuthorizations(auths);

                // 僅針對「已核准」的車友進行報表計算
                const approvedAthleteIds = auths
                    .filter(a => a.status === 'approved')
                    .map(a => a.athlete_id);

                // 全體車友 ID (用於載入基本資訊)
                const allAthleteIds = auths.map(a => a.athlete_id);

                // 平行載入所有資料
                const [athletes, summaries, activities, stats, settings, logs] = await Promise.all([
                    loadAthleteInfo(allAthleteIds),
                    loadMaintenanceSummaries(approvedAthleteIds),
                    loadActivitySummaries(approvedAthleteIds),
                    loadMaintenanceStatistics(approvedAthleteIds),
                    loadNotificationSettings(managerAthleteId, managerEmail),
                    loadNotificationLogs(managerAthleteId, managerEmail),
                ]);

                setAuthorizedAthletes(athletes);
                setMaintenanceSummaries(summaries);
                setActivitySummaries(activities);
                setMaintenanceStatistics(stats);
                setNotificationSettings(settings);
                setNotificationLogs(logs);
            } catch (dataError) {
                console.error('載入詳細資料失敗:', dataError);
            }

        } catch (err: any) {
            console.error('載入管理者資料失敗:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [
        getAthleteId,
        checkManagerRole,
        loadAuthorizations,
        loadAthleteInfo,
        loadMaintenanceSummaries,
        loadActivitySummaries,
        loadMaintenanceStatistics,
        loadNotificationSettings,
        loadNotificationLogs,
    ]);

    // 新增授權
    const addAuthorization = useCallback(async (
        athleteId: number,
        type: AuthorizationType,
        notes?: string
    ) => {
        const identity = await getAthleteId();
        if (!identity) throw new Error('尚未登入');

        const managerAthleteId = identity.id ? parseInt(identity.id) : null;
        const managerEmail = identity.email || managerRole?.email;

        if (!managerAthleteId && !managerEmail) {
            throw new Error('無法識別管理者身分（無 ID 或 Email）');
        }

        // 1. 檢查是否存在記錄
        let query = supabase.from('user_authorizations').select('*').eq('athlete_id', athleteId);

        if (managerAthleteId) {
            query = query.eq('manager_athlete_id', managerAthleteId);
        } else {
            query = query.eq('manager_email', managerEmail);
        }

        const { data: existing, error: fetchError } = await query.maybeSingle();
        if (fetchError) throw fetchError;

        const upsertData: any = {
            athlete_id: athleteId,
            authorization_type: type,
            status: 'pending',
            notes,
            shop_name: managerRole?.shop_name,
            updated_at: new Date().toISOString()
        };

        if (managerAthleteId) upsertData.manager_athlete_id = managerAthleteId;
        if (managerEmail) upsertData.manager_email = managerEmail;

        if (existing) {
            if (existing.status === 'pending') throw new Error('已發送過申請，正在等待車友審核中。');
            if (existing.status === 'approved') throw new Error('該車友已經在您的授權清單中。');

            // 更新現有記錄
            const { error: updateError } = await supabase
                .from('user_authorizations')
                .update({ ...upsertData, approved_at: null })
                .eq('id', existing.id);

            if (updateError) throw updateError;
        } else {
            // 插入新記錄
            const { error: insertError } = await supabase
                .from('user_authorizations')
                .insert(upsertData);

            if (insertError) throw insertError;
        }

        await refresh();
    }, [getAthleteId, managerRole, refresh]);

    // 更新授權狀態
    const updateAuthorizationStatus = useCallback(async (
        id: string,
        status: AuthorizationStatus
    ) => {
        const updates: any = { status, updated_at: new Date().toISOString() };
        if (status === 'approved') {
            updates.approved_at = new Date().toISOString();
        }

        const { error: updateError } = await supabase
            .from('user_authorizations')
            .update(updates)
            .eq('id', id);

        if (updateError) throw updateError;
        await refresh();
    }, [refresh]);

    // 移除授權 (軟刪除)
    const removeAuthorization = useCallback(async (id: string) => {
        const { error: updateError } = await supabase
            .from('user_authorizations')
            .update({
                status: 'revoked',
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (updateError) throw updateError;
        await refresh();
    }, [refresh]);

    // 刪除授權紀錄 (物理刪除)
    const deleteAuthorization = useCallback(async (id: string) => {
        const { error: deleteError } = await supabase
            .from('user_authorizations')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;
        await refresh();
    }, [refresh]);

    // 更新通知設定
    const updateNotificationSetting = useCallback(async (
        setting: Partial<NotificationSetting>
    ) => {
        const identity = await getAthleteId();
        if (!identity) throw new Error('尚未登入');

        const managerAthleteId = identity.id ? parseInt(identity.id) : null;
        const managerEmail = identity.email;

        const upsertData: any = {
            ...setting,
            updated_at: new Date().toISOString(),
        };
        if (managerAthleteId) upsertData.manager_athlete_id = managerAthleteId;
        if (managerEmail) upsertData.manager_email = managerEmail;

        const { error: upsertError } = await supabase
            .from('notification_settings')
            .upsert(upsertData);

        if (upsertError) throw upsertError;
        await refresh();
    }, [getAthleteId, refresh]);

    // 發送通知
    const sendNotification = useCallback(async (
        athleteId: number,
        message: string,
        channel: string
    ) => {
        const identity = await getAthleteId();
        if (!identity) throw new Error('尚未登入');

        const managerAthleteId = identity.id ? parseInt(identity.id) : null;
        const managerEmail = identity.email;

        const insertData: any = {
            athlete_id: athleteId,
            notification_type: 'maintenance_due',
            message,
            channel,
            status: 'pending',
        };
        if (managerAthleteId) insertData.manager_athlete_id = managerAthleteId;
        if (managerEmail) insertData.manager_email = managerEmail;

        // 記錄通知 (實際發送由 n8n 處理)
        const { error: insertError } = await supabase
            .from('notification_logs')
            .insert(insertData);

        if (insertError) throw insertError;

        // TODO: 觸發 n8n webhook 發送通知
        console.log('通知已排入佇列，等待 n8n 處理');

        await refresh();
    }, [getAthleteId, refresh]);

    // 註冊為管理者
    const registerAsManager = useCallback(async (
        role: string,
        shopName?: string
    ) => {
        const identity = await getAthleteId();
        if (!identity) throw new Error('尚未登入');

        // 建構寫入資料
        const upsertData: any = {
            role,
            shop_name: shopName,
            is_active: false,
            updated_at: new Date().toISOString(),
        };

        if (identity.id) {
            upsertData.athlete_id = parseInt(identity.id);
        }

        if (identity.email) {
            upsertData.email = identity.email;
        }

        const { error: insertError } = await supabase
            .from('manager_roles')
            .upsert(upsertData, { onConflict: 'email' });

        if (insertError) throw insertError;
        await refresh();
    }, [getAthleteId, refresh]);

    // 初始載入
    useEffect(() => {
        refresh();

        // 監聽登入狀態變更
        const handleAuthChange = () => {
            console.log('useManagerData: 偵測到登入狀態變更');
            refresh();
        };

        window.addEventListener('strava-auth-changed', handleAuthChange);
        window.addEventListener('storage', handleAuthChange);

        return () => {
            window.removeEventListener('strava-auth-changed', handleAuthChange);
            window.removeEventListener('storage', handleAuthChange);
        };
    }, [refresh]);

    // 檢查車友是否存在
    const checkAthleteExistence = useCallback(async (athleteId: string) => {
        try {
            const { data, error } = await supabase
                .from('athletes')
                .select('id, firstname, lastname, profile')
                .eq('id', athleteId)
                .single();

            if (error) throw error;
            return data;
        } catch (err) {
            return null;
        }
    }, []);

    return {
        loading,
        error,
        isManager,
        isAuthenticated, // 回傳
        managerRole,
        authorizations,
        authorizedAthletes,
        maintenanceSummaries,
        activitySummaries,
        maintenanceStatistics,
        notificationSettings,
        notificationLogs,
        refresh,
        addAuthorization,
        updateAuthorizationStatus,
        removeAuthorization,
        deleteAuthorization,
        updateNotificationSetting,
        sendNotification,
        registerAsManager,
        checkAthleteExistence,
    };
}

export default useManagerData;
