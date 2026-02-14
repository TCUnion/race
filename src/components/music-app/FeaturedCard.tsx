import { ChevronRight } from 'lucide-react';
import SegmentMap from '../../features/map/SegmentMap';

interface FeaturedCardProps {
    title: string;
    subtitle: string;
    tag?: string;
    tagColor?: string;
    imageUrl: string;
    participants?: number;
    onNext?: () => void;
    polyline?: string;
}

export function FeaturedCard({
    title,
    subtitle,
    tag = "熱門挑戰",
    tagColor = "#FC5200", // Default to Strava Orange
    imageUrl,
    participants,
    onNext,
    polyline
}: FeaturedCardProps) {
    return (
        <div className="card-glow relative w-full h-[200px] md:h-[360px] rounded-2xl overflow-hidden">
            {/* Background Layer */}
            <div className="absolute inset-0 z-0">
                {polyline ? (
                    <SegmentMap
                        polyline={polyline}
                        className="!min-h-0 h-full w-full pointer-events-none"
                    />
                ) : (
                    <img
                        src={imageUrl}
                        alt={title}
                        className="w-full h-full object-cover"
                    />
                )}
            </div>

            {/* 漸層遮罩 */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 pointer-events-none" />

            {/* 內容 */}
            <div className="absolute inset-0 flex flex-col justify-end p-4 z-20 pointer-events-none">
                <span
                    className="inline-block w-fit px-2.5 py-1 mb-2 text-[11px] font-semibold text-white rounded-full shadow-sm"
                    style={{ backgroundColor: tagColor }}
                >
                    {tag}
                </span>
                <h3 className="text-white text-xl font-bold mb-1 drop-shadow-md">{title}</h3>
                <div className="flex items-center justify-between">
                    <p className="text-white/90 text-sm font-medium drop-shadow-sm">{subtitle}</p>
                    {participants && (
                        <span className="text-white/70 text-xs font-medium">{participants} 人參與</span>
                    )}
                </div>
            </div>

            {/* 播放按鈕 - pointer-events-auto ensures it's clickable */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onNext?.();
                }}
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-primary rounded-full active:scale-95 transition-transform hover:bg-primary/90 z-30 pointer-events-auto shadow-lg"
            >
                <ChevronRight size={20} className="text-white ml-0.5" />
            </button>
        </div>
    );
}
