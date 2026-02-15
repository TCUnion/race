import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useSEO } from './hooks/useSEO';
import { HomePage, SearchPage, LibraryPage, StatusBar } from './components/music-app';
import { useIsMobile } from './hooks/useIsMobile';

// 頁面視圖定義
export enum V2View {
    HOME = 'HOME',
    DASHBOARD = 'DASHBOARD',
    LEADERBOARD = 'LEADERBOARD',
    MAINTENANCE = 'MAINTENANCE',
    AI_COACH = 'AI_COACH',
    TEAM_DASHBOARD = 'TEAM_DASHBOARD',
    SEARCH = 'SEARCH',
    LIBRARY = 'LIBRARY',
    MEMBER_BINDING = 'MEMBER_BINDING',
    SETTINGS = 'SETTINGS',
    REGISTER = 'REGISTER',
    MANAGER = 'MANAGER',
    ADMIN = 'ADMIN',
    SKILL_VERIFICATION = 'SKILL_VERIFICATION',
}

import { V2Leaderboard } from './features/V2Leaderboard';
import { V2Dashboard } from './features/V2Dashboard';
import { V2Maintenance } from './features/V2Maintenance';
import { V2TeamDashboard } from './features/V2TeamDashboard';
import { V2AICoach } from './features/V2AICoach';
import { V2Settings } from './features/V2Settings';
import RegisterPage from './features/auth/RegisterPage';
import { ViewType } from './types';
import { Sidebar } from './components/music-app/Sidebar';
import { TabBar } from './components/music-app/TabBar';
import ManagerDashboard from './features/manager/ManagerDashboard';
import MaintenanceDashboard from './features/maintenance/MaintenanceDashboard';
import AdminPanel from './features/admin/AdminPanel';
import SkillVerificationPage from './features/skill/SkillVerificationPage';
import { ApiStatusWarning } from './components/ui/ApiStatusWarning';

