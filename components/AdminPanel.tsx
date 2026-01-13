import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AdminPanel: React.FC = () => {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [segments, setSegments] = useState<any[]>([]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
            if (session) fetchSegments();
        });

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) fetchSegments();
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const [editingSegment, setEditingSegment] = useState<any>(null);
    const [registrations, setRegistrations] = useState<any[]>([]);

    const fetchSegments = async () => {
        const { data, error } = await supabase.from('segments').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error('Fetch error:', error);
            setError('讀取路段失敗: ' + error.message);
        } else if (data) {
            setSegments(data);
        }
    };

    const fetchRegistrations = async (filterSegmentId: string | null = null) => {
        console.log('Fetching registrations... Session:', session, 'Filter:', filterSegmentId);

        let query = supabase
            .from('registrations')
            .select('*, segments(name, strava_id)')
            .order('registered_at', { ascending: false });

        if (filterSegmentId) {
            query = query.eq('segment_id', filterSegmentId);
        }

        const { data, error } = await query;

        console.log('Fetch result:', { data, error });
        if (error) {
            console.error('Fetch registrations error:', error);
            setError('讀取報名資料失敗: ' + error.message);
        } else if (data) {
            setRegistrations(data);
        }
    };

    useEffect(() => {
        if (session) fetchRegistrations();
    }, [session]);

    const handleUpdateSegment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSegment) return;

        let error;
        if (editingSegment.id === 'new') {
            const { error: insertError } = await supabase.from('segments').insert({
                strava_id: editingSegment.strava_id,
                name: editingSegment.name,
                description: editingSegment.description,
                link: editingSegment.link,
                is_active: editingSegment.is_active
            });
            error = insertError;
        } else {
            const { error: updateError } = await supabase
                .from('segments')
                .update({
                    name: editingSegment.name,
                    description: editingSegment.description,
                    link: editingSegment.link,
                    is_active: editingSegment.is_active
                })
                .eq('id', editingSegment.id);
            error = updateError;
        }

        if (error) {
            alert((editingSegment.id === 'new' ? '新增' : '更新') + '失敗: ' + error.message);
        } else {
            setEditingSegment(null);
            fetchSegments();
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            // 登入後重整資料
            fetchSegments();
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setSegments([]);
    };

    if (loading && !session) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tsu-blue"></div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="max-w-md mx-auto my-20 p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800">
                <h2 className="text-2xl font-black italic mb-6 uppercase tracking-tight">管理員登入</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-tsu-blue"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">密碼</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-tsu-blue"
                            required
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm font-bold">{error}</p>}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-tsu-blue hover:bg-tsu-blue-light text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-tsu-blue/20"
                    >
                        {loading ? '登入中...' : '立即登入'}
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-black italic uppercase tracking-tighter">
                        管理後台 <span className="text-tsu-blue text-lg not-italic opacity-50 ml-2">Admin Dashboard</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-bold mt-1">
                        目前登入身份: {session.user.email}
                    </p>
                </div>
                <button
                    onClick={handleLogout}
                    className="px-6 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-red-500 hover:text-white text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all"
                >
                    登出
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 路段管理 */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-black">路段管理</h3>
                        <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-500">{segments.length} 個路段</span>
                    </div>

                    {editingSegment ? (
                        <form onSubmit={handleUpdateSegment} className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-tsu-blue">
                            <h4 className="font-bold text-tsu-blue uppercase text-sm">
                                {editingSegment.id === 'new' ? '新增路段' : `編輯路段: ${editingSegment.strava_id}`}
                            </h4>
                            {editingSegment.id === 'new' && (
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Strava ID</label>
                                    <input
                                        type="number"
                                        value={editingSegment.strava_id}
                                        onChange={(e) => setEditingSegment({ ...editingSegment, strava_id: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                        required
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">路段名稱</label>
                                <input
                                    type="text"
                                    value={editingSegment.name}
                                    onChange={(e) => setEditingSegment({ ...editingSegment, name: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">敘述 (對應首頁標題)</label>
                                <input
                                    type="text"
                                    value={editingSegment.description || ''}
                                    onChange={(e) => setEditingSegment({ ...editingSegment, description: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                    placeholder="例如：台中經典挑戰：136檢定"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">詳情連結 (對應首頁查看詳情)</label>
                                <input
                                    type="text"
                                    value={editingSegment.link || ''}
                                    onChange={(e) => setEditingSegment({ ...editingSegment, link: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                    placeholder="https://..."
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="submit"
                                    className="flex-1 bg-tsu-blue text-white font-bold py-2 rounded-lg text-sm"
                                >
                                    儲存變更
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingSegment(null)}
                                    className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2 rounded-lg text-sm"
                                >
                                    取消
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            {segments.map((seg) => (
                                <div key={seg.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl flex justify-between items-center group hover:border-tsu-blue border border-transparent transition-all">
                                    <div className="flex-1">
                                        <p className="font-bold">{seg.name}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Strava ID: {seg.strava_id}</p>
                                        {seg.description && (
                                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{seg.description}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-0.5 ${seg.is_active ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-600'} text-[10px] font-bold rounded-full`}>
                                            {seg.is_active ? '啟用' : '停用'}
                                        </span>
                                        <button
                                            onClick={() => setEditingSegment(seg)}
                                            className="material-symbols-outlined text-slate-400 hover:text-tsu-blue text-lg transition-colors"
                                        >
                                            edit
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {segments.length === 0 && !loading && (
                                <div className="text-center py-10 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200">
                                    <p className="text-slate-400 font-bold">目前無路段資料</p>
                                </div>
                            )}
                            <button
                                onClick={async () => {
                                    const strava_id = prompt('請輸入 Strava 路段 ID (數字):');
                                    if (!strava_id) return;

                                    try {
                                        // 呼叫 n8n webhook 取得路段資料
                                        const response = await fetch('https://n8n.criterium.tw/webhook/segment_set', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ segment_id: parseInt(strava_id) })
                                        });

                                        if (!response.ok) {
                                            throw new Error('無法取得路段資料');
                                        }

                                        const segment = await response.json();

                                        if (!segment || !segment.id) {
                                            throw new Error('路段資料格式錯誤');
                                        }

                                        // 顯示預覽並確認
                                        const confirmMsg = `確認新增此路段？\n\n路段名稱: ${segment.name}\nStrava ID: ${segment.id}\n距離: ${(segment.distance / 1000).toFixed(2)} km\n平均坡度: ${segment.average_grade}%\n總爬升: ${segment.total_elevation_gain} m`;

                                        if (!confirm(confirmMsg)) return;

                                        // 寫入 Supabase
                                        const { error } = await supabase.from('segments').insert({
                                            strava_id: segment.id,
                                            name: segment.name,
                                            distance: segment.distance,
                                            average_grade: segment.average_grade,
                                            total_elevation_gain: segment.total_elevation_gain,
                                            polyline: segment.map,
                                            link: segment.link || `https://www.strava.com/segments/${segment.id}`,
                                            is_active: true
                                        });

                                        if (error) {
                                            alert('新增失敗: ' + error.message);
                                        } else {
                                            alert('路段新增成功！');
                                            fetchSegments();
                                        }
                                    } catch (err: any) {
                                        alert('取得路段資料失敗: ' + (err.message || '請檢查 Strava ID 是否正確'));
                                        console.error('Segment fetch error:', err);
                                    }
                                }}
                                className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 p-4 rounded-2xl text-slate-400 font-bold hover:border-tsu-blue hover:text-tsu-blue transition-all"
                            >
                                + 新增挑戰路段
                            </button>
                        </div>
                    )}
                </div>

                {/* 報名審核列表 */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm md:col-span-2">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <h3 className="text-xl font-black">報名列表</h3>
                        <div className="flex items-center gap-4">
                            <select
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setRegistrations(prev => {
                                        // 這裡僅做前端篩選展示稍微複雜，通常我們在 fetch 時篩選
                                        // 為了簡單起見，我們這裡重新 fetch 並帶入 filter
                                        // 但因為 fetchRegistrations 是無參數的，我們改用 state
                                        return prev;
                                    });
                                    // 重新 fetch 會比較好，從資料庫撈
                                    fetchRegistrations(val);
                                }}
                                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm rounded-lg focus:ring-tsu-blue focus:border-tsu-blue block p-2.5 font-bold"
                            >
                                <option value="">全部路段</option>
                                {segments.map(seg => (
                                    <option key={seg.id} value={seg.id}>{seg.name}</option>
                                ))}
                            </select>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400 font-mono">Count: {registrations.length}</span>
                                <button onClick={() => fetchRegistrations()} className="text-sm text-tsu-blue hover:underline">重新整理</button>
                            </div>
                        </div>
                    </div>

                    {registrations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
                            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">assignment_turned_in</span>
                            <p className="text-slate-400 font-bold">目前無待處理報名</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase font-bold text-xs">
                                    <tr>
                                        <th className="px-4 py-3 rounded-l-lg">選手</th>
                                        <th className="px-4 py-3">路段</th>
                                        <th className="px-4 py-3">號碼</th>
                                        <th className="px-4 py-3">車隊</th>
                                        <th className="px-4 py-3">TCU ID</th>
                                        <th className="px-4 py-3">狀態</th>
                                        <th className="px-4 py-3 rounded-r-lg">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {registrations.map((reg) => (
                                        <tr key={reg.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-4 py-3 font-bold">{reg.athlete_name}</td>
                                            <td className="px-4 py-3 text-slate-500 text-xs">{reg.segments?.name || reg.segment_id}</td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => {
                                                        const newNum = prompt('修改選手號碼:', reg.number);
                                                        if (newNum !== null) {
                                                            supabase.from('registrations')
                                                                .update({ number: newNum })
                                                                .eq('id', reg.id)
                                                                .then(({ error }) => {
                                                                    if (error) alert('更新失敗:' + error.message);
                                                                    else fetchRegistrations();
                                                                });
                                                        }
                                                    }}
                                                    className="font-mono text-tsu-blue hover:underline font-bold"
                                                >
                                                    {reg.number || '派發'}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-slate-500">{reg.team || '-'}</td>
                                            <td className="px-4 py-3 text-slate-500 font-mono text-xs">{reg.tcu_id || '-'}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${reg.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                    reg.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {reg.status || 'Pending'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => {
                                                        if (confirm('刪除報名紀錄？')) {
                                                            supabase.from('registrations').delete().eq('id', reg.id).then(() => fetchRegistrations());
                                                        }
                                                    }}
                                                    className="text-red-400 hover:text-red-500 font-bold text-xs"
                                                >
                                                    刪除
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
