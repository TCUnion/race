import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Segment {
    id: number;
    name: string;
    internal_id?: number;
}

interface RegistrationFormProps {
    athlete: {
        id: string | number;
        firstname?: string;
        lastname?: string;
        profile?: string;
    };
    segments: Segment[];
    onSuccess: () => void;
}

const TCU_SYNC_URL = 'https://n8n.criterium.tw/webhook/tcu-sync';

const RegistrationForm: React.FC<RegistrationFormProps> = ({ athlete, segments, onSuccess }) => {
    const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(null);
    const [existingRegistrations, setExistingRegistrations] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isLoadingExisting, setIsLoadingExisting] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [name, setName] = useState(athlete.firstname && athlete.lastname ? `${athlete.firstname} ${athlete.lastname}` : '');
    const [team, setTeam] = useState('');
    const [tcuId, setTcuId] = useState('');

    // 檢查現有報名
    useEffect(() => {
        const checkExisting = async () => {
            setIsLoadingExisting(true);
            try {
                const { data, error: regError } = await supabase
                    .from('registrations')
                    .select('*, segments(name)')
                    .eq('strava_athlete_id', athlete.id);

                if (regError) throw regError;
                setExistingRegistrations(data || []);

                // 如果已有報名，預設選中已報名的路段 (若路段還在啟用清單中)
                if (data && data.length > 0) {
                    const existingInternalId = data[0].segment_id;
                    const match = segments.find(s => s.internal_id === existingInternalId);
                    if (match) {
                        setSelectedSegmentId(match.id);
                    }
                }
            } catch (err) {
                console.error('檢查現有報名失敗:', err);
            } finally {
                setIsLoadingExisting(false);
            }
        };

        checkExisting();
    }, [athlete.id, segments]);

    // 預設勾選第一個路段 (若無現有報名)
    useEffect(() => {
        if (segments.length > 0 && selectedSegmentId === null && existingRegistrations.length === 0) {
            setSelectedSegmentId(segments[0].id);
        }
    }, [segments, selectedSegmentId, existingRegistrations]);

    const handleSegmentChange = (segmentId: number) => {
        setSelectedSegmentId(segmentId);
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
            const response = await fetch(TCU_SYNC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tcu_id: tcuId.toUpperCase(),
                    strava_athlete_id: String(athlete.id)
                })
            });

            const result = await response.json().catch(() => ({}));

            if (result.success && result.data) {
                if (result.data.tcu_id) {
                    setTcuId(result.data.tcu_id);
                }
                if (result.data.name) {
                    setName(result.data.name);
                }
                if (result.data.team) {
                    setTeam(result.data.team);
                }
                setSuccessMessage(result.message || 'TCU 資料同步成功！');
            } else {
                setError(result.message || 'TCU 資料同步失敗');
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

        if (selectedSegmentId === null) {
            setError('請選擇一個挑戰路段');
            return;
        }

        if (existingRegistrations.length > 0) {
            setError('您已經報名過路段，如需變更請洽管理員。同步資料請使用上方同步按鈕。');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // 新增報名記錄
            const seg = segments.find(s => s.id === selectedSegmentId);
            const registration = {
                segment_id: seg?.internal_id || selectedSegmentId,
                strava_athlete_id: athlete.id,
                athlete_name: name,
                athlete_profile: athlete.profile,
                team: team,
                tcu_id: tcuId,
                status: 'approved'
            };

            const { error: insertError } = await supabase
                .from('registrations')
                .insert([registration]);

            if (insertError) throw insertError;

            onSuccess();
        } catch (err: any) {
            console.error('報名失敗:', err);
            setError(err.message || '報名失敗，請稍後再試');
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
                            <div className="absolute -bottom-1 -right-1 bg-strava-orange text-white rounded-full p-1 shadow-md border border-slate-900">
                                <span className="material-symbols-outlined text-[12px] block font-black">check</span>
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
                            選擇挑戰路段 <span className="text-tsu-blue-light">(單選)</span>
                        </label>

                        {existingRegistrations.length > 0 && (
                            <div className="mb-4 p-4 bg-tsu-blue/10 border border-tsu-blue/30 rounded-2xl">
                                <p className="text-tsu-blue-light text-xs font-bold leading-relaxed">
                                    <span className="material-symbols-outlined text-sm align-middle mr-1">info</span>
                                    您已報名過：{existingRegistrations.map(r => r.segments?.name).join(', ')}。
                                    <br />
                                    根據規則，一個 Strava 帳號僅能報名一個主要路段，如需變更請聯絡管理員。
                                </p>
                            </div>
                        )}
                        <div className="grid gap-3">
                            {segments.map(seg => (
                                <label
                                    key={seg.id}
                                    className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-300 ${selectedSegmentId === seg.id
                                        ? 'bg-tsu-blue/20 border-tsu-blue/50'
                                        : 'bg-white/5 border-white/10 hover:border-white/20'
                                        } ${existingRegistrations.length > 0 && selectedSegmentId !== seg.id ? 'opacity-50 grayscale' : ''}`}
                                >
                                    <input
                                        type="radio"
                                        name="segment"
                                        checked={selectedSegmentId === seg.id}
                                        onChange={() => handleSegmentChange(seg.id)}
                                        disabled={existingRegistrations.length > 0}
                                        className="sr-only"
                                    />
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedSegmentId === seg.id
                                        ? 'bg-tsu-blue border-tsu-blue'
                                        : 'border-white/30'
                                        }`}>
                                        {selectedSegmentId === seg.id && (
                                            <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-white font-bold">{seg.name}</p>
                                        <p className="text-slate-500 text-xs">Strava ID: {seg.id}</p>
                                    </div>
                                </label>
                            ))}
                            {segments.length === 0 && (
                                <div className="text-center py-6 text-slate-500">
                                    <p>目前無可報名的路段</p>
                                </div>
                            )}
                        </div>
                        <p className="mt-3 text-[10px] text-slate-500 italic ml-1">* 請慎重選擇您的挑戰路段，報名後不可自行修改。</p>
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
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-700 text-xl">fingerprint</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleSyncTCU}
                                    disabled={isSyncing || !tcuId.trim()}
                                    className="px-5 py-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
                                >
                                    {isSyncing ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <span className="material-symbols-outlined text-lg">sync</span>
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
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-700 text-xl">person</span>
                            </div>
                        </div>

                        {/* Team */}
                        <div className="group/field">
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 tracking-[0.2em] group-focus-within/field:text-tsu-blue-light transition-colors">車隊名稱 (選填)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={team}
                                    onChange={(e) => setTeam(e.target.value)}
                                    className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-tsu-blue-light/50 focus:border-tsu-blue-light/50 transition-all duration-300 font-bold"
                                    placeholder="例如：TCU Taiwan"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-700 text-xl">group</span>
                            </div>
                        </div>


                    </div>

                    {/* Success Message */}
                    {successMessage && (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                            <p className="text-emerald-400 text-xs font-bold flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                {successMessage}
                            </p>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                            <p className="text-red-400 text-xs font-bold flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">error</span>
                                {error}
                            </p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting || existingRegistrations.length > 0}
                        className="w-full bg-tsu-blue-light hover:bg-tsu-blue text-white font-black py-5 rounded-2xl transition-all shadow-2xl shadow-tsu-blue/30 flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-sm disabled:opacity-50 active:scale-95 group/btn"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>傳送中...</span>
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">
                                    {existingRegistrations.length > 0 ? 'lock' : 'how_to_reg'}
                                </span>
                                <span>{existingRegistrations.length > 0 ? '您已報名完成' : '送出報名'}</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RegistrationForm;

