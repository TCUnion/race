
import React, { useState, useEffect, Suspense } from 'react';
import { Users2, Trophy, Loader2, Calendar, MapPin, Plus, Save, AlertCircle, Zap, TrendingUp, Mountain, Trash2, Pencil } from 'lucide-react';
import { API_BASE_URL } from '../../lib/api_config';
import { useAuth } from '../../hooks/useAuth';
import { resolveAvatarUrl } from '../../lib/imageUtils';
import SegmentMap from '../map/SegmentMap';
const CaptainWarRoom = React.lazy(() => import('./CaptainWarRoom'));

const TeamDashboard: React.FC = () => {
    const { athlete, isAdmin } = useAuth();
    const [loading, setLoading] = useState(true);
    const [teamData, setTeamData] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [races, setRaces] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'members' | 'races' | 'war_room'>('members');

    // Admin: Create Race State (兩階段流程)
    const [isCreatingRace, setIsCreatingRace] = useState(false);
    const [raceCreationStep, setRaceCreationStep] = useState<'input_id' | 'confirm'>('input_id');
    const [segmentIdInput, setSegmentIdInput] = useState('');
    const [fetchingSegment, setFetchingSegment] = useState(false);
    const [fetchedSegment, setFetchedSegment] = useState<any>(null);
    const [newRace, setNewRace] = useState({
        name: '',
        segment_id: '',
        start_date: '',
        end_date: ''
    });

    // Admin: Edit Race State
    const [editingRace, setEditingRace] = useState<any>(null);
    const [editFormData, setEditFormData] = useState({
        name: '',
        start_date: '',
        end_date: ''
    });

    useEffect(() => {
        if (athlete) {
            fetchTeamData();
        }
    }, [athlete]);

    // Check permissions
    const currentUser = members.find(m => m.strava_id === athlete?.id);
    const memberType = currentUser?.member_type || '';
    const isCaptain = memberType.includes('隊長');
    const canSeeWarRoom = isAdmin ||
        memberType.includes('付費車隊管理員') ||
        memberType.includes('隊長') ||
        memberType.includes('管理員');

    // Auto-switch to War Room for Privileged Users
    useEffect(() => {
        if (members.length > 0 && athlete?.id && canSeeWarRoom) {
            setActiveTab('war_room');
        }
    }, [members, athlete?.id, canSeeWarRoom]);

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

            // 3. Fetch Races (using team_name)
            if (teamJson.team_name) {
                try {
                    const racesRes = await fetch(`${API_BASE_URL}/api/teams/races?team_name=${encodeURIComponent(teamJson.team_name)}`);
                    const racesJson = await racesRes.json();
                    // 防禦性編碼：確保 races 是陣列
                    setRaces(Array.isArray(racesJson) ? racesJson : []);
                } catch (raceErr) {
                    console.error('[TeamDashboard] Fetch races error:', raceErr);
                    setRaces([]);
                }
            }

        } catch (err: any) {
            console.error(err);
            setError("載入車隊資訊失敗");
        } finally {
            setLoading(false);
        }
    };

    // Step 1: 取得路段資料（從 n8n webhook）
    const handleFetchSegment = async () => {
        if (!segmentIdInput.trim()) {
            alert('請輸入 Strava Segment ID');
            return;
        }

        setFetchingSegment(true);
        try {
            const response = await fetch('https://service.criterium.tw/webhook/segment_set', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ segment_id: segmentIdInput.trim() })
            });

            const responseText = await response.text();
            if (!responseText || responseText.trim() === "") {
                throw new Error("伺服器回傳了空內容");
            }

            const segmentData = JSON.parse(responseText);
            if (!segmentData || !segmentData.id) {
                throw new Error("無法取得路段資料，請確認 Segment ID 是否正確");
            }

            // 設定取得的路段資料
            setFetchedSegment(segmentData);
            setNewRace({
                name: segmentData.name || `路段 ${segmentIdInput}`,
                segment_id: segmentIdInput.trim(),
                start_date: '',
                end_date: ''
            });
            setRaceCreationStep('confirm');
        } catch (err: any) {
            alert('取得路段資料失敗: ' + err.message);
        } finally {
            setFetchingSegment(false);
        }
    };

    // Step 2: 確認並建立賽事
    const handleCreateRace = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_BASE_URL}/api/teams/races`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    strava_id: athlete?.id,
                    team_name: teamData.team_name,
                    ...newRace,
                    // 包含路段統計資料
                    distance: fetchedSegment?.distance,
                    average_grade: fetchedSegment?.average_grade,
                    elevation_gain: fetchedSegment?.total_elevation_gain || fetchedSegment?.elevation_gain,
                    polyline: typeof fetchedSegment?.map === 'string' ? fetchedSegment.map : (fetchedSegment?.map?.polyline || fetchedSegment?.polyline)
                })
            });

            if (response.ok) {
                // Generate share link
                const shareUrl = `${window.location.origin}/dashboard?segment_id=${newRace.segment_id}`;

                // Show link to user
                window.prompt('賽事建立成功！請複製以下連結分享給隊員：', shareUrl);

                // 重設所有狀態
                setIsCreatingRace(false);
                setRaceCreationStep('input_id');
                setSegmentIdInput('');
                setFetchedSegment(null);
                setNewRace({ name: '', segment_id: '', start_date: '', end_date: '' });
                // Refresh races
                try {
                    const racesRes = await fetch(`${API_BASE_URL}/api/teams/races?team_name=${encodeURIComponent(teamData.team_name)}`);
                    const racesJson = await racesRes.json();
                    setRaces(Array.isArray(racesJson) ? racesJson : []);
                } catch {
                    setRaces([]);
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                alert("建立失敗: " + (errorData.detail || "未知錯誤"));
            }
        } catch (err) {
            alert("建立失敗");
        }
    };



    // 取消建立賽事
    const handleCancelCreateRace = () => {
        setIsCreatingRace(false);
        setRaceCreationStep('input_id');
        setSegmentIdInput('');
        setFetchedSegment(null);
        setNewRace({ name: '', segment_id: '', start_date: '', end_date: '' });
    };

    // 編輯賽事 - 開始編輯
    const handleStartEdit = (race: any) => {
        const startDate = new Date(race.start_date);
        const endDate = new Date(race.end_date);

        setEditingRace(race);
        setEditFormData({
            name: race.name,
            start_date: startDate.toISOString().slice(0, 16),
            end_date: endDate.toISOString().slice(0, 16)
        });
    };

    // 編輯賽事 - 取消編輯
    const handleCancelEdit = () => {
        setEditingRace(null);
        setEditFormData({ name: '', start_date: '', end_date: '' });
    };

    // 編輯賽事 - 儲存變更
    const handleUpdateRace = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!editFormData.name || !editFormData.start_date || !editFormData.end_date) {
            alert('請填寫所有欄位');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/teams/races/${editingRace.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    strava_id: athlete?.id,
                    team_name: teamData.team_name,
                    name: editFormData.name,
                    start_date: editFormData.start_date,
                    end_date: editFormData.end_date
                })
            });

            if (response.ok) {
                // Refresh races
                const racesRes = await fetch(`${API_BASE_URL}/api/teams/races?team_name=${encodeURIComponent(teamData.team_name)}`);
                const racesData = await racesRes.json();
                setRaces(racesData);
                handleCancelEdit();
            } else {
                const err = await response.json();
                alert('更新失敗: ' + (err.detail || '未知錯誤'));
            }
        } catch (error) {
            console.error('Update race error:', error);
            alert('更新發生錯誤');
        }
    };

    // 刪除賽事 (Admin Only)
    const handleDeleteRace = async (raceId: number, raceName: string) => {
        if (!confirm(`確定要刪除賽事「${raceName}」嗎？此操作無法復原。`)) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/teams/races/${raceId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    strava_id: athlete?.id,
                    team_name: teamData.team_name
                })
            });

            if (response.ok) {
                // Refresh races
                const racesRes = await fetch(`${API_BASE_URL}/api/teams/races?team_name=${encodeURIComponent(teamData.team_name)}`);
                const racesData = await racesRes.json();
                setRaces(racesData);
            } else {
                const err = await response.json();
                alert('刪除失敗: ' + (err.detail || '未知錯誤'));
            }
        } catch (error) {
            console.error('Delete race error:', error);
            alert('刪除發生錯誤');
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
                {/* Captain's War Room Tab - Visible to Privileged Users */}
                {canSeeWarRoom && (
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
                                                            src={resolveAvatarUrl(member.avatar) || "https://www.strava.com/assets/users/placeholder_athlete.png"}
                                                            alt={member.real_name}
                                                            referrerPolicy="no-referrer"
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
                    {/* 管理員或隊長且目前沒有賽事才能建立 (限制一場) */}
                    {canSeeWarRoom && races.length === 0 && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">{isCreatingRace ? (
                            <div className="space-y-4">
                                {/* Step 1: 輸入 Segment ID */}
                                {raceCreationStep === 'input_id' && (
                                    <div>
                                        <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">建立新賽事 - 步驟 1/2</h3>
                                        <p className="text-sm text-slate-700 dark:text-slate-400 mb-4">輸入 Strava 路段 ID，系統會自動取得路段資訊</p>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <input
                                                type="number"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                placeholder="Strava Segment ID (例如: 12345678)"
                                                value={segmentIdInput}
                                                onChange={e => setSegmentIdInput(e.target.value.replace(/\D/g, ''))}
                                                className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                disabled={fetchingSegment}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleFetchSegment}
                                                disabled={fetchingSegment}
                                                className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
                                            >
                                                {fetchingSegment ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        取得中...
                                                    </>
                                                ) : (
                                                    <>
                                                        <MapPin className="w-4 h-4" />
                                                        取得路段
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                        <div className="flex justify-end mt-4">
                                            <button
                                                type="button"
                                                onClick={handleCancelCreateRace}
                                                className="px-4 py-2 text-slate-700 dark:text-slate-400 font-bold hover:text-slate-900 dark:hover:text-slate-200"
                                            >
                                                取消
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Step 2: 確認路段資訊並設定日期 */}
                                {raceCreationStep === 'confirm' && fetchedSegment && (
                                    <form onSubmit={handleCreateRace}>
                                        <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">建立新賽事 - 步驟 2/2</h3>

                                        {/* 路段資訊預覽 */}
                                        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 mb-4 border border-slate-200 dark:border-slate-700">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                                                    <MapPin className="w-5 h-5 text-green-600" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 dark:text-white">{fetchedSegment.name}</p>
                                                    <p className="text-xs text-slate-500">Segment ID: {newRace.segment_id}</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 text-sm">
                                                <div>
                                                    <span className="text-slate-600 dark:text-slate-400">距離</span>
                                                    <p className="font-bold text-slate-900 dark:text-white">{((fetchedSegment.distance || 0) / 1000).toFixed(2)} km</p>
                                                </div>
                                                <div>
                                                    <span className="text-slate-600 dark:text-slate-400">爬升</span>
                                                    <p className="font-bold text-slate-900 dark:text-white">{fetchedSegment.total_elevation_gain || fetchedSegment.elevation_gain || 0} m</p>
                                                </div>
                                                <div>
                                                    <span className="text-slate-600 dark:text-slate-400">平均坡度</span>
                                                    <p className="font-bold text-slate-900 dark:text-white">{fetchedSegment.average_grade || 0}%</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 賽事設定 */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">賽事名稱</label>
                                                <input
                                                    type="text"
                                                    value={newRace.name}
                                                    onChange={e => setNewRace({ ...newRace, name: e.target.value })}
                                                    className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 w-full text-slate-900 dark:text-white"
                                                    required
                                                />
                                            </div>
                                            <div></div>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">開始時間</label>
                                                <input
                                                    type="datetime-local"
                                                    value={newRace.start_date}
                                                    onChange={e => setNewRace({ ...newRace, start_date: e.target.value })}
                                                    className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 w-full text-slate-900 dark:text-white"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">結束時間</label>
                                                <input
                                                    type="datetime-local"
                                                    value={newRace.end_date}
                                                    onChange={e => setNewRace({ ...newRace, end_date: e.target.value })}
                                                    className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 w-full text-slate-900 dark:text-white"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end mt-4">
                                            <button
                                                type="button"
                                                onClick={() => setRaceCreationStep('input_id')}
                                                className="w-full sm:w-auto px-4 py-2 text-slate-500 font-bold hover:text-slate-700"
                                            >
                                                返回
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleCancelCreateRace}
                                                className="w-full sm:w-auto px-4 py-2 text-slate-500 font-bold hover:text-slate-700"
                                            >
                                                取消
                                            </button>
                                            <button
                                                type="submit"
                                                className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"
                                            >
                                                建立賽事
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
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
                        {races.map((race) => {
                            // 判斷是否進行中
                            const now = new Date();
                            const startDate = new Date(race.start_date);
                            const endDate = new Date(race.end_date);
                            const isOngoing = now >= startDate && now <= endDate;

                            // 格式化日期
                            const formatDate = (d: Date) => d.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' });

                            return (
                                <div
                                    key={race.id}
                                    className={`
                                        group relative overflow-hidden rounded-2xl border transition-all duration-300
                                        flex flex-col sm:flex-row
                                        ${isOngoing
                                            ? 'bg-gradient-to-br from-slate-900 to-slate-800 border-strava-orange/30 hover:border-strava-orange/60 hover:shadow-xl hover:shadow-strava-orange/10'
                                            : 'bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700/50 hover:border-slate-600 hover:shadow-lg'
                                        }
                                    `}
                                >
                                    {/* 進行中標籤 */}
                                    {isOngoing && (
                                        <div className="absolute top-2 right-2 sm:top-auto sm:bottom-3 sm:right-3 z-20 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-strava-orange text-white text-[10px] font-black uppercase tracking-wider shadow-lg">
                                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                            進行中
                                        </div>
                                    )}

                                    {/* Map Preview - Square on All Devices */}
                                    <div className="relative w-full aspect-square sm:w-40 sm:h-auto sm:aspect-square shrink-0 bg-slate-800/50 border-b sm:border-b-0 sm:border-r border-white/5">
                                        <SegmentMap polyline={race.polyline} minimal className="w-full h-full opacity-80 group-hover:opacity-100 transition-opacity duration-500" />

                                        {/* Mobile Gradient Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent sm:hidden pointer-events-none" />

                                        {/* Desktop Gradient Overlay (Right side fade) */}
                                        <div className="hidden sm:block absolute inset-0 bg-gradient-to-r from-transparent to-slate-900/50 pointer-events-none" />
                                    </div>

                                    {/* 內容區 */}
                                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between relative">
                                        <div className="space-y-3">
                                            <h3 className="text-xl font-black text-white tracking-tight line-clamp-1 group-hover:text-strava-orange transition-colors">
                                                {race.name}
                                            </h3>

                                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3.5 h-3.5 text-tcu-blue" />
                                                    {(race.distance / 1000).toFixed(1)}km
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                                                    {race.average_grade}%
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Mountain className="w-3.5 h-3.5 text-amber-500" />
                                                    {Math.round(race.elevation_gain)}m
                                                </span>
                                            </div>
                                        </div>

                                        {/* 底部資訊區 */}
                                        <div className="space-y-3 pt-3 mt-2 border-t border-white/5">
                                            {/* 第一行：日期 + 編輯/刪除按鈕 */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {formatDate(startDate)} - {formatDate(endDate)}
                                                </div>

                                                {canSeeWarRoom && (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleStartEdit(race);
                                                            }}
                                                            className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition-colors"
                                                            title="編輯賽事"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteRace(race.id, race.name);
                                                            }}
                                                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                                                            title="刪除賽事"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* 第二行：報名與活動狀態 */}
                                            <div className="flex items-center gap-4 text-xs">
                                                <div className="flex items-center gap-1.5 text-slate-400">
                                                    <Users2 className="w-3.5 h-3.5" />
                                                    <span className="font-semibold">報名人數:</span>
                                                    <span className="text-white font-bold">{race.participant_count || 0}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    {isOngoing ? (
                                                        <span className="px-2 py-0.5 rounded-full bg-strava-orange/20 text-strava-orange text-xs font-bold">進行中</span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-400 text-xs font-bold">已結束</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* 第三行：排行榜按鈕 */}
                                            <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold text-white transition-all hover:scale-[1.02]">
                                                <Users2 className="w-4 h-4" />
                                                查看排行榜
                                            </button>
                                        </div>
                                    </div>

                                    {/* Hover Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-strava-orange/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                </div>
                            );
                        })}
                        {races.length === 0 && !isCreatingRace && (
                            <div className="text-center py-12 text-slate-400 font-bold">
                                尚無進行中的賽事
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'war_room' && (
                <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-8 h-8 animate-spin text-tcu-blue" /></div>}>
                    <CaptainWarRoom members={members} />
                </Suspense>
            )}

            {/* 編輯賽事 Modal */}
            {editingRace && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
                        <h3 className="font-bold text-xl mb-4 text-slate-900 dark:text-white">編輯賽事</h3>

                        <form onSubmit={handleUpdateRace} className="space-y-4">
                            {/* 賽事名稱 */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    賽事名稱
                                </label>
                                <input
                                    type="text"
                                    value={editFormData.name}
                                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                    className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 w-full text-slate-900 dark:text-white"
                                    required
                                    placeholder="例如：禮拜三的約會"
                                />
                            </div>

                            {/* 開始時間 */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    開始時間
                                </label>
                                <input
                                    type="datetime-local"
                                    value={editFormData.start_date}
                                    onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                                    className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 w-full text-slate-900 dark:text-white"
                                    required
                                />
                            </div>

                            {/* 結束時間 */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    結束時間
                                </label>
                                <input
                                    type="datetime-local"
                                    value={editFormData.end_date}
                                    onChange={(e) => setEditFormData({ ...editFormData, end_date: e.target.value })}
                                    className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 w-full text-slate-900 dark:text-white"
                                    required
                                />
                            </div>

                            {/* 按鈕 */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    儲存變更
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamDashboard;
