import { Home, LayoutDashboard, Search, Settings, LogOut, User, Wrench } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useMemberAuthorizations } from '../../hooks/useMemberAuthorizations';
import { useActiveAnnouncements } from '../../hooks/useActiveAnnouncements';

interface SidebarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

const tabs = [
    { id: 'home', label: '探索', icon: Home },
    { id: 'library', label: '挑戰', icon: LayoutDashboard },
    { id: 'maintenance', label: '保養', icon: Wrench },
    { id: 'search', label: '搜尋', icon: Search },
    { id: 'settings', label: '設定', icon: Settings },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
    const { athlete, logout } = useAuth();
    const { pendingAuthorizations } = useMemberAuthorizations();
    const { hasActiveAnnouncements } = useActiveAnnouncements();
    const hasNotifications = pendingAuthorizations.length > 0 || hasActiveAnnouncements;

    return (
        <aside className="hidden md:flex flex-col w-[240px] h-screen bg-bg-elevated border-r border-white/5 p-4 sticky top-0 shrink-0">
            {/* Branding */}
            <div className="flex items-center gap-3 px-2 py-4 mb-6">
                <img src="/tcu-logo-light.png" alt="TCU Logo" className="h-8 w-auto" />
                <h1 className="text-white text-xl font-bold font-display tracking-tight">TCU小幫手</h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1 flex flex-col gap-2">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${isActive
                                ? 'bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20'
                                : 'text-text-secondary hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <div className="relative">
                                <Icon size={20} className={isActive ? 'text-primary-foreground' : 'group-hover:text-white'} />
                                {tab.id === 'library' && hasNotifications && (
                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#1a1a1a] animate-pulse z-10"></span>
                                )}
                            </div>
                            <span className="text-sm">{tab.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* User Profile Summary (Desktop) */}
            {athlete ? (
                <div className="mt-auto pt-4 border-t border-white/5">
                    <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
                        <img
                            src={athlete.profile}
                            alt={athlete.lastname}
                            className="w-10 h-10 rounded-full border border-white/10"
                        />
                        <div className="flex-1 min-w-0">
                            <h3 className="text-white text-sm font-bold truncate group-hover:text-primary transition-colors">
                                {athlete.lastname}{athlete.firstname}
                            </h3>
                            <p className="text-white/40 text-xs truncate">View Profile</p>
                        </div>
                        <button
                            onClick={() => {
                                if (window.confirm('確定要登出嗎？')) logout();
                            }}
                            className="p-2 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            title="登出"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="mt-auto pt-4 border-t border-white/5">
                    <div className="flex items-center gap-3 px-2 py-2">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                            <User size={20} className="text-white/40" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-white text-sm font-bold">訪客</h3>
                            <p className="text-white/40 text-xs">尚未登入</p>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}
