import { useState } from 'react';
import { StatusBar } from '../components/music-app/StatusBar';
import { useAuth } from '../hooks/useAuth';
import { V2View } from '../App';
import MemberBindingCard from './auth/MemberBindingCard';
import { Settings, Store, Shield, Users2 } from 'lucide-react';

interface V2SettingsProps {
    onTabChange: (tab: string) => void;
    activeTab: string;
    onNavigate?: (view: V2View) => void;
}

export function V2Settings({ onTabChange, activeTab, onNavigate }: V2SettingsProps) {
    const { isBound } = useAuth();

    return (
        <div className="flex flex-col w-full h-full bg-bg overflow-hidden relative">
            <div className="md:hidden">
                <StatusBar />
            </div>

            {/* Header */}
            <header className="px-5 py-4 pt-2">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/50">
                        <Settings size={20} />
                    </div>
                    <div>
                        <h1 className="text-white text-2xl md:text-3xl font-bold font-display tracking-tight">系統設定</h1>
                        <p className="text-white/40 text-xs font-bold">管理您的帳號授權與偏好設定</p>
                    </div>
                </div>
            </header>

            {/* Scrollable Content */}
            <main className="flex-1 overflow-y-auto flex flex-col gap-6 px-5 pb-24 md:pb-6 scrollbar-hide">

                {/* Team Dashboard Link (Bound Members Only) */}
                {isBound && (
                    <button
                        onClick={() => onNavigate?.(V2View.TEAM_DASHBOARD)}
                        className="w-full flex items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl group active:scale-[0.98] transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                                <Users2 size={20} className="text-yellow-500" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-white font-bold text-sm group-hover:text-yellow-500 transition-colors">我的車隊</h3>
                                <p className="text-white/40 text-xs font-bold">管理車隊成員與數據</p>
                            </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-yellow-500/20 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/30 group-hover:text-yellow-500"><path d="m9 18 6-6-6-6" /></svg>
                        </div>
                    </button>
                )}

                {/* Authorized Shops & Teams Section */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <Shield size={16} className="text-[#0EA5E9]" />
                        <h2 className="text-white text-base font-bold">已授權的車店與車隊</h2>
                    </div>

                    <div className="w-full min-h-[160px] bg-bg-card rounded-2xl flex flex-col items-center justify-center gap-3 border border-white/5">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/20">
                            <Store size={24} />
                        </div>
                        <p className="text-white/30 text-xs font-bold">目前沒有授權給任何車店或車隊</p>
                    </div>
                </section>

                {/* Member Binding Section */}
                <section>
                    <MemberBindingCard onBindingSuccess={() => { }} />
                </section>

                {/* Extra spacing for bottom tab bar */}
                <div className="h-4" />
            </main>
        </div>
    );
}
