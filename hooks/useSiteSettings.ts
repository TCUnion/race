import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface SiteSetting {
    key: string;
    value: string;
    updated_at: string;
}

export const useSiteSettings = () => {
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data, error } = await supabase.from('site_settings').select('*');
                if (error) throw error;

                const settingsMap: Record<string, string> = {};
                data?.forEach((setting: SiteSetting) => {
                    settingsMap[setting.key] = setting.value;
                });
                setSettings(settingsMap);
            } catch (error) {
                console.error('Error fetching site settings:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const getSetting = (key: string) => settings[key] || '';

    return { settings, getSetting, loading };
};
