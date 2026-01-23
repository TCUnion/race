
import React, { useState, useEffect } from 'react';
import { Users2, Trophy, Loader2, Calendar, MapPin, Plus, Save, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../lib/api_config';
import { useAuth } from '../hooks/useAuth';

const TeamDashboard: React.FC = () => {
    const { athlete } = useAuth();
    const [loading, setLoading] = useState(true);
    const [teamData, setTeamData] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [races, setRaces] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'members' | 'races'>('members');

    // Admin: Create Race State
    const [isCreatingRace, setIsCreatingRace] = useState(false);
    const [newRace, setNewRace] = useState({
        name: '',
        segment_id: '',
        start_date: '',
        end_date: ''
    });

    useEffect(() => {
        if (athlete) {
            fetchTeamData();
        }
    }, [athlete]);

    const fetchTeamData = async () => {
        try {
            setLoading(true);
            // 1. Get My Team Info
            const teamRes = await fetch(`${API_BASE_URL}/api/teams/my-team?strava_id=${athlete?.id}`);
            const teamJson = await teamRes.json();

            if (!teamJson.has_team) {
                setError(teamJson.message || "您目前沒有所屬車隊");
                setLoading(false);
                return;
            }

            setTeamData(teamJson);

            // 2. Fetch Members
            if (teamJson.team_name) {
                const membersRes = await fetch(`${API_BASE_URL}/api/teams/members?team_name=${encodeURIComponent(teamJson.team_name)}`);
                const membersJson = await membersRes.json();
                setMembers(membersJson);
            }

            // 3. Fetch Races (if team exists in DB)
            if (teamJson.team_data?.id) {
                const racesRes = await fetch(`${API_BASE_URL}/api/teams/races?team_id=${teamJson.team_data.id}`);
                const racesJson = await racesRes.json();
                setRaces(racesJson);
            }

        } catch (err: any) {
            console.error(err);
            setError("載入車隊資訊失敗");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRace = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_BASE_URL}/api/teams/races`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    strava_id: athlete?.id,
                    team_id: teamData.team_data.id,
                    ...newRace
                })
            });

            if (response.ok) {
                alert("賽事建立成功！");
                setIsCreatingRace(false);
                setNewRace({ name: '', segment_id: '', start_date: '', end_date: '' });
                // Refresh races
                const racesRes = await fetch(`${API_BASE_URL}/api/teams/races?team_id=${teamData.team_data.id}`);
                const racesJson = await racesRes.json();
                setRaces(racesJson);
            } else {
                alert("建立失敗");
            }
        } catch (err) {
            alert("建立失敗");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-tsu-blue" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-12 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{error}</h2>
                <p className="text-slate-500">請確認您的 TCU 會員資料中的車隊設定。</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-tsu-blue/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="bg-tsu-blue/10 p-3 rounded-2xl">
                            <Users2 className="w-8 h-8 text-tsu-blue" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
                                {teamData?.team_name || "My Team"}
                            </h1>
                            <p className="text-slate-500 font-bold text-sm tracking-wide uppercase">
                                Team Dashboard
                            </p>
                        </div>
                    </div>

                    {teamData?.is_admin && (
                        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/10 text-yellow-600 rounded-full text-xs font-black uppercase tracking-widest">
                            <Save className="w-3 h-3" />
                            Team Admin
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-8">
                <button
                    onClick={() => setActiveTab('members')}
                    className={`flex-1 py-4 rounded-xl font-black uppercase tracking-wider text-sm transition-all ${activeTab === 'members'
                        ? 'bg-tsu-blue text-white shadow-lg shadow-tsu-blue/30'
                        : 'bg-white dark:bg-slate-900 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                >
                    成員列表 ({members.length})
                </button>
                <button
                    onClick={() => setActiveTab('races')}
                    className={`flex-1 py-4 rounded-xl font-black uppercase tracking-wider text-sm transition-all ${activeTab === 'races'
                        ? 'bg-tsu-blue text-white shadow-lg shadow-tsu-blue/30'
                        : 'bg-white dark:bg-slate-900 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                >
                    車隊賽事 ({races.length})
                </button>
            </div>

            {/* Content */}
            {activeTab === 'members' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {members.map((member, idx) => {
                        const isCaptain = member.member_type?.includes('隊長');
                        return (
                            <div key={idx} className={`relative bg-white dark:bg-slate-900 p-6 rounded-3xl border transition-all hover:scale-[1.02] duration-300 ${isCaptain
                                    ? 'border-yellow-500/50 shadow-xl shadow-yellow-500/10'
                                    : 'border-slate-100 dark:border-slate-800 hover:border-tsu-blue/30 shadow-sm'
                                }`}>
                                {isCaptain && (
                                    <div className="absolute -top-3 -right-3 bg-gradient-to-br from-yellow-400 to-yellow-600 text-white p-2 rounded-xl shadow-lg transform rotate-12">
                                        <Trophy className="w-5 h-5" />
                                    </div>
                                )}

                                <div className="flex items-center gap-5">
                                    <div className="relative">
                                        <img
                                            src={member.avatar || "https://www.strava.com/assets/users/placeholder_athlete.png"}
                                            alt={member.real_name}
                                            className={`w-16 h-16 rounded-2xl object-cover ${isCaptain ? 'ring-4 ring-yellow-500/20' : 'ring-4 ring-slate-100 dark:ring-slate-800'
                                                }`}
                                        />
                                        {member.strava_id && (
                                            <div className="absolute -bottom-1 -right-1 bg-orange-500 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm">
                                                <img src="https://www.strava.com/favicon.ico" alt="strava" className="w-3 h-3 grayscale brightness-200" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-black text-slate-900 dark:text-white truncate text-lg">
                                                {member.real_name}
                                            </h3>
                                        </div>

                                        <div className="flex flex-wrap gap-2 items-center">
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${isCaptain
                                                    ? 'bg-yellow-500 text-white'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                                }`}>
                                                {member.member_type || '隊員'}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                ID: {member.tcu_id}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                                    <span>Status</span>
                                    <span className={member.strava_id ? 'text-green-500' : 'text-slate-300'}>
                                        {member.strava_id ? '已綁定 Strava' : '尚未綁定'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {activeTab === 'races' && (
                <div className="space-y-6">
                    {teamData?.is_admin && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                            {isCreatingRace ? (
                                <form onSubmit={handleCreateRace} className="space-y-4">
                                    <h3 className="font-bold text-lg mb-4">建立新賽事</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <input
                                            type="text"
                                            placeholder="賽事名稱"
                                            value={newRace.name}
                                            onChange={e => setNewRace({ ...newRace, name: e.target.value })}
                                            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full"
                                            required
                                        />
                                        <input
                                            type="text"
                                            placeholder="Strava Segment ID"
                                            value={newRace.segment_id}
                                            onChange={e => setNewRace({ ...newRace, segment_id: e.target.value })}
                                            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full"
                                            required
                                        />
                                        <input
                                            type="datetime-local"
                                            value={newRace.start_date}
                                            onChange={e => setNewRace({ ...newRace, start_date: e.target.value })}
                                            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full"
                                            required
                                        />
                                        <input
                                            type="datetime-local"
                                            value={newRace.end_date}
                                            onChange={e => setNewRace({ ...newRace, end_date: e.target.value })}
                                            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full"
                                            required
                                        />
                                    </div>
                                    <div className="flex gap-2 justify-end mt-4">
                                        <button
                                            type="button"
                                            onClick={() => setIsCreatingRace(false)}
                                            className="px-4 py-2 text-slate-500 font-bold hover:text-slate-700"
                                        >
                                            取消
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-6 py-2 bg-tsu-blue text-white rounded-xl font-bold hover:bg-tsu-blue-dark"
                                        >
                                            建立
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <button
                                    onClick={() => setIsCreatingRace(true)}
                                    className="w-full flex items-center justify-center gap-2 py-4 text-slate-400 hover:text-tsu-blue hover:bg-white dark:hover:bg-slate-800 transition-all rounded-xl font-bold uppercase tracking-widest"
                                >
                                    <Plus className="w-5 h-5" />
                                    建立新賽事
                                </button>
                            )}
                        </div>
                    )}

                    <div className="grid gap-4">
                        {races.map((race) => (
                            <div key={race.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex justify-between items-center group hover:border-tsu-blue/30 transition-all">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{race.name}</h3>
                                    <div className="flex gap-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            Seg ID: {race.segment_id}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(race.start_date).toLocaleDateString()} - {new Date(race.end_date).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trophy className="w-6 h-6 text-yellow-500" />
                                </div>
                            </div>
                        ))}
                        {races.length === 0 && !isCreatingRace && (
                            <div className="text-center py-12 text-slate-400 font-bold">
                                尚無進行中的賽事
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamDashboard;
