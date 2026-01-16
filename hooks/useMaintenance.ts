import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Strava 腳踏車型別（對應 bikes 表）
export interface StravaBike {
  id: string;
  athlete_id: number;
  name: string;
  nickname?: string;
  primary_gear: boolean;
  retired: boolean;
  distance: number; // 累計里程（公尺）
  converted_distance: number; // 累計里程（公里）
  updated_at: string;
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
  athlete_id: number;
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
  // 關聯資料
  maintenance_type_info?: MaintenanceType;
}

// 自訂保養里程設定（對應 bike_maintenance_settings 表）
export interface MaintenanceSetting {
  id: string;
  bike_id: string;
  maintenance_type_id: string;
  custom_interval_km: number;
  athlete_id: number;
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
  const [maintenanceTypes, setMaintenanceTypes] = useState<MaintenanceType[]>([]);
  const [records, setRecords] = useState<BikeMaintenanceRecord[]>([]);
  const [settings, setSettings] = useState<MaintenanceSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 取得 athlete_id
  const getAthleteId = useCallback((): number | null => {
    const savedData = localStorage.getItem('strava_athlete_meta');
    if (!savedData) return null;
    const athlete = JSON.parse(savedData);
    return Number(athlete.id);
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
      const [bikesResult, typesResult, recordsResult, settingsResult] = await Promise.all([
        supabase
          .from('bikes')
          .select('*')
          .eq('athlete_id', athleteId)
          .eq('retired', false)
          .order('primary_gear', { ascending: false }),
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
      if (typesResult.error) throw typesResult.error;
      if (recordsResult.error) throw recordsResult.error;
      if (settingsResult.error) throw settingsResult.error;

      setBikes(bikesResult.data || []);
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
      const lastService = bikeRecords.find(r => r.maintenance_type === type.id);
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
  }, [fetchData]);

  return {
    bikes,
    maintenanceTypes,
    records,
    loading,
    error,
    addMaintenanceRecord,
    deleteMaintenanceRecord,
    updateMaintenanceSetting,
    getRecordsByBike,
    getMaintenanceReminders,
    getAlertCount,
    refresh: fetchData
  };
};
