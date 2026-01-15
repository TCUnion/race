
export enum ViewType {
  LANDING = 'LANDING',
  DASHBOARD = 'DASHBOARD',
  LEADERBOARD = 'LEADERBOARD',
  ADMIN = 'ADMIN',
  REGISTER = 'REGISTER',
  MAINTENANCE = 'MAINTENANCE',
}

export enum RaceStatus {
  AWAITING = 'AWAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  FINISHED = 'FINISHED',
}

export interface Participant {
  id: number | string;
  rank: number;
  name: string;
  avatar: string;
  bike?: string;
  team?: string;
  tcu_id?: string;
  number?: string;
  time: string;
  time_seconds?: number;
  speed: string;
  speed_kmh?: number;
  avg_power?: string;
  avg_power_value?: number;
  heart_rate?: string;
  heart_rate_avg?: number;
  cadence?: string;
  distance_completed?: string;
  distance_meters?: number;
  date: string;
  strava_activity_id?: string | number;
}

export interface Activity {
  id: number | string;
  title: string;
  date: string;
  power: string;
  time: string;
  is_pr?: boolean;
}

export interface SegmentData {
  id: number | string;
  name: string;
  activity_type: string;
  distance: number;
  average_grade: number;
  maximum_grade: number;
  elevation_high: number;
  elevation_low: number;
  map?: {
    polyline: string;
  };
  start_date?: string;
  end_date?: string;
}

export interface LeaderboardStats {
  total_athletes: number;
  completed_athletes: number;
  best_time: string;
  avg_time: string;
  max_power: number;
  avg_speed: number;
}

export interface LeaderboardResponse {
  leaderboard: Participant[];
  stats: LeaderboardStats;
  segment: SegmentData;
  last_updated: string;
}

export interface MaintenanceItem {
  id?: string;
  name: string;
  cost: number;
  note?: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicle_id: string;
  date: string;
  mileage: number;
  total_cost: number;
  description: string;
  service_type: 'Shop' | 'DIY';
  items: MaintenanceItem[];
  created_at: string;
}

export interface Vehicle {
  id: string;
  user_id: string;
  brand: string;
  model: string;
  year?: number;
  transmission?: string;
  initial_mileage: number;
  current_mileage: number;
  created_at: string;
  maintenance_records?: MaintenanceRecord[];
}
