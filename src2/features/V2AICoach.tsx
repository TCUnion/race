import React from 'react';
import { ChevronLeft } from 'lucide-react';
import AthletePowerTrainingReport from '../../src/features/member/AthletePowerTrainingReport';
import { StatusBar } from '../components/music-app/StatusBar';

interface V2AICoachProps {
    onBack: () => void;
}

export function V2AICoach({ onBack }: V2AICoachProps) {
    return (
        <div className="flex flex-col w-full min-h-screen bg-bg overflow-hidden relative">
            <StatusBar />

            {/* Header */}
            <header className="px-5 pt-1 pb-3 flex items-center justify-between relative z-10 shrink-0">
                <button
                    onClick={onBack}
                    className="w-10 h-10 -ml-2 flex items-center justify-center text-white/80 hover:text-white active:scale-95 transition-all"
                >
                    <ChevronLeft size={28} />
                </button>
                <h2 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-bold text-lg">
                    AI 功率教室
                </h2>
                <div className="w-10" /> {/* Spacer for centering */}
            </header>

            {/* Scrollable Content */}
            <main className="flex-1 overflow-y-auto scrollbar-hide">
                <div className="pb-10 pt-2">
                    {/* Reuse the existing component but wrap it to fit mobile style if needed */}
                    {/* Using a scale transform to fit the potentially wide desktop layout into mobile if necessary, 
                        or just render it directly if it's responsive. 
                        Given the screenshot, it looks like a dashboard. 
                        Let's try rendering it directly first, but check if we need to override styles.
                        The original component has padding and max-width specifics which might need overriding. 
                    */}
                    <div className="min-h-[calc(100vh-100px)] px-2">
                        <AthletePowerTrainingReport />
                    </div>
                </div>
            </main>
        </div>
    );
}
