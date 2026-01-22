
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
import { useSEO } from './hooks/useSEO';

const App: React.FC = () => {
  useSEO();
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
