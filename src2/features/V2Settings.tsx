import { useState } from 'react';
import { StatusBar } from '../components/music-app/StatusBar';
import { TabBar } from '../components/music-app/TabBar';
import MemberBindingCard from '../../src/features/auth/MemberBindingCard';
import { Settings, Store, Shield } from 'lucide-react';

interface V2SettingsProps {
    onTabChange: (tab: string) => void;
    activeTab: string;
}

export function V2Settings({ onTabChange, activeTab }: V2SettingsProps) {
    return (
        <div className="flex flex-col w-[390px] h-[844px] bg-bg overflow-hidden relative">
            <StatusBar />

            {/* Header */}
            <header className="px-5 py-4 pt-2">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/50">
                        <Settings size={20} />
                    </div>
                    <div>
                        <h1 className="text-white text-2xl font-bold font-display tracking-tight">系統設定</h1>
                        <p className="text-white/40 text-xs font-bold">管理您的帳號授權與偏好設定</p>
                    </div>
                </div>
            </header>

            {/* Scrollable Content */}
            <main className="flex-1 overflow-y-auto flex flex-col gap-6 px-5 pb-24 scrollbar-hide">

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

            {/* Bottom Tab Bar */}
            <div className="absolute bottom-0 left-0 right-0 z-40">
                <TabBar activeTab={activeTab} onTabChange={onTabChange} />
            </div>
        </div>
    );
}
