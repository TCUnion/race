import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface RegistrationFormProps {
    athlete: {
        id: string | number;
        firstname?: string;
        lastname?: string;
        profile?: string;
    };
    segmentId: number;
    onSuccess: () => void;
}

const TCU_SYNC_URL = 'https://n8n.criterium.tw/webhook/tcu-sync';

const RegistrationForm: React.FC<RegistrationFormProps> = ({ athlete, segmentId, onSuccess }) => {
    const [tcuId, setTcuId] = useState('');
    const [name, setName] = useState(`${athlete.firstname || ''} ${athlete.lastname || ''}`.trim());
    const [team, setTeam] = useState('');
    const [number, setNumber] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const { error: insertError } = await supabase
                .from('registrations')
                .insert([
                    {
                        segment_id: segmentId,
                        strava_athlete_id: athlete.id,
                        athlete_name: name,
                        athlete_profile: athlete.profile,
                        team: team,
                        number: number,
                        tcu_id: tcuId,
                        status: 'approved'
                    }
                ]);

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

                        {/* Number */}
                        <div className="group/field">
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 tracking-[0.2em] group-focus-within/field:text-tsu-blue-light transition-colors">號碼牌 (選填)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={number}
                                    onChange={(e) => setNumber(e.target.value)}
                                    className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-tsu-blue-light/50 focus:border-tsu-blue-light/50 transition-all duration-300 font-bold"
                                    placeholder="例如：001"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-700 text-xl">tag</span>
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
                                <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">how_to_reg</span>
                                <span>送出報名</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RegistrationForm;

