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
    ftp?: number;
    max_heartrate?: number;
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
                .select('id, firstname, lastname, profile, ftp, max_heartrate')
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

    // 載入保養摘要 (優化版：批次讀取資料)
    const loadMaintenanceSummaries = useCallback(async (athleteIds: number[]) => {
        if (athleteIds.length === 0) return [];

        const summaries: AthleteMaintenanceSummary[] = [];

        // 優化：將時間範圍設定為 42 天 (CTL 週期)
        const fortyTwoDaysAgo = new Date();
        fortyTwoDaysAgo.setDate(fortyTwoDaysAgo.getDate() - 42);

        const [
            allTypesResult,
            allBikesResult,
            allRecordsResult,
            allSettingsResult,
            allActivitiesResult,
            allAthletesResult
        ] = await Promise.all([
            supabase.from('maintenance_types').select('*').order('sort_order'),
            supabase.from('bikes').select('*').in('athlete_id', athleteIds).eq('retired', false),
            supabase.from('bike_maintenance').select('*').in('athlete_id', athleteIds).order('service_date', { ascending: false }),
            supabase.from('bike_maintenance_settings').select('*').in('athlete_id', athleteIds),
            supabase.from('strava_activities').select('id, athlete_id, gear_id, start_date, distance').in('athlete_id', athleteIds).gte('start_date', fortyTwoDaysAgo.toISOString()),
            supabase.from('athletes').select('id, firstname, lastname, profile, ftp, max_heartrate').in('id', athleteIds)
        ]);

        const allTypes = allTypesResult.data || [];
        const allBikes = allBikesResult.data || [];
        const allRecords = allRecordsResult.data || [];
        const allSettings = allSettingsResult.data || [];
        const allActivities = allActivitiesResult.data || [];
        const allAthletes = allAthletesResult.data || [];

        if (allTypes.length === 0) return [];

        for (const athleteId of athleteIds) {
            const athlete = allAthletes.find(a => a.id === athleteId);
            const bikes = allBikes.filter(b => b.athlete_id === athleteId);
            const records = allRecords.filter(r => r.athlete_id === athleteId);
            const settings = allSettings.filter(s => s.athlete_id === athleteId);
            const activities = allActivities.filter(a => a.athlete_id === athleteId);

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

                allTypes
                    .filter(type =>
                        type.id !== 'full_service' &&
                        type.id !== 'wheel_check' &&
                        !type.name.includes('輪框檢查')
                    )
                    .forEach((type: any) => {
                        const lastTypeRecord = bikeRecords.find((r: any) => {
                            const types = r.maintenance_type.split(', ').map((t: string) => t.trim());
                            return types.includes(type.id) || types.includes('full_service') || types.includes('全車保養');
                        });

                        const lastServiceDate = lastTypeRecord?.service_date;
                        let mileageSince = 0;

                        if (lastServiceDate) {
                            const start = new Date(lastServiceDate);
                            const validActivities = activities.filter((a: any) => {
                                if (a.gear_id !== bike.id) return false;
                                return new Date(a.start_date) > start;
                            });
                            mileageSince = validActivities.reduce((sum: number, a: any) => sum + (a.distance || 0), 0) / 1000;
                        } else {
                            mileageSince = currentMileageKm;
                        }

                        const setting = settings.find((s: any) => s.bike_id === bike.id && s.maintenance_type_id === type.id);
                        const intervalKm = setting ? setting.custom_interval_km : (type.estimated_lifespan_km || type.default_interval_km);

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


    // 載入活動摘要 (優化版：批次讀取)
    const loadActivitySummaries = useCallback(async (athleteIds: number[]) => {
        if (athleteIds.length === 0) return [];

        // 優化：將時間範圍設定為 180 天 (支援 120 天圖表與 180 天列表篩選)
        const fortyTwoDaysAgo = new Date();
        fortyTwoDaysAgo.setDate(fortyTwoDaysAgo.getDate() - 180);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // 1. 批量載入資料
        const [allActivitiesResult, allAthletesResult, allBikesResult] = await Promise.all([
            supabase.from('strava_activities')
                .select('*')
                .in('athlete_id', athleteIds)
                .gte('start_date', fortyTwoDaysAgo.toISOString())
                .order('start_date', { ascending: true }),
            supabase.from('athletes').select('id, firstname, lastname, ftp, max_heartrate').in('id', athleteIds),
            supabase.from('bikes').select('id, name, athlete_id').in('athlete_id', athleteIds)
        ]);

        const allActivities = allActivitiesResult.data || [];
        const allAthletes = allAthletesResult.data || [];
        const allBikes = allBikesResult.data || [];

        const summaries: ActivitySummary[] = [];

        // TSS 計算輔助函式
        const calculateSimpleTSS = (watts: number, ftp: number, durationSeconds: number): number => {
            if (!ftp || !watts) return 0;
            const if_factor = watts / ftp;
            return (durationSeconds * watts * if_factor) / (ftp * 3600) * 100;
        };

        for (const athleteId of athleteIds) {
            const activities = allActivities.filter(a => a.athlete_id === athleteId);
            const athlete = allAthletes.find(a => a.id === athleteId);
            const bikes = allBikes.filter(b => b.athlete_id === athleteId);

            // 即使沒有活動也要列出隊員（不再跳過）
            const ftp = athlete?.ftp || 200;
            let currentCtl = 0;
            let currentAtl = 0;
            const dailyTssMap = new Map<string, number>();

            activities.forEach((a: any) => {
                const dateKey = a.start_date.split('T')[0];
                const isRide = ['Ride', 'VirtualRide', 'MountainBikeRide', 'GravelRide', 'EBikeRide', 'Velomobile'].includes(a.sport_type);

                const sufferScore = a.suffer_score ? Number(a.suffer_score) : 0;
                let tss = 0;
                // 優先使用身心負荷 (Suffer Score)，這對所有運動類型都有效
                if (sufferScore > 0) {
                    tss = sufferScore;
                } else if (isRide && ftp > 0 && (a.average_watts || a.weighted_average_watts)) {
                    // 次之使用功率計算 (僅限騎乘類活動)
                    const watts = Number(a.weighted_average_watts || (a.average_watts * 1.05) || 0);
                    tss = calculateSimpleTSS(watts, ftp, a.moving_time);
                }

                const current = dailyTssMap.get(dateKey) || 0;
                dailyTssMap.set(dateKey, current + tss);
                a.tss = tss;
            });

            // 計算 CTL/ATL（即使沒有活動也計算）
            if (activities.length > 0) {
                const startDate = new Date(activities[0].start_date);
                const endDate = new Date();
                let iteratorDate = new Date(startDate);

                while (iteratorDate <= endDate) {
                    const dateKey = iteratorDate.toISOString().split('T')[0];
                    const dayTss = dailyTssMap.get(dateKey) || 0;
                    currentCtl = currentCtl * (41 / 42) + dayTss * (1 / 42);
                    currentAtl = currentAtl * (6 / 7) + dayTss * (1 / 7);
                    iteratorDate.setDate(iteratorDate.getDate() + 1);
                }
            }

            const currentTsb = currentCtl - currentAtl;
            const recentWeekActivities = activities.filter((a: any) => new Date(a.start_date) >= sevenDaysAgo);

            const totalDistance = recentWeekActivities.reduce((sum: number, a: any) => sum + (a.distance || 0), 0) / 1000;
            const totalElevation = recentWeekActivities.reduce((sum: number, a: any) => sum + (a.total_elevation_gain || 0), 0);
            const totalTime = recentWeekActivities.reduce((sum: number, a: any) => sum + (a.moving_time || 0), 0) / 3600;
            const totalTss = recentWeekActivities.reduce((sum: number, a: any) => sum + (a.tss || 0), 0);

            const activitiesWithPower = recentWeekActivities.filter((a: any) => a.average_watts > 0);
            const avgWatts = activitiesWithPower.length > 0
                ? activitiesWithPower.reduce((sum: number, a: any) => sum + (a.average_watts || 0), 0) / activitiesWithPower.length
                : undefined;

            const maxWatts = recentWeekActivities.reduce((max: number, a: any) => Math.max(max, a.max_watts || 0), 0);

            const activitiesWithHR = recentWeekActivities.filter((a: any) => a.average_heartrate > 0);
            const avgHeartRate = activitiesWithHR.length > 0
                ? activitiesWithHR.reduce((sum: number, a: any) => sum + (a.average_heartrate || 0), 0) / activitiesWithHR.length
                : undefined;

            const sortedActivitiesDesc = [...activities].sort((a, b) =>
                new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
            );

            const bikeUsage: Record<string, { distance: number; count: number }> = {};
            recentWeekActivities.forEach((a: any) => {
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
                total_activities: recentWeekActivities.length,
                total_distance: totalDistance,
                total_elevation: totalElevation,
                total_time: totalTime,
                bikes_used: bikesUsed,
                avg_watts: avgWatts,
                max_watts: maxWatts || undefined,
                avg_heartrate: avgHeartRate,
                recent_activities: sortedActivitiesDesc.slice(0, 200),
                ftp: ftp,
                max_heartrate: athlete?.max_heartrate,
                total_tss: Math.round(totalTss),
                ctl: Math.round(currentCtl),
                atl: Math.round(currentAtl),
                tsb: Math.round(currentTsb),
                full_history_activities: activities,
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

    // 載入通知設定 (增強錯誤處理)
    const loadNotificationSettings = useCallback(async (managerAthleteId?: string, managerEmail?: string) => {
        try {
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
            if (settingsError) throw settingsError;

            return (data || []) as NotificationSetting[];
        } catch (err) {
            console.warn('通知設定表載入失敗 (可能不存在):', err);
            return [];
        }
    }, []);

    // 載入通知記錄 (增強錯誤處理)
    const loadNotificationLogs = useCallback(async (managerAthleteId?: string, managerEmail?: string) => {
        try {
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

            if (logsError) throw logsError;

            return (data || []) as NotificationLog[];
        } catch (err) {
            console.warn('通知記錄表載入失敗 (可能不存在):', err);
            return [];
        }
    }, []);


    // 主要載入函數 (優化版：平行處理所有資料)
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

            if (!role || !role.is_active) {
                // 非管理者或未啟用，清空資料
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

            const managerAthleteId = role.athlete_id ? String(role.athlete_id) : undefined;
            const managerEmail = role.email || identity.email;

            try {
                // 1. 先載入授權清單 (這是核心依賴)
                const auths = await loadAuthorizations(managerAthleteId, managerEmail);
                setAuthorizations(auths);

                // 2. 準備車友 ID 清單
                const approvedAthleteIds = auths
                    .filter(a => a.status === 'approved')
                    .map(a => a.athlete_id);
                const allAthleteIds = auths.map(a => a.athlete_id);

                // 3. 平行載入所有報表與統計資料 (極速模式)
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
