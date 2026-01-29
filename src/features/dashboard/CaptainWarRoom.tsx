
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Activity, Calendar, Clock, MapPin, Zap, ExternalLink, Heart, Gauge, User } from 'lucide-react';

interface ActivityData {
    id: number;
    athlete_id: number;
    name: string;
    distance: number;
    moving_time: number;
    total_elevation_gain: number;
    type: string;
    start_date: string;
    average_watts: number;
    suffer_score: number;
    average_heartrate?: number;
}

interface TeamMember {
    member_id: string; // Strava ID as string
    real_name: string;
    nickname?: string;
    strava_id?: string;
    member_type?: string;
}

interface Props {
    members: any[]; // Passed from parent to link names
}

// Combined data structure for list
interface WarRoomEntry {
    member: any;
    activity?: ActivityData;
}

const CaptainWarRoom: React.FC<Props> = ({ members }) => {
    const [entries, setEntries] = useState<WarRoomEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLatestActivities();
    }, [members]);

    const fetchLatestActivities = async () => {
        try {
            setLoading(true);

            // Get all member Strava IDs
            // Ensure we have IDs to query
            const memberIds = members.map(m => Number(m.member_id || m.strava_id)).filter(Boolean);

            const latestMap = new Map<number, ActivityData>();

            if (memberIds.length > 0) {
                // Fetch latest activity for each member from our new table
                // Fetch last 100 activities for these athletes
                const { data, error } = await supabase
                    .from('strava_activities')
                    .select('*')
                    .in('athlete_id', memberIds)
                    .order('start_date', { ascending: false })
                    .limit(100);

                if (error) throw error;

                // Process to get only the LATEST for each person
                data?.forEach((act: any) => {
                    if (!latestMap.has(act.athlete_id)) {
                        latestMap.set(act.athlete_id, act);
                    }
                });
            }

            // Combine members with their latest activity
            const combinedEntries: WarRoomEntry[] = members.map(member => {
                const stravaId = Number(member.member_id || member.strava_id);
                const activity = latestMap.get(stravaId);
                return {
                    member,
                    activity
                };
            });

            // Sort logic:
            // 1. Members with Activity come first, sorted by date DESC
            // 2. Members without Activity come last
            combinedEntries.sort((a, b) => {
                if (a.activity && b.activity) {
                    return new Date(b.activity.start_date).getTime() - new Date(a.activity.start_date).getTime();
                }
                if (a.activity) return -1;
                if (b.activity) return 1;
                return 0;
            });

            setEntries(combinedEntries);

        } catch (err) {
            console.error('Error fetching war room data:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    if (loading) {
        return <div className="py-12 text-center text-slate-400">載入戰情室數據中...</div>;
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-red-100 dark:border-red-900/30 overflow-hidden shadow-2xl shadow-red-900/10">
            <div className="p-6 border-b border-red-100 dark:border-red-900/30 bg-gradient-to-r from-red-50 to-white dark:from-red-950/30 dark:to-slate-900 relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3"></div>

                <h2 className="relative z-10 text-2xl font-black uppercase italic tracking-tighter text-red-600 dark:text-red-500 flex items-center gap-3">
                    <div className="p-2 bg-red-600 text-white rounded-lg shadow-lg shadow-red-600/20">
                        <Activity className="w-6 h-6" />
                    </div>
                    WAR ROOM // 隊長戰情室
                </h2>
                <p className="relative z-10 text-sm font-bold text-red-400/80 mt-2 uppercase tracking-widest pl-14">
                    LIVE COMBAT STATUS • 即時戰力分析 ({entries.length} 位隊員)
                </p>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50">
                            <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">隊員</th>
                            <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">最新活動日期</th>
                            <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">活動標題</th>
                            <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider text-slate-500">數據</th>
                            <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider text-slate-500">強度</th>
                            <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider text-slate-500">連結</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {entries.length > 0 ? entries.map(({ member, activity }) => (
                            <tr key={member.tcu_id || member.strava_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                {/* Member */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        {member.avatar ? (
                                            <img src={member.avatar} alt={member.real_name} className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                <User className="w-4 h-4 text-slate-400" />
                                            </div>
                                        )}
                                        <div>
                                            <div className="font-bold text-slate-900 dark:text-white">
                                                {member.real_name || "Unknown"}
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                {member.member_type || "隊員"}
                                            </div>
                                        </div>
                                    </div>
                                </td>

                                {/* Date */}
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {activity ? (
                                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm font-medium">
                                            <Calendar className="w-4 h-4 text-slate-400" />
                                            {new Date(activity.start_date).toLocaleDateString()}
                                            <span className="text-xs text-slate-400">
                                                {new Date(activity.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-slate-400 italic">無近期紀錄</span>
                                    )}
                                </td>

                                {/* Title & Type */}
                                <td className="px-6 py-4">
                                    {activity ? (
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1 group-hover:text-tcu-blue transition-colors">
                                                {activity.name}
                                            </span>
                                            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                                                {activity.type}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-slate-300 dark:text-slate-700">-</span>
                                    )}
                                </td>

                                {/* Stats */}
                                <td className="px-6 py-4">
                                    {activity ? (
                                        <div className="flex items-center justify-center gap-4 text-xs">
                                            <span className="flex flex-col items-center gap-1" title="距離">
                                                <span className="font-black text-slate-700 dark:text-slate-300">{(activity.distance / 1000).toFixed(1)} km</span>
                                                <span className="text-[10px] text-slate-400 uppercase">Dist</span>
                                            </span>
                                            <span className="flex flex-col items-center gap-1" title="爬升">
                                                <span className="font-black text-slate-700 dark:text-slate-300">{Math.round(activity.total_elevation_gain)} m</span>
                                                <span className="text-[10px] text-slate-400 uppercase">Elev</span>
                                            </span>
                                            <span className="flex flex-col items-center gap-1" title="時間">
                                                <span className="font-black text-slate-700 dark:text-slate-300">{formatDuration(activity.moving_time)}</span>
                                                <span className="text-[10px] text-slate-400 uppercase">Time</span>
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="text-center text-slate-300 dark:text-slate-700">-</div>
                                    )}
                                </td>

                                {/* Intensity */}
                                <td className="px-6 py-4">
                                    {activity ? (
                                        <div className="flex items-center justify-center gap-3">
                                            {activity.average_watts > 0 && (
                                                <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 rounded text-amber-600 text-xs font-bold">
                                                    <Zap className="w-3 h-3" />
                                                    {Math.round(activity.average_watts)}w
                                                </div>
                                            )}
                                            {activity.average_heartrate && (
                                                <div className="flex items-center gap-1 px-2 py-1 bg-rose-500/10 rounded text-rose-600 text-xs font-bold">
                                                    <Heart className="w-3 h-3" />
                                                    {Math.round(activity.average_heartrate)}bpm
                                                </div>
                                            )}
                                            {activity.suffer_score && (
                                                <div className="flex items-center gap-1 px-2 py-1 bg-red-600/10 rounded text-red-600 text-xs font-black" title="Suffer Score">
                                                    <Gauge className="w-3 h-3" />
                                                    {activity.suffer_score}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center text-slate-300 dark:text-slate-700">-</div>
                                    )}
                                </td>

                                {/* Link */}
                                <td className="px-6 py-4 text-center">
                                    {activity ? (
                                        <a
                                            href={`https://www.strava.com/activities/${activity.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-orange-500 hover:text-white text-slate-400 transition-all"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    ) : (
                                        <span className="text-slate-300 dark:text-slate-700">-</span>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                                    尚無隊員資料
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CaptainWarRoom;
