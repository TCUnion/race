import { ChevronDown, Heart, SkipBack, Play, SkipForward, List } from 'lucide-react';

interface PlayerPageProps {
    challengeName?: string;
    distance?: string;
    gradient?: string;
    maxGradient?: string;
    participants?: number;
    imageUrl?: string;
    onClose?: () => void;
}

export function PlayerPage({
    challengeName = "風櫃嘴爬坡挑戰",
    distance = "5.8km",
    gradient = "7.8%",
    maxGradient = "15.2%",
    participants = 578,
    imageUrl = "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=1200&fit=crop",
    onClose
}: PlayerPageProps) {
    return (
        <div className="relative flex flex-col w-[390px] h-[844px] bg-bg overflow-hidden">
            {/* 背景圖 */}
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${imageUrl})` }}
            />
            <div className="absolute inset-0 bg-black/60" />

            {/* 內容 */}
            <div className="relative flex flex-col h-full">
                {/* 拖拽手柄 */}
                <div className="flex justify-center py-3">
                    <div className="w-10 h-[5px] bg-white/40 rounded-full" />
                </div>

                {/* 頂部控制 */}
                <div className="flex justify-between items-center px-5 mb-6">
                    <button onClick={onClose}>
                        <ChevronDown size={28} className="text-white" />
                    </button>
                    <span className="text-white text-sm font-medium">挑戰進行中</span>
                    <button>
                        <List size={24} className="text-white" />
                    </button>
                </div>

                {/* 挑戰封面 */}
                <div className="flex-1 flex flex-col items-center justify-center px-8">
                    <div
                        className="w-[280px] h-[280px] rounded-2xl shadow-2xl bg-cover bg-center mb-8"
                        style={{ backgroundImage: `url(${imageUrl})` }}
                    />

                    {/* 標題區 */}
                    <div className="w-full text-center mb-2">
                        <h1 className="text-white text-2xl font-bold mb-1">{challengeName}</h1>
                        <p className="text-white/60 text-base">{distance} · {gradient}均坡</p>
                    </div>
                </div>

                {/* 統計數據 */}
                <div className="flex justify-around px-5 py-4 bg-black/20">
                    <Stat value={distance} label="總距離" />
                    <Stat value="428m" label="爬升" color="text-secondary" />
                    <Stat value={maxGradient} label="最陡" color="text-primary" />
                    <Stat value={`${participants}`} label="參與" />
                </div>

                {/* 進度條 */}
                <div className="px-8 py-4">
                    <div className="h-1 bg-white/20 rounded-full overflow-hidden mb-2">
                        <div className="h-full w-1/3 bg-primary rounded-full" />
                    </div>
                    <div className="flex justify-between text-white/60 text-xs">
                        <span>1.9km</span>
                        <span>-3.9km</span>
                    </div>
                </div>

                {/* 控制按鈕 */}
                <div className="flex justify-center items-center gap-8 pb-12">
                    <button className="p-2">
                        <SkipBack size={32} className="text-white" fill="white" />
                    </button>
                    <button className="w-16 h-16 flex items-center justify-center bg-white rounded-full">
                        <Play size={28} className="text-bg ml-1" fill="currentColor" />
                    </button>
                    <button className="p-2">
                        <SkipForward size={32} className="text-white" fill="white" />
                    </button>
                </div>
            </div>
        </div>
    );
}

function Stat({
    value,
    label,
    color = "text-white"
}: { value: string; label: string; color?: string }) {
    return (
        <div className="flex flex-col items-center gap-1">
            <span className={`text-lg font-bold ${color}`}>{value}</span>
            <span className="text-white/60 text-xs">{label}</span>
        </div>
    );
}
