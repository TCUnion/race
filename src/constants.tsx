
import { Participant, Activity } from './types';

export const MOCK_LEADERBOARD: Participant[] = [
  {
    id: 1,
    rank: 1,
    name: 'Chen Wei-Ting',
    avatar: 'https://picsum.photos/seed/rider1/100/100',
    bike: 'Cannondale SuperSix EVO',
    time: '32:15',
    speed: '28.2 KM/H',
    date: '2023/10/25',
  },
  {
    id: 2,
    rank: 2,
    name: 'Lin Joshua',
    avatar: 'https://picsum.photos/seed/rider2/100/100',
    bike: 'Giant TCR Advanced',
    time: '33:42',
    speed: '27.0 KM/H',
    date: '2023/10/24',
  },
  {
    id: 3,
    rank: 3,
    name: 'Sarah Huang',
    avatar: 'https://picsum.photos/seed/rider3/100/100',
    bike: 'Specialized Tarmac',
    time: '34:05',
    speed: '26.7 KM/H',
    date: '2023/10/26',
  }
];

export const MOCK_ACTIVITIES: Activity[] = [
  {
    id: 101,
    title: 'Morning Ascent Zwift',
    date: '2023年10月24日 • 10:15 AM',
    power: '285 W',
    time: '42:15',
    is_pr: true,
  },
  {
    id: 102,
    title: 'Recovery Ride',
    date: '2023年10月22日 • 04:30 PM',
    power: '210 W',
    time: '48:50',
  }
];


export const MOCK_SEGMENT_STATS = {
  distance: '12.2 km',
  grade: '8.5%',
  ascent: '1,036 m'
};
