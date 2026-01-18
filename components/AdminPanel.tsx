import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, CheckCircle2, History, ChevronRight, ClipboardCheck, RefreshCw, Edit2, Globe, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

// 🚀 深度搜索 Polyline 函式 (地毯式搜尋)
const findPolyline = (obj: any): string => {
    if (!obj || typeof obj !== 'object') return "";

    // 1. 常見直接欄位
    if (typeof obj.polyline === 'string' && obj.polyline.length > 10) return obj.polyline;
    if (typeof obj.summary_polyline === 'string' && obj.summary_polyline.length > 10) return obj.summary_polyline;
    if (typeof obj.map_polyline === 'string' && obj.map_polyline.length > 10) return obj.map_polyline;

    // 2. map 欄位處理 (支援物件或直接字串)
    if (obj.map) {
        // 如果 map 直接就是 polyline 字串 (n8n 格式)
        if (typeof obj.map === 'string' && obj.map.length > 10) return obj.map;
        // 如果 map 是物件 (Strava 標準格式)
        if (typeof obj.map === 'object') {
            if (typeof obj.map.polyline === 'string' && obj.map.polyline.length > 10) return obj.map.polyline;
            if (typeof obj.map.summary_polyline === 'string' && obj.map.summary_polyline.length > 10) return obj.map.summary_polyline;
        }
    }

    // 3. map_id 欄位 (有時候會是 s + segment_id 格式，需要忽略)
    // 不處理 map_id，因為它不是 polyline

    // 4. 遞迴搜索 (限深二層以防循環)
    for (const key in obj) {
        if (obj[key] && typeof obj[key] === 'object' && key !== 'map') {
            const found = findPolyline(obj[key]);
            if (found && found.length > 10) return found;
        }
    }
    return "";
};

const normalizeSegment = (raw: any): any => {
    const data = Array.isArray(raw) ? raw[0] : raw;
    if (!data) return null;

    // 🚀 多重備援 Key 檢查 (Strava API 有時會變動，或經過 n8n 轉換)
    const elevation = data.total_elevation_gain || data.elevation_gain || (data.elevationDetail?.total_gain);
    const id = data.id || data.strava_id || data.segment_id;

    return {
        id: id,
        strava_id: id,
        name: data.name,
        description: data.description || data.name,
        link: data.link || `https://www.strava.com/segments/${id}`,
        distance: data.distance,
        average_grade: data.average_grade,
        maximum_grade: data.maximum_grade,
        elevation_gain: elevation,
        elevation_high: data.elevation_high,
        elevation_low: data.elevation_low,
        total_elevation_gain: elevation,
        activity_type: data.activity_type || 'Ride',
        climb_category: data.climb_category,
        city: data.city,
        state: data.state,
        country: data.country,
        star_count: data.star_count,
        athlete_count: data.athlete_count,
        kom: data.KOM || data.kom || data.kom_time,
        qom: data.QOM || data.qom || data.qom_time,
        pr_elapsed_time: data.pr_elapsed_time || data.athlete_segment_stats?.pr_elapsed_time,
        pr_date: data.pr_date || data.athlete_segment_stats?.pr_date,
        elevation_profile: data.elevation_profile,
        polyline: findPolyline(data)
    };
};

