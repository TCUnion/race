
import React from 'react';
import { ViewType } from '../types';

interface NavbarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-solid border-slate-200 dark:border-slate-800 px-6 md:px-20 py-4 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate(ViewType.LANDING)}>
        <img src="https://www.tsu.com.tw/images/logo.png" alt="TCU Logo" className="h-8 w-auto" />
        <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight uppercase">TCU STRAVA RANK</h2>
      </div>

      <div className="hidden md:flex flex-1 justify-end gap-8 items-center">
        <nav className="flex items-center gap-8">
          <button
            onClick={() => onNavigate(ViewType.LANDING)}
            className={`text-sm font-bold uppercase tracking-wide transition-colors ${currentView === ViewType.LANDING ? 'text-tsu-blue border-b-2 border-tsu-blue' : 'text-slate-600 dark:text-slate-300 hover:text-tsu-blue'}`}
          >
            探索活動
          </button>
          <button
            onClick={() => onNavigate(ViewType.LEADERBOARD)}
            className={`text-sm font-bold uppercase tracking-wide transition-colors ${currentView === ViewType.LEADERBOARD ? 'text-tsu-blue border-b-2 border-tsu-blue' : 'text-slate-600 dark:text-slate-300 hover:text-tsu-blue'}`}
          >
            排行榜
          </button>
          <button
            onClick={() => onNavigate(ViewType.DASHBOARD)}
            className={`text-sm font-bold uppercase tracking-wide transition-colors ${currentView === ViewType.DASHBOARD ? 'text-tsu-blue border-b-2 border-tsu-blue' : 'text-slate-600 dark:text-slate-300 hover:text-tsu-blue'}`}
          >
            個人儀表板
          </button>
        </nav>

        <button className="flex min-w-[100px] cursor-pointer items-center justify-center rounded px-5 h-10 bg-tsu-blue text-white text-sm font-bold uppercase tracking-widest hover:brightness-110 transition-all shadow-md shadow-tsu-blue/20">
          <span>立即登入</span>
        </button>
      </div>

      <div className="md:hidden">
        <span className="material-symbols-outlined text-3xl">menu</span>
      </div>
    </header>
  );
};

export default Navbar;
