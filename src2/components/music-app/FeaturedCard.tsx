import { ChevronRight } from 'lucide-react';

interface FeaturedCardProps {
    title: string;
    subtitle: string;
    tag?: string;
    imageUrl: string;
    participants?: number;
}

export function FeaturedCard({
    title,
    subtitle,
    tag = "熱門挑戰",
    imageUrl,
    participants
}: FeaturedCardProps) {
    return (
        <div
            className="relative w-full h-[200px] rounded-2xl overflow-hidden bg-cover bg-center"
            style={{ backgroundImage: `url(${imageUrl})` }}
        >
            {/* 漸層遮罩 */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* 內容 */}
            <div className="absolute inset-0 flex flex-col justify-end p-4">
                <span className="inline-block w-fit px-2.5 py-1 mb-2 text-[11px] font-semibold text-white bg-primary rounded-full">
                    {tag}
                </span>
                <h3 className="text-white text-xl font-bold mb-1">{title}</h3>
                <div className="flex items-center justify-between">
                    <p className="text-white/70 text-sm">{subtitle}</p>
                    {participants && (
                        <span className="text-white/50 text-xs">{participants} 人參與</span>
                    )}
                </div>
            </div>

            {/* 播放按鈕 */}
            <button className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-primary rounded-full">
                <ChevronRight size={20} className="text-white ml-0.5" />
            </button>
        </div>
    );
}