const AdminPanel: React.FC = () => {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [segments, setSegments] = useState<any[]>([]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
            if (session) {
                fetchSegments();
                fetchSiteSettings();
            } else {
                // 嘗試從 localStorage 讀取記住的登入資訊
                const savedEmail = localStorage.getItem('admin_email');
                const savedPassword = localStorage.getItem('admin_password');
                if (savedEmail) {
                    setEmail(savedEmail);
                    setRememberMe(true);
                }
                if (savedPassword) {
                    setPassword(savedPassword);
                }
            }
        });

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) {
                fetchSegments();
                fetchSiteSettings();
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const [editingSegment, setEditingSegment] = useState<any>(null);
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [siteSettings, setSiteSettings] = useState<any[]>([]);
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    const fetchSegments = async () => {
        const { data, error } = await supabase.from('segments').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error('Fetch error:', error);
            setError('讀取路段失敗: ' + error.message);
        } else if (data) {
            setSegments(data);
        }
    };

    const handleRefreshSegment = async (seg: any) => {
        if (!confirm(`確定要重新整理「${seg.name}」的資料與地圖嗎？`)) return;

        try {
            const sid = seg.strava_id;
            if (!sid) {
                alert('缺少 Strava ID，無法重新整理');
                return;
            }

            const response = await fetch('https://n8n.criterium.tw/webhook/segment_set', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ segment_id: sid })
            });

            const responseText = await response.text();
            if (!responseText || responseText.trim() === "") throw new Error("伺服器回傳了空內容");

            const segmentData = JSON.parse(responseText);
            const normalized = normalizeSegment(segmentData);
            if (!normalized) throw new Error("正規化資料後為空，請檢查伺服器回傳格式");

            if (!normalized.polyline) {
                alert('警告：雖然成功取得資料，地圖路線 (Polyline) 仍然缺失。');
            }

            const { error } = await supabase
                .from('segments')
                .update({
                    name: normalized.name || seg.name,
                    distance: normalized.distance || seg.distance,
                    average_grade: normalized.average_grade || seg.average_grade,
                    maximum_grade: normalized.maximum_grade || seg.maximum_grade,
                    elevation_gain: normalized.elevation_gain || seg.elevation_gain,
                    elevation_high: normalized.elevation_high,
                    elevation_low: normalized.elevation_low,
                    total_elevation_gain: normalized.total_elevation_gain,
                    activity_type: normalized.activity_type,
                    climb_category: normalized.climb_category,
                    city: normalized.city,
                    state: normalized.state,
                    country: normalized.country,
                    star_count: normalized.star_count,
                    athlete_count: normalized.athlete_count,
                    kom: normalized.kom,
                    qom: normalized.qom,
                    pr_elapsed_time: normalized.pr_elapsed_time,
                    pr_date: normalized.pr_date,
                    elevation_profile: normalized.elevation_profile,
                    polyline: normalized.polyline || seg.polyline
                })
                .eq('id', seg.id);

            if (error) throw error;
            alert('路段資料更新成功！');
            fetchSegments();
        } catch (err: any) {
            alert('更新失敗: ' + err.message);
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
                id: editingSegment.strava_id, // 顯式傳遞 Strava ID 作為主鍵
                strava_id: editingSegment.strava_id,
                name: editingSegment.name,
                description: editingSegment.description,
                link: editingSegment.link,
                distance: editingSegment.distance,
                average_grade: editingSegment.average_grade,
                maximum_grade: editingSegment.maximum_grade,
                elevation_gain: editingSegment.elevation_gain,
                polyline: editingSegment.polyline,
                is_active: editingSegment.is_active,
                start_date: editingSegment.start_date,
                end_date: editingSegment.end_date
            });
            error = insertError;
        } else {
            const { error: updateError } = await supabase
                .from('segments')
                .update({
                    strava_id: editingSegment.strava_id,
                    name: editingSegment.name,
                    description: editingSegment.description,
                    link: editingSegment.link,
                    distance: editingSegment.distance,
                    average_grade: editingSegment.average_grade,
                    maximum_grade: editingSegment.maximum_grade,
                    elevation_gain: editingSegment.elevation_gain,
                    polyline: editingSegment.polyline,
                    is_active: editingSegment.is_active,
                    start_date: editingSegment.start_date,
                    end_date: editingSegment.end_date
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
            // 處理「記住我」邏輯
            if (rememberMe) {
                localStorage.setItem('admin_email', email);
                localStorage.setItem('admin_password', password);
            } else {
                localStorage.removeItem('admin_email');
                localStorage.removeItem('admin_password');
            }
            // 登入後重整資料
            fetchSegments();
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setSegments([]);
    };

    const fetchSiteSettings = async () => {
        const { data, error } = await supabase.from('site_settings').select('*');
        if (!error && data) {
            setSiteSettings(data);
        }
    };

    const handleUpdateSetting = (key: string, value: string) => {
        setSiteSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
    };

    const handleSaveAllSettings = async () => {
        setIsSavingSettings(true);
        try {
            const { error } = await supabase.from('site_settings').upsert(
                siteSettings.map(s => ({
                    key: s.key,
                    value: s.value,
                    updated_at: new Date().toISOString()
                }))
            );
            if (error) throw error;
            alert('SEO 設定已儲存');
        } catch (err: any) {
            alert('儲存失敗: ' + err.message);
        } finally {
            setIsSavingSettings(false);
        }
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
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="rememberMe"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-tsu-blue focus:ring-tsu-blue"
                        />
                        <label htmlFor="rememberMe" className="text-sm font-bold text-slate-500 cursor-pointer">記住密碼</label>
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
                <div className="flex gap-4">
                    <button
                        onClick={handleLogout}
                        className="px-6 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-red-500 hover:text-white text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all"
                    >
                        登出
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* SEO 設定區塊 - 移至最上方並設為寬版 */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-800 md:col-span-2">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-black uppercase italic italic flex items-center gap-2">
                            <Globe className="w-5 h-5 text-tsu-blue" />
                            SEO & 站點設定
                        </h3>
                        <button
                            onClick={handleSaveAllSettings}
                            disabled={isSavingSettings}
                            className="bg-tsu-blue text-white px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest hover:brightness-110 disabled:opacity-50 transition-all"
                        >
                            {isSavingSettings ? '儲存中...' : '儲存所有設定'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {siteSettings.map((setting) => (
                            <div key={setting.key} className="flex flex-col gap-2">
                                <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest flex justify-between">
                                    {setting.key.replace(/_/g, ' ')}
                                    <span className="text-slate-300 font-normal normal-case">
                                        Last updated: {setting.updated_at ? new Date(setting.updated_at).toLocaleString() : '剛剛'}
                                    </span>
                                </label>
                                {setting.key.includes('description') || setting.key.includes('keywords') ? (
                                    <textarea
                                        value={setting.value || ''}
                                        onChange={(e) => handleUpdateSetting(setting.key, e.target.value)}
                                        className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-tsu-blue min-h-[100px]"
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={setting.value || ''}
                                        onChange={(e) => handleUpdateSetting(setting.key, e.target.value)}
                                        className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl h-12 px-4 text-sm focus:ring-2 focus:ring-tsu-blue"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

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
                                    className={`w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm ${editingSegment.id !== 'new' ? 'bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed opacity-70' : ''}`}
                                    required
                                    readOnly={editingSegment.id !== 'new'}
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
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">詳情連結</label>
                                <input
                                    type="text"
                                    value={editingSegment.link || ''}
                                    onChange={(e) => setEditingSegment({ ...editingSegment, link: e.target.value })}
                                    className={`w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm ${editingSegment.id !== 'new' ? 'bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed opacity-70' : ''}`}
                                    placeholder="https://..."
                                    readOnly={editingSegment.id !== 'new'}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">距離 (公尺)</label>
                                    <input
                                        type="number"
                                        value={editingSegment.distance || ''}
                                        onChange={(e) => setEditingSegment({ ...editingSegment, distance: parseFloat(e.target.value) })}
                                        className={`w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm ${editingSegment.id !== 'new' ? 'bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed opacity-70' : ''}`}
                                        readOnly={editingSegment.id !== 'new'}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">平均坡度 (%)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={editingSegment.average_grade || ''}
                                        onChange={(e) => setEditingSegment({ ...editingSegment, average_grade: parseFloat(e.target.value) })}
                                        className={`w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm ${editingSegment.id !== 'new' ? 'bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed opacity-70' : ''}`}
                                        readOnly={editingSegment.id !== 'new'}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">總爬升 (公尺)</label>
                                    <input
                                        type="number"
                                        value={editingSegment.elevation_gain || ''}
                                        onChange={(e) => setEditingSegment({ ...editingSegment, elevation_gain: parseFloat(e.target.value) })}
                                        className={`w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm ${editingSegment.id !== 'new' ? 'bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed opacity-70' : ''}`}
                                        readOnly={editingSegment.id !== 'new'}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Polyline (路線編碼)</label>
                                <textarea
                                    value={editingSegment.polyline || ''}
                                    onChange={(e) => setEditingSegment({ ...editingSegment, polyline: e.target.value })}
                                    className={`w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm h-16 font-mono ${editingSegment.id !== 'new' ? 'bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed opacity-70' : ''}`}
                                    readOnly={editingSegment.id !== 'new'}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">開始日期</label>
                                    <input
                                        type="datetime-local"
                                        value={editingSegment.start_date ? new Date(editingSegment.start_date).toISOString().slice(0, 16) : ''}
                                        onChange={(e) => setEditingSegment({ ...editingSegment, start_date: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">結束日期</label>
                                    <input
                                        type="datetime-local"
                                        value={editingSegment.end_date ? new Date(editingSegment.end_date).toISOString().slice(0, 16) : ''}
                                        onChange={(e) => setEditingSegment({ ...editingSegment, end_date: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                    />
                                </div>
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
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">ID: {seg.id}</p>
                                        {seg.description && (
                                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{seg.description}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleRefreshSegment(seg)}
                                            className="text-slate-400 hover:text-tsu-blue transition-colors"
                                            title="重新整理路段資料與地圖"
                                        >
                                            <RefreshCw className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const { error } = await supabase
                                                        .from('segments')
                                                        .update({ is_active: !seg.is_active })
                                                        .eq('id', seg.id);
                                                    if (error) throw error;
                                                    fetchSegments();
                                                } catch (err: any) {
                                                    alert('更新失敗: ' + err.message);
                                                }
                                            }}
                                            className={`px-2 py-0.5 ${seg.is_active ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'} text-[10px] font-bold rounded-full transition-colors cursor-pointer`}
                                        >
                                            {seg.is_active ? '啟用' : '停用'}
                                        </button>
                                        <button
                                            onClick={() => setEditingSegment(seg)}
                                            className="text-slate-400 hover:text-tsu-blue transition-colors"
                                        >
                                            <Edit2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (!confirm(`確定要刪除路段「${seg.name}」？\n\n此操作將同時刪除所有相關的報名資料，且無法復原！`)) return;
                                                try {
                                                    // 先刪除相關報名資料
                                                    const { error: regError } = await supabase
                                                        .from('registrations')
                                                        .delete()
                                                        .eq('segment_id', seg.id);

                                                    if (regError) throw regError;

                                                    // 再刪除路段
                                                    const { error: segError } = await supabase
                                                        .from('segments')
                                                        .delete()
                                                        .eq('id', seg.id);

                                                    if (segError) throw segError;

                                                    alert('路段已刪除');
                                                    fetchSegments();
                                                    fetchRegistrations();
                                                } catch (err: any) {
                                                    alert('刪除失敗: ' + err.message);
                                                }
                                            }}
                                            className="text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="w-5 h-5" />
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

                                    const parsedId = parseInt(strava_id);
                                    if (isNaN(parsedId)) {
                                        alert('請輸入有效的數字 ID');
                                        return;
                                    }

                                    try {
                                        // 呼叫 n8n webhook 取得路段資料
                                        const response = await fetch('https://n8n.criterium.tw/webhook/segment_set', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ segment_id: parsedId })
                                        });

                                        const responseText = await response.text();
                                        console.log('n8n Webhook Raw Response:', responseText); // 強化偵錯

                                        if (!responseText || responseText.trim() === "") {
                                            throw new Error("伺服器回傳了空內容，請稍後再試或檢查 Strava ID 是否正確。");
                                        }

                                        // 解析並正規化資料 (處理 Array 與多重 Key)
                                        const segment = JSON.parse(responseText);
                                        const normalized = normalizeSegment(segment);
                                        if (!normalized) throw new Error('無法正規化路段資料');

                                        console.log('Extracted Polyline:', normalized.polyline ? `${normalized.polyline.substring(0, 30)}...` : '❌ MISSING');

                                        if (!normalized.polyline) {
                                            if (!confirm('警告：無法從 Strava 取得路線資訊 (Polyline)。\n這將導致排行榜地圖無法顯示。\n\n是否仍要強行新增該路段？')) {
                                                return;
                                            }
                                        }

                                        // 顯示預覽並確認
                                        const confirmMsg = `確認新增此路段？\n\n路段名稱: ${normalized.name}\nStrava ID: ${normalized.id}\n距離: ${(normalized.distance / 1000).toFixed(2)} km\n平均坡度: ${normalized.average_grade}%\n總爬升: ${normalized.elevation_gain} m`;

                                        if (!confirm(confirmMsg)) return;

                                        // 計算預設日期：今天的前後 7 天 (00:00)
                                        const now = new Date();
                                        const startDate = new Date(now);
                                        startDate.setDate(now.getDate() - 7);
                                        startDate.setHours(0, 0, 0, 0);

                                        const endDate = new Date(now);
                                        endDate.setDate(now.getDate() + 7);
                                        endDate.setHours(0, 0, 0, 0);

                                        // 寫入 Supabase (包含所有 Strava 資料與預設日期)
                                        const { error } = await supabase.from('segments').insert({
                                            ...normalized,
                                            is_active: true,
                                            start_date: startDate.toISOString(),
                                            end_date: endDate.toISOString()
                                        });

                                        if (error) {
                                            // 錯誤中文化
                                            if (error.code === '23505') {
                                                alert('新增失敗: 此路段 ID 已存在於系統中，請勿重複新增。');
                                            } else {
                                                alert('新增失敗: ' + error.message);
                                            }
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
                            <ClipboardCheck className="w-10 h-10 text-slate-300 mb-2" />
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
