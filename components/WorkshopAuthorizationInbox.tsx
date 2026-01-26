import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Check, X, Store, Info, Clock } from 'lucide-react';
import { useMemberAuthorizations } from '../hooks/useMemberAuthorizations';

const WorkshopAuthorizationInbox: React.FC = () => {
    const { pendingAuthorizations, approve, reject, loading } = useMemberAuthorizations();

    if (loading || pendingAuthorizations.length === 0) return null;

    return (
        <div className="w-full mb-8">
            <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-tcu-blue" />
                <h2 className="text-xl font-black uppercase italic text-slate-900 dark:text-white">授權請求通知</h2>
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                    {pendingAuthorizations.length}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence>
                    {pendingAuthorizations.map((auth) => (
                        <motion.div
                            key={auth.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-tcu-blue/30 p-5 shadow-xl shadow-tcu-blue/5 relative overflow-hidden group"
                        >
                            {/* 裝飾背景 */}
                            <div className="absolute top-0 right-0 -mr-6 -mt-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Store className="w-24 h-24" />
                            </div>

                            <div className="flex gap-4 relative z-10">
                                <div className="w-12 h-12 rounded-xl bg-tcu-blue/10 flex items-center justify-center shrink-0">
                                    <Store className="w-6 h-6 text-tcu-blue" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-black text-slate-900 dark:text-white text-lg leading-tight">
                                        {auth.shop_name || '特約合作車店'}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Clock className="w-3 h-3 text-slate-400" />
                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                            於 {new Date(auth.created_at).toLocaleDateString()} 發起申請
                                        </p>
                                    </div>
                                    <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-start gap-2">
                                            <Info className="w-3.5 h-3.5 text-tcu-blue shrink-0 mt-0.5" />
                                            <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                                                {auth.shop_name || '此車店'} 尋求授權。將查看您的「維修保養紀錄」與「Strava 活動數據」，以便為您提供更精確的保養建議。
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 mt-5">
                                        <button
                                            onClick={() => reject(auth.id)}
                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all font-bold text-sm"
                                        >
                                            <X className="w-4 h-4" />
                                            拒絕授權
                                        </button>
                                        <button
                                            onClick={() => approve(auth.id)}
                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-tcu-blue text-white hover:bg-tcu-blue-light transition-all font-bold text-sm shadow-lg shadow-tcu-blue/20"
                                        >
                                            <Check className="w-4 h-4" />
                                            核准授權
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default WorkshopAuthorizationInbox;
