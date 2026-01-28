import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useSEO = () => {
    useEffect(() => {
        const updateSEO = async () => {
            const { data, error } = await supabase.from('site_settings').select('*');
            if (error || !data) return;

            data.forEach(setting => {
                switch (setting.key) {
                    case 'seo_title':
                        document.title = setting.value;
                        updateMeta('property', 'og:title', setting.value);
                        updateMeta('name', 'twitter:title', setting.value);
                        break;
                    case 'seo_description':
                        updateMeta('name', 'description', setting.value);
                        updateMeta('property', 'og:description', setting.value);
                        updateMeta('name', 'twitter:description', setting.value);
                        break;
                    case 'seo_keywords':
                        updateMeta('name', 'keywords', setting.value);
                        break;
                    case 'og_title':
                        updateMeta('property', 'og:title', setting.value);
                        break;
                    case 'og_description':
                        updateMeta('property', 'og:description', setting.value);
                        break;
                    case 'og_image':
                        updateMeta('property', 'og:image', setting.value);
                        updateMeta('name', 'twitter:image', setting.value);
                        break;
                }
            });
        };

        const updateMeta = (attrName: string, attrValue: string, content: string) => {
            let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
            if (!element) {
                element = document.createElement('meta');
                element.setAttribute(attrName, attrValue);
                document.head.appendChild(element);
            }
            element.setAttribute('content', content);
        };

        updateSEO();
    }, []);
};
