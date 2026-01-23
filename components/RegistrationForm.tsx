import React, { useState, useEffect } from 'react';
import {
    Check,
    Fingerprint,
    User,
    Users,
    CheckCircle2,
    AlertCircle,
    Save,
    RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Segment {
    id: number; // Supabase PK
    strava_id: number; // Strava ID
    name: string;
}

interface RegistrationFormProps {
    athlete: {
        id: string | number;
        firstname?: string;
        lastname?: string;
        firstName?: string;
        lastName?: string;
        profile?: string;
        access_token?: string;
    };
    segments: Segment[];
    onSuccess: () => void;
}



const RegistrationForm: React.FC<RegistrationFormProps> = ({ athlete, segments, onSuccess }) => {
    const [selectedSegmentIds, setSelectedSegmentIds] = useState<number[]>([]);
    const [existingRegistrations, setExistingRegistrations] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isLoadingExisting, setIsLoadingExisting] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [name, setName] = useState(() => {
        const fname = athlete.firstname || athlete.firstName || '';
        const lname = athlete.lastname || athlete.lastName || '';
        return (fname && lname) ? `${fname} ${lname}`.trim() : (fname || lname || '');
    });
    const [team, setTeam] = useState('');
    const [tcuId, setTcuId] = useState('');

    // 檢查現有報名
    useEffect(() => {
        const checkExisting = async () => {
            setIsLoadingExisting(true);
            try {
                const { data, error: regError } = await supabase
                    .from('registrations')
                    .select('*, segments(name, strava_id)')
                    .eq('strava_athlete_id', athlete.id);

                if (regError) throw regError;
                setExistingRegistrations(data || []);

                // 初始化選中的路段 (使用 Supabase PK)
                if (data && data.length > 0) {
                    const existingIds = data.map(r => r.segment_id);
                    setSelectedSegmentIds(existingIds);
                }
            } catch (err) {
                console.error('檢查現有報名失敗:', err);
            } finally {
                setIsLoadingExisting(false);
            }
        };

        checkExisting();
    }, [athlete.id, segments]);

    const toggleSegment = (segmentId: number) => {
        setSelectedSegmentIds(prev =>
            prev.includes(segmentId)
                ? prev.filter(id => id !== segmentId)
                : [...prev, segmentId]
        );
    };


    // 同步 TCU 資料
    const handleSyncTCU = async () => {
        if (!tcuId.trim()) {
            setError('請先輸入 TCU-ID / 個人身份證ID');
            return;
        }

        setIsSyncing(true);
        setError(null);
        setSuccessMessage(null);


        try {
            // 直接查詢 Supabase tcu_members 資料表
            const { data, error } = await supabase
                .from('tcu_members')
                .select('*')
                .or(`account.eq.${tcuId.toUpperCase()},tcu_id.eq.${tcuId}`)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                if (data.real_name) {
                    setName(data.real_name);
                }
                if (data.team) {
                    setTeam(data.team);
                }
                if (data.tcu_id) {
                    setTcuId(data.tcu_id);
                }
                setSuccessMessage('TCU 資料同步成功！');
            } else {
                setError('查無此 TCU ID 或身份證字號');
            }
        } catch (err: any) {
            console.error('同步錯誤:', err);
            setError('同步失敗，請稍後再試');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const existingSegmentIds = existingRegistrations.map(r => r.segment_id);
            const currentSegmentIds = selectedSegmentIds;

            // 需要刪除的 (使用者在介面上取消勾選的)
            const toDelete = existingSegmentIds.filter(id => !currentSegmentIds.includes(id));

            // 1. 執行刪除
            if (toDelete.length > 0) {
                const { error: delError } = await supabase
                    .from('registrations')
                    .delete()
                    .eq('strava_athlete_id', athlete.id)
                    .in('segment_id', toDelete);
                if (delError) throw delError;
            }

            // 2. 執行更新/新增 (Upsert)
            // 直接對目前選中的所有路段進行 upsert，這會同時處理新增與更新
            if (currentSegmentIds.length > 0) {
                const { error: upsertError } = await supabase
                    .from('registrations')
                    .upsert(
                        currentSegmentIds.map(id => ({
                            segment_id: id,
                            strava_athlete_id: athlete.id,
                            athlete_name: name,
                            athlete_profile: athlete.profile,
                            team: team,
                            tcu_id: tcuId,
                            status: 'approved',
                            updated_at: new Date().toISOString()
                        })),
                        { onConflict: 'strava_athlete_id,segment_id' }
                    );
                if (upsertError) throw upsertError;
            }

            setSuccessMessage('報名設定已更新');
            onSuccess();
        } catch (err: any) {
            console.error('更新失敗:', err);
            setError(err.message || '更新失敗，請稍後再試');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto p-10 bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] shadow-2xl border border-white/5 relative overflow-hidden group">
            {/* 背景裝飾 */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-tsu-blue/10 rounded-full blur-3xl group-hover:bg-tsu-blue/20 transition-colors duration-700"></div>

            <div className="relative z-10">
                <div className="flex flex-col gap-3 mb-10">
                    <span className="text-tsu-blue-light text-[11px] font-black uppercase tracking-[0.3em]">Registration</span>
                    <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">填寫報名資料</h2>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-sm">
                        歡迎挑戰！請確認您的參賽資訊。報名後系統將開始追蹤您在路段的 Strava 活動紀錄。
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Strava Status Card */}
                    <div className="flex items-center gap-5 p-6 bg-white/5 rounded-3xl border border-white/10 hover:border-white/20 transition-all duration-300">
                        <div className="relative">
                            <img
                                src={athlete.profile || "https://www.strava.com/assets/users/placeholder_athlete.png"}
                                alt="Profile"
                                className="w-16 h-16 rounded-full border-2 border-strava-orange shadow-lg object-cover"
                            />
                            <div className="absolute -bottom-1 -right-1 bg-tsu-blue text-white rounded-full p-1 shadow-md border border-slate-900">
                                <Check className="w-3 h-3" />
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">已連結 Strava</p>
                            <p className="text-white font-black text-xl italic tracking-tight uppercase">ID: {athlete.id}</p>
                        </div>
                    </div>

                    {/* 路段選擇 */}
                    <div className="group/field">
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 tracking-[0.2em]">
                            選擇挑戰路段 <span className="text-tsu-blue-light">(勾選報名)</span>
                        </label>
                        <div className="grid gap-3">
                            {segments.map(seg => (
                                <label
                                    key={seg.id}
                                    className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-300 ${selectedSegmentIds.includes(seg.id)
                                        ? 'bg-tsu-blue/20 border-tsu-blue/50'
                                        : 'bg-white/5 border-white/10 hover:border-white/20'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedSegmentIds.includes(seg.id)}
                                        onChange={() => toggleSegment(seg.id)}
                                        className="sr-only"
                                    />
                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedSegmentIds.includes(seg.id)
                                        ? 'bg-tsu-blue border-tsu-blue'
                                        : 'border-white/30'
                                        }`}>
                                        {selectedSegmentIds.includes(seg.id) && (
                                            <Check className="w-4 h-4 text-white" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-white font-bold">{seg.name}</p>
                                        <p className="text-slate-500 text-xs">Strava ID: {seg.strava_id}</p>
                                    </div>
                                </label>
                            ))}
                            {segments.length === 0 && (
                                <div className="text-center py-6 text-slate-500">
                                    <p>目前無可報名的路段</p>
                                </div>
                            )}
                        </div>
                        <p className="mt-3 text-[10px] text-slate-500 italic ml-1">* 您可以隨時調整報道路段，勾選即代表報名，取消勾選則移除紀錄。</p>
                    </div>

                    <div className="grid gap-6">
                        {/* TCU-ID with Sync Button */}
                        <div className="group/field">
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 tracking-[0.2em] group-focus-within/field:text-tsu-blue-light transition-colors">TCU-ID / 個人身份證ID (選填)</label>
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        value={tcuId}
                                        onChange={(e) => setTcuId(e.target.value)}
                                        className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-tsu-blue-light/50 focus:border-tsu-blue-light/50 transition-all duration-300 font-bold"
                                        placeholder="例如：TCU-zvnrqonh..."
                                    />
                                    <Fingerprint className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 w-5 h-5" />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleSyncTCU}
                                    disabled={isSyncing || !tcuId.trim()}
                                    className="px-5 py-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
                                >
                                    {isSyncing ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="w-4 h-4" />
                                    )}
                                    <span className="hidden sm:inline">同步</span>
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-600 mt-2 ml-1">輸入後點擊「同步」可自動帶入會員姓名與車隊</p>
                        </div>

                        {/* Name */}
                        <div className="group/field">
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 tracking-[0.2em] group-focus-within/field:text-tsu-blue-light transition-colors">選手姓名 (顯示於排行榜)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-tsu-blue-light/50 focus:border-tsu-blue-light/50 transition-all duration-300 font-bold"
                                    placeholder="三義 劉德華"
                                    required
                                />
                                <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 w-5 h-5" />
                            </div>
                        </div>

                        {/* Team */}
                        <div className="group/field">
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 tracking-[0.2em] group-focus-within/field:text-tsu-blue-light transition-colors">車隊名稱 (TCU同步資料)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={team}
                                    readOnly
                                    className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 text-white/50 placeholder:text-slate-600 focus:outline-none cursor-not-allowed font-bold"
                                    placeholder="同步後自動帶入"
                                />
                                <Users className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 w-5 h-5" />
                            </div>
                        </div>


                    </div>

                    {/* Success Message */}
                    {successMessage && (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                            <p className="text-emerald-400 text-xs font-bold flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                {successMessage}
                            </p>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                            <p className="text-red-400 text-xs font-bold flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-tsu-blue-light hover:bg-tsu-blue text-white font-black py-5 rounded-2xl transition-all shadow-2xl shadow-tsu-blue/30 flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-sm disabled:opacity-50 active:scale-95 group/btn"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>傳送中...</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                <span>確認報名內容</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RegistrationForm;

