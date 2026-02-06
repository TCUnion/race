import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import { ExternalLink, X, Megaphone, ChevronRight } from 'lucide-react';

const AnnouncementBanner: React.FC = () => {
    const { isBound, isLoading: authLoading } = useAuthContext();
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAnnouncements = async () => {
            if (authLoading) return;

            try {
                // 根據綁定狀態過濾目標客群
                const targetGroups = ['all'];
                if (isBound) {
                    targetGroups.push('bound');
                } else {
                    targetGroups.push('unbound');
                }

                const { data, error } = await supabase
                    .from('announcements')
                    .select('*')
                    .eq('is_active', true)
                    .in('target_group', targetGroups)
                    .order('priority', { ascending: false })
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    setAnnouncements(data);
                }
            } catch (err) {
                console.error('Failed to fetch announcements:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnnouncements();
    }, [isBound, authLoading]);

    // 自動輪播
    useEffect(() => {
        if (announcements.length <= 1) return;

        const timer = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % announcements.length);
        }, 8000);

        return () => clearInterval(timer);
    }, [announcements.length]);

    if (isLoading || announcements.length === 0 || !isVisible) return null;

    const current = announcements[currentIndex];

    return (
        <div className="w-full max-w-[1200px] px-6 md:px-10 lg:px-20 mb-6">
            <AnimatePresence mode="wait">
                <motion.div
                    key={current.id}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="relative overflow-hidden bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl group"
                >
                    <div className="flex flex-col md:flex-row items-stretch">
                        {/* 圖片區域 (如果有) */}
                        {current.image_url && (
                            <div className="md:w-1/3 h-48 md:h-auto relative overflow-hidden">
                                <img
                                    src={current.image_url}
                                    alt={current.title}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white dark:to-slate-900 md:block hidden opacity-60" />
                            </div>
                        )}

                        {/* 內容區域 */}
                        <div className={`p-6 md:p-8 flex-1 flex flex-col justify-center ${current.image_url ? 'md:pl-4' : ''}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 rounded-lg bg-tcu-blue/10 text-tcu-blue">
                                    <Megaphone className="w-4 h-4" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">官方公告</span>
                                {announcements.length > 1 && (
                                    <span className="text-[10px] font-bold text-slate-300 ml-auto">
                                        {currentIndex + 1} / {announcements.length}
                                    </span>
                                )}
                            </div>

                            <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight mb-2">
                                {current.title}
                            </h3>

                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 md:line-clamp-3 mb-6">
                                {current.content}
                            </p>

                            <div className="flex items-center gap-4 mt-auto">
                                {current.button_url && (
                                    <a
                                        href={current.button_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 bg-tcu-blue text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-tcu-blue-light transition-all shadow-lg shadow-tcu-blue/20"
                                    >
                                        {current.button_text || '立即查看'}
                                        <ChevronRight className="w-4 h-4" />
                                    </a>
                                )}

                                <button
                                    onClick={() => setIsVisible(false)}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold transition-all p-2"
                                >
                                    暫不顯示
                                </button>
                            </div>
                        </div>

                        {/* 特殊裝飾 (類 Authorized Store 風格) */}
                        <div className="absolute top-0 right-0 p-4 pointer-events-none opacity-5">
                            <Megaphone className="w-32 h-32 rotate-12" />
                        </div>
                    </div>

                    {/* 關閉按鈕 */}
                    <button
                        onClick={() => setIsVisible(false)}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-all opacity-0 group-hover:opacity-100"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    {/* 進度條 (輪播) */}
                    {announcements.length > 1 && (
                        <div className="absolute bottom-0 left-0 h-1 bg-slate-100 dark:bg-slate-800 w-full">
                            <motion.div
                                key={`progress-${currentIndex}`}
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 8, ease: "linear" }}
                                className="h-full bg-tcu-blue"
                            />
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default AnnouncementBanner;
