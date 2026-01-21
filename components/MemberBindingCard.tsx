import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    UserCheck,
    Mail,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    ShieldCheck,
    RefreshCw
} from 'lucide-react';

interface MemberBindingCardProps {
    athlete: any;
    onBindingSuccess: () => void;
}

const MemberBindingCard: React.FC<MemberBindingCardProps> = ({ athlete, onBindingSuccess }) => {
    const [tcuId, setTcuId] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [step, setStep] = useState<'input' | 'otp'>('input');
    const [memberData, setMemberData] = useState<any>(null);
    const [otp, setOtp] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isAlreadyBound, setIsAlreadyBound] = useState(false);

    // 檢查是否已經綁定
    useEffect(() => {
        const checkBinding = async () => {
            if (!athlete?.id) return;

            try {
                const { data, error } = await supabase
                    .from('tcu_members')
                    .select('*')
                    .eq('strava_id', athlete.id.toString())
                    .maybeSingle();

                if (data) {
                    setMemberData(data);
                    setIsAlreadyBound(true);
                }
            } catch (err) {
                console.error('檢查綁定狀態失敗:', err);
            }
        };

        checkBinding();
    }, [athlete]);

    const handleSync = async () => {
        if (!tcuId.trim()) {
            setError('請輸入 TCU-ID 或身份證字號');
            return;
        }

        setIsSyncing(true);
        setError(null);

        try {
            // 搜尋 tcu_members 資料表
            const { data, error } = await supabase
                .from('tcu_members')
                .select('*')
                .or(`account.eq.${tcuId.toUpperCase()},tcu_id.eq.${tcuId}`)
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                setError('查無此會員資料，請確認輸入是否正確');
            } else if (data.strava_id && data.strava_id !== athlete.id.toString()) {
                setError('此會員已綁定其他 Strava 帳號，如有疑問請聯繫管理員');
            } else {
                setMemberData(data);
                // 觸發 n8n 發送 OTP
                await triggerOtp(data.email, data.name);
                setStep('otp');
            }
        } catch (err) {
            console.error('同步錯誤:', err);
            setError('同步失敗，請稍後再試');
        } finally {
            setIsSyncing(false);
        }
    };

    const triggerOtp = async (email: string, name: string) => {
        try {
            // 這裡呼叫後端代理，避免 CORS 問題
            await fetch('/api/auth/member-binding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'generate_otp',
                    email: email,
                    memberName: name,
                    stravaId: athlete.id.toString()
                })
            });
        } catch (err) {
            console.error('發送驗證碼失敗:', err);
            // 即使 Webhook 失敗，前端可能還是要讓使用者進入下一步，或者提示
            throw new Error('發送驗證碼失敗');
        }
    };

    const handleVerify = async () => {
        if (otp.length !== 6) {
            setError('請輸入 6 位數驗證碼');
            return;
        }

        setIsVerifying(true);
        setError(null);

        try {
            const response = await fetch('/api/auth/member-binding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'verify_otp',
                    email: memberData.email,
                    otp: otp,
                    stravaId: athlete.id.toString()
                })
            });

            const result = await response.json();

            if (result.success) {
                setStep('success');
                // 發送自定義事件通知 Navbar 等組件更新狀態
                window.dispatchEvent(new Event('tcu-binding-success'));
                setSuccess('綁定成功！您現在是官方認證會員');
                setIsAlreadyBound(true);
                onBindingSuccess();
            } else {
                setError(result.message || '驗證碼錯誤，請重新輸入');
            }
        } catch (err) {
            console.error('驗證失敗:', err);
            setError('驗證過程發生錯誤，請稍後再試');
        } finally {
            setIsVerifying(false);
        }
    };

    if (isAlreadyBound && memberData) {
        return (
            <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-center md:text-left">
                    <div className="bg-emerald-500 text-white rounded-full p-3 shadow-lg flex-shrink-0">
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-emerald-900 dark:text-emerald-400 font-black italic uppercase">TCU 官方認證會員</h3>
                        <p className="text-emerald-700 dark:text-emerald-600 text-sm font-bold uppercase tracking-wider">
                            {memberData.name} ({memberData.tcu_id})
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-full border border-emerald-200 dark:border-emerald-800 shadow-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">已完成身份綁定</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden group">
            {/* Background decoration */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-tsu-blue/5 rounded-full blur-3xl group-hover:bg-tsu-blue/10 transition-all"></div>

            <div className="relative z-10 flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${step === 'input' ? 'bg-tsu-blue text-white' : 'bg-tsu-blue/10 text-tsu-blue'}`}>
                            <UserCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-slate-900 dark:text-white text-xl font-black italic uppercase">TCU 會員身份綁定</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">Bind your TCU identity to unlock more features</p>
                        </div>
                    </div>
                </div>

                {step === 'input' ? (
                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                            輸入您的 TCU-ID 或個人身份證字號，我們將透過您的官方註冊 Email 發送驗證碼進行確認。
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="text"
                                placeholder="TCU-ID / 身份證字號 (EX: U123...)"
                                value={tcuId}
                                onChange={(e) => setTcuId(e.target.value)}
                                className="flex-1 px-5 py-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-tsu-blue outline-none text-slate-900 dark:text-white font-bold transition-all uppercase"
                            />
                            <button
                                onClick={handleSync}
                                disabled={isSyncing}
                                className="bg-tsu-blue hover:bg-tsu-blue-light disabled:bg-slate-400 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-lg shadow-tsu-blue/20 active:scale-95 flex items-center justify-center gap-2"
                            >
                                {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                                <span>同步資料</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="bg-tsu-blue/10 border border-tsu-blue/30 rounded-2xl p-4 flex items-start gap-3">
                            <Mail className="w-5 h-5 text-tsu-blue mt-0.5" />
                            <div>
                                <p className="text-tsu-blue font-bold text-sm">驗證碼已發送</p>
                                <p className="text-slate-600 dark:text-slate-400 text-xs mt-1">
                                    我們已發送驗證碼至您的註冊信箱：
                                    <span className="font-bold text-slate-900 dark:text-white mx-1">
                                        {memberData.email.replace(/(.{3})(.*)(@.*)/, "$1***$3")}
                                    </span>
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="text"
                                maxLength={6}
                                placeholder="輸入 6 位數驗證碼"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                className="flex-1 px-5 py-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-tsu-blue outline-none text-slate-900 dark:text-white font-black tracking-[0.5em] text-center transition-all"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setStep('input')}
                                    className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-6 py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-slate-300 transition-all"
                                >
                                    返回
                                </button>
                                <button
                                    onClick={handleVerify}
                                    disabled={isVerifying}
                                    className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-400 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                                    <span>確認驗證</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-500/10 p-4 rounded-xl border border-red-100 dark:border-red-500/20 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-xs font-bold leading-normal">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="flex items-center gap-2 text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-500/20 animate-in fade-in slide-in-from-top-2">
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                        <p className="text-xs font-bold leading-normal">{success}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MemberBindingCard;