function App() {
    useSEO();
    const { athlete, isBound } = useAuth();
    const [view, setView] = useState<V2View>(V2View.HOME);
    const [activeTab, setActiveTab] = useState('home');
    const [viewParams, setViewParams] = useState<any>({});
    const isMobile = useIsMobile();

    // 初始化：檢查 URL 參數
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const viewParam = params.get('view');
        const updateParam = params.get('update'); // Legacy support

        // 檢查路徑是否為 /skill
        if (window.location.pathname === '/skill') {
            setView(V2View.SKILL_VERIFICATION);
            return;
        }

        if (viewParam === 'manager') {
            setView(V2View.MANAGER);
        } else if (viewParam === 'admin') {
            setView(V2View.ADMIN);
        }
    }, []);

    // 處理導航
    const handleNavigation = (targetView: V2View, params?: any) => {
        setView(targetView);
        if (params) {
            setViewParams(params);
        } else {
            setViewParams({});
        }
    };

    const renderView = () => {
        switch (view) {
            case V2View.HOME:
                return (
                    <HomePage
                        activeTab={activeTab}
                        onTabChange={(tab) => {
                            setActiveTab(tab);
                            if (tab === 'search') setView(V2View.SEARCH);
                            if (tab === 'library') setView(V2View.LIBRARY);
                            if (tab === 'settings') setView(V2View.SETTINGS);
                        }}
                        onNavigate={handleNavigation}
                    />
                );
            case V2View.SEARCH:
                return <SearchPage activeTab="search" onTabChange={(tab) => {
                    setActiveTab(tab);
                    if (tab === 'home') setView(V2View.HOME);
                    if (tab === 'library') setView(V2View.LIBRARY);
                    if (tab === 'settings') setView(V2View.SETTINGS);
                }} />;
            case V2View.LIBRARY:
                return <LibraryPage activeTab="library" initialSegmentId={viewParams?.segmentId} onTabChange={(tab) => {
                    setActiveTab(tab);
                    if (tab === 'home') setView(V2View.HOME);
                    if (tab === 'search') setView(V2View.SEARCH);
                    if (tab === 'settings') setView(V2View.SETTINGS);
                }} />;

            case V2View.MAINTENANCE:
                if (isMobile) {
                    return <V2Maintenance onBack={() => setView(V2View.HOME)} />;
                }
                return (
                    <div className="flex flex-col w-full h-full bg-bg overflow-hidden relative">
                        <StatusBar />
                        <div className="flex-1 overflow-y-auto bg-bg-dark">
                            <MaintenanceDashboard />
                        </div>
                    </div>
                );

            case V2View.SETTINGS:
                return (
                    <V2Settings
                        activeTab="settings"
                        onTabChange={(tab) => {
                            setActiveTab(tab);
                            if (tab === 'home') setView(V2View.HOME);
                            if (tab === 'search') setView(V2View.SEARCH);
                            if (tab === 'library') setView(V2View.DASHBOARD); // Redirect 'library' (Challenge) to Dashboard
                        }}
                        onNavigate={handleNavigation}
                    />
                );

            case V2View.LEADERBOARD:
                return <V2Leaderboard
                    onBack={() => setView(V2View.HOME)}
                    initialSegmentId={viewParams?.segmentId}
                />;

            case V2View.DASHBOARD:
                return (
                    <V2Dashboard
                        onBack={() => setView(V2View.HOME)}
                        onNavigate={(v1View) => {
                            if (v1View === ViewType.REGISTER) {
                                setView(V2View.REGISTER);
                            }
                        }}
                    />
                );

            case V2View.REGISTER:
                return (
                    <div className="flex flex-col w-full h-full bg-bg overflow-hidden relative">
                        <StatusBar />
                        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide bg-bg-dark">
                            <RegisterPage onNavigate={(v1View) => {
                                if (v1View === ViewType.DASHBOARD) {
                                    setView(V2View.DASHBOARD);
                                } else {
                                    setView(V2View.HOME);
                                }
                            }} />
                        </div>
                        <button
                            onClick={() => setView(V2View.DASHBOARD)}
                            className="absolute top-12 left-5 w-8 h-8 flex items-center justify-center bg-black/20 backdrop-blur-md rounded-full text-white/50 hover:text-white hover:bg-black/40 transition-all z-50 border border-white/10"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                        </button>
                    </div>
                );

            case V2View.TEAM_DASHBOARD:
                return <V2TeamDashboard onBack={() => setView(V2View.HOME)} />;

            case V2View.AI_COACH:
                return <V2AICoach onBack={() => setView(V2View.HOME)} />;

            // TODO: 實現原生的 V2 視圖組件
            case V2View.MEMBER_BINDING:
                return (
                    <div className="flex flex-col w-[390px] h-[844px] bg-bg items-center justify-center p-10 text-center">
                        <div className="text-accent text-4xl mb-4">🚧</div>
                        <h2 className="text-white text-xl font-bold mb-2">{view} 頁面建置中</h2>
                        <p className="text-text-secondary text-sm mb-6">正在將 V1 功能移植至原生的 V2 行動介面...</p>
                        <button
                            onClick={() => setView(V2View.HOME)}
                            className="btn-primary py-2 px-6 rounded-xl text-xs"
                        >
                            返回首頁
                        </button>
                    </div>
                );

            default:
                return <HomePage activeTab={activeTab} onTabChange={setActiveTab} />;
        }
    };

    // 如果是管理員或後台視圖，直接渲染完整頁面（不使用 Responsive Layout）
    if (view === V2View.MANAGER) return <ManagerDashboard />;
    if (view === V2View.ADMIN) return <AdminPanel />;
    if (view === V2View.SKILL_VERIFICATION) return <SkillVerificationPage />;

    return (
        <div className="flex h-screen bg-bg dark text-foreground font-sans antialiased selection:bg-accent/30 box-border overflow-hidden">
            <ApiStatusWarning />
            {/* Desktop Sidebar */}
            <Sidebar activeTab={activeTab} onTabChange={(tab) => {
                setActiveTab(tab);
                if (tab === 'home') setView(V2View.HOME);
                if (tab === 'dashboard') setView(V2View.DASHBOARD); // Registration
                if (tab === 'team') setView(V2View.TEAM_DASHBOARD); // Team
                if (tab === 'search') setView(V2View.SEARCH);
                if (tab === 'library') setView(V2View.LIBRARY); // Challenge (Unchanged)
                if (tab === 'settings') setView(V2View.SETTINGS);
                if (tab === 'maintenance') setView(V2View.MAINTENANCE);
            }} />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-bg-dark">
                {renderView()}

                {/* Mobile Bottom Bar - Only visible on mobile/small screens and for main tabs */}
                <div className="md:hidden absolute bottom-0 left-0 right-0 z-40">
                    {(view === V2View.HOME || view === V2View.LIBRARY || view === V2View.DASHBOARD || view === V2View.TEAM_DASHBOARD || view === V2View.SEARCH || view === V2View.SETTINGS || view === V2View.MAINTENANCE) && (
                        <TabBar activeTab={activeTab} onTabChange={(tab) => {
                            setActiveTab(tab);
                            if (tab === 'home') setView(V2View.HOME);
                            if (tab === 'dashboard') setView(V2View.DASHBOARD);
                            if (tab === 'team') setView(V2View.TEAM_DASHBOARD);
                            if (tab === 'search') setView(V2View.SEARCH);
                            if (tab === 'library') setView(V2View.LIBRARY);
                            if (tab === 'settings') setView(V2View.SETTINGS);
                            if (tab === 'maintenance') setView(V2View.MAINTENANCE);
                        }} />
                    )}
                </div>
            </div>
        </div>
    );
}

export default App;
