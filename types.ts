
export enum ViewType {
  LANDING = 'LANDING',
  DASHBOARD = 'DASHBOARD',
  LEADERBOARD = 'LEADERBOARD',
}

export enum RaceStatus {
  AWAITING = 'AWAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  FINISHED = 'FINISHED',
}

export interface Participant {
  id: number;
  rank: number;
  name: string;
  avatar: string;
  bike: string;
  time: string;
  speed: string;
  avg_power?: string;
  heart_rate?: string;
  cadence?: string;
  distance_completed?: string;
  date: string;
}

export interface Activity {
  id: number;
  title: string;
  date: string;
  power: string;
  time: string;
  is_pr?: boolean;
}

export interface SegmentStats {
  distance: string;
  grade: string;
  ascent: string;
}
