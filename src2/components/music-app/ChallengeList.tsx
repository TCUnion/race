import { Play, Users } from 'lucide-react';
import SegmentMap from '../../../src/features/map/SegmentMap';
import { getTeamColor } from '../../../src/utils/teamColors';

interface Challenge {
    id: string;
    name: string;
    distance: string;
    gradient: string;
    imageUrl: string;
    polyline?: string;
    team?: string;
}

interface ChallengeListProps {
    challenges: Challenge[];
    onChallengeClick?: (id: string) => void;
}

export function ChallengeList({ challenges, onChallengeClick }: ChallengeListProps) {
    return (
        <div className="w-full px-5">
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-white text-lg font-bold">近期挑戰</h2>
            </div>

            <div className="flex flex-col gap-2">
                {challenges.map((challenge) => (
                    <button
                        key={challenge.id}
                        onClick={() => onChallengeClick?.(challenge.id)}
                        className="flex items-center gap-3 p-3 bg-bg-card rounded-xl relative overflow-hidden"
                    >
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 relative bg-bg-darker">
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
                                <h3 className="text-white text-[15px] font-medium truncate">{challenge.name}</h3>
                                {challenge.team && (
                                    <div
                                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full shrink-0"
                                        style={{ backgroundColor: getTeamColor(challenge.team) }}
                                    >
                                        <span className="text-[9px] font-bold text-white shadow-black drop-shadow-sm">{challenge.team}</span>
                                    </div>
                                )}
                            </div>
                            <p className="text-text-secondary text-[13px]">
                                {challenge.distance} · {challenge.gradient}
                            </p>
                        </div>
                        <div className="w-8 h-8 flex items-center justify-center bg-primary-soft rounded-full shrink-0">
                            <Play size={14} className="text-primary ml-0.5" fill="currentColor" />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
