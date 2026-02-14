
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Shield, Store, Clock, X, AlertTriangle } from 'lucide-react';
import { useMemberAuthorizations } from '../../hooks/useMemberAuthorizations';

const SettingsPage: React.FC = () => {
    const { authorizations, reject, loading, refresh } = useMemberAuthorizations();
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; id: string | null; name: string }>({
        isOpen: false,
        id: null,
        name: ''
    });

    // 隱藏系統管理員帳號，不讓一般使用者看到
    const HIDDEN_MANAGER_EMAILS = ['samkhlin@gmail.com', 'service@tsu.com.tw'];
    const approvedAuths = authorizations.filter(a =>
        a.status === 'approved' &&
        !HIDDEN_MANAGER_EMAILS.includes(a.manager_email?.toLowerCase() || '')
    );

    const handleReject = async () => {
        if (confirmModal.id) {
            await reject(confirmModal.id);
            setConfirmModal({ isOpen: false, id: null, name: '' });
            await refresh();
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[40vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tcu-blue"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <Settings className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-wide">
                        系統設定
                    </h1>
                    <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">
                        管理您的帳號授權與偏好設定
                    </p>
                </div>
            </div>

            <div className="space-y-8">
                {/* 授權管理區塊 */}
                <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                        <Shield className="w-5 h-5 text-tcu-blue" />
                        <h2 className="text-lg font-black text-slate-800 dark:text-slate-200">
                            已授權的車店與車隊
                        </h2>
                    </div>

                    {approvedAuths.length === 0 ? (
                        <div className="text-center py-10 opacity-50">
                            <Store className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                            <p className="text-slate-500 font-medium">目前沒有授權給任何車店或車隊</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {approvedAuths.map((auth) => (
                                <div
                                    key={auth.id}
                                    className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black">
                                            {auth.shop_name ? auth.shop_name.charAt(0) : <Store className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-white">
                                                {auth.shop_name || '特約合作車店'}
                                            </h3>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <Clock className="w-3 h-3 text-slate-400" />
                                                <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">
                                                    授權於 {auth.approved_at ? new Date(auth.approved_at).toLocaleDateString() : '未知日期'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setConfirmModal({ isOpen: true, id: auth.id, name: auth.shop_name || '此車店' })}
                                        className="px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors flex items-center gap-2"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                        解除授權
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* 確認解除 Modal */}
            <AnimatePresence>
                {confirmModal.isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
                        onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-6 h-6 text-red-500" />
                            </div>
                            <h3 className="text-xl font-black text-center text-slate-900 dark:text-white mb-2">
                                確定要解除授權？
                            </h3>
                            <p className="text-center text-slate-500 text-sm mb-6">
                                解除後，<span className="font-bold text-slate-900 dark:text-slate-300">{confirmModal.name}</span> 將無法查看您的保養紀錄與活動數據。
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                                    className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleReject}
                                    className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-shadow shadow-lg shadow-red-500/20"
                                >
                                    確認解除
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SettingsPage;
