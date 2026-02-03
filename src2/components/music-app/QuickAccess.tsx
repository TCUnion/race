import { Trophy, LayoutDashboard, Zap, Users, Wrench, MoreHorizontal, LucideIcon, Lock } from 'lucide-react';

interface QuickAccessItem {
    id: string;
    label: string;
    icon: LucideIcon;
    color: string;
    bgColor: string;
}

const quickItems: QuickAccessItem[] = [
    { id: 'ranking', label: '排行榜', icon: Trophy, color: '#FFD60A', bgColor: 'rgba(255, 214, 10, 0.2)' },
    { id: 'dashboard', label: '儀表板', icon: LayoutDashboard, color: '#30D158', bgColor: 'rgba(48, 209, 88, 0.2)' },
    { id: 'training', label: 'AI 訓練', icon: Zap, color: '#FF3B30', bgColor: 'rgba(255, 59, 48, 0.2)' },
    { id: 'team', label: '車隊', icon: Users, color: '#0A84FF', bgColor: 'rgba(10, 132, 255, 0.2)' },
    { id: 'maintenance', label: '保養紀錄', icon: Wrench, color: '#8E8E93', bgColor: 'rgba(142, 142, 147, 0.2)' },
    { id: 'more', label: '', icon: MoreHorizontal, color: '#A1A1AA', bgColor: 'rgba(161, 161, 170, 0.1)' },
];

interface QuickAccessProps {
    onItemClick?: (id: string) => void;
    isBound?: boolean | null;
}

export function QuickAccess({ onItemClick, isBound }: QuickAccessProps) {
    return (
        <div className="w-full">
            <div className="flex overflow-x-auto gap-3 px-5 pb-2 scrollbar-hide snap-x">
                {quickItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                if ((item.id === 'training' || item.id === 'team') && !isBound) {
                                    alert('此功能需綁定 TCU 會員才能使用，請至「系統設定」進行綁定。');
                                    return;
                                }
                                onItemClick?.(item.id);
                            }}
                            className={`flex-none flex flex-col items-center gap-2 p-4 bg-bg-card rounded-2xl w-[calc(25%-9px)] snap-start whitespace-nowrap transition-all relative ${(item.id === 'training' || item.id === 'team') && !isBound
                                ? 'opacity-60 grayscale'
                                : 'active:scale-95'
                                }`}
                        >
                            <div
                                className="w-11 h-11 flex items-center justify-center rounded-xl relative"
                                style={{ backgroundColor: item.bgColor }}
                            >
                                <Icon size={22} style={{ color: item.color }} />
                                {(item.id === 'training' || item.id === 'team') && !isBound && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
                                        <Lock size={14} className="text-white" />
                                    </div>
                                )}
                            </div>
                            <span className="text-white text-xs font-medium">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
