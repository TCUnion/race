
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface WeeklyStats {
    weeklyTSS: number;
    weeklyDistance: number;
    weeklyTime: number;
    activityCount: number;
}

export const useWeeklyStats = (athleteId: number | undefined, ftp: number | undefined) => {
    const [stats, setStats] = useState<WeeklyStats>({
        weeklyTSS: 0,
        weeklyDistance: 0,
        weeklyTime: 0,
        activityCount: 0
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!athleteId) {
            setStats({ weeklyTSS: 0, weeklyDistance: 0, weeklyTime: 0, activityCount: 0 });
            return;
        }

        const fetchWeeklyStats = async () => {
            setLoading(true);
            try {
                // Get start of week (Monday) in local time
                const now = new Date();
                const day = now.getDay();
                const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
                const monday = new Date(now.setDate(diff));
                monday.setHours(0, 0, 0, 0);

                const { data, error } = await supabase
                    .from('strava_activities')
                    .select('distance, moving_time, elapsed_time, weighted_average_watts, average_watts, total_elevation_gain')
                    .eq('athlete_id', athleteId)
                    .gte('start_date', monday.toISOString());

                if (error) throw error;

                if (data) {
                    let totalTSS = 0;
                    let totalDistance = 0;
                    let totalTime = 0;

                    const currentFTP = ftp || 200; // Default to 200 if not set, but TSS will be inaccurate

                    data.forEach(activity => {
                        totalDistance += activity.distance || 0;
                        totalTime += activity.moving_time || 0;

                        // Calculate TSS
                        // TSS = (sec x NP x IF) / (FTP x 3600) x 100
                        const duration = activity.elapsed_time || activity.moving_time || 0;
                        const np = activity.weighted_average_watts || activity.average_watts || 0;

                        if (currentFTP > 0 && np > 0) {
                            const intensity = np / currentFTP;
                            const tss = (duration * np * intensity) / (currentFTP * 3600) * 100;
                            totalTSS += tss;
                        }
                    });

                    setStats({
                        weeklyTSS: Math.round(totalTSS),
                        weeklyDistance: Math.round(totalDistance / 1000), // km
                        weeklyTime: Math.round(totalTime / 3600 * 10) / 10, // hours
                        activityCount: data.length
                    });
                }
            } catch (err) {
                console.error('Error fetching weekly stats:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchWeeklyStats();
    }, [athleteId, ftp]);

    return { stats, loading };
};
