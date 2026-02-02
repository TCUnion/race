import { Trophy, Map, Zap, Users, LucideIcon } from 'lucide-react';

interface QuickAccessItem {
    id: string;
    label: string;
    icon: LucideIcon;
    color: string;
    bgColor: string;
}

const quickItems: QuickAccessItem[] = [
    { id: 'ranking', label: '排行榜', icon: Trophy, color: '#FFD60A', bgColor: 'rgba(255, 214, 10, 0.2)' },
    { id: 'routes', label: '路線', icon: Map, color: '#30D158', bgColor: 'rgba(48, 209, 88, 0.2)' },
    { id: 'training', label: 'AI 訓練', icon: Zap, color: '#FF3B30', bgColor: 'rgba(255, 59, 48, 0.2)' },
    { id: 'team', label: '車隊', icon: Users, color: '#0A84FF', bgColor: 'rgba(10, 132, 255, 0.2)' },
];

interface QuickAccessProps {
    onItemClick?: (id: string) => void;
}

export function QuickAccess({ onItemClick }: QuickAccessProps) {
    return (
        <div className="w-full px-5">
            <h2 className="text-white text-lg font-bold mb-3">快捷入口</h2>
            <div className="grid grid-cols-4 gap-3">
                {quickItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onItemClick?.(item.id)}
                            className="flex flex-col items-center gap-2 p-4 bg-bg-card rounded-2xl"
                        >
                            <div
                                className="w-11 h-11 flex items-center justify-center rounded-xl"
                                style={{ backgroundColor: item.bgColor }}
                            >
                                <Icon size={22} style={{ color: item.color }} />
                            </div>
                            <span className="text-white text-xs font-medium">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
