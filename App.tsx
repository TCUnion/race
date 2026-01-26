
import React, { useState } from 'react';
import { ViewType } from './types';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import Leaderboard from './components/Leaderboard';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AdminPanel from './components/AdminPanel';
import RegisterPage from './components/RegisterPage';
import MemberBindingCard from './components/MemberBindingCard';
import MaintenanceDashboard from './components/maintenance/MaintenanceDashboard';
import ACPowerTraining from './components/ACPowerTraining';
import TeamDashboard from './components/TeamDashboard';
import SettingsPage from './components/SettingsPage';
import { useSEO } from './hooks/useSEO';
import { useAuth } from './hooks/useAuth';

const App: React.FC = () => {
  useSEO();
  const { isAdmin, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.LANDING);

  const renderView = () => {
    switch (currentView) {
      case ViewType.LANDING:
        return <LandingPage onRegister={() => setCurrentView(ViewType.DASHBOARD)} />;
      case ViewType.DASHBOARD:
        return <Dashboard onNavigate={setCurrentView} />;
      case ViewType.LEADERBOARD:
        return <Leaderboard />;
      case ViewType.ADMIN:
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          );
        }
        if (!isAdmin) {
          return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
              <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-2xl backdrop-blur-sm max-w-md">
                <h2 className="text-2xl font-bold text-red-400 mb-4">存取被拒絕</h2>
                <p className="text-gray-400 mb-6">您沒有存取管理員面板的權限。如果您是管理員，請確保已登入正確的帳號。</p>
                <button
                  onClick={() => setCurrentView(ViewType.DASHBOARD)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                >
                  回到儀表板
                </button>
              </div>
            </div>
          );
        }
        return <AdminPanel />;
      case ViewType.REGISTER:
        return <RegisterPage onNavigate={setCurrentView} />;
      case ViewType.MAINTENANCE:
        return <MaintenanceDashboard />;
      case ViewType.MEMBER_BINDING:
        return (
          <div className="flex flex-col items-center w-full py-20 px-4">
            <div className="w-full max-w-2xl">
              <MemberBindingCard
                onBindingSuccess={() => setCurrentView(ViewType.DASHBOARD)}
              />
            </div>
          </div>
        );
      case ViewType.AI_COACH:
        return <ACPowerTraining />;
      case ViewType.TEAM_DASHBOARD:
        return <TeamDashboard />;
      case ViewType.SETTINGS:
        return <SettingsPage />;
      default:
        return <LandingPage onRegister={() => setCurrentView(ViewType.DASHBOARD)} />;
    }
  };


  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
      />

      <main className="flex-grow">
        {renderView()}
      </main>

      <Footer onNavigate={(view) => setCurrentView(view)} />
    </div>
  );
};

export default App;
