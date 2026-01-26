import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, Lock, LogIn, AlertCircle, CheckCircle2, Store, User, Zap } from 'lucide-react';

interface ManagerLoginProps {
    onLoginSuccess: () => void;
}

type RegistrationStep = 'role' | 'details' | 'verify';

export default function ManagerLogin({ onLoginSuccess }: ManagerLoginProps) {
    // Mode
    const [isLogin, setIsLogin] = useState(true);

    // Registration State
    const [regStep, setRegStep] = useState<RegistrationStep>('role');
    const [selectedRole, setSelectedRole] = useState('shop_owner');
    const [shopName, setShopName] = useState('');

    // Form Data
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);

    // Status
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initial load: check remembered credentials
    React.useEffect(() => {
        const savedEmail = localStorage.getItem('manager_email');
        const savedPassword = localStorage.getItem('manager_password');
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
        if (savedPassword) {
            setPassword(savedPassword);
        }
    }, []);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Login Logic
        if (isLogin) {
            setLoading(true);
            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) throw error;

                if (data.session) {
                    // Handle Remember Me
                    if (rememberMe) {
                        localStorage.setItem('manager_email', email);
                        localStorage.setItem('manager_password', password);
                    } else {
                        localStorage.removeItem('manager_email');
                        localStorage.removeItem('manager_password');
                    }

                    localStorage.removeItem('strava_athlete_data');
                    localStorage.removeItem('strava_athlete_meta');
                    onLoginSuccess();
                }
            } catch (err: any) {
                if (err.message === 'Invalid login credentials') {
                    setError('帳號或密碼錯誤。若您剛註冊，請檢查信箱並完成驗證。');
                } else {
                    setError(err.message || '登入失敗，請檢查帳號密碼。');
                }
            } finally {
                setLoading(false);
            }
            return;
        }

        // Registration Logic
        if (regStep === 'role') {
            setRegStep('details');
        } else if (regStep === 'details') {
            setLoading(true);
            try {
                // === BYPASS SUPABASE AUTH ===
                // 直接 INSERT 到 manager_roles，觸發資料庫 Webhook 通知 n8n
                // n8n 會發送驗證信，使用者點擊後才建立 auth.users

                const { error: insertError } = await supabase
                    .from('manager_roles')
                    .insert({
                        email,
                        role: selectedRole,
                        shop_name: shopName,
                        pending_password: password, // 暫存密碼，n8n 建立帳號後清除
                        is_active: false,
                    });

                if (insertError) {
                    // 判斷是重複 Email 錯誤
                    if (insertError.code === '23505') {
                        throw new Error('此 Email 已被註冊，請直接登入或使用其他信箱。');
                    }
                    throw new Error(`註冊失敗: ${insertError.message}`);
                }

                // 成功：跳轉到驗證提示畫面
                setRegStep('verify');

            } catch (err: any) {
                setError(err.message || '註冊失敗，請稍後再試。');
            } finally {
                setLoading(false);
            }
        }
    };

    const resetFlow = (loginMode: boolean) => {
        setIsLogin(loginMode);
        setRegStep('role');
        setError(null);
        if (!rememberMe) {
            setEmail('');
            setPassword('');
        }
        setShopName('');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 max-w-md w-full backdrop-blur-xl shadow-2xl">

                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-white mb-2">
                        {isLogin ? '管理後台登入' : '註冊新帳號'}
                    </h1>
                    <p className="text-slate-400">
                        {isLogin
                            ? '請使用您的管理員帳號登入'
                            : regStep === 'role'
                                ? '第一步：選擇您的角色'
                                : regStep === 'details'
                                    ? '第二步：建立帳號資料'
                                    : '註冊完成'}
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}

                {/* Success Message */}
                {regStep === 'verify' && !isLogin && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center mb-6">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-white mb-2">註冊信已發送！</h3>
                        <p className="text-slate-300 text-sm mb-4">
                            請前往 {email} 收取驗證信，點擊連結後即可登入系統。
                        </p>
                        <button
                            onClick={() => resetFlow(true)}
                            className="w-full bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-2 font-bold transition-colors"
                        >
                            返回登入
                        </button>
                    </div>
                )}

                {/* Forms */}
                {(!(!isLogin && regStep === 'verify')) && (
                    <form onSubmit={handleAuth} className="space-y-6">

                        {/* Step 1: Role Selection (Register Only) */}
                        {!isLogin && regStep === 'role' && (
                            <div className="space-y-3">
                                {[
                                    { id: 'shop_owner', label: '車店老闆', desc: '管理車店與授權', icon: Store },
                                    { id: 'team_coach', label: '車隊教練', desc: '管理車隊成員數據', icon: User },
                                    { id: 'power_coach', label: '功率教練', desc: '專注於訓練分析', icon: Zap }
                                ].map((role) => (
                                    <div
                                        key={role.id}
                                        onClick={() => setSelectedRole(role.id)}
                                        className={`
                                            relative flex items-center p-4 rounded-xl cursor-pointer border-2 transition-all
                                            ${selectedRole === role.id
                                                ? 'border-blue-500 bg-blue-500/10'
                                                : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                                            }
                                        `}
                                    >
                                        <div className={`
                                            w-10 h-10 rounded-lg flex items-center justify-center border-2 mr-4 transition-colors shrink-0
                                            ${selectedRole === role.id
                                                ? 'bg-blue-500 border-blue-500 text-white'
                                                : 'border-slate-600 text-slate-400'
                                            }
                                        `}>
                                            <role.icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className={`font-bold ${selectedRole === role.id ? 'text-white' : 'text-slate-300'}`}>
                                                {role.label}
                                            </h4>
                                            <p className="text-xs text-slate-500 mt-0.5">{role.desc}</p>
                                        </div>
                                        {selectedRole === role.id && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                <CheckCircle2 className="w-5 h-5 text-blue-500" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Step 2: Account Details (Login or Register Step 2) */}
                        {(isLogin || regStep === 'details') && (
                            <>
                                {/* Shop Name (Register Only) */}
                                {!isLogin && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                            {selectedRole === 'shop_owner' ? '車店名稱' : '車隊/組織名稱'}
                                        </label>
                                        <input
                                            type="text"
                                            value={shopName}
                                            onChange={(e) => setShopName(e.target.value)}
                                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all font-medium"
                                            placeholder="例如：TCU 車隊"
                                            required
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                        Email
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                                            placeholder="name@example.com"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                        密碼
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                </div>

                                {isLogin && (
                                    <div className="flex items-center">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    checked={rememberMe}
                                                    onChange={(e) => setRememberMe(e.target.checked)}
                                                    className="sr-only"
                                                />
                                                <div className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${rememberMe ? 'bg-blue-500 border-blue-500' : 'border-slate-700 bg-slate-900/50'}`}>
                                                    {rememberMe && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                                </div>
                                            </div>
                                            <span className="text-sm font-bold text-slate-400 group-hover:text-slate-300 transition-colors uppercase tracking-wider">記住密碼</span>
                                        </label>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl py-4 font-bold text-lg hover:from-blue-500 hover:to-blue-400 focus:ring-4 focus:ring-blue-500/20 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        處理中...
                                    </>
                                ) : (
                                    <>
                                        {isLogin ? (
                                            <>
                                                <LogIn className="w-5 h-5" />
                                                登入
                                            </>
                                        ) : regStep === 'role' ? (
                                            '下一步'
                                        ) : (
                                            '完成註冊'
                                        )}
                                    </>
                                )}
                            </button>

                            {/* Back Button for Register Steps */}
                            {!isLogin && regStep === 'details' && (
                                <button
                                    type="button"
                                    onClick={() => setRegStep('role')}
                                    className="text-slate-400 hover:text-white font-bold transition-colors"
                                >
                                    返回上一步
                                </button>
                            )}
                        </div>

                        {/* Toggle Mode */}
                        <div className="text-center pt-2 border-t border-slate-700/50">
                            <button
                                type="button"
                                onClick={() => resetFlow(!isLogin)}
                                className="text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                {isLogin ? '還沒有帳號？立即註冊' : '已有帳號？返回登入'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div >
    );
}
