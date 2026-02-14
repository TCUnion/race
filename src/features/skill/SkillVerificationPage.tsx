
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { apiClient } from '../../lib/apiClient';
import {
    CheckCircle2,
    AlertTriangle,
    Search,
    Loader2,
    Send,
    ArrowLeft,
    User,
    Mail,
    Edit2,
    Info,
    Check,
    Activity
} from 'lucide-react';

// Ability Types
type AbilityGrade = 'A' | 'B' | 'C' | 'D' | 'E' | null;
type Abilities = {
    '公路賽': AbilityGrade;
    '公路登山': AbilityGrade;
    '公路繞圈': AbilityGrade;
    '計時賽TT': AbilityGrade;
};

interface MemberData {
    success: boolean;
    systemId: string | number;
    memberIdCard: string;
    memberName: string;
    email: string;
    abilities: Abilities;
    tcuId: string | null;
}

const WEBHOOK_ENDPOINT = '/webhook/member-ability';

export const SkillVerificationPage = () => {
    // State
    const [step, setStep] = useState<'query' | 'loading' | 'member' | 'success' | 'error'>('query');
    const [inputId, setInputId] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [memberData, setMemberData] = useState<MemberData | null>(null);
    const [abilityGrades, setAbilityGrades] = useState<Abilities>({
        '公路賽': null,
        '公路登山': null,
        '公路繞圈': null,
        '計時賽TT': null
    });
    const [correctionReason, setCorrectionReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initial Load - Check URL Params
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        let tcuId = urlParams.get('tcu_id') || urlParams.get('tcuId') || urlParams.get('id');

        if (tcuId === 'undefined' || tcuId === 'null') {
            tcuId = null;
        }

        if (tcuId) {
            console.log('🚀 TCU ID detected in URL:', tcuId);
            setInputId(tcuId);
            setStep('loading');
            // Slight delay to ensure UI renders
            setTimeout(() => {
                queryMember(tcuId!);
            }, 500);
        }
    }, []);

    // Query Member Logic
    const queryMember = async (id: string) => {
        const cleanId = id.trim();
        if (!cleanId) {
            showError('請輸入身分證字號或居留證號碼 / Please enter ID or Resident Certificate number');
            return;
        }

        setStep('loading');
        setErrorMessage('');

        try {
            // Priority: Supabase Query
            if (supabase) {
                console.log('Querying member via Supabase...');
                let query = supabase.from('tcu_members').select('*');

                if (cleanId.startsWith('TCU-')) {
                    query = query.eq('tcu_id', cleanId);
                } else {
                    query = query.eq('account', cleanId.toUpperCase());
                }

                const { data, error } = await query;

                if (error) throw error;

                if (!data || data.length === 0) {
                    throw new Error('Member Not Found / 查無此會員資料。請確認輸入是否正確，或嘗試使用身分證字號查詢。');
                }

                const member = data[0];
                const parsedAbilities = parseSkills(member.skills);

                const dataObj: MemberData = {
                    success: true,
                    systemId: member.id,
                    memberIdCard: member.account,
                    memberName: member.real_name,
                    email: member.email,
                    abilities: parsedAbilities,
                    tcuId: member.tcu_id
                };

                setMemberData(dataObj);
                setAbilityGrades(parsedAbilities); // Pre-fill with existing, knowing they might want to change them
                setStep('member');
                return;
            }

            // Fallback: Webhook (via apiClient)
            // Note: In typical React app with apiClient, we trust apiClient to handle the base URL.
            // But if the webhook is on a different service, we might need full URL.
            // Assuming apiClient is configured for the service API.
            // If strictly needed, we can use fetch if apiClient fails or is wrong base.
            // Based on ManagerDashboard, logic seems to rely on apiClient.
            // UPDATE: index.html used https://service.criterium.tw/webhook/member-ability
            // If apiClient base is not that, this might fail.
            // However, let's try apiClient first as it is cleaner.

            // Actually, let's mimic the index.html fallback logic exactly but using apiClient if possible

            // ... legacy fallback omitted if Supabase works ...
            throw new Error('Supabase client not initialized');

        } catch (error: any) {
            console.error('查詢錯誤:', error);
            // If basic Supabase query fails, try Webhook via direct fetch to ensure we hit the right URL if apiClient is different
            try {
                const response = await fetch('https://service.criterium.tw/webhook/member-ability', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'query',
                        memberIdCard: cleanId.startsWith('TCU-') ? cleanId : cleanId.toUpperCase()
                    })
                });

                if (!response.ok) throw new Error(`Inquiry Failed: ${response.status}`);
                const data = await response.json();
                if (data.success === false) throw new Error(data.message || 'Member Not Found');

                setMemberData(data);
                setAbilityGrades(data.abilities || {});
                setStep('member');
            } catch (webhookError: any) {
                showError(webhookError.message || error.message);
                setStep('query');
            }
        }
    };

    const parseSkills = (skillsStr: string | null): Abilities => {
        const abilities: Abilities = {
            '公路賽': null,
            '公路登山': null,
            '公路繞圈': null,
            '計時賽TT': null
        };
        if (!skillsStr) return abilities;

        const lines = skillsStr.split('\n');
        lines.forEach(line => {
            const parts = line.split('：');
            if (parts.length === 2) {
                const name = parts[0].trim() as keyof Abilities;
                const grade = parts[1].trim() as AbilityGrade;
                if (Object.prototype.hasOwnProperty.call(abilities, name)) {
                    abilities[name] = grade;
                }
            }
        });
        return abilities;
    };

    const showError = (msg: string) => {
        setErrorMessage(msg);
        setStep('error');
    };

    const handleSetGrade = (ability: keyof Abilities, grade: AbilityGrade) => {
        setAbilityGrades(prev => ({
            ...prev,
            [ability]: grade
        }));
    };

    const handleSubmit = async () => {
        if (!memberData) return;

        // Validation
        const unsetAbilities = Object.entries(abilityGrades).filter(([_, grade]) => !grade).map(([key]) => key);
        if (unsetAbilities.length > 0) {
            showError(`Missing Ratings / 評等不完整: ${unsetAbilities.join(', ')}`);
            return;
        }

        if (!correctionReason || correctionReason.length < 10) {
            alert('❌ 修正原因需至少 10 字，請描述為何需要調整能力組別\n(例如：近期比賽表現、訓練進步、Strava 成績提升等)');
            return;
        }

        setIsSubmitting(true);
        setStep('loading');

        const payload = {
            action: 'update',
            memberIdCard: memberData.memberIdCard,
            memberName: memberData.memberName,
            abilities: abilityGrades,
            email: memberData.email,
            correctionReason: correctionReason
        };

        try {
            console.log('📡 Sending Webhook Payload:', JSON.stringify(payload, null, 2));
            // Use direct fetch to ensure we hit the exact URL as per original html
            const response = await fetch('https://service.criterium.tw/webhook/member-ability', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`Update Failed: ${response.status}`);
            const data = await response.json();
            if (data.success === false) throw new Error(data.message || 'Update Failed');

            setStep('success');

        } catch (error: any) {
            console.error('更新錯誤:', error);
            showError(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        setStep('query');
        setMemberData(null);
        setInputId('');
        setCorrectionReason('');
        setAbilityGrades({
            '公路賽': null,
            '公路登山': null,
            '公路繞圈': null,
            '計時賽TT': null
        });
        setErrorMessage('');
    };

    // UI Helpers
    const getGradeColor = (grade: string | null) => {
        switch (grade) {
            case 'A': return 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white';
            case 'B': return 'bg-gradient-to-br from-pink-500 to-rose-500 text-white';
            case 'C': return 'bg-gradient-to-br from-blue-500 to-teal-400 text-white';
            case 'D': return 'bg-gradient-to-br from-emerald-500 to-green-600 text-white';
            case 'E': return 'bg-gradient-to-br from-amber-500 to-orange-600 text-white';
            default: return 'bg-slate-100 text-slate-400 border border-slate-200';
        }
    };

    const getGradeBorderColor = (grade: string) => {
        switch (grade) {
            case 'A': return 'border-indigo-500';
            case 'B': return 'border-rose-500';
            case 'C': return 'border-blue-500';
            case 'D': return 'border-emerald-500';
            case 'E': return 'border-amber-500';
            default: return 'border-slate-200';
        }
    };

    const ABILITY_CONFIG = [
        { name: '公路賽', en: 'Road Race' },
        { name: '公路登山', en: 'Hill Climb' },
        { name: '公路繞圈', en: 'Criterium' },
        { name: '計時賽TT', en: 'Time Trial' }
    ] as const;


    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans font-medium md:font-normal selection:bg-blue-500/30 font-['Outfit',sans-serif]">
            {/* Navbar */}
            <nav className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 py-4 px-6 sticky top-0 z-50">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <img src="/tcu-logo-light.png" alt="TCU Logo" className="h-10 hover:opacity-80 transition-opacity" />
                        <div className="h-8 w-[1px] bg-slate-700 mx-2"></div>
                        <div className="flex flex-col">
                            <h1 className="text-white text-lg font-bold tracking-tight leading-tight">能力級別確認與修正</h1>
                            <span className="text-slate-300 text-[10px] uppercase font-bold tracking-[0.2em]">Ability Verification & Correction</span>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-4xl mx-auto p-8 relative">
                <div className="absolute top-0 right-0 -z-10 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50"></div>
                <div className="absolute bottom-0 left-0 -z-10 w-64 h-64 bg-purple-100 rounded-full blur-3xl opacity-50"></div>

                {/* Query Section */}
                {step === 'query' && (
                    <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-2xl p-10 mb-8 border border-white/10 animate-fade-in card-glow">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                                <Search className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white leading-tight">會員資料查詢</h2>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Member Identity Verification</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="flex justify-between items-baseline mb-2 px-1">
                                    <span className="text-sm font-bold text-slate-300">會員身分證字號 <span className="text-orange-500">*</span></span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">National ID Number</span>
                                </label>
                                <input
                                    type="text"
                                    value={inputId}
                                    onChange={(e) => setInputId(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && queryMember(inputId)}
                                    className="w-full px-5 py-4 bg-slate-900/50 border-2 border-slate-800 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-lg placeholder:text-slate-600 font-medium text-white"
                                    placeholder="Ex: A123456789 或 TCU ID"
                                    maxLength={30}
                                />
                                <div className="flex items-start gap-2 mt-3 ml-1 text-slate-400">
                                    <Info className="w-4 h-4 mt-0.5 shrink-0" />
                                    <div className="flex flex-col">
                                        <p className="text-[11px] font-medium leading-relaxed">請輸入完整的身分證字號或居留證號碼（含大寫英文字母）</p>
                                        <p className="text-[10px] font-bold uppercase tracking-tight opacity-60">Full ID or Resident Certificate number required (Capitalized Letters)</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => queryMember(inputId)}
                                className="w-full py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white font-black rounded-2xl hover:from-slate-800 hover:to-slate-700 active:scale-[0.98] transition-all shadow-xl shadow-slate-200 text-lg flex flex-col items-center justify-center -space-y-1"
                            >
                                <span className="flex items-center gap-2">
                                    開始查詢
                                    <Search className="w-5 h-5" />
                                </span>
                                <span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-60">Initiate Inquiry</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Loading Section */}
                {step === 'loading' && (
                    <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-16 mb-8 text-center animate-fade-in">
                        <div className="flex flex-col items-center justify-center">
                            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-8" />
                            <h3 className="text-slate-900 font-black text-2xl tracking-tight">正在同步資料庫</h3>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mt-1 mb-4">Synchronizing Database</p>
                            <p className="text-slate-400 text-sm">這只需要幾秒鐘的時間 / Process will complete in seconds</p>
                        </div>
                    </div>
                )}


                {/* Error Section */}
                {step === 'error' && (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-6 mb-8 animate-fade-in">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600 flex-shrink-0">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-black text-red-900 text-lg">操作發生錯誤</h3>
                                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">System Error</span>
                                </div>
                                <p className="text-red-700 text-sm leading-relaxed whitespace-pre-line">{errorMessage}</p>
                            </div>
                            <button onClick={() => setStep('query')} className="text-red-300 hover:text-red-500 transition-colors">
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Member Section */}
                {step === 'member' && memberData && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Basic Info */}
                        <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl shadow-lg p-8 border border-white/10 card-glow">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex flex-col">
                                    <h2 className="text-2xl font-bold text-white">會員基本資訊</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Basic Member Profile</p>
                                </div>
                                <span className="px-3 py-1 bg-green-500/20 text-green-400 text-[10px] font-black rounded-lg border border-green-500/30 uppercase tracking-widest">Verified Identity</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="group p-6 rounded-2xl bg-slate-950/50 border border-white/5 hover:bg-slate-900 hover:border-blue-500/30 transition-all duration-300">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">ID Card Number / 證號</p>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-3xl font-bold text-white tabular-nums tracking-tight">{memberData.tcuId || memberData.memberIdCard}</p>
                                    </div>
                                </div>
                                <div className="group p-6 rounded-2xl bg-slate-950/50 border border-white/5 hover:bg-slate-900 hover:border-blue-500/30 transition-all duration-300">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Full Member Name / 姓名</p>
                                    <p className="text-3xl font-bold text-white tracking-tight">{memberData.memberName}</p>
                                </div>
                                <div className="md:col-span-2 group p-6 rounded-2xl bg-slate-950/50 border border-white/5 hover:bg-slate-900 hover:border-blue-500/30 transition-all duration-300">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Email Address / 電子郵件</p>
                                            <p className="text-2xl font-bold text-white break-all tracking-tight">{memberData.email || 'N/A'}</p>
                                        </div>
                                        <div className="flex flex-col items-start md:items-end">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-1">Data Correction / 資料修正</p>
                                            <a href="https://page.line.me/criterium" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all text-xs font-bold">
                                                <span>修正請洽 TCU Line@ 官方</span>
                                                <Edit2 className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Current Abilities Display */}
                        <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 text-white relative overflow-hidden">
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                                        <Activity className="w-4 h-4 text-white" />
                                    </div>
                                    <h2 className="text-2xl font-bold">當前能力評等</h2>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {ABILITY_CONFIG.map((ability) => {
                                        const grade = memberData.abilities[ability.name];
                                        return (
                                            <div key={ability.name} className="group bg-white/5 border border-white/10 rounded-2xl p-6 text-center hover:bg-white/10 transition-all duration-300 flex flex-col items-center">
                                                <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">{ability.en}</div>
                                                <div className="text-white text-sm font-bold mb-4">{ability.name}</div>
                                                <span className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${getGradeColor(grade)}`}>
                                                    {grade || 'N/A'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Correction Form */}
                        <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl shadow-lg p-8 border border-white/10 relative overflow-hidden card-glow">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
                                    <Edit2 className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex flex-col">
                                    <h2 className="text-2xl font-bold text-white leading-tight">能力級別確認與修正</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ability Verification & Correction</p>
                                </div>
                            </div>
                            <p className="text-slate-500 text-sm mb-10 ml-1 leading-relaxed">
                                針對不同賽制手動調整您的能力等級評等（A-頂尖 ... E-新手）
                                <br />
                                <span className="text-[10px] font-bold uppercase tracking-wide opacity-60">Adjust your ability ratings for different event formats</span>
                            </p>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {ABILITY_CONFIG.map((ability) => (
                                    <div key={ability.name} className="group bg-slate-950/50 rounded-2xl p-6 border border-white/5 hover:border-blue-500/30 transition-all">
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="flex flex-col">
                                                <h3 className="text-lg font-bold text-white">{ability.name}</h3>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">{ability.en}</p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getGradeColor(abilityGrades[ability.name])}`}>
                                                {abilityGrades[ability.name] || '未設定 / N/A'}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            {['A', 'B', 'C', 'D', 'E'].map((grade) => (
                                                <button
                                                    key={grade}
                                                    onClick={() => handleSetGrade(ability.name, grade as AbilityGrade)}
                                                    className={`flex-1 py-3 border rounded-xl font-bold transition-all ${abilityGrades[ability.name] === grade
                                                        ? `bg-blue-600 text-white ring-4 ring-blue-500/30 ${getGradeBorderColor(grade)}`
                                                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white'
                                                        }`}
                                                >
                                                    {grade}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Reason Input */}
                            <div className="mt-10 p-8 bg-slate-950/50 rounded-3xl border border-white/5 group">
                                <div className="flex items-center justify-between mb-6">
                                    <label className="flex flex-col">
                                        <span className="text-lg font-black text-white leading-tight"><span className="text-rose-400">*</span> 修正原因說明</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Adjustment Justification</span>
                                    </label>
                                    <span className="text-[10px] font-black bg-slate-900/80 px-3 py-1.5 rounded-full border border-white/10 shadow-sm flex items-center gap-1.5">
                                        <span className="text-white text-xs">{correctionReason.length}</span>
                                        <span className="text-slate-300">/</span>
                                        <span className="text-slate-400 uppercase">10+ Characters</span>
                                    </span>
                                </div>
                                <textarea
                                    value={correctionReason}
                                    onChange={(e) => setCorrectionReason(e.target.value)}
                                    rows={4}
                                    className="w-full px-6 py-5 bg-slate-900/50 border-2 border-slate-700 rounded-3xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none placeholder:text-slate-600 font-medium text-sm leading-relaxed text-white"
                                    placeholder="請詳細說明為何需要修正等級 (例如：近期賽事表現、數據提升等) / Please provide detailed reasons..."
                                />
                                <div className="mt-6 flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${correctionReason.length >= 10 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {correctionReason.length >= 10 ? (
                                                <>
                                                    <Check className="w-4 h-4" />
                                                    Ready for Submission / 準備就緒
                                                </>
                                            ) : (
                                                <>
                                                    <AlertTriangle className="w-4 h-4" />
                                                    Requires 10+ characters
                                                </>
                                            )}
                                        </span>
                                    </div>
                                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                                        <div
                                            className={`h-full transition-all duration-500 ease-out ${correctionReason.length >= 10 ? 'bg-blue-500' : 'bg-slate-600'}`}
                                            style={{ width: `${Math.min((correctionReason.length / 10) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 mt-12">
                                <button
                                    onClick={handleSubmit}
                                    disabled={correctionReason.length < 10 || isSubmitting}
                                    className={`flex-[2] py-5 font-black rounded-2xl text-xl shadow-2xl flex flex-col items-center justify-center -space-y-1 transition-all ${correctionReason.length >= 10 && !isSubmitting
                                        ? 'bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98]'
                                        : 'bg-slate-900 text-white opacity-40 cursor-not-allowed'
                                        }`}
                                >
                                    <span className="flex items-center gap-3">
                                        {isSubmitting ? '提交中...' : '確認並提交審核'}
                                        {!isSubmitting && <Send className="w-6 h-6" />}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-40">Confirm and Submit for Review</span>
                                </button>
                                <button
                                    onClick={handleReset}
                                    className="flex-1 py-5 bg-slate-800/50 text-slate-400 font-bold rounded-2xl hover:bg-slate-700 hover:text-white transition-all text-lg flex flex-col items-center justify-center -space-y-1 active:scale-[0.98] border border-white/5"
                                >
                                    <span>返回查詢</span>
                                    <span className="text-[9px] uppercase tracking-wider font-bold opacity-60">Back to Inquiry</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Success Section */}
                {step === 'success' && (
                    <div className="bg-white/90 backdrop-blur-2xl rounded-[3rem] shadow-2xl p-20 mb-10 border border-white animate-fade-in relative overflow-hidden text-center">
                        <div className="absolute -top-32 -left-32 w-80 h-80 bg-green-400/10 rounded-full blur-[80px]"></div>
                        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-blue-400/10 rounded-full blur-[80px]"></div>

                        <div className="relative z-10 flex flex-col items-center">
                            <div className="w-24 h-24 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-slate-200 mb-10 transform scale-110">
                                <CheckCircle2 className="w-12 h-12" />
                            </div>

                            <div className="flex flex-col items-center mb-6">
                                <h3 className="text-4xl font-black text-slate-900 tracking-tight">提交成功</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-1">Submission Successful</p>
                            </div>

                            <p className="text-lg text-slate-500 font-medium mb-12 max-w-md mx-auto leading-relaxed">
                                您的能力修正申請已正式送出，待管理員核實後將會立即生效並通知。
                                <br />
                                <span className="text-[11px] font-bold text-slate-400 leading-normal uppercase">Your application has been submitted and will be reviewed shortly by administrators.</span>
                            </p>

                            <button
                                onClick={handleReset}
                                className="px-12 py-5 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all text-xl shadow-xl shadow-slate-200 active:scale-[0.98] flex flex-col items-center"
                            >
                                <span>完成並返回</span>
                                <span className="text-[10px] uppercase tracking-widest font-bold opacity-50">Complete & Return</span>
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default SkillVerificationPage;
