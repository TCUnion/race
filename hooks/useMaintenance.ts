
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

      // 並行載入腳踏車、保養類型、保養紀錄、自訂設定
      const [bikesResult, wheelsetsResult, typesResult, recordsResult, settingsResult] = await Promise.all([
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
          .eq('athlete_id', athleteId)
      ]);

      if (bikesResult.error) throw bikesResult.error;
      if (wheelsetsResult.error) throw wheelsetsResult.error;
      if (typesResult.error) throw typesResult.error;
      if (recordsResult.error) throw recordsResult.error;
      if (settingsResult.error) throw settingsResult.error;

      setBikes(bikesResult.data || []);
      setWheelsets(wheelsetsResult.data || []);
      setMaintenanceTypes(typesResult.data || []);
      setRecords(recordsResult.data || []);
      setSettings(settingsResult.data || []);
    } catch (err: any) {
      console.error('載入保養資料失敗:', err);
      setError(err.message);
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

      setRecords(prev => [data, ...prev]);
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

      setRecords(prev => prev.map(r => r.id === id ? data : r));
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

  // 計算保養提醒
  const getMaintenanceReminders = useCallback((bike: StravaBike): MaintenanceReminder[] => {
    const currentMileageKm = bike.converted_distance || (bike.distance / 1000);
    const bikeRecords = getRecordsByBike(bike.id);

    return maintenanceTypes.map(type => {
      // 找到此類型的最後一次保養紀錄
      const lastService = bikeRecords.find(r =>
        r.maintenance_type === type.id ||
        r.maintenance_type.includes(type.id) ||
        r.maintenance_type.includes('全車保養')
      );
      const lastServiceMileage = lastService?.mileage_at_service || 0;

      // 檢查是否有自訂里程設定
      const setting = settings.find(s => s.bike_id === bike.id && s.maintenance_type_id === type.id);
      const intervalKm = setting ? setting.custom_interval_km : type.default_interval_km;

      const { status, percentageUsed, mileageSinceService } = calculateMaintenanceStatus(
        currentMileageKm,
        lastServiceMileage,
        intervalKm
      );

      return {
        type,
        lastService,
        currentMileage: currentMileageKm,
        mileageSinceService,
        nextServiceMileage: lastServiceMileage + type.default_interval_km,
        status,
        percentageUsed
      };
    });
  }, [maintenanceTypes, getRecordsByBike]);

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



  // Wheelset CRUD
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
    refresh: fetchData
  };
};

