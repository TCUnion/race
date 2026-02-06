import { Home, LayoutDashboard, Search, Settings } from 'lucide-react';
import { useMemberAuthorizations } from '../../../src/hooks/useMemberAuthorizations';
import { useActiveAnnouncements } from '../../../src/hooks/useActiveAnnouncements';

interface TabBarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

const tabs = [
    { id: 'home', label: '探索', icon: Home },
    { id: 'library', label: '比賽', icon: LayoutDashboard },
    { id: 'search', label: '搜尋', icon: Search },
    { id: 'settings', label: '設定', icon: Settings },
];

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
    const { pendingAuthorizations } = useMemberAuthorizations();
    const { hasActiveAnnouncements } = useActiveAnnouncements();
    const hasNotifications = pendingAuthorizations.length > 0 || hasActiveAnnouncements;


    return (
        <nav className="flex justify-around items-center w-full h-[83px] bg-bg-glass backdrop-blur-xl px-0 pt-2 pb-7 border-t border-border">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className="flex flex-col items-center gap-1 relative"
                    >
                        <div className="relative">
                            <Icon
                                size={24}
                                className={isActive ? 'text-primary' : 'text-text-secondary'}
                            />
                            {tab.id === 'library' && hasNotifications && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#1a1a1a] animate-pulse z-10"></span>
                            )}
                        </div>
                        <span
                            className={`text-[10px] font-medium ${isActive ? 'text-primary' : 'text-text-secondary'
                                }`}
                        >
                            {tab.label}
                        </span>
                    </button>
                );
            })}
        </nav>
    );
}
