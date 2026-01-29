
import React, { useState, useEffect } from 'react';
import { Users2, Trophy, Loader2, Calendar, MapPin, Plus, Save, AlertCircle, Zap } from 'lucide-react';
import { API_BASE_URL } from '../../lib/api_config';
import { useAuth } from '../../hooks/useAuth';
import CaptainWarRoom from './CaptainWarRoom';

const TeamDashboard: React.FC = () => {
    const { athlete } = useAuth();
    const [loading, setLoading] = useState(true);
    const [teamData, setTeamData] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [races, setRaces] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'members' | 'races' | 'war_room'>('members');

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

    // Auto-switch to War Room for Paid Team Managers
    useEffect(() => {
        if (members.length > 0 && athlete?.id) {
            const currentUser = members.find(m => m.strava_id === athlete.id);
            if (currentUser?.member_type?.includes('付費車隊管理員')) {
                setActiveTab('war_room');
            }
        }
    }, [members, athlete?.id]);

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
                // 防禦性編碼：確保回傳是陣列
                setMembers(Array.isArray(membersJson) ? membersJson : []);
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
                <Loader2 className="w-8 h-8 animate-spin text-tcu-blue" />
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
                <div className="absolute top-0 right-0 w-64 h-64 bg-tcu-blue/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="bg-tcu-blue/10 p-3 rounded-2xl">
                            <Users2 className="w-8 h-8 text-tcu-blue" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-yellow-500">
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
                {/* Captain's War Room Tab - Visible to Paid Team Managers */}
                {members.find(m => m.strava_id === athlete?.id)?.member_type?.includes('付費車隊管理員') && (
                    <button
                        onClick={() => setActiveTab('war_room')}
                        className={`flex-1 py-4 rounded-xl font-black uppercase tracking-wider text-sm transition-all border-2 relative overflow-hidden group ${activeTab === 'war_room'
                            ? 'bg-red-600 border-red-600 text-white shadow-xl shadow-red-600/40 scale-[1.02]'
                            : 'bg-white dark:bg-slate-900 border-red-100 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                            }`}
                    >
                        <div className={`absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 transition-opacity ${activeTab === 'war_room' ? 'opacity-20' : 'group-hover:opacity-20'}`}></div>
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            <Zap className={`w-4 h-4 ${activeTab === 'war_room' ? 'animate-pulse' : ''}`} fill="currentColor" />
                            <span className="italic">隊長戰情室</span>
                        </span>
                    </button>
                )}
                <button
                    onClick={() => setActiveTab('members')}
                    className={`flex-1 py-4 rounded-xl font-black uppercase tracking-wider text-sm transition-all ${activeTab === 'members'
                        ? 'bg-tcu-blue text-white shadow-lg shadow-tcu-blue/30'
                        : 'bg-white dark:bg-slate-900 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                >
                    成員列表 ({members.length})
                </button>
                <button
                    onClick={() => setActiveTab('races')}
                    className={`flex-1 py-4 rounded-xl font-black uppercase tracking-wider text-sm transition-all ${activeTab === 'races'
                        ? 'bg-tcu-blue text-white shadow-lg shadow-tcu-blue/30'
                        : 'bg-white dark:bg-slate-900 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                >
                    車隊賽事 ({races.length})
                </button>
            </div>

            {/* Content */}
            {activeTab === 'members' && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-lg">
                    {/* Table Header */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-850">
                                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">成員</th>
                                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">暱稱</th>
                                    <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider text-slate-500">年齡</th>
                                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">身份</th>
                                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500 hidden md:table-cell">能力分組</th>
                                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500 hidden lg:table-cell">個人說明</th>
                                    <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider text-slate-500">Strava</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {members.map((member, idx) => {
                                    const isAdmin = member.member_type?.includes('付費車隊管理員');
                                    const isCaptain = member.member_type?.includes('隊長');
                                    const isHighlighted = isAdmin || isCaptain;

                                    // Parse skills
                                    const skillBadges = [];
                                    if (member.skills) {
                                        const skillMap = {
                                            '公路賽': { color: 'bg-indigo-500', label: '公路賽' },
                                            '公路登山': { color: 'bg-emerald-500', label: '公路登山' },
                                            '公路繞圈': { color: 'bg-amber-500', label: '公路繞圈' },
                                            '計時賽TT': { color: 'bg-rose-500', label: '計時賽TT' },
                                        };

                                        const parts = member.skills.split(/[,，\n]/).map((s: string) => s.trim()).filter(Boolean);

                                        parts.forEach((part: string) => {
                                            const match = part.match(/^(.*?)[：:][\s]*([A-Za-z0-9\+\-]+)$/);
                                            if (match) {
                                                const skillName = match[1].trim();
                                                const grade = match[2].trim();
                                                const config = skillMap[skillName as keyof typeof skillMap];

                                                if (config) {
                                                    skillBadges.push(
                                                        <div key={skillName} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm shadow-sm group-hover:bg-slate-800/80 transition-colors">
                                                            <Zap className={`w-3 h-3 ${config.color.replace('bg-', 'text-')}`} fill="currentColor" />
                                                            <span className="text-[10px] font-medium text-slate-300">{config.label} : </span>
                                                            <span className="text-xs font-black text-white">{grade}</span>
                                                        </div>
                                                    );
                                                }
                                            }
                                        });
                                    }

                                    return (
                                        <tr
                                            key={idx}
                                            className={`transition-all border-b border-slate-100 dark:border-slate-800 last:border-0 group ${isAdmin
                                                ? 'bg-purple-500/5 hover:bg-purple-500/10 dark:bg-purple-500/10 dark:hover:bg-purple-500/20'
                                                : isCaptain
                                                    ? 'bg-yellow-500/5 hover:bg-yellow-500/10 dark:bg-yellow-500/10 dark:hover:bg-yellow-500/20'
                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                                }`}
                                        >
                                            {/* 成員 */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative">
                                                        <img
                                                            src={member.avatar || "https://www.strava.com/assets/users/placeholder_athlete.png"}
                                                            alt={member.real_name}
                                                            className={`w-12 h-12 rounded-xl object-cover ${isAdmin ? 'ring-2 ring-purple-500'
                                                                : isCaptain ? 'ring-2 ring-yellow-500'
                                                                    : 'ring-1 ring-slate-200 dark:ring-slate-700'
                                                                }`}
                                                        />
                                                        {isHighlighted && (
                                                            <div className={`absolute -top-1 -right-1 text-white p-1 rounded-full shadow-lg ${isAdmin ? 'bg-purple-500' : 'bg-yellow-500'
                                                                }`}>
                                                                <Trophy className="w-3 h-3" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 dark:text-white">
                                                            {member.real_name}
                                                        </div>
                                                        <div className="text-[10px] font-mono text-slate-400">
                                                            {member.tcu_id}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* 暱稱 */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-slate-600 dark:text-slate-300">
                                                    {member.nickname || '-'}
                                                </span>
                                            </td>

                                            {/* 年齡 */}
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold ${member.age
                                                    ? 'bg-tcu-blue/10 text-tcu-blue'
                                                    : 'text-slate-300'
                                                    }`}>
                                                    {member.age || '-'}
                                                </span>
                                            </td>

                                            {/* 身份 */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-3 py-1 rounded-full text-xs font-black ${isAdmin
                                                    ? 'bg-gradient-to-r from-purple-400 to-purple-600 text-white shadow-lg shadow-purple-500/30'
                                                    : isCaptain
                                                        ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-lg shadow-yellow-500/30'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                                    }`}>
                                                    {member.member_type || '隊員'}
                                                </span>
                                            </td>

                                            {/* 能力分組 */}
                                            <td className="px-6 py-4 hidden md:table-cell">
                                                <div className="flex flex-wrap gap-2 max-w-[400px]">
                                                    {skillBadges.length > 0 ? skillBadges : <span className="text-sm text-slate-400">-</span>}
                                                </div>
                                            </td>

                                            {/* 個人說明 */}
                                            <td className="px-6 py-4 hidden lg:table-cell">
                                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 max-w-xs">
                                                    {member.self_intro || '-'}
                                                </p>
                                            </td>

                                            {/* Strava 狀態 */}
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                {member.strava_id ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/10 text-orange-500 rounded-lg text-xs font-bold">
                                                        <img src="https://www.strava.com/favicon.ico" alt="strava" className="w-3 h-3" />
                                                        已綁定
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-300">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>


                    {/* Empty State */}
                    {members.length === 0 && (
                        <div className="py-16 text-center text-slate-400">
                            <Users2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p className="font-bold">尚無成員資料</p>
                        </div>
                    )}
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
                                            className="px-6 py-2 bg-tcu-blue text-white rounded-xl font-bold hover:bg-tcu-blue-dark"
                                        >
                                            建立
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <button
                                    onClick={() => setIsCreatingRace(true)}
                                    className="w-full flex items-center justify-center gap-2 py-4 text-slate-400 hover:text-tcu-blue hover:bg-white dark:hover:bg-slate-800 transition-all rounded-xl font-bold uppercase tracking-widest"
                                >
                                    <Plus className="w-5 h-5" />
                                    建立新賽事
                                </button>
                            )}
                        </div>
                    )}

                    <div className="grid gap-4">
                        {races.map((race) => (
                            <div key={race.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex justify-between items-center group hover:border-tcu-blue/30 transition-all">
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

            {activeTab === 'war_room' && (
                <CaptainWarRoom members={members} />
            )}
        </div>
    );
};

export default TeamDashboard;
