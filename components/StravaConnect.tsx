import React from 'react';
import { useStravaAuth } from '../hooks/useStravaAuth';

const StravaConnect: React.FC = () => {
    const { athlete, isLoading, handleConnect, handleDisconnect } = useStravaAuth();

    if (athlete) {
        return (
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="relative">
                        <img
                            src={athlete.profile_medium || athlete.profile || "https://www.strava.com/assets/users/placeholder_athlete.png"}
                            alt="Profile"
                            className="w-12 h-12 rounded-full border-2 border-strava-orange shadow-sm"
                        />
                        <div className="absolute -bottom-1 -right-1 bg-strava-orange text-white rounded-full p-0.5 shadow-sm">
                            <span className="material-symbols-outlined text-[12px] block">check</span>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-slate-900 dark:text-white font-black text-sm uppercase truncate">
                            {athlete.firstname} {athlete.lastname}
                        </h4>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                            Athlete ID: {athlete.id}
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleDisconnect}
                    className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors"
                >
                    中斷連結
                </button>
                <div className="flex justify-center">
                    <img
                        src="https://status.criterium.tw/logo_pwrdBy_strava_horiz_orange.png"
                        alt="Powered by Strava"
                        className="h-6 opacity-80"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <button
                onClick={handleConnect}
                disabled={isLoading}
                className={`w-full flex items-center justify-center gap-3 bg-strava-orange text-white py-4 px-6 rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
            >
                {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                    <span className="material-symbols-outlined">sync</span>
                )}
                <span className="text-sm font-black uppercase tracking-wider">
                    {isLoading ? '授權中...' : 'Connect with Strava'}
                </span>
            </button>

            <div className="flex justify-center">
                <img
                    src="https://status.criterium.tw/logo_pwrdBy_strava_horiz_orange.png"
                    alt="Powered by Strava"
                    className="h-8"
                />
            </div>
        </div>
    );
};

export default StravaConnect;


