import { useState } from 'react';
import { ViewType } from '../../src/types';
import { StatusBar } from '../components/music-app/StatusBar';
import { ChevronLeft, User, Share2, CheckCircle2, Timer, Gauge, Trophy, Bookmark } from 'lucide-react';
import { useAuth } from '../../src/hooks/useAuth';
import { useSegmentData } from '../../src/hooks/useSegmentData';
import { useWeeklyStats } from '../../src/hooks/useWeeklyStats';

interface V2DashboardProps {
    onBack: () => void;
    onNavigate?: (view: ViewType) => void;
}

export function V2Dashboard({ onBack, onNavigate }: V2DashboardProps) {
    const { athlete, isBound } = useAuth();
    const { segments } = useSegmentData();
    const { stats } = useWeeklyStats(athlete?.id, athlete?.ftp);

    // Mock data for demo if no real data
    const featuredSegment = segments.length > 0 ? segments[0] : null;

    const handleRegisterClick = () => {
        onNavigate?.(ViewType.REGISTER);
    };

    return (
        <div className="flex flex-col w-full min-h-screen bg-[#050505] overflow-hidden relative font-sans text-white">
            <StatusBar />

            {/* Header */}
            <header className="flex items-center px-4 py-4 pt-12 relative z-10">
                <button
                    onClick={onBack}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md active:scale-95 transition-transform"
                >
                    <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <h1 className="ml-4 text-[10px] font-black tracking-[0.2em] uppercase text-white/80">CU Challenge Series</h1>
            </header>

            <main className="flex-1 overflow-y-auto px-5 pb-24 scrollbar-hide">

                {/* Profile Section */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-white/20 to-white/5">
                            <img
                                src={athlete?.profile || "https://www.strava.com/assets/users/placeholder_athlete.png"}
                                alt="Profile"
                                className="w-full h-full rounded-full object-cover"
                            />
                        </div>
                        {isBound && (
                            <div className="absolute -bottom-1 -right-1 bg-[#1a1a1a] p-1 rounded-full">
                                <User className="w-3 h-3 text-white" />
                            </div>
                        )}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold italic tracking-tight text-white/90">
                            {athlete ? `${athlete.lastname}${athlete.firstname}` : 'Guest User'}
                            <span className="not-italic text-xs font-normal text-white/50 ml-2">- TCUNION</span>
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-[9px] font-black uppercase text-green-500 tracking-wider">
                                    ATHLETE #{athlete?.id || '---'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Primary Action Button */}
                <button
                    onClick={handleRegisterClick}
                    className="w-full py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 mb-8 group active:scale-[0.98]"
                >
                    <User className="w-4 h-4 text-white/70" />
                    <span className="text-xs font-bold tracking-widest text-white/90 uppercase">管理報名 / 報名新路段</span>
                </button>

                {/* Status Text */}
                <div className="flex flex-col items-center gap-1 mb-6">
                    <p className="text-[10px] text-white/40 font-medium">目前系統顯示為最新同步數據</p>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-white/30">左右滑動切換路段詳情</span>
                        <div className="flex gap-1">
                            <div className="w-3 h-1 rounded-full bg-[#3b82f6]"></div>
                            <div className="w-3 h-1 rounded-full bg-white/20"></div>
                        </div>
                    </div>
                </div>

                {/* Main Challenge Card */}
                {featuredSegment ? (
                    <div className="relative w-full aspect-[4/3] rounded-[2.5rem] overflow-hidden bg-[#121212] border border-white/5 mb-6 shadow-2xl shadow-blue-900/10">
                        {/* Map Background Placeholder */}
                        <div className="absolute inset-0 opacity-40 mix-blend-screen">
                            {/* Using a static dark map style image or gradient if map is not available */}
                            <img
                                src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=800"
                                alt="Map"
                                className="w-full h-full object-cover grayscale invert contrast-125"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent"></div>
                        </div>

                        {/* Content Overlay */}
                        <div className="absolute inset-0 p-6 flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Strava ID: {featuredSegment.strava_id}</span>
                                    <h3 className="text-xl font-bold text-white mt-1 leading-tight max-w-[70%]">
                                        {featuredSegment.name}
                                    </h3>
                                </div>
                                <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                                    <CheckCircle2 className="w-5 h-5 text-white" />
                                </div>
                            </div>

                            {/* Center Path Graphic Placeholder */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-80">
                                {/* This would be the SVG path of the route */}
                                <svg width="100" height="100" viewBox="0 0 100 100" className="text-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.6)]">
                                    <path d="M20,80 Q50,10 80,80" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                                </svg>
                            </div>

                            <div className="flex items-end justify-between mt-auto z-10">
                                <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                                    <div>
                                        <p className="text-[9px] text-white/50 mb-0.5">距離</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-black italic text-white tracking-tighter">
                                                {(featuredSegment.distance / 1000).toFixed(2)}
                                            </span>
                                            <span className="text-[10px] text-white/50 font-bold">km</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-white/50 mb-0.5">坡度</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-black italic text-white tracking-tighter">
                                                {featuredSegment.average_grade}%
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-white font-bold text-xl tracking-widest">--:--</span>
                                    <div className="px-1.5 py-0.5 rounded border border-white/20 text-[9px] font-black text-white/70">PR</div>
                                </div>
                            </div>

                            {/* Bottom Actions */}
                            <div className="absolute bottom-4 left-6 right-6 flex justify-between items-center opacity-50">
                                <span className="text-[10px] text-white/50">📅 --</span>
                                <Share2 className="w-4 h-4 text-white/50" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-64 rounded-[2.5rem] bg-white/5 flex items-center justify-center border border-white/5 mb-6">
                        <span className="text-white/30 text-xs">載入中...</span>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Best Time */}
                    <div className="bg-[#121212] rounded-3xl p-5 border border-white/5 relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-bold text-white/40">最佳時間</span>
                            <Timer className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
                        </div>
                        <div className="flex items-baseline gap-1">
                            <div className="w-4 h-1 bg-white/20 rounded-full mb-2"></div>
                        </div>
                        <p className="text-[10px] font-bold text-emerald-500 mt-2 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            紀錄同步中
                        </p>
                    </div>

                    {/* Avg Speed */}
                    <div className="bg-[#121212] rounded-3xl p-5 border border-white/5 relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-bold text-white/40">平均時速</span>
                            <Gauge className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
                        </div>
                        <div className="flex items-baseline gap-2 mt-2">
                            <span className="w-4 h-1 bg-white/20 rounded-full"></span>
                            <span className="text-xs text-white/30 font-bold">KM/H</span>
                        </div>
                        <p className="text-[10px] font-bold text-emerald-500 mt-4 flex items-center gap-1">
                            <span className="text-emerald-500">~</span> 數據保持穩定
                        </p>
                    </div>
                </div>

                {/* Rank Card */}
                <div className="bg-[#121212] rounded-3xl p-5 border border-white/5 relative overflow-hidden mb-4">
                    <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-white/40">目前排名</span>
                        <div className="bg-white/5 p-2 rounded-lg">
                            <Bookmark className="w-4 h-4 text-white/40" />
                        </div>
                    </div>
                    <div className="mt-4 mb-2">
                        <div className="w-6 h-1 bg-white/20 rounded-full"></div>
                    </div>
                    <p className="text-[10px] font-bold text-white/60 mt-4 flex items-center gap-1">
                        <span className="text-white/40">^</span> 努力刷新排名中
                    </p>
                </div>

                {/* Goal Progress */}
                <div className="bg-[#121212] rounded-3xl p-6 border border-white/5 relative overflow-hidden">
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <h3 className="text-lg font-black text-white tracking-tight">挑戰目標進度</h3>
                            <p className="text-[10px] text-white/40 mt-1">距離前 10% 僅差一步之遙</p>
                        </div>
                        <span className="text-4xl font-black text-white italic tracking-tighter">85%</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full mt-4 overflow-hidden">
                        <div className="h-full w-[85%] bg-gradient-to-r from-blue-600 to-blue-400 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                    </div>
                </div>

            </main>
        </div>
    );
}
