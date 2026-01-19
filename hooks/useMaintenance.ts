
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
}

// 保養類型（對應 maintenance_types 表）
export interface MaintenanceType {
  id: string;
  name: string;
  description?: string;
  default_interval_km: number;
  icon?: string;
  sort_order: number;
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

export const useMaintenance = () => {
  const [bikes, setBikes] = useState<StravaBike[]>([]);
  const [wheelsets, setWheelsets] = useState<Wheelset[]>([]);
  const [maintenanceTypes, setMaintenanceTypes] = useState<MaintenanceType[]>([]);
  const [records, setRecords] = useState<BikeMaintenanceRecord[]>([]);
  const [settings, setSettings] = useState<MaintenanceSetting[]>([]);
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

      // 並行載入腳踏車、保養類型、保養紀錄、自訂設定、活動紀錄
      const [bikesResult, wheelsetsResult, typesResult, recordsResult, settingsResult, activitiesResult] = await Promise.all([
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
          .select('id, athlete_id, name, distance, moving_time, start_date, gear_id')
          .eq('athlete_id', athleteId)
          // 抓取過去 365 天的資料
          .gte('start_date', new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString())
          .order('start_date', { ascending: false })
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

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return {
      distanceKm: totalMeters / 1000,
      movingTimeHours: totalMovingTimeSeconds / 3600,
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
        const isTypeMatch = r.maintenance_type === type.id ||
          r.maintenance_type.includes(type.id) ||
          r.maintenance_type.includes('全車保養');

        if (!isTypeMatch) return false;

        // 如果是輪胎更換，且該紀錄有指定輪組，則必須匹配目前單車的作用中輪組
        if (isTires && bike.active_wheelset_id && r.wheelset_id) {
          return r.wheelset_id === bike.active_wheelset_id;
        }

        return true;
      });

      const lastServiceMileage = lastService?.mileage_at_service || 0;
      let calculatedMileageSinceService = 0;

      // 核心修改 logic: 
      // 如果是輪胎更換且有作用中輪組，我們使用輪組的累積里程
      if (isTires && bike.active_wheelset_id) {
        const activeWheelset = wheelsets.find(ws => ws.id === bike.active_wheelset_id);
        if (activeWheelset) {
          if (lastService && lastService.service_date) {
            // 計算該輪組自上次保養日期以後的里程增量
            // 注意：這裡假設活動紀錄中有記錄輪組 ID 或者我們能推算出來。
            // 目前系統活動紀錄只記了 bike_id。
            // 但我們可以推算：在該日期之後，且該單車 active_wheelset_id 為此輪組時的里程。
            // 簡化起見：我們假設輪胎保養是跟隨「輪組」的。
            // 如果 lastService 有記錄當時的輪組里程，最準確。
            // 但目前 `mileage_at_service` 存的是單車里程。

            // 方案：我們改用 calculateMetricsSinceDate，但邏輯不變，因為輪胎里程通常跟隨輪組。
            // 如果使用者換了輪組，新輪組的里程應該從 0 開始算起。
            // 這裡我們暫時維持使用活動紀錄推算（假設該段時間都是用這個輪組）。
            calculatedMileageSinceService = calculateMileageSinceDate(bike.id, lastService.service_date);
          } else {
            // 如果沒有保養紀錄，則使用輪組本身的累積里程
            calculatedMileageSinceService = activeWheelset.distance / 1000;
          }
        } else {
          // 找不到輪組資訊，回退到單車邏輯
          calculatedMileageSinceService = lastService && lastService.service_date
            ? calculateMileageSinceDate(bike.id, lastService.service_date)
            : currentMileageKm;
        }
      } else {
        // 非輪胎更換，維持原有邏輯
        calculatedMileageSinceService = lastService && lastService.service_date
          ? calculateMileageSinceDate(bike.id, lastService.service_date)
          : currentMileageKm;
      }

      // 檢查是否有自訂里程設定
      const setting = settings.find(s => s.bike_id === bike.id && s.maintenance_type_id === type.id);
      const intervalKm = setting ? setting.custom_interval_km : type.default_interval_km;

      const { status, percentageUsed } = calculateMaintenanceStatus(
        calculatedMileageSinceService,
        0,
        intervalKm
      );

      return {
        type,
        lastService,
        currentMileage: currentMileageKm, // 雖然我們用了動態計算，但顯示目前總里程還是保持原樣較好
        mileageSinceService: calculatedMileageSinceService, // 這是實際顯示在 UI "距上次保養" 的數值
        nextServiceMileage: lastServiceMileage + intervalKm, // 這是推估的下次保養總里程點
        status,
        percentageUsed
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
    refresh: fetchData
  };
};
