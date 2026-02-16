import React, { useState, useEffect } from 'react';
import {
    Check,
    Fingerprint,
    User,
    Users,
    CheckCircle2,
    AlertCircle,
    Save,
    RefreshCw,
    Crown
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface Segment {
    id: number; // Supabase PK
    strava_id: number; // Strava ID
    name: string;
    description?: string; // 路段說明
    team?: string;
    start_date?: string;
    end_date?: string;
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
    initialSegmentId?: number;
}



// UUID Generator for environments where crypto.randomUUID might be missing (e.g. non-secure contexts)
const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

const RegistrationForm: React.FC<RegistrationFormProps> = ({ athlete, segments, onSuccess, initialSegmentId }) => {
    const { isBound, memberData } = useAuth();
    const [selectedSegmentIds, setSelectedSegmentIds] = useState<number[]>([]);
    const [existingRegistrations, setExistingRegistrations] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingExisting, setIsLoadingExisting] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // 初始化或自動填寫姓名
    const [name, setName] = useState('');
    const [team, setTeam] = useState('');

    // 自動填入邏輯
    useEffect(() => {
        if (isBound && memberData) {
            setName(memberData.real_name || '');
            setTeam(memberData.team || '');
        } else {
            // 未綁定：使用 Strava 姓名
            const fname = athlete.firstname || athlete.firstName || '';
            const lname = athlete.lastname || athlete.lastName || '';
            setName(`${fname} ${lname}`.trim());

            // 未綁定：車隊維持空白或允許手動輸入
            // 如果切換回未綁定狀態，清空或保留? 這裡選擇清空以避免混淆
            // 但如果使用者手動輸入過，可能會被覆蓋。
            // 簡化邏輯：每次狀態變更都重置。
            setTeam('');
        }
    }, [isBound, memberData, athlete]);

    // 檢查現有報名（不使用 embedded relationship 避免 PGRST200 錯誤）
    const lastCheckedIdRef = React.useRef<string | number | null>(null);

    useEffect(() => {
        const checkExisting = async () => {
            // 避免重複檢查導致循環
            if (lastCheckedIdRef.current === athlete.id) {
                return;
            }

            setIsLoadingExisting(true);
            setIsLoadingExisting(true);
            lastCheckedIdRef.current = athlete.id;
            try {
                const { data, error: regError } = await supabase
                    .from('registrations')
                    .select('*')
                    .eq('strava_athlete_id', athlete.id);

                if (regError) {
                    throw regError;
                }

                setExistingRegistrations(data || []);

                // 初始化選中的路段 (使用 Supabase PK)
                if (data && data.length > 0) {
                    const existingIds = data.map(r => r.segment_id);
                    setSelectedSegmentIds(existingIds);
                }
            } catch (err) {
                console.error('檢查現有報名失敗:', err);
                // alert('無法讀取現有報名資料，請稍後再試'); // Optional: alerting on load failure might be too aggressive
            } finally {
                setIsLoadingExisting(false);
            }
        };

        checkExisting();
    }, [athlete.id]);

    // Handle initial segment selection from URL
    useEffect(() => {
        if (initialSegmentId && !isLoadingExisting) {
            setSelectedSegmentIds(prev => {
                if (prev.includes(initialSegmentId)) return prev;
                return [...prev, initialSegmentId];
            });
        }
    }, [initialSegmentId, isLoadingExisting]);

    const toggleSegment = (segmentId: number) => {
        setSelectedSegmentIds(prev =>
            prev.includes(segmentId)
                ? prev.filter(id => id !== segmentId)
                : [...prev, segmentId]
        );
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
                if (delError) {
                    console.error('[DEBUG] Delete error:', delError);
                    throw delError;
                }
            }

            // 2. 執行更新/新增（分離 insert/update 避免 ON CONFLICT 約束問題）
            if (currentSegmentIds.length > 0) {
                // 區分需要新增 vs 需要更新的
                const toInsert = currentSegmentIds.filter(id => !existingSegmentIds.includes(id));
                const toUpdate = currentSegmentIds.filter(id => existingSegmentIds.includes(id));

                // 新增新報名（明確產生 UUID 避免 null 約束錯誤）
                if (toInsert.length > 0) {
                    const insertPayload = toInsert.map(id => ({
                        id: generateUUID(),
                        segment_id: id,
                        strava_athlete_id: athlete.id,
                        athlete_name: name,
                        athlete_profile: athlete.profile,
                        team: team,
                        tcu_id: memberData?.tcu_id || null,
                        status: 'approved'
                    }));

                    const { error: insertError } = await supabase
                        .from('registrations')
                        .insert(insertPayload);
                    if (insertError) {
                        console.error('[DEBUG] Insert error:', insertError);
                        throw insertError;
                    }
                }

                // 更新現有報名
                if (toUpdate.length > 0) {
                    const updatePayload = {
                        athlete_name: name,
                        athlete_profile: athlete.profile,
                        team: team,
                        tcu_id: memberData?.tcu_id || null,
                        updated_at: new Date().toISOString()
                    };

                    const { error: updateError } = await supabase
                        .from('registrations')
                        .update(updatePayload)
                        .eq('strava_athlete_id', athlete.id)
                        .in('segment_id', toUpdate);
                    if (updateError) {
                        console.error('[DEBUG] Update error:', updateError);
                        throw updateError;
                    }
                }
            }

            setSuccessMessage('報名設定已更新');

            // Short delay to let user see success message before closing/redirecting if needed
            // setTimeout(() => onSuccess(), 1000); 
            onSuccess();
        } catch (err: any) {
            console.error('更新失敗:', err);
            const errMsg = err.message || '更新失敗，請稍後再試';
            setError(errMsg);
            alert(`提交失敗: ${errMsg}`); // Explicit alert for user
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full mx-auto p-6 sm:p-10 bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] shadow-2xl border border-white/5 relative overflow-hidden group">
            {/* 背景裝飾 */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-tcu-blue/10 rounded-full blur-3xl group-hover:bg-tcu-blue/20 transition-colors duration-700"></div>

            <div className="relative z-10">
                <div className="flex flex-col gap-3 mb-10">
                    <span className="text-tcu-blue-light text-[11px] font-black uppercase tracking-[0.3em]">Registration</span>
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
                            <div className="absolute -bottom-1 -right-1 bg-tcu-blue text-white rounded-full p-1 shadow-md border border-slate-900">
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
                            選擇挑戰路段 <span className="text-tcu-blue-light">(勾選報名)</span>
                        </label>
                        <div className="grid gap-3">
                            {segments.map(seg => (
                                <label
                                    key={seg.id}
                                    className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-300 ${selectedSegmentIds.includes(seg.id)
                                        ? 'bg-tcu-blue/20 border-tcu-blue/50'
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
                                        ? 'bg-tcu-blue border-tcu-blue'
                                        : 'border-white/30'
                                        }`}>
                                        {selectedSegmentIds.includes(seg.id) && (
                                            <Check className="w-4 h-4 text-white" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            {seg.team && (
                                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-tcu-blue text-white shadow-sm">
                                                    {seg.team}
                                                </span>
                                            )}
                                            <p className="text-white font-bold">{seg.description || seg.name}</p>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <span>ID: {seg.strava_id}</span>
                                            {seg.end_date && (
                                                <>
                                                    <span>•</span>
                                                    <span className={new Date(seg.end_date) < new Date() ? 'text-red-400' : 'text-emerald-400'}>
                                                        {new Date(seg.end_date).toLocaleDateString()} 截止
                                                    </span>
                                                </>
                                            )}
                                        </div>
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


                        {/* Name */}
                        <div className="group/field">
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 tracking-[0.2em] group-focus-within/field:text-tcu-blue-light transition-colors">選手姓名 (與STRAVA同步，若需要修正。請於STRAVA修正後更新報名)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={name}
                                    readOnly={true} // 強制唯讀：已綁定用 TCU Name，未綁定用 Strava Name
                                    className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 text-slate-400 placeholder:text-slate-600 focus:outline-none font-bold cursor-not-allowed opacity-90"
                                    placeholder="姓名"
                                />
                                {isBound ? (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                        <Crown className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                                        <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider hidden sm:inline">TCU Member</span>
                                    </div>
                                ) : (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">Strava Name</span>
                                        <User className="text-slate-700 w-5 h-5" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Team */}
                        <div className="group/field">
                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 tracking-[0.2em] group-focus-within/field:text-tcu-blue-light transition-colors">車隊名稱 {isBound && <span className="text-tcu-blue-light">(TCU已驗證)</span>}</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={team}
                                    readOnly={true} // 強制唯讀：未綁定不可填寫
                                    className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 text-slate-400 placeholder:text-slate-600 focus:outline-none font-bold cursor-not-allowed opacity-90"
                                    placeholder={isBound ? "已自動帶入車隊" : "未綁定會員不顯示車隊"}
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
                        className="w-full bg-tcu-blue-light hover:bg-tcu-blue text-white font-black py-5 rounded-2xl transition-all shadow-2xl shadow-tcu-blue/30 flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-sm disabled:opacity-50 active:scale-95 group/btn"
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

