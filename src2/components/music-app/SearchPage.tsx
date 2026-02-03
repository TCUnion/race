import { Search, X, Clock, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { StatusBar } from './StatusBar';
import { TabBar } from './TabBar';

const trendingTags = ['風櫃嘴', '武嶺', '陽金P', '北宜公路', '冬瓜山'];
const searchHistory = ['2024冬季挑戰賽', 'TCU春季積分賽', '功率區間訓練'];

const categories = [
    { id: 'climb', label: '爬坡挑戰', color: '#FF3B30' },
    { id: 'flat', label: '平路競速', color: '#0A84FF' },
    { id: 'endurance', label: '耐力賽事', color: '#30D158' },
    { id: 'training', label: 'AI 訓練', color: '#FF9F0A' },
];

interface SearchPageProps {
    onTabChange?: (tab: string) => void;
    activeTab?: string;
}

export function SearchPage({ onTabChange, activeTab = 'search' }: SearchPageProps) {
    const [query, setQuery] = useState('');

    return (
        <div className="flex flex-col w-full min-h-screen bg-bg overflow-hidden relative">
            <StatusBar />

            {/* Header */}
            <header className="px-5 pt-3 pb-4">
                <h1 className="text-white text-[34px] font-bold font-display mb-4">搜尋</h1>

                {/* 搜索框 */}
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="路線、賽段或挑戰"
                        className="w-full h-10 pl-10 pr-10 bg-bg-elevated rounded-xl text-white text-base placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                        >
                            <X size={18} className="text-text-secondary" />
                        </button>
                    )}
                </div>
            </header>

            {/* 可滾動內容區 */}
            <main className="flex-1 overflow-y-auto px-5 flex flex-col gap-6 pb-24 scrollbar-hide">
                {/* 熱門搜尋 */}
                <section>
                    <h2 className="text-white text-sm font-bold mb-3 flex items-center gap-2">
                        <TrendingUp size={14} className="text-primary" />
                        熱門搜尋
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {trendingTags.map((tag) => (
                            <button
                                key={tag}
                                className="px-3 py-1.5 bg-bg-card rounded-full text-white text-sm"
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </section>

                {/* 搜尋紀錄 */}
                <section>
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-white text-sm font-bold flex items-center gap-2">
                            <Clock size={14} className="text-text-secondary" />
                            搜尋紀錄
                        </h2>
                        <button className="text-primary text-sm">清除</button>
                    </div>
                    <div className="flex flex-col">
                        {searchHistory.map((item) => (
                            <button
                                key={item}
                                className="py-3 text-left text-white/70 text-base border-b border-border last:border-0"
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </section>

                {/* 瀏覽分類 */}
                <section className="pb-4">
                    <h2 className="text-white text-sm font-bold mb-3">瀏覽分類</h2>
                    <div className="grid grid-cols-2 gap-3">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                className="h-20 rounded-xl flex items-center justify-center text-white font-semibold"
                                style={{ backgroundColor: cat.color }}
                            >
                                {cat.label}
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
