import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthContext } from '../contexts/AuthContext';

export function useActiveAnnouncements() {
    const { isBound, isLoading: authLoading } = useAuthContext();
    const [hasActiveAnnouncements, setHasActiveAnnouncements] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;

        const checkAnnouncements = async () => {
            try {
                const targetGroups = ['all'];
                if (isBound) {
                    targetGroups.push('bound');
                } else {
                    targetGroups.push('unbound');
                }

                const { count, error } = await supabase
                    .from('announcements')
                    .select('*', { count: 'exact', head: true })
                    .eq('is_active', true)
                    .in('target_group', targetGroups);

                if (!error) {
                    setHasActiveAnnouncements((count || 0) > 0);
                }
            } catch (err) {
                console.error('Check announcements error:', err);
            } finally {
                setLoading(false);
            }
        };

        checkAnnouncements();

        // Polling every 5 minutes just in case
        const interval = setInterval(checkAnnouncements, 5 * 60 * 1000);
        return () => clearInterval(interval);

    }, [isBound, authLoading]);

    return { hasActiveAnnouncements, loading };
}
