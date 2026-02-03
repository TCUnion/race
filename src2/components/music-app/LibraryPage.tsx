import { useState, useEffect } from 'react';
import { Heart, Download, MapPin, MoreHorizontal, Plus, Calendar, Clock } from 'lucide-react';
import { StatusBar } from './StatusBar';
import { TabBar } from './TabBar';
import { RaceCreationModal } from '../../../src/features/race/RaceCreationModal';
import { supabase } from '../../../src/lib/supabase';

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

interface RaceEvent {
    id: number;
    race_name: string;
    description: string;
    cover_image_url: string;
    start_date: string;
    end_date: string;
    approval_status: 'pending' | 'approved' | 'rejected';
    rejection_reason?: string;
}

export function LibraryPage({ onTabChange, activeTab = 'library' }: LibraryPageProps) {
    const [activeSection, setActiveSection] = useState('播放列表');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTeamManager, setIsTeamManager] = useState(false);
    const [managerData, setManagerData] = useState<any>(null);
    const [userRaces, setUserRaces] = useState<RaceEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkManagerPermission();
    }, []);

    const checkManagerPermission = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setLoading(false);
                return;
            }

            const { data: manager } = await supabase
                .from('manager_roles')
                .select('id, email, role')
                .eq('email', session.user.email)
                .single();

            if (manager && manager.role === 'team_manager') {
                setIsTeamManager(true);
                setManagerData(manager);
                fetchUserRaces(manager.id);
            }
        } catch (err) {
            console.error('權限檢查失敗:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserRaces = async (managerId: number) => {
        const { data } = await supabase
            .from('race_events')
            .select('*')
            .eq('created_by_manager_id', managerId)
            .order('created_at', { ascending: false });

        if (data) setUserRaces(data);
    };

    const handleRaceCreated = () => {
        if (managerData) {
            fetchUserRaces(managerData.id);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full border border-orange-500/30">待審核</span>;
            case 'approved':
                return <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">已通過</span>;
            case 'rejected':
                return <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30">已拒絕</span>;
        }
    };

    return (
        <div className="flex flex-col w-full min-h-screen bg-bg overflow-hidden relative">
            <StatusBar />

            {/* Header */}
            <header className="flex justify-between items-center px-5 py-3">
                <h1 className="text-white text-[34px] font-bold font-display">資料庫</h1>
                {isTeamManager && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        建立比賽
                    </button>
                )}
            </header>

            {/* 可滾動內容區 */}
            <main className="flex-1 overflow-y-auto px-5 flex flex-col gap-6 pb-24 scrollbar-hide">
                {/* 我的比賽 - 只對車隊管理員顯示 */}
                {isTeamManager && userRaces.length > 0 && (
                    <section>
                        <h2 className="text-white text-lg font-bold mb-3">我的比賽</h2>
                        <div className="space-y-3">
                            {userRaces.map((race) => (
                                <div
                                    key={race.id}
                                    className="bg-[#1C1C1E] rounded-xl overflow-hidden border border-slate-800"
                                >
                                    <div className="flex gap-3 p-3">
                                        <div
                                            className="w-24 h-24 rounded-lg bg-cover bg-center flex-shrink-0"
                                            style={{ backgroundImage: `url(${race.cover_image_url})` }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h3 className="text-white font-medium truncate">{race.race_name}</h3>
                                                {getStatusBadge(race.approval_status)}
                                            </div>
                                            {race.description && (
                                                <p className="text-sm text-slate-400 line-clamp-2 mb-2">{race.description}</p>
                                            )}
                                            <div className="flex items-center gap-3 text-xs text-slate-500">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {race.start_date} ~ {race.end_date}
                                                </div>
                                            </div>
                                            {race.approval_status === 'rejected' && race.rejection_reason && (
                                                <p className="text-xs text-red-400 mt-2">拒絕原因: {race.rejection_reason}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

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

            {/* Race Creation Modal */}
            {isTeamManager && managerData && (
                <RaceCreationModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleRaceCreated}
                    managerId={managerData.id}
                    managerEmail={managerData.email}
                />
            )}
        </div>
    );
}
