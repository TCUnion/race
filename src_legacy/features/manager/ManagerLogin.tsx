import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { apiClient } from '../../lib/apiClient';
import { Mail, Lock, LogIn, AlertCircle, CheckCircle2, Store, User, Zap, ArrowLeft, KeyRound, Eye, EyeOff } from 'lucide-react';

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

    // 忘記密碼狀態
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmailSent, setResetEmailSent] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');

    // 密碼重設狀態
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [resetToken, setResetToken] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false);
    const [tokenEmail, setTokenEmail] = useState('');

    // 檢查 URL 中的 reset_token
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('reset_token');
        if (token) {
            setResetToken(token);
            setIsResettingPassword(true);
            // 驗證 Token
            verifyResetToken(token);
        }
    }, []);

    // 驗證 Token 是否有效
    const verifyResetToken = async (token: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('password_reset_tokens')
                .select('email, expires_at, used_at')
                .eq('token', token)
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                throw new Error('重設連結無效或已過期，請重新申請。');
            }

            if (data.used_at) {
                throw new Error('此重設連結已被使用，請重新申請。');
            }

            if (new Date(data.expires_at) < new Date()) {
                throw new Error('重設連結已過期，請重新申請。');
            }

            setTokenEmail(data.email);
        } catch (err: any) {
            console.error('Token verification failed:', err);
            setError(err.message || '驗證失敗');
        } finally {
            setLoading(false);
        }
    };

    // 處理密碼重設
    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (newPassword.length < 6) {
            setError('密碼至少需要 6 個字元。');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('兩次輸入的密碼不一致。');
            return;
        }

        setLoading(true);

        try {
            // 1. 更新 Supabase Auth 密碼
            // 先用 Email 登入取得 Session，然後更新密碼
            // 或者直接使用 Admin API
            const response = await apiClient.post('/webhook/manager-password-update', {
                email: tokenEmail,
                new_password: newPassword,
                reset_token: resetToken
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || '密碼重設失敗');
            }

            // 2. 標記 Token 已使用
            await supabase
                .from('password_reset_tokens')
                .update({ used_at: new Date().toISOString() })
                .eq('token', resetToken);

            setResetSuccess(true);

            // 3. 清除 URL 參數
            window.history.replaceState({}, '', window.location.pathname);

        } catch (err: any) {
            console.error('Password reset failed:', err);
            setError(err.message || '密碼重設失敗，請稍後再試。');
        } finally {
            setLoading(false);
        }
    };

    // Initial load: check remembered credentials
    useEffect(() => {
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

    // Handle Strava Auth Callback (Login Mode)
    React.useEffect(() => {
        const handleStravaAuth = async (athleteData: any) => {
            try {
                setLoading(true);
                console.log('Manager Login: Verifying Strava Athlete', athleteData.id);

                // Verify against manager_roles
                const { data: role, error } = await supabase
                    .from('manager_roles')
                    .select('*')
                    .eq('athlete_id', athleteData.id)
                    .maybeSingle();

                if (error) throw error;

                if (!role) {
                    throw new Error('此 Strava 帳號未綁定任何管理員權限，請先使用 Email 登入並完成綁定。');
                }

                if (!role.is_active) {
                    throw new Error('此管理員帳號尚未啟用，請聯繫系統管理員。');
                }

                // Login Success
                localStorage.setItem('strava_athlete_meta', JSON.stringify(athleteData));
                localStorage.setItem('strava_athlete_data', JSON.stringify(athleteData)); // Sync for consistency

                // Clear any leftover temp data
                localStorage.removeItem('strava_athlete_data_temp');

                onLoginSuccess();
            } catch (err: any) {
                console.error('Strava Login Failed', err);
                setError(err.message || 'Strava 登入失敗');
            } finally {
                setLoading(false);
            }
        };

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'strava_athlete_data_temp' && e.newValue) {
                const data = JSON.parse(e.newValue);
                handleStravaAuth(data);
            }
        };

        const handleMessage = (e: MessageEvent) => {
            if (e.data && e.data.type === 'STRAVA_AUTH_SUCCESS' && e.data.athlete) {
                handleStravaAuth(e.data.athlete);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('message', handleMessage);
        };
    }, []);

    // 處理忘記密碼 (透過 n8n Webhook 發送郵件)
    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // 1. 先檢查此 Email 是否存在於 manager_roles 中
            const { data: managerRole, error: checkError } = await supabase
                .from('manager_roles')
                .select('id, email, shop_name, role')
                .eq('email', forgotEmail)
                .maybeSingle();

            if (checkError) throw checkError;

            if (!managerRole) {
                throw new Error('此 Email 尚未註冊為管理員帳號。');
            }

            // 2. 產生一個重設 Token (簡易版：使用時間戳+隨機數)
            const resetToken = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 小時後過期

            // 3. 將 Token 存入資料庫 (如果沒有 password_reset_tokens 表，需要先建立)
            // 這裡我們直接呼叫 n8n，讓它處理 Token 儲存和郵件發送

            // 4. 呼叫 n8n Webhook 發送重設郵件
            const response = await apiClient.post('/webhook/manager-password-reset', {
                email: forgotEmail,
                shop_name: managerRole.shop_name || '管理員',
                reset_token: resetToken,
                expires_at: expiresAt,
                reset_url: `${import.meta.env.VITE_APP_URL || 'https://status.criterium.tw'}/manager?reset_token=${resetToken}`,
                requested_at: new Date().toISOString()
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || '發送重設信失敗，請稍後再試。');
            }

            setResetEmailSent(true);
        } catch (err: any) {
            console.error('Reset Password Error:', err);
            setError(err.message || '發送重設信失敗，請檢查 Email 是否正確。');
        } finally {
            setLoading(false);
        }
    };

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
                console.error('Manager Login Error:', err);
                if (err.message === 'Invalid login credentials') {
                    setError('帳號或密碼錯誤。若您剛註冊，請檢查信箱並完成驗證。');
                } else if (err.message?.includes('Database error querying schema')) {
                    setError('資料庫架構查詢錯誤 (500)。這通常與 RLS 政策遞迴有關，請確認已執行修復腳本。');
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

                {/* 密碼重設模式 */}
                {isResettingPassword ? (
                    <>
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <KeyRound className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-3xl font-black text-white mb-2">重設密碼</h1>
                            <p className="text-slate-400">
                                {tokenEmail ? `為 ${tokenEmail} 設定新密碼` : '正在驗證重設連結...'}
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Loading State */}
                        {loading && !tokenEmail && !error && (
                            <div className="flex flex-col items-center py-8">
                                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
                                <p className="text-slate-400">正在驗證重設連結...</p>
                            </div>
                        )}

                        {/* Reset Success */}
                        {resetSuccess && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
                                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-white mb-2">密碼重設成功！</h3>
                                <p className="text-slate-300 mb-6">
                                    您現在可以使用新密碼登入管理後台。
                                </p>
                                <button
                                    onClick={() => {
                                        setIsResettingPassword(false);
                                        setResetSuccess(false);
                                        setNewPassword('');
                                        setConfirmPassword('');
                                        setError(null);
                                    }}
                                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl py-3 font-bold transition-all hover:from-blue-500 hover:to-blue-400"
                                >
                                    前往登入
                                </button>
                            </div>
                        )}

                        {/* Reset Form */}
                        {tokenEmail && !resetSuccess && (
                            <form onSubmit={handlePasswordReset} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                        新密碼
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-12 pr-12 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                                            placeholder="至少 6 個字元"
                                            required
                                            minLength={6}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                        >
                                            {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                        確認新密碼
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                                            placeholder="再次輸入新密碼"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl py-4 font-bold text-lg hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            處理中...
                                        </>
                                    ) : (
                                        <>
                                            <KeyRound className="w-5 h-5" />
                                            確認重設密碼
                                        </>
                                    )}
                                </button>

                                <div className="text-center pt-2 border-t border-slate-700/50">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsResettingPassword(false);
                                            setError(null);
                                            window.history.replaceState({}, '', window.location.pathname);
                                        }}
                                        className="text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors"
                                    >
                                        返回登入
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Error with Return Button */}
                        {error && !tokenEmail && (
                            <div className="mt-6">
                                <button
                                    onClick={() => {
                                        setIsResettingPassword(false);
                                        setError(null);
                                        window.history.replaceState({}, '', window.location.pathname);
                                    }}
                                    className="w-full bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-3 font-bold transition-colors"
                                >
                                    返回登入頁面
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {/* 原本的登入/註冊 Header */}
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
                                            <div className="flex items-center justify-between">
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
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowForgotPassword(true);
                                                        setForgotEmail(email);
                                                        setError(null);
                                                    }}
                                                    className="text-sm font-medium text-red-500 hover:text-red-400 transition-colors"
                                                >
                                                    忘記密碼？
                                                </button>
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

                                    {/* Strava Login (Only in Login Mode) */}
                                    {isLogin && (
                                        <>
                                            <div className="relative flex py-2 items-center">
                                                <div className="flex-grow border-t border-slate-700"></div>
                                                <span className="flex-shrink-0 mx-4 text-slate-500 text-sm">或是</span>
                                                <div className="flex-grow border-t border-slate-700"></div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const width = 600;
                                                    const height = 700;
                                                    const left = window.screen.width / 2 - width / 2;
                                                    const top = window.screen.height / 2 - height / 2;
                                                    const authUrl = `https://service.criterium.tw/webhook/strava/auth/start?return_url=${encodeURIComponent(window.location.href)}`;

                                                    window.open(
                                                        authUrl,
                                                        'StravaAuth',
                                                        `width=${width},height=${height},top=${top},left=${left},toolbar=no,menubar=no`
                                                    );
                                                }}
                                                className="w-full bg-[#FC4C02] hover:bg-[#E34402] text-white rounded-xl py-3 font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#FC4C02]/20"
                                            >
                                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                                    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                                                </svg>
                                                使用 Strava 登入
                                            </button>
                                        </>
                                    )}

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

                        {/* 忘記密碼 Modal */}
                        {showForgotPassword && (
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                                    {resetEmailSent ? (
                                        <div className="text-center">
                                            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                                            <h3 className="text-xl font-bold text-white mb-2">重設信已發送！</h3>
                                            <p className="text-slate-300 mb-6">
                                                請前往 <span className="text-blue-400 font-medium">{forgotEmail}</span> 收取重設密碼信，點擊連結即可設定新密碼。
                                            </p>
                                            <button
                                                onClick={() => {
                                                    setShowForgotPassword(false);
                                                    setResetEmailSent(false);
                                                    setForgotEmail('');
                                                }}
                                                className="w-full bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-3 font-bold transition-colors"
                                            >
                                                返回登入
                                            </button>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleForgotPassword} className="space-y-6">
                                            <div className="flex items-center gap-3 mb-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowForgotPassword(false);
                                                        setError(null);
                                                    }}
                                                    className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
                                                >
                                                    <ArrowLeft className="w-5 h-5 text-slate-400" />
                                                </button>
                                                <h3 className="text-xl font-bold text-white">忘記密碼</h3>
                                            </div>
                                            <p className="text-slate-400 text-sm">
                                                請輸入您註冊時使用的 Email，我們將發送重設密碼連結給您。
                                            </p>

                                            {error && (
                                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
                                                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                                    <p className="text-red-400 text-sm">{error}</p>
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
                                                        value={forgotEmail}
                                                        onChange={(e) => setForgotEmail(e.target.value)}
                                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                                                        placeholder="name@example.com"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl py-3 font-bold hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                {loading ? (
                                                    <>
                                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                        處理中...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Mail className="w-5 h-5" />
                                                        發送重設信
                                                    </>
                                                )}
                                            </button>
                                        </form>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
