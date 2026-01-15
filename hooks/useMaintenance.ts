import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Vehicle, MaintenanceRecord } from '../types';

export const useMaintenance = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      // 改為從 localStorage 獲取 Strava 資訊
      const savedData = localStorage.getItem('strava_athlete_meta');
      if (!savedData) throw new Error('尚未連結 Strava：請先在首頁連結您的 Strava 帳號');

      const athlete = JSON.parse(savedData);
      const athleteId = athlete.id;

      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          maintenance_records (*)
        `)
        .eq('strava_athlete_id', athleteId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addVehicle = async (vehicle: Omit<Vehicle, 'id' | 'user_id' | 'created_at'>) => {
    try {
      const savedData = localStorage.getItem('strava_athlete_meta');
      if (!savedData) throw new Error('尚未連結 Strava');

      const athlete = JSON.parse(savedData);
      const athleteId = athlete.id;

      const { data, error } = await supabase
        .from('vehicles')
        .insert([{
          ...vehicle,
          strava_athlete_id: athleteId
        }])
        .select()
        .single();

      if (error) throw error;
      setVehicles([data, ...vehicles]);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const addMaintenanceRecord = async (record: Omit<MaintenanceRecord, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('maintenance_records')
        .insert([record])
        .select()
        .single();

      if (error) throw error;

      // 更新本地狀態中的車輛記錄
      setVehicles(prev => prev.map(v =>
        v.id === record.vehicle_id
          ? { ...v, maintenance_records: [data, ...(v.maintenance_records || [])] }
          : v
      ));

      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  return {
    vehicles,
    loading,
    error,
    addVehicle,
    addMaintenanceRecord,
    refresh: fetchVehicles
  };
};
