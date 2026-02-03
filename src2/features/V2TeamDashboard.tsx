import React, { Suspense } from 'react';
import TeamDashboard from '../../src/features/dashboard/TeamDashboard';
import { StatusBar } from '../components/music-app/StatusBar';
import { Loader2 } from 'lucide-react';

interface V2TeamDashboardProps {
    onBack: () => void;
}

export function V2TeamDashboard({ onBack }: V2TeamDashboardProps) {
    return (
        <div className="flex flex-col w-full min-h-screen bg-bg overflow-hidden relative">
            <StatusBar />

            <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide bg-bg-dark">
                {/* 
                   V1 TeamDashboard is designed for desktop/responsive. 
                   We render it here. The padding might need adjustment or we accept it as is.
                   TeamDashboard has its own Header, so we don't need another one.
                */}
                <Suspense fallback={
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 animate-spin text-tcu-blue" />
                    </div>
                }>
                    <div className="min-h-full pb-20">
                        {/* Scale down slightly if needed, or just let it reflow */}
                        <div className="origin-top-left scale-[0.85] w-[117.6%] -mb-[15%]">
                            <TeamDashboard />
                        </div>
                    </div>
                </Suspense>
            </div>

            {/* Overlay Back Button */}
            <button
                onClick={onBack}
                className="absolute top-4 left-5 w-8 h-8 flex items-center justify-center bg-black/20 backdrop-blur-md rounded-full text-white/50 hover:text-white hover:bg-black/40 transition-all z-50 border border-white/10"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </button>
        </div>
    );
}
