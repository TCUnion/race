
import React, { useState } from 'react';
import { ViewType } from './types';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import Leaderboard from './components/Leaderboard';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AdminPanel from './components/AdminPanel';
import RegisterPage from './components/RegisterPage';

const App: React.FC = () => {
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
