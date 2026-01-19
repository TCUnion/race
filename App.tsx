
import React, { useState } from 'react';
import { ViewType, isAthleteAdmin } from './types';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import Leaderboard from './components/Leaderboard';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AdminPanel from './components/AdminPanel';
import RegisterPage from './components/RegisterPage';
import MaintenanceDashboard from './components/maintenance/MaintenanceDashboard';
import { useSEO } from './hooks/useSEO';

const App: React.FC = () => {
  useSEO();
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.LANDING);
  const [isAdmin, setIsAdmin] = useState(false);

  // 監聽管理員狀態
  React.useEffect(() => {
    const checkAdmin = () => {
      const savedData = localStorage.getItem('strava_athlete_meta');
      if (savedData) {
        try {
          const athlete = JSON.parse(savedData);
          setIsAdmin(isAthleteAdmin(athlete.id));
        } catch (e) {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };

    checkAdmin();
    window.addEventListener('strava-auth-changed', checkAdmin);
    window.addEventListener('storage', checkAdmin);
    return () => {
      window.removeEventListener('strava-auth-changed', checkAdmin);
      window.removeEventListener('storage', checkAdmin);
    };
  }, []);

  const renderView = () => {
    switch (currentView) {
      case ViewType.LANDING:
        return <LandingPage onRegister={() => setCurrentView(ViewType.DASHBOARD)} />;
      case ViewType.DASHBOARD:
        return <Dashboard onNavigate={setCurrentView} />;
      case ViewType.LEADERBOARD:
        return <Leaderboard />;
      case ViewType.ADMIN:
        if (!isAdmin) {
          // 如果不是管理員，自動導向首頁
          return <LandingPage onRegister={() => setCurrentView(ViewType.DASHBOARD)} />;
        }
        return <AdminPanel />;
      case ViewType.REGISTER:
        return <RegisterPage onNavigate={setCurrentView} />;
      case ViewType.MAINTENANCE:
        return <MaintenanceDashboard />;
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
