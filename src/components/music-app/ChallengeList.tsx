import { Play, Users } from 'lucide-react';
import SegmentMap from '../../features/map/SegmentMap';
import { getTeamColor } from '../../utils/teamColors';

interface Challenge {
    id: string;
    name: string;
    distance: string;
    gradient: string;
    imageUrl: string;
    polyline?: string;
    team?: string;
    endDate?: string;
}

interface ChallengeListProps {
    challenges: Challenge[];
    onChallengeClick?: (id: string) => void;
}

/**
 * 近期挑戰列表
 * - 過期挑戰（endDate < 今天）顯示灰色 + 「已結束」標籤
 * - 點擊跳轉至挑戰頁面
 */
export function ChallengeList({ challenges, onChallengeClick }: ChallengeListProps) {
    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="w-full px-5">
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-white text-lg font-bold">近期挑戰</h2>
            </div>

            <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
                {challenges.map((challenge) => {
                    // NOTE: 判斷挑戰是否已結束
                    const isExpired = challenge.endDate ? challenge.endDate < today : false;

                    return (
                        <button
                            key={challenge.id}
                            onClick={() => onChallengeClick?.(challenge.id)}
                            className={`flex items-center gap-3 p-3 text-left w-full rounded-3xl border transition-all ${isExpired
                                    ? 'bg-white/[0.03] border-white/5 opacity-50'
                                    : 'card-glow'
                                }`}
                        >
                            <div className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 relative bg-bg-darker ${isExpired ? 'grayscale' : ''}`}>
                                {challenge.polyline ? (
                                    <SegmentMap
                                        polyline={challenge.polyline}
                                        className="w-full h-full !min-h-0 pointer-events-none"
                                        minimal={true}
                                    />
                                ) : (
                                    <img
                                        src={challenge.imageUrl}
                                        alt={challenge.name}
                                        className="w-full h-full object-cover"
                                    />
                                )}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <h3 className={`text-[15px] font-medium truncate ${isExpired ? 'text-white/40' : 'text-white'}`}>
                                        {challenge.name}
                                    </h3>
                                    {isExpired && (
                                        <span className="text-[10px] font-bold text-white/30 bg-white/10 px-1.5 py-0.5 rounded-full shrink-0">
                                            已結束
                                        </span>
                                    )}
                                    {!isExpired && challenge.team && (
                                        <div
                                            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full shrink-0"
                                            style={{ backgroundColor: getTeamColor(challenge.team) }}
                                        >
                                            <span className="text-[9px] font-bold text-white shadow-black drop-shadow-sm">{challenge.team}</span>
                                        </div>
                                    )}
                                </div>
                                <p className={`text-[13px] ${isExpired ? 'text-white/20' : 'text-text-secondary'}`}>
                                    {challenge.distance} · {challenge.gradient}
                                </p>
                            </div>
                            <div className={`w-8 h-8 flex items-center justify-center rounded-full shrink-0 ${isExpired ? 'bg-white/5' : 'bg-primary-soft'
                                }`}>
                                <Play size={14} className={isExpired ? 'text-white/20 ml-0.5' : 'text-primary ml-0.5'} fill="currentColor" />
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
