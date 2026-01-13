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

const RegistrationForm: React.FC<RegistrationFormProps> = ({ athlete, segmentId, onSuccess }) => {
    const [name, setName] = useState(`${athlete.firstname || ''} ${athlete.lastname || ''}`.trim());
    const [team, setTeam] = useState('');
    const [number, setNumber] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

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
                        status: 'approved' // 預設批准，或根據需求設為 pending
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
        <div className="max-w-xl mx-auto p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col gap-2 mb-8">
                <span className="text-tsu-blue text-[10px] font-black uppercase tracking-[0.2em]">Registration</span>
                <h2 className="text-2xl font-black italic uppercase tracking-tight">填寫報名資料</h2>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">
                    歡迎挑戰！請確認您的參賽資訊。報名後系統將開始追蹤您在該路段的 Strava 活動紀錄。
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 mb-6">
                    <img
                        src={athlete.profile || "https://www.strava.com/assets/users/placeholder_athlete.png"}
                        alt="Profile"
                        className="w-12 h-12 rounded-full border-2 border-strava-orange shadow-sm"
                    />
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">已連結 Strava</p>
                        <p className="text-slate-900 dark:text-white font-bold text-sm">ID: {athlete.id}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1 tracking-widest">選手姓名 (顯示於排行榜)</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-tsu-blue transition-all"
                            placeholder="請輸入姓名"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1 tracking-widest">車隊名稱 (選填)</label>
                        <input
                            type="text"
                            value={team}
                            onChange={(e) => setTeam(e.target.value)}
                            className="w-full px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-tsu-blue transition-all"
                            placeholder="例如：TCU Taiwan"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1 tracking-widest">號碼牌 (選填)</label>
                        <input
                            type="text"
                            value={number}
                            onChange={(e) => setNumber(e.target.value)}
                            className="w-full px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-tsu-blue transition-all"
                            placeholder="例如：001"
                        />
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-xl">
                        <p className="text-red-500 text-xs font-bold">{error}</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-tsu-blue hover:bg-tsu-blue-light text-white font-black py-4 rounded-xl transition-all shadow-xl shadow-tsu-blue/20 flex items-center justify-center gap-2 uppercase tracking-widest text-sm disabled:opacity-50"
                >
                    {isSubmitting ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>提交中...</span>
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-sm font-bold">how_to_reg</span>
                            <span>送出報名</span>
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};

export default RegistrationForm;
