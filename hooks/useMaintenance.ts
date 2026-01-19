
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Wheelset } from '../types';

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
export interface StravaActivity {
  id: number;
  athlete_id: number;
  name: string;
  distance: number;
  moving_time: number; // 使用秒
  start_date: string;
  gear_id: string; // 對應 bikes.id
  total_elevation_gain: number; // 總爬升 (公尺)
}

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
  const [appSettings, setAppSettings] = useState<AppSetting[]>([]); // New state for app settings
  const [activities, setActivities] = useState<StravaActivity[]>([]); // 新增活動資料狀態
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBikeId, setSelectedBikeId] = useState<string | null>(null);

  // 取得 athlete_id
  const getAthleteId = useCallback((): string | null => {
    const savedData = localStorage.getItem('strava_athlete_meta');
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

      // 並行載入腳踏車、保養類型、保養紀錄、自訂設定、活動紀錄、App設定
      const [bikesResult, wheelsetsResult, typesResult, recordsResult, settingsResult, activitiesResult, appSettingsResult] = await Promise.all([
        supabase
          .from('bikes')
          .select('*')
          .eq('athlete_id', athleteId)
          .eq('retired', false)
          .order('primary_gear', { ascending: false }),
        supabase
          .from('wheelsets')
          .select('*')
          .eq('athlete_id', athleteId),
        supabase
          .from('maintenance_types')
          .select('*')
          .order('sort_order'),
        supabase
          .from('bike_maintenance')
          .select('*')
          .eq('athlete_id', athleteId)
          .order('service_date', { ascending: false }),
        supabase
          .from('bike_maintenance_settings')
          .select('*')
          .eq('athlete_id', athleteId),
        // 載入最近一年的活動紀錄用於計算里程
        supabase
          .from('strava_activities')
          .select('id, athlete_id, name, distance, moving_time, start_date, gear_id, total_elevation_gain')
          .eq('athlete_id', athleteId)
          // 抓取過去 365 天的資料
          .gte('start_date', new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString())
          .order('start_date', { ascending: false }),
        supabase
          .from('app_settings')
          .select('*')
          .eq('athlete_id', athleteId)
      ]);

      if (bikesResult.error) throw bikesResult.error;
      if (wheelsetsResult.error) throw wheelsetsResult.error;
      if (typesResult.error) throw typesResult.error;
      if (recordsResult.error) throw recordsResult.error;
      if (settingsResult.error) throw settingsResult.error;
      if (activitiesResult.error) throw activitiesResult.error;

      setBikes(bikesResult.data || []);
      setWheelsets(wheelsetsResult.data || []);
      setMaintenanceTypes(typesResult.data || []);
      setRecords(recordsResult.data || []);
      setSettings(settingsResult.data || []);
      setActivities(activitiesResult.data || []);
      setAppSettings(appSettingsResult.data || []);
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
  }, [activities]);

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
      // 如果是輪胎更換且有作用中輪組，我們使用輪組的累積里程
      if (isTires && bike.active_wheelset_id) {
        const activeWheelset = wheelsets.find(ws => ws.id === bike.active_wheelset_id);
        if (activeWheelset) {
          if (lastService && lastService.service_date) {
            // 使用日期推算
            const metrics = calculateMetricsSinceDate(bike.id, lastService.service_date);
            calculatedMileageSinceService = metrics.distanceKm;
            calculatedClimbingSinceService = metrics.elevationGain;
          } else {
            // 如果沒有保養紀錄，則使用輪組本身的累積里程 (輪組爬升暫時無法從 wheelsets 表取得，設為 0 或需擴充 DB)
            calculatedMileageSinceService = activeWheelset.distance / 1000;
            // calculatedClimbingSinceService = 0; // 暫不支援輪組獨立爬升追蹤 Without DB change
            // 為了避免誤差，暫時用該單車近期活動推算 (雖不精確但比 0 好) 
            // 但如果輪組剛換上？
            // 這裡先保持 0，後續可考慮擴充 wheelsets table
          }
        } else {
          // 找不到輪組資訊，回退到單車邏輯
          if (lastService && lastService.service_date) {
            const metrics = calculateMetricsSinceDate(bike.id, lastService.service_date);
            calculatedMileageSinceService = metrics.distanceKm;
            calculatedClimbingSinceService = metrics.elevationGain;
          } else {
            calculatedMileageSinceService = currentMileageKm;
            // 這裡無法得知單車總爬升 (因為 bikes 表沒存)，所以僅能從活動紀錄抓，若無活動紀錄則為 0
            // 但通常會有 lastService，若無，則是新車?
            // 實務上：total elevation gain of bike is needed if no service record. 
            // But we only have activities for 1 year. 
            // So if no service record, we likely can't calc full climbing lifetime.
          }
        }
      } else {
        // 非輪胎更換，維持原有邏輯
        if (lastService && lastService.service_date) {
          const metrics = calculateMetricsSinceDate(bike.id, lastService.service_date);
          calculatedMileageSinceService = metrics.distanceKm;
          calculatedClimbingSinceService = metrics.elevationGain;
        } else {
          calculatedMileageSinceService = currentMileageKm;
          // 同上，無 lastService 時無法準確得知 total climbing
        }
      }

      // 檢查是否有自訂里程設定 -> 優先順序: 自訂 > 預估(DB) > 預設(DB)
      const setting = settings.find(s => s.bike_id === bike.id && s.maintenance_type_id === type.id);
      const intervalKm = setting ? setting.custom_interval_km : (type.estimated_lifespan_km || type.default_interval_km);

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
  }, [maintenanceTypes, getRecordsByBike, calculateMileageSinceDate, settings]); // added dependencies

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
    refresh: fetchData,
    updateAppSetting,
    getAppSetting,
    appSettings
  };
};
