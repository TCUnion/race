
export enum ViewType {
  LANDING = 'LANDING',
  DASHBOARD = 'DASHBOARD',
  LEADERBOARD = 'LEADERBOARD',
}

export interface Participant {
  id: number;
  rank: number;
  name: string;
  avatar: string;
  bike: string;
  time: string;
  speed: string;
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
