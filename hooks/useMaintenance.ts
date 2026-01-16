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
  // 關聯資料
  maintenance_type_info?: MaintenanceType;
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

      // 並行載入腳踏車、保養類型、保養紀錄
      const [bikesResult, typesResult, recordsResult] = await Promise.all([
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
          .order('service_date', { ascending: false })
      ]);

      if (bikesResult.error) throw bikesResult.error;
      if (typesResult.error) throw typesResult.error;
      if (recordsResult.error) throw recordsResult.error;

      setBikes(bikesResult.data || []);
      setMaintenanceTypes(typesResult.data || []);
      setRecords(recordsResult.data || []);
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

      const { status, percentageUsed, mileageSinceService } = calculateMaintenanceStatus(
        currentMileageKm,
        lastServiceMileage,
        type.default_interval_km
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
    getRecordsByBike,
    getMaintenanceReminders,
    getAlertCount,
    refresh: fetchData
  };
};
