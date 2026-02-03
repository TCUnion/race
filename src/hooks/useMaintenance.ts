
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Wheelset, StravaActivity } from '../types';

// Strava 腳踏車型別（對應 bikes 表）
export interface StravaBike {
  id: string;
  athlete_id: string;
  name: string;
  nickname?: string;
  primary_gear: boolean;
  retired: boolean;
  distance: number; // 累計里程（公尺）
  converted_distance: number; // 累計里程（公里）
  updated_at: string;
  // 新增欄位
  brand?: string;
  model?: string;
  groupset_name?: string;
  shop_name?: string;
  remarks?: string;
  price?: number;
  active_wheelset_id?: string;
  power_meter?: string;
}

// Strava 活動紀錄（對應 strava_activities 表）
// StravaActivity moved to types.ts

// 保養類型（對應 maintenance_types 表）
export interface MaintenanceType {
  id: string;
  name: string;
  description?: string;
  default_interval_km: number;
  icon?: string;
  sort_order: number;
  estimated_lifespan_km?: number; // 預估壽命 (公里) - 可覆蓋預設
  climbing_lifespan_m?: number;   // 爬升壽命 (公尺)
}

// 保養紀錄（對應 bike_maintenance 表）
export interface BikeMaintenanceRecord {
  id: string;
  bike_id: string;
  athlete_id: string;
  maintenance_type: string;
  service_date: string;
  mileage_at_service: number;
  cost?: number;
  shop_name?: string;
  notes?: string;
  is_diy: boolean;
  created_at: string;
  updated_at: string;
  other?: string; // 其他資訊欄位
  wheelset_id?: string; // 關聯的輪組 ID
  parts_details?: {
    type_id: string;
    brand: string;
    model: string;
    other: string;
  }[];
  // 關聯資料
  maintenance_type_info?: MaintenanceType;
}

// 自訂保養里程設定（對應 bike_maintenance_settings 表）
export interface MaintenanceSetting {
  id: string;
  bike_id: string;
  maintenance_type_id: string;
  custom_interval_km: number;
  athlete_id: string;
}

// 壽命設定（對應 bike_lifespan_settings 表）
export interface LifespanSetting {
  id: string;
  bike_id: string;
  maintenance_type_id: string;
  athlete_id: string;
  lifespan_km?: number;    // 里程壽命 (公里)
  lifespan_days?: number;  // 時間壽命 (天數)
  created_at: string;
  updated_at: string;
}

// 活動輪組關聯（對應 activity_wheelset 表）
export interface ActivityWheelset {
  id: string;
  activity_id: number;
  wheelset_id: string;
  athlete_id: number;
  created_at: string;
}

// 保養狀態
export type MaintenanceStatus = 'ok' | 'due_soon' | 'overdue';

// 保養提醒項目
export interface MaintenanceReminder {
  type: MaintenanceType;
  lastService?: BikeMaintenanceRecord;
  currentMileage: number;
  mileageSinceService: number;
  nextServiceMileage: number;
  status: MaintenanceStatus;
  percentageUsed: number;
  climbingSinceService: number; // 新增：累積爬升
  usageByClimbing: number;      // 新增：爬升使用率
}

// 計算保養狀態
const calculateMaintenanceStatus = (
  currentMileage: number,
  lastServiceMileage: number,
  intervalKm: number
): { status: MaintenanceStatus; percentageUsed: number; mileageSinceService: number } => {
  const mileageSinceService = currentMileage - lastServiceMileage;
  const percentageUsed = (mileageSinceService / intervalKm) * 100;

  let status: MaintenanceStatus = 'ok';
  if (percentageUsed >= 100) {
    status = 'overdue';
  } else if (percentageUsed >= 85) {
    status = 'due_soon';
  }

  return { status, percentageUsed, mileageSinceService };
};

// App Settings (for storing user preferences like column order)
export interface AppSetting {
  athlete_id: string;
  key: string;
  value: any;
  updated_at: string;
}

