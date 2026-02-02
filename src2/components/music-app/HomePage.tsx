import { StatusBar } from './StatusBar';
import { FeaturedCard } from './FeaturedCard';
import { QuickAccess } from './QuickAccess';
import { ChallengeList } from './ChallengeList';
import { TabBar } from './TabBar';

// 示範數據
const sampleChallenges = [
    {
        id: '1',
        name: '風櫃嘴爬坡挑戰',
        distance: '5.8km',
        gradient: '7.8%均坡',
        imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop'
    },
    {
        id: '2',
        name: '武嶺極限挑戰',
        distance: '55km',
        gradient: '3,275m爬升',
        imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=200&h=200&fit=crop'
    },
];

interface HomePageProps {
    onTabChange?: (tab: string) => void;
    activeTab?: string;
}

export function HomePage({ onTabChange, activeTab = 'home' }: HomePageProps) {
    return (
        <div className="flex flex-col w-[390px] h-[844px] bg-bg overflow-hidden">
            <StatusBar />

            {/* Header */}
            <header className="flex justify-between items-center px-5 py-3">
                <h1 className="text-white text-[34px] font-bold font-display">探索</h1>
                <div className="w-9 h-9 flex items-center justify-center bg-primary rounded-full">
                    <span className="text-white text-base font-bold">T</span>
                </div>
            </header>

            {/* 可滾動內容區 */}
            <main className="flex-1 overflow-y-auto flex flex-col gap-6 pb-4">
                {/* 精選卡片 */}
                <section className="px-5">
                    <FeaturedCard
                        title="風櫃嘴爬坡挑戰"
                        subtitle="5.8km · 7.8%均坡"
                        participants={578}
                        imageUrl="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop"
                    />
                </section>

                {/* 快捷入口 */}
                <QuickAccess />

                {/* 挑戰列表 */}
                <ChallengeList challenges={sampleChallenges} />
            </main>

            {/* 底部導航 */}
            <TabBar activeTab={activeTab} onTabChange={onTabChange || (() => { })} />
        </div>
    );
}
