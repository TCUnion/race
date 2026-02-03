import { ViewType } from '../../src/types';
import Dashboard from '../../src/features/dashboard/Dashboard';
import { StatusBar } from '../components/music-app/StatusBar';

interface V2DashboardProps {
    onBack: () => void;
    onNavigate?: (view: ViewType) => void;
}

export function V2Dashboard({ onBack, onNavigate }: V2DashboardProps) {
    const handleNavigate = (view: ViewType) => {
        // Map V1 ViewType to V2 navigation actions if needed
        console.log('V2Dashboard: Navigate to:', view);
        if (view === ViewType.LANDING) {
            onBack();
        } else {
            // Forward V1 navigation to parent V2 App
            onNavigate?.(view);
        }
    };

    return (
        <div className="flex flex-col w-full min-h-screen bg-bg overflow-hidden relative">
            <StatusBar />
            <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide bg-bg-dark">
                {/* 
                    V1 Dashboard is designed for responsive web. 
                    We render it here directly. It should adapt to the mobile container width.
                 */}
                <Dashboard onNavigate={handleNavigate} />
            </div>

            {/* Overlay a back button if needed, or rely on Dashboard's internal navigation */}
            <button
                onClick={onBack}
                className="absolute top-12 left-5 w-8 h-8 flex items-center justify-center bg-black/20 backdrop-blur-md rounded-full text-white/50 hover:text-white hover:bg-black/40 transition-all z-50 border border-white/10"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </button>
        </div>
    );
}