export const useMaintenance = () => {
  const [bikes, setBikes] = useState<StravaBike[]>([]);
  const [wheelsets, setWheelsets] = useState<Wheelset[]>([]);
  const [maintenanceTypes, setMaintenanceTypes] = useState<MaintenanceType[]>([]);
  const [records, setRecords] = useState<BikeMaintenanceRecord[]>([]);
  const [settings, setSettings] = useState<MaintenanceSetting[]>([]);
  const [lifespanSettings, setLifespanSettings] = useState<LifespanSetting[]>([]);
  const [appSettings, setAppSettings] = useState<AppSetting[]>([]); // New state for app settings
  const [activities, setActivities] = useState<StravaActivity[]>([]); // 新增活動資料狀態
  const [activityWheelsets, setActivityWheelsets] = useState<ActivityWheelset[]>([]); // 活動輪組關聯
  const [isBatchUpdating, setIsBatchUpdating] = useState(false); // 批量更新狀態
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBikeId, setSelectedBikeId] = useState<string | null>(null);

  // 取得 athlete_id
  const getAthleteId = useCallback((): string | null => {
    const savedData = localStorage.getItem('strava_athlete_data');
    if (!savedData) return null;
    const athlete = JSON.parse(savedData);
    return String(athlete.id);
  }, []);

  // 載入所有資料
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const athleteId = getAthleteId();
      if (!athleteId) {
        setError('尚未連結 Strava：請先在首頁連結您的 Strava 帳號');
        setLoading(false);
        return;
      }

      // 並行載入所有資料，個別處理錯誤以避免單一表缺失導致整體失敗
      const [
        bikesResult,
        wheelsetsResult,
        typesResult,
        recordsResult,
        settingsResult,
        lifespanSettingsResult,
        activitiesResult,
        appSettingsResult,
        activityWheelsetsResult
      ] = await Promise.all([
        supabase.from('bikes').select('*').eq('athlete_id', athleteId).eq('retired', false).order('primary_gear', { ascending: false }),
        supabase.from('wheelsets').select('*').eq('athlete_id', athleteId),
        supabase.from('maintenance_types').select('*').order('sort_order'),
        supabase.from('bike_maintenance').select('*').eq('athlete_id', athleteId).order('service_date', { ascending: false }),
        supabase.from('bike_maintenance_settings').select('*').eq('athlete_id', athleteId),
        supabase.from('bike_lifespan_settings').select('*').eq('athlete_id', athleteId),
        supabase.from('strava_activities').select('id, athlete_id, name, distance, moving_time, start_date, gear_id, total_elevation_gain').eq('athlete_id', athleteId).gte('start_date', new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString()).order('start_date', { ascending: false }),
        supabase.from('app_settings').select('*').eq('athlete_id', athleteId),
        supabase.from('activity_wheelset').select('*').eq('athlete_id', athleteId)
      ]);

      // 檢查核心基礎資料
      if (bikesResult.error) {
        console.error('Critical Error loading bikes:', bikesResult.error);
        throw bikesResult.error;
      }
      if (typesResult.error) {
        console.error('Critical Error loading maintenance_types:', typesResult.error);
        throw typesResult.error;
      }

      // 其他非核心表若失敗則顯示警告但繼續執行
      if (wheelsetsResult.error) console.warn('載入輪組失敗:', wheelsetsResult.error);
      if (recordsResult.error) console.warn('載入保養紀錄失敗:', recordsResult.error);
      if (settingsResult.error) console.warn('載入保養設定失敗:', settingsResult.error);
      if (lifespanSettingsResult.error) console.warn('載入壽命設定失敗:', lifespanSettingsResult.error);
      if (activitiesResult.error) console.warn('載入活動數據失敗:', activitiesResult.error);
      if (appSettingsResult.error) console.warn('載入 App 設定失敗:', appSettingsResult.error);
      if (activityWheelsetsResult?.error) console.warn('載入活動輪組關聯失敗:', activityWheelsetsResult.error);

      setBikes(bikesResult.data || []);
      setWheelsets(wheelsetsResult.data || []);
      setMaintenanceTypes((typesResult.data || []).filter((t: any) => t.id !== 'wheel_check' && !t.name.includes('輪框檢查')));
      setRecords(recordsResult.data || []);
      setSettings(settingsResult.data || []);
      setLifespanSettings(lifespanSettingsResult.data || []);
      setActivities(activitiesResult.data || []);
      setAppSettings(appSettingsResult.data || []);
      setActivityWheelsets(activityWheelsetsResult?.data || []);
    } catch (err: any) {
      console.error('載入保養資料失敗:', err);
      // 如果 strava_activities 表不存在，不要因此阻擋其他資料顯示
      if (err.message?.includes('strava_activities')) {
        console.warn('無法載入活動紀錄，將使用預設里程計算:', err);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [getAthleteId]);

  // 新增保養紀錄
  const addMaintenanceRecord = async (
    record: Omit<BikeMaintenanceRecord, 'id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      const { data, error } = await supabase
        .from('bike_maintenance')
        .insert([record])
        .select()
        .single();

      if (error) throw error;

      setRecords(prev => [...prev, data].sort((a, b) =>
        new Date(b.service_date).getTime() - new Date(a.service_date).getTime()
      ));
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // App Settings CRUD
  const updateAppSetting = async (key: string, value: any) => {
    try {
      const athleteId = getAthleteId();
      if (!athleteId) throw new Error('Athlete ID not found');

      const { data, error } = await supabase
        .from('app_settings')
        .upsert({
          athlete_id: athleteId,
          key,
          value,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'athlete_id,key'
        })
        .select()
        .single();

      if (error) throw error;

      setAppSettings(prev => {
        const remaining = prev.filter(s => s.key !== key);
        return [...remaining, data];
      });
      return data;
    } catch (err: any) {
      console.error('Failed to update app setting', err);
      // Fallback to local state update for UI responsiveness if needed, but preferable to show error
      throw err;
    }
  };

  const getAppSetting = useCallback((key: string): any | null => {
    const setting = appSettings.find(s => s.key === key);
    return setting ? setting.value : null;
  }, [appSettings]);

  // 更新自訂保養里程
  const updateMaintenanceSetting = async (bikeId: string, typeId: string, intervalKm: number) => {
    try {
      const athleteId = getAthleteId();
      if (!athleteId) throw new Error('Athlete ID not found');

      const { data, error } = await supabase
        .from('bike_maintenance_settings')
        .upsert({
          bike_id: bikeId,
          maintenance_type_id: typeId,
          custom_interval_km: intervalKm,
          athlete_id: athleteId
        }, {
          onConflict: 'bike_id,maintenance_type_id'
        })
        .select()
        .single();

      if (error) throw error;

      setSettings(prev => {
        const remaining = prev.filter(s => !(s.bike_id === bikeId && s.maintenance_type_id === typeId));
        return [...remaining, data];
      });
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // 更新壽命設定
  const updateLifespanSetting = async (bikeId: string, typeId: string, lifespanKm?: number, lifespanDays?: number) => {
    try {
      const athleteId = getAthleteId();
      if (!athleteId) throw new Error('Athlete ID not found');

      const { data, error } = await supabase
        .from('bike_lifespan_settings')
        .upsert({
          bike_id: bikeId,
          maintenance_type_id: typeId,
          athlete_id: athleteId,
          lifespan_km: lifespanKm,
          lifespan_days: lifespanDays
        }, {
          onConflict: 'bike_id,maintenance_type_id'
        })
        .select()
        .single();

      if (error) throw error;

      setLifespanSettings(prev => {
        const remaining = prev.filter(s => !(s.bike_id === bikeId && s.maintenance_type_id === typeId));
        return [...remaining, data];
      });
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // 取得特定腳踏車的壽命設定
  const getLifespanSetting = useCallback((bikeId: string, typeId: string): LifespanSetting | undefined => {
    return lifespanSettings.find(s => s.bike_id === bikeId && s.maintenance_type_id === typeId);
  }, [lifespanSettings]);

  // 刪除保養紀錄
  const deleteMaintenanceRecord = async (id: string) => {
    try {
      const { error } = await supabase
        .from('bike_maintenance')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // 更新保養紀錄
  const updateMaintenanceRecord = async (
    id: string,
    updates: Partial<Omit<BikeMaintenanceRecord, 'id' | 'created_at' | 'updated_at'>>
  ) => {
    try {
      const { data, error } = await supabase
        .from('bike_maintenance')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setRecords(prev => prev.map(r => r.id === id ? data : r).sort((a, b) =>
        new Date(b.service_date).getTime() - new Date(a.service_date).getTime()
      ));
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // 更新腳踏車資訊
  const updateBike = async (bikeId: string, updates: {
    brand?: string;
    model?: string;
    groupset_name?: string;
    power_meter?: string;
    shop_name?: string;
    remarks?: string;
    price?: number;
    active_wheelset_id?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('bikes')
        .update(updates)
        .eq('id', bikeId)
        .select()
        .single();

      if (error) throw error;

      setBikes(prev => prev.map(b => b.id === bikeId ? data : b));
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // 取得特定腳踏車的保養紀錄
  const getRecordsByBike = useCallback((bikeId: string) => {
    return records.filter(r => r.bike_id === bikeId);
  }, [records]);

  // 新增：計算兩段日期之間的數據 (User Request: 區間保養數據)
  const calculateMetricsBetweenDates = useCallback((bikeId: string, startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const validActivities = activities.filter(a => {
      if (a.gear_id !== bikeId) return false;
      const activityDate = new Date(a.start_date);
      // 區間定義：(開始日期, 結束日期]
      return activityDate > start && activityDate <= end;
    });

    const totalMeters = validActivities.reduce((sum, a) => sum + a.distance, 0);
    const totalMovingTimeSeconds = validActivities.reduce((sum, a) => sum + (a.moving_time || 0), 0);
    const totalElevationGain = validActivities.reduce((sum, a) => sum + (a.total_elevation_gain || 0), 0);

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return {
      distanceKm: totalMeters / 1000,
      movingTimeHours: totalMovingTimeSeconds / 3600,
      elevationGain: totalElevationGain,
      days: totalDays
    };
  }, [activities, activityWheelsets]);

  // 重構：根據日期從活動紀錄計算里程與時間 (至今)
  const calculateMetricsSinceDate = useCallback((bikeId: string, startDate: string) => {
    const now = new Date().toISOString();
    return calculateMetricsBetweenDates(bikeId, startDate, now);
  }, [calculateMetricsBetweenDates]);

  const calculateMileageSinceDate = useCallback((bikeId: string, startDate: string) => {
    return calculateMetricsSinceDate(bikeId, startDate).distanceKm;
  }, [calculateMetricsSinceDate]);

  // 新增：回推計算特定日期的總里程 (User Request: 保養當下里程)
  const calculateTotalDistanceAtDate = useCallback((bike: StravaBike, targetDate: string) => {
    const currentTotalKm = bike.converted_distance || (bike.distance / 1000);
    const target = new Date(targetDate);

    // 找出 targetDate 之後的所有活動里程
    const laterActivities = activities.filter(a => {
      if (a.gear_id !== bike.id) return false;
      const activityDate = new Date(a.start_date);
      return activityDate > target;
    });

    const accumulatedKmSinceTarget = laterActivities.reduce((sum, a) => sum + a.distance, 0) / 1000;

    // 歷史里程 = 目前總里程 - 從那時到現在累積的里程
    return Math.max(0, currentTotalKm - accumulatedKmSinceTarget);
  }, [activities]);

  // 新增：計算輪組總里程 (初始里程 + 關聯活動里程)
  const calculateWheelsetTotalDistance = useCallback((wheelset: Wheelset) => {
    // 1. 初始里程 (公尺)
    const initialDistance = wheelset.distance || 0;

    // 2. 累計活動里程 (公尺)
    const linkedActivities = activityWheelsets
      .filter(aw => aw.wheelset_id === wheelset.id)
      .map(aw => activities.find(a => a.id === aw.activity_id))
      .filter((a): a is StravaActivity => !!a);

    const activityDistance = linkedActivities.reduce((sum, a) => sum + a.distance, 0);

    // 回傳總里程 (公尺)
    return initialDistance + activityDistance;
  }, [activities, activityWheelsets]);

  // 計算保養提醒
  const getMaintenanceReminders = useCallback((bike: StravaBike): MaintenanceReminder[] => {
    const currentMileageKm = bike.converted_distance || (bike.distance / 1000);
    const bikeRecords = getRecordsByBike(bike.id);
    return maintenanceTypes.map(type => {
      // 檢查是否為輪胎更換，若是則優先查看關聯輪組的最後保養里程
      const isTires = type.id === 'tires';

      // 找出此類型的最後一次保養紀錄
      // 如果是輪胎，則必須符合目前作用中輪組（如果有的話）或是沒有指定輪組的紀錄
      const lastService = bikeRecords.find(r => {
        const types = r.maintenance_type.split(', ').map(t => t.trim());
        const isTypeMatch = types.includes(type.id) ||
          types.includes('full_service') ||
          types.includes('全車保養');

        if (!isTypeMatch) return false;

        // 如果是輪胎更換，且該紀錄有指定輪組，則必須匹配目前單車的作用中輪組
        if (isTires && bike.active_wheelset_id && r.wheelset_id) {
          return r.wheelset_id === bike.active_wheelset_id;
        }

        return true;
      });

      const lastServiceMileage = lastService?.mileage_at_service || 0;
      let calculatedMileageSinceService = 0;
      let calculatedClimbingSinceService = 0;

      // 核心修改 logic: 
      // 如果是輪胎更換且有作用中輪組，我們使用輪組的啟用日期或保養紀錄計算里程
      if (isTires && bike.active_wheelset_id) {
        const activeWheelset = wheelsets.find(ws => ws.id === bike.active_wheelset_id);
        if (activeWheelset) {
          // 優先順序：1. 保養紀錄日期 2. 輪組啟用日期 3. 輪組總里程
          const referenceDate = lastService?.service_date || activeWheelset.active_date;
          if (referenceDate) {
            // 使用參考日期計算從該日期至今的里程，並排除指定給其他輪組的活動
            const metrics = calculateMetricsSinceDate(bike.id, referenceDate);
            calculatedMileageSinceService = metrics.distanceKm;
            calculatedClimbingSinceService = metrics.elevationGain;
          } else {
            // 如果沒有參考日期，則使用輪組本身的累積里程
            calculatedMileageSinceService = activeWheelset.distance / 1000;
          }
        } else {
          // 找不到輪組資訊，回退到單車邏輯
          if (lastService && lastService.service_date) {
            const metrics = calculateMetricsSinceDate(bike.id, lastService.service_date);
            calculatedMileageSinceService = metrics.distanceKm;
            calculatedClimbingSinceService = metrics.elevationGain;
          } else {
            calculatedMileageSinceService = currentMileageKm;
          }
        }
      } else {
        // 非輪胎類型：使用標準的保養紀錄日期計算
        if (lastService && lastService.service_date) {
          const metrics = calculateMetricsSinceDate(bike.id, lastService.service_date);
          calculatedMileageSinceService = metrics.distanceKm;
          calculatedClimbingSinceService = metrics.elevationGain;
        } else {
          // 無保養紀錄，使用單車總里程作為距離
          calculatedMileageSinceService = currentMileageKm;
        }
      }

      // 檢查是否有自訂里程設定 -> 優先順序: 自訂 > 預估(DB) > 預設(DB)
      const setting = settings.find(s => s.bike_id === bike.id && s.maintenance_type_id === type.id);
      const intervalKm = setting?.custom_interval_km || type.estimated_lifespan_km || type.default_interval_km || 1000;

      const climbingLimit = type.climbing_lifespan_m || Infinity;

      // 計算兩種使用率
      const usageByDistance = (calculatedMileageSinceService / intervalKm) * 100;
      const usageByClimbing = climbingLimit !== Infinity ? (calculatedClimbingSinceService / climbingLimit) * 100 : 0;

      // 取最大值作為主要判斷依據
      const percentageUsed = Math.max(usageByDistance, usageByClimbing);

      let status: MaintenanceStatus = 'ok';
      if (percentageUsed >= 100) {
        status = 'overdue';
      } else if (percentageUsed >= 85) {
        status = 'due_soon';
      }

      return {
        type,
        lastService,
        currentMileage: currentMileageKm,
        mileageSinceService: calculatedMileageSinceService,
        nextServiceMileage: lastServiceMileage + intervalKm, // 這是基於里程的預估
        status,
        percentageUsed,
        climbingSinceService: calculatedClimbingSinceService,
        usageByClimbing
      };
    });
  }, [maintenanceTypes, getRecordsByBike, calculateMetricsSinceDate, settings, wheelsets, calculateMetricsBetweenDates]); // 已修正依賴項

  // 取得需要注意的保養項目數量
  const getAlertCount = useCallback((bike: StravaBike): { dueSoon: number; overdue: number } => {
    const reminders = getMaintenanceReminders(bike);
    return {
      dueSoon: reminders.filter(r => r.status === 'due_soon').length,
      overdue: reminders.filter(r => r.status === 'overdue').length
    };
  }, [getMaintenanceReminders]);

  useEffect(() => {
    fetchData();

    // 監聽來自 StravaConnect 的登入狀態變更事件
    const handleAuthChange = () => {
      console.log('useMaintenance: 偵測到登入狀態變更，重新載入資料...');
      fetchData();
    };

    window.addEventListener('strava-auth-changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    return () => {
      window.removeEventListener('strava-auth-changed', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, [fetchData]);

  // Wheelset CRUD (省略，保持不變)
  const addWheelset = async (wheelset: Omit<Wheelset, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase.from('wheelsets').insert([wheelset]).select().single();
      if (error) throw error;
      setWheelsets(prev => [data, ...prev]);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateWheelset = async (id: string, updates: Partial<Wheelset>) => {
    try {
      const { data, error } = await supabase.from('wheelsets').update(updates).eq('id', id).select().single();
      if (error) throw error;
      setWheelsets(prev => prev.map(w => (w.id === id ? data : w)));
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const deleteWheelset = async (id: string) => {
    try {
      const { error } = await supabase.from('wheelsets').delete().eq('id', id);
      if (error) throw error;
      setWheelsets(prev => prev.filter(w => w.id !== id));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // 活動輪組關聯 CRUD
  const setActivityWheelsetForActivity = async (activityId: number, wheelsetId: string) => {
    const athleteId = getAthleteId();
    if (!athleteId) throw new Error('未登入');

    try {
      // 使用 upsert 來新增或更新
      const { data, error } = await supabase
        .from('activity_wheelset')
        .upsert({
          activity_id: activityId,
          wheelset_id: wheelsetId,
          athlete_id: parseInt(athleteId)
        }, { onConflict: 'activity_id,athlete_id' })
        .select()
        .single();

      if (error) throw error;

      // 更新本地狀態
      setActivityWheelsets(prev => {
        const existing = prev.find(aw => aw.activity_id === activityId);
        if (existing) {
          return prev.map(aw => aw.activity_id === activityId ? data : aw);
        }
        return [...prev, data];
      });

      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // 批量活動輪組關聯 CRUD
  const batchSetActivityWheelsets = async (activitiesData: { activityId: number, wheelsetId: string }[]) => {
    const athleteId = getAthleteId();
    if (!athleteId) throw new Error('未登入');

    try {
      const upsertData = activitiesData.map(item => ({
        activity_id: item.activityId,
        wheelset_id: item.wheelsetId,
        athlete_id: parseInt(athleteId)
      }));

      const { data, error } = await supabase
        .from('activity_wheelset')
        .upsert(upsertData, { onConflict: 'activity_id,athlete_id' })
        .select();

      if (error) throw error;

      // 更新本地狀態
      setActivityWheelsets(prev => {
        const newData = [...prev];
        (data as ActivityWheelset[]).forEach(item => {
          const idx = newData.findIndex(aw => aw.activity_id === item.activity_id);
          if (idx > -1) {
            newData[idx] = item;
          } else {
            newData.push(item);
          }
        });
        return newData;
      });

      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const getActivityWheelset = useCallback((activityId: number) => {
    return activityWheelsets.find(aw => aw.activity_id === activityId);
  }, [activityWheelsets]);

  const removeActivityWheelset = async (activityId: number) => {
    const athleteId = getAthleteId();
    if (!athleteId) throw new Error('未登入');

    try {
      const { error } = await supabase
        .from('activity_wheelset')
        .delete()
        .eq('activity_id', activityId)
        .eq('athlete_id', athleteId);

      if (error) throw error;

      setActivityWheelsets(prev => prev.filter(aw => aw.activity_id !== activityId));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return {
    bikes,
    wheelsets,
    maintenanceTypes,
    records,
    loading,
    error,
    addMaintenanceRecord,
    deleteMaintenanceRecord,
    updateMaintenanceRecord,
    updateMaintenanceSetting,
    updateBike,
    addWheelset,
    updateWheelset,
    deleteWheelset,
    getRecordsByBike,
    getMaintenanceReminders,
    getAlertCount,
    calculateMetricsSinceDate,
    calculateMetricsBetweenDates,
    calculateTotalDistanceAtDate,
    calculateWheelsetTotalDistance,
    refresh: fetchData,
    updateAppSetting,
    getAppSetting,
    appSettings,
    lifespanSettings,
    updateLifespanSetting,
    getLifespanSetting,
    activities,
    // 活動輪組關聯
    activityWheelsets,
    setActivityWheelsetForActivity,
    batchSetActivityWheelsets,
    isBatchUpdating,
    setIsBatchUpdating,
    getActivityWheelset,
    removeActivityWheelset
  };
};

export type UseMaintenanceReturn = ReturnType<typeof useMaintenance>;
