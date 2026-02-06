import { useAuthContext } from '../contexts/AuthContext';
export type { StravaAthlete } from '../contexts/AuthContext';

/**
 * useAuth Hook 現在只是 AuthContext 的封裝。
 * 這樣可以確保所有呼叫 useAuth 的組件共享相同的狀態。
 */
export const useAuth = () => {
    return useAuthContext();
};
