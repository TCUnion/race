import { useState } from 'react';
import { Heart, Download, MapPin, MoreHorizontal } from 'lucide-react';
import { StatusBar } from './StatusBar';
import { TabBar } from './TabBar';

const tabs = ['播放列表', '挑戰', '下載'];

const libraryItems = [
    { id: 'favorites', icon: Heart, label: '我的收藏', count: 12, color: '#FF3B30' },
    { id: 'downloads', icon: Download, label: '已下載', count: 5, color: '#30D158' },
    { id: 'routes', icon: MapPin, label: '我的路線', count: 8, color: '#0A84FF' },
];

const recentPlays = [
    { id: '1', name: '風櫃嘴', time: '昨天', imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200' },
    { id: '2', name: '北海岸', time: '3天前', imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200' },
];

interface LibraryPageProps {
    onTabChange?: (tab: string) => void;
    activeTab?: string;
}

export function LibraryPage({ onTabChange, activeTab = 'library' }: LibraryPageProps) {
    const [activeSection, setActiveSection] = useState('播放列表');

    return (
        <div className="flex flex-col w-full min-h-screen bg-bg overflow-hidden relative">
            <StatusBar />


            {/* Header */}
            <header className="flex justify-between items-center px-5 py-3">
                <h1 className="text-white text-[34px] font-bold font-display">資料庫</h1>
            </header>

            {/* 可滾動內容區 */}
            <main className="flex-1 overflow-y-auto px-5 flex flex-col gap-6 pb-24 scrollbar-hide">
                {/* 資料庫項目 */}
                <section className="flex flex-col gap-2">
                    {libraryItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                className="flex items-center gap-3 py-3"
                            >
                                <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: item.color }}
                                >
                                    <Icon size={20} className="text-white" />
                                </div>
                                <div className="flex-1 text-left">
                                    <h3 className="text-white text-base font-medium">{item.label}</h3>
                                    <p className="text-text-secondary text-sm">{item.count} 個挑戰</p>
                                </div>
                                <MoreHorizontal size={20} className="text-text-secondary" />
                            </button>
                        );
                    })}
                </section>

                {/* 最近播放 */}
                <section>
                    <h2 className="text-white text-lg font-bold mb-3">最近播放</h2>
                    <div className="grid grid-cols-2 gap-3">
                        {recentPlays.map((item) => (
                            <button
                                key={item.id}
                                className="flex flex-col text-left"
                            >
                                <div
                                    className="w-full aspect-square rounded-xl bg-cover bg-center mb-2"
                                    style={{ backgroundImage: `url(${item.imageUrl})` }}
                                />
                                <h3 className="text-white text-sm font-medium">{item.name}</h3>
                                <p className="text-text-secondary text-xs">{item.time}</p>
                            </button>
                        ))}
                    </div>
                </section>
            </main>

            {/* 底部導航 - 絕對定位在最下方 */}
            <div className="absolute bottom-0 left-0 right-0 z-40">
                <TabBar activeTab={activeTab} onTabChange={onTabChange || (() => { })} />
            </div>
        </div>
    );
}
