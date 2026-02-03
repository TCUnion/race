import { useState, TouchEvent } from 'react';
import { useAuth } from '../../../src/hooks/useAuth';
import { useSegmentData } from '../../../src/hooks/useSegmentData';
import StravaConnect from '../../../src/features/auth/StravaConnect';
import { StatusBar } from './StatusBar';
import { FeaturedCard } from './FeaturedCard';
import { QuickAccess } from './QuickAccess';
import { ChallengeList } from './ChallengeList';
import { TabBar } from './TabBar';
import { V2View } from '../../App';
import { LogOut, User } from 'lucide-react';
import { useWeeklyStats } from '../../../src/hooks/useWeeklyStats';
import { useMemberAuthorizations } from '../../../src/hooks/useMemberAuthorizations';


interface HomePageProps {
    onTabChange?: (tab: string) => void;
    activeTab?: string;
    onNavigate?: (view: V2View, params?: any) => void;
}

export function HomePage({ onTabChange, activeTab = 'home', onNavigate }: HomePageProps) {
    const { athlete, logout, isAdmin, isBound } = useAuth();
    const { segments, statsMap, isLoading } = useSegmentData();
    const [showProfile, setShowProfile] = useState(false);
    const { stats } = useWeeklyStats(athlete?.id, athlete?.ftp);
    const { pendingAuthorizations } = useMemberAuthorizations();

    // Get the featured segment based on current index
    const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
    const featuredSegment = segments.length > 0 ? segments[currentSegmentIndex % segments.length] : null;
    const featuredStats = featuredSegment ? statsMap[featuredSegment.id] : null;

    // Color palette for dynamic tags
    const TAG_COLORS = [
        '#FC5200', // Strava Orange
        '#0EA5E9', // Sky Blue
        '#10B981', // Emerald
        '#8B5CF6', // Violet
        '#F59E0B', // Amber
        '#EC4899', // Pink
    ];
    const currentTagColor = TAG_COLORS[currentSegmentIndex % TAG_COLORS.length];

    const handleNextSegment = () => {
        if (segments.length > 0) {
            setCurrentSegmentIndex((prev) => (prev + 1) % segments.length);
        }
    };

    const handleQuickAccess = (id: string) => {
        if (!onNavigate) return;

        switch (id) {
            case 'ranking':
                onNavigate(V2View.LEADERBOARD);
                break;
            case 'training':
                onNavigate(V2View.AI_COACH);
                break;
            case 'dashboard':
                onNavigate(V2View.DASHBOARD);
                break;
            case 'team':
                onNavigate(V2View.TEAM_DASHBOARD);
                break;
            case 'maintenance':
                onNavigate(V2View.MAINTENANCE);
                break;
            default:
                break;
        }
    };


    const handlePrevSegment = () => {
        if (segments.length > 0) {
            setCurrentSegmentIndex((prev) => (prev - 1 + segments.length) % segments.length);
        }
    };

    // Touch handling for swipe
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);

    // Min swipe distance
    const minSwipeDistance = 50;

    const onTouchStart = (e: TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            handleNextSegment();
        } else if (isRightSwipe) {
            handlePrevSegment();
        }
    };

    return (
        <div className="flex flex-col w-full min-h-screen bg-bg overflow-hidden relative">
            <StatusBar />

            {/* Header */}
            <header className="flex justify-between items-center px-5 pt-1 pb-3 relative z-50">
                <div className="flex items-center gap-2">
                    <img src="/tcu-logo-light.png" alt="TCU Logo" className="h-8 w-auto" />
                    <h1 className="text-white text-[28px] font-bold font-display tracking-tight">TCU小幫手</h1>
                </div>

                {/* T Button / Profile Trigger */}
                <div className="relative">
                    <button
                        onClick={() => setShowProfile(!showProfile)}
                        className={`relative w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform border-2 border-transparent hover:border-white/20 overflow-hidden ${athlete ? 'bg-white/10' : 'bg-[#FC5200]'}`}
                    >
                        {athlete ? (
                            <>
                                <img
                                    src={athlete.profile}
                                    alt={athlete.lastname}
                                    className="w-full h-full object-cover"
                                />
                                {pendingAuthorizations.length > 0 && (
                                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-[#1a1a1a] animate-pulse"></span>
                                )}
                            </>
                        ) : (
                            <img src="/strava-logo-white.svg" alt="Strava" className="w-6 h-6" />
                        )}
                    </button>



                    {/* Member Info Dropdown */}
                    {showProfile && (
                        <div className="absolute top-12 right-0 w-[280px] bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl p-4 animate-in fade-in slide-in-from-top-2">
                            {athlete ? (
                                <div className="flex flex-col gap-4">
                                    {/* User Info Card */}
                                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl">
                                        <img
                                            src={athlete.profile}
                                            alt="Profile"
                                            className="w-12 h-12 rounded-full border-2 border-[#0EA5E9]"
                                        />
                                        <div className="flex flex-col min-w-0">
                                            <h3 className="text-white font-bold text-sm truncate">
                                                {athlete.lastname}{athlete.firstname}
                                            </h3>
                                            <div className="flex items-center gap-1">
                                                <span className="text-white/50 text-[10px] uppercase font-bold tracking-wider">TCUNION</span>
                                                {isAdmin && (
                                                    <span className="text-[#0EA5E9] text-[10px] font-black border border-[#0EA5E9]/30 px-1 rounded">ADMIN</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            {/* TCU Binding Status */}
                                            <div className={`rounded-lg p-2 flex flex-col items-center justify-center gap-1 border ${isBound ? 'bg-green-500/10 border-green-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
                                                <span className={`${isBound ? 'text-green-400/60' : 'text-orange-400/60'} text-[9px] uppercase font-black`}>TCU 狀態</span>
                                                <span className={`${isBound ? 'text-green-400' : 'text-orange-400'} text-[11px] font-black uppercase tracking-tighter`}>
                                                    {isBound ? '已連線' : '未連結'}
                                                </span>
                                            </div>

                                            {/* Weekly TSS (Replaces FTP) */}
                                            <div className="bg-white/5 rounded-lg p-2 flex flex-col items-center justify-center gap-1">
                                                <span className="text-white/40 text-[10px] uppercase font-bold">本週累積 TSS</span>
                                                <span className="text-white font-black italic">{stats.weeklyTSS || '--'}</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setShowProfile(false)}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text hover:bg-white/5 transition-colors"
                                        >
                                            <User size={18} className="text-primary" />
                                            <span>個人檔案</span>
                                        </button>

                                        {pendingAuthorizations.length > 0 && (
                                            <button
                                                onClick={() => {
                                                    setShowProfile(false);
                                                    if (onNavigate) onNavigate(V2View.DASHBOARD);
                                                }}
                                                className="w-full flex items-center justify-between px-4 py-3 text-sm text-text hover:bg-white/5 transition-colors border-t border-white/5"
                                            >
                                                <div className="flex items-center gap-3 text-red-400">
                                                    <User size={18} />
                                                    <span className="font-bold">授權請求通知</span>
                                                </div>
                                                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                                                    {pendingAuthorizations.length}
                                                </span>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                if (window.confirm('確定要登出嗎？')) {
                                                    logout();
                                                    setShowProfile(false);
                                                }
                                            }}
                                            className="w-full py-3 mt-2 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors text-xs font-bold"
                                        >
                                            <LogOut size={14} />
                                            登出帳號
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4 text-center py-2">
                                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto text-white/20">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <p className="text-white font-bold text-sm">尚未登入</p>
                                        <p className="text-white/40 text-xs mt-1">連結 Strava 帳號以獲取完整功能</p>
                                    </div>
                                    <StravaConnect>
                                        <div className="w-full py-3 bg-[#FC4C02] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#E34402] transition-colors flex items-center justify-center gap-2">
                                            Connect Strava
                                        </div>
                                    </StravaConnect>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </header>

            {/* 可滾動內容區 */}
            <main className="flex-1 overflow-y-auto flex flex-col gap-6 pb-24 scrollbar-hide" onClick={() => setShowProfile(false)}>
                {/* 精選卡片 */}
                <section
                    className="px-5 touch-pan-y"
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                >
                    {isLoading ? (
                        <div className="w-full h-[200px] rounded-2xl bg-white/5 animate-pulse" />
                    ) : featuredSegment ? (
                        <FeaturedCard
                            title={featuredSegment.description || featuredSegment.name}
                            subtitle={`${(featuredSegment.distance / 1000).toFixed(1)}km · ${Math.round(featuredSegment.total_elevation_gain || 0)}m 爬升 · ${featuredSegment.average_grade}%`}
                            participants={featuredStats?.totalAthletes || 0}
                            imageUrl="https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&q=80&w=800"

                            tag={(() => {
                                if (!featuredSegment?.start_date) return "路段挑戰";
                                try {
                                    // Handle potential ISO strings or just dates
                                    const getDatePart = (dateStr: string) => {
                                        const date = new Date(dateStr);
                                        return `${date.getMonth() + 1}/${date.getDate()}`;
                                    };

                                    const startStr = getDatePart(featuredSegment.start_date);
                                    if (featuredSegment.end_date && featuredSegment.end_date !== featuredSegment.start_date) {
                                        const endStr = getDatePart(featuredSegment.end_date);
                                        return `${startStr} - ${endStr}`;
                                    }
                                    return startStr;
                                } catch (e) {
                                    return "路段挑戰";
                                }
                            })()}
                            tagColor={currentTagColor}
                            onNext={handleNextSegment}
                            polyline={featuredSegment.polyline}
                        />
                    ) : (
                        <FeaturedCard
                            title="暫無活動"
                            subtitle="敬請期待下一場挑戰"
                            imageUrl="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop"
                        />
                    )}
                </section>

                {/* 快捷入口 */}
                <QuickAccess onItemClick={handleQuickAccess} isBound={isBound} />

                {/* 挑戰列表 */}
                <ChallengeList
                    challenges={segments.map(segment => ({
                        id: String(segment.id),
                        name: segment.name,
                        distance: `${(segment.distance / 1000).toFixed(1)}km`,
                        gradient: `${segment.average_grade}%`,
                        imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop",
                        polyline: segment.polyline
                    }))}
                    onChallengeClick={(id) => {
                        if (onNavigate) {
                            onNavigate(V2View.LEADERBOARD, { segmentId: id });
                        }
                    }}
                />

            </main>

            {/* 底部導航 - 絕對定位在最下方 */}
            <div className="absolute bottom-0 left-0 right-0 z-40">
                <TabBar activeTab={activeTab} onTabChange={onTabChange || (() => { })} />
            </div>
        </div>
    );
}
