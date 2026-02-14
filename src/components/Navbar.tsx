import React from 'react';
import logo from '../assets/images/logo.png';
import { useAuth } from '../hooks/useAuth';
import StravaConnect from '../features/auth/StravaConnect';

interface NavbarProps {
    onNavigate: (view: any) => void;
    currentView: string;
}

const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentView }) => {
    const { athlete, isBound, logout } = useAuth();

    return (
        <nav className="fixed top-8 left-1/2 -translate-x-1/2 w-[90%] max-w-7xl h-18 glass rounded-2xl flex items-center justify-between px-10 z-50 transition-all duration-300">
            <div className="flex items-center gap-8">
                <button onClick={() => onNavigate('HOME')} className="flex items-center hover:opacity-80 transition-opacity">
                    <img src={logo} alt="CXXC" className="h-10 w-auto brightness-0 invert drop-shadow-[0_2px_4px_rgba(255,107,0,0.3)] transform -skew-x-6" />
                </button>

                <div className="hidden md:flex gap-8 text-[12px] font-bold tracking-widest uppercase">
                    <button
                        onClick={() => onNavigate('DASHBOARD')}
                        className={`hover:text-accent transition-colors ${currentView === 'DASHBOARD' ? 'text-accent' : 'text-text/70'}`}
                    >
                        儀表板
                    </button>
                    <button
                        onClick={() => onNavigate('LEADERBOARD')}
                        className={`hover:text-accent transition-colors ${currentView === 'LEADERBOARD' ? 'text-accent' : 'text-text/70'}`}
                    >
                        排行榜
                    </button>
                    <button
                        onClick={() => onNavigate('AI_COACH')}
                        className={`hover:text-accent transition-colors ${currentView === 'AI_COACH' ? 'text-accent' : 'text-text/70'}`}
                    >
                        AI 訓練
                    </button>
                    <button
                        onClick={() => onNavigate('MAINTENANCE')}
                        className={`hover:text-accent transition-colors ${currentView === 'MAINTENANCE' ? 'text-accent' : 'text-text/70'}`}
                    >
                        庫房
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-6">
                {athlete ? (
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end hidden sm:flex">
                            <span className="text-[11px] font-bold text-text uppercase tracking-tighter">
                                {athlete.firstname} {athlete.lastname}
                            </span>
                            <button
                                onClick={logout}
                                className="text-[9px] text-text/40 hover:text-red-400 transition-colors uppercase font-bold"
                            >
                                Logout
                            </button>
                        </div>
                        <img
                            src={athlete.profile}
                            alt="Profile"
                            className="w-10 h-10 rounded-xl border border-white/10 shadow-lg"
                        />
                        {!isBound && (
                            <button
                                onClick={() => onNavigate('MEMBER_BINDING')}
                                className="bg-yellow-500/10 text-yellow-500 text-[10px] px-3 py-1 rounded-full border border-yellow-500/20 font-bold hover:bg-yellow-500/20 transition-all"
                            >
                                TCU 綁定
                            </button>
                        )}
                    </div>
                ) : (
                    <StravaConnect>
                        <button className="btn-primary text-[11px] tracking-wider py-2 px-6">
                            CONNECT STRAVA
                        </button>
                    </StravaConnect>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
