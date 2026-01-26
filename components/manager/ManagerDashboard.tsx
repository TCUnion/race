/**
 * 管理後台 - 主頁面組件
 * 提供車店/車隊管理者查看授權車友的保養、活動與統計資料
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Store,
    Users,
    Wrench,
    Activity,
    BarChart3,
    Bell,
    Settings,
    AlertTriangle,
    Clock,
    CheckCircle2,
    ChevronRight,
    Plus,
    RefreshCw,
    Search,
    Filter,
    Download,
    Send,
    UserPlus,
    Shield,
    TrendingUp,
    Bike,
    Calendar,
    DollarSign,
    MapPin,
    Mountain,
    Timer,
    Home,
    Trash2,
    UserX,
    UserCheck,
    LogOut,
    X,
    Zap,
    Heart,
    ChevronDown,
    ChevronUp,
    Phone,
    Globe,
    Facebook,
    Instagram,
    Youtube,
    Edit2,
    Save,
} from 'lucide-react';
import { useManagerData } from '../../hooks/useManagerData';
import { supabase } from '../../lib/supabase';
import { AthleteMaintenanceSummary, ActivitySummary, MaintenanceStatistics } from '../../types';
import ManagerLogin from './ManagerLogin';

const ROLE_NAMES: Record<string, string> = {
    shop_owner: '車店老闆',
    team_coach: '車隊教練',
    power_coach: '功率教練',
    team_leader: '車隊長', // Legacy
    technician: '技師'     // Legacy
};

// 頁籤類型
type TabType = 'overview' | 'members' | 'maintenance' | 'activity' | 'statistics' | 'notifications' | 'settings';

// 狀態顏色
const statusColors = {
    ok: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    due_soon: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    overdue: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const statusIcons = {
    ok: CheckCircle2,
    due_soon: Clock,
    overdue: AlertTriangle,
};

const statusLabels = {
    ok: '正常',
    due_soon: '即將到期',
    overdue: '已超期',
};

// 角色專屬配色主題 - Premium 設計
const ROLE_THEMES: Record<string, {
    primary: string;       // 主色
    primaryGlow: string;   // 主色光暈
    secondary: string;     // 次色
    accent: string;        // 強調色漸層
    gradient: string;      // 背景漸層
    headerBg: string;      // Header 背景
    cardBg: string;        // 卡片背景
    cardBorder: string;    // 卡片邊框
    tabActive: string;     // 頁籤選中
    tabHover: string;      // 頁籤 hover
    buttonPrimary: string; // 主按鈕
    buttonGlow: string;    // 按鈕光暈
    iconBg: string;        // 圖示背景
    badge: string;         // 標籤
}> = {
    shop_owner: {
        primary: 'text-amber-400',
        primaryGlow: 'shadow-amber-500/30',
        secondary: 'text-amber-300',
        accent: 'from-amber-500 to-orange-600',
        gradient: 'from-slate-950 via-amber-950/20 to-slate-900',
        headerBg: 'bg-gradient-to-r from-slate-900/95 via-amber-950/30 to-slate-900/95',
        cardBg: 'bg-gradient-to-br from-slate-800/60 to-amber-900/10',
        cardBorder: 'border-amber-500/20',
        tabActive: 'bg-gradient-to-r from-amber-600 to-orange-600 shadow-lg shadow-amber-500/30',
        tabHover: 'hover:bg-amber-500/10',
        buttonPrimary: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400',
        buttonGlow: 'shadow-lg shadow-amber-500/30',
        iconBg: 'bg-gradient-to-br from-amber-500/20 to-orange-500/10',
        badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    },
    team_coach: {
        primary: 'text-emerald-400',
        primaryGlow: 'shadow-emerald-500/30',
        secondary: 'text-emerald-300',
        accent: 'from-emerald-500 to-teal-600',
        gradient: 'from-slate-950 via-emerald-950/20 to-slate-900',
        headerBg: 'bg-gradient-to-r from-slate-900/95 via-emerald-950/30 to-slate-900/95',
        cardBg: 'bg-gradient-to-br from-slate-800/60 to-emerald-900/10',
        cardBorder: 'border-emerald-500/20',
        tabActive: 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg shadow-emerald-500/30',
        tabHover: 'hover:bg-emerald-500/10',
        buttonPrimary: 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400',
        buttonGlow: 'shadow-lg shadow-emerald-500/30',
        iconBg: 'bg-gradient-to-br from-emerald-500/20 to-teal-500/10',
        badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    },
    power_coach: {
        primary: 'text-violet-400',
        primaryGlow: 'shadow-violet-500/30',
        secondary: 'text-violet-300',
        accent: 'from-violet-500 to-purple-600',
        gradient: 'from-slate-950 via-violet-950/20 to-slate-900',
        headerBg: 'bg-gradient-to-r from-slate-900/95 via-violet-950/30 to-slate-900/95',
        cardBg: 'bg-gradient-to-br from-slate-800/60 to-violet-900/10',
        cardBorder: 'border-violet-500/20',
        tabActive: 'bg-gradient-to-r from-violet-600 to-purple-600 shadow-lg shadow-violet-500/30',
        tabHover: 'hover:bg-violet-500/10',
        buttonPrimary: 'bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-400 hover:to-purple-400',
        buttonGlow: 'shadow-lg shadow-violet-500/30',
        iconBg: 'bg-gradient-to-br from-violet-500/20 to-purple-500/10',
        badge: 'bg-violet-500/20 text-violet-400 border-violet-500/30'
    }
};

// 預設主題 (fallback)
const DEFAULT_THEME = ROLE_THEMES.shop_owner;

function ManagerDashboard() {
    const {
        loading,
        error,
        isManager,
        isAuthenticated,
        managerRole,
        authorizations,
        authorizedAthletes,
        maintenanceSummaries,
        activitySummaries,
        maintenanceStatistics,
        notificationSettings,
        notificationLogs,
        refresh,
        addAuthorization,
        removeAuthorization,
        updateNotificationSetting,
        sendNotification,
        registerAsManager,
        checkAthleteExistence,
    } = useManagerData();

    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddAthleteModal, setShowAddAthleteModal] = useState(false);
    const [addStep, setAddStep] = useState<'search' | 'confirm'>('search');
    const [newAthleteId, setNewAthleteId] = useState('');

    // 新增：查詢到的車友資料 State
    const [searchedAthlete, setSearchedAthlete] = useState<{
        id: number;
        firstname: string;
        lastname: string;
        profile: string;
    } | null>(null);
    const [searchError, setSearchError] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [expandedActivityRows, setExpandedActivityRows] = useState<Set<number>>(new Set());

    const toggleActivityRow = (athleteId: number) => {
        const newSet = new Set(expandedActivityRows);
        if (newSet.has(athleteId)) {
            newSet.delete(athleteId);
        } else {
            newSet.add(athleteId);
        }
        setExpandedActivityRows(newSet);
    };

    // Settings Editing State
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState('');
    const [isEditingContact, setIsEditingContact] = useState(false);
    const [tempAddress, setTempAddress] = useState('');
    const [tempPhone, setTempPhone] = useState('');
    const [tempSocials, setTempSocials] = useState<any>({});

    const handleUpdateShopName = async () => {
        if (!tempName.trim()) return;

        try {
            const { error } = await supabase
                .from('manager_roles')
                .update({ shop_name: tempName })
                .eq('id', managerRole?.id);

            if (error) throw error;

            alert('名稱更新成功！');
            setIsEditingName(false);
            refresh(); // Refresh data to show new name
        } catch (err: any) {
            alert('更新失敗: ' + err.message);
        }
    };

    const handleUpdateContactInfo = async () => {
        try {
            const { error } = await supabase
                .from('manager_roles')
                .update({
                    address: tempAddress,
                    phone: tempPhone,
                    social_links: tempSocials
                })
                .eq('id', managerRole?.id);

            if (error) throw error;

            alert('聯絡資訊更新成功！');
            setIsEditingContact(false);
            refresh();
        } catch (err: any) {
            alert('更新失敗: ' + err.message);
        }
    };

    // Load initial data when entering edit mode
    const initEditMode = () => {
        setTempName(managerRole?.shop_name || '');
        setTempAddress(managerRole?.address || '');
        setTempPhone(managerRole?.phone || '');
        setTempSocials(managerRole?.social_links || {});
    };

    const getUnitNameLabel = () => {
        switch (managerRole?.role) {
            case 'shop_owner': return '車店名稱';
            case 'team_coach': return '車隊名稱';
            case 'power_coach': return '訓練中心名稱';
            default: return '單位名稱';
        }
    };

    const tabs = [
        { id: 'overview' as const, label: '總覽', icon: Store },
        { id: 'members' as const, label: '車友管理', icon: Users },
        { id: 'maintenance' as const, label: '保養報表', icon: Wrench },
        { id: 'activity' as const, label: '活動報表', icon: Activity },
        { id: 'statistics' as const, label: '統計分析', icon: BarChart3 },
        { id: 'notifications' as const, label: '通知管理', icon: Bell },
        { id: 'settings' as const, label: '設定', icon: Settings },
    ];

    // 計算統計數據
    const totalOverdue = maintenanceSummaries.reduce((sum, s) => sum + s.totalOverdue, 0);
    const totalDueSoon = maintenanceSummaries.reduce((sum, s) => sum + s.totalDueSoon, 0);
    const totalAthletes = authorizations.length;
    const totalActivities = activitySummaries.reduce((sum, s) => sum + s.total_activities, 0);

    // 取得當前角色主題
    const theme = ROLE_THEMES[managerRole?.role || ''] || DEFAULT_THEME;

    // 搜尋過濾
    const filteredSummaries = maintenanceSummaries.filter(s =>
        s.athlete_name.toLowerCase().includes(searchQuery.toLowerCase())
    );



    // 登出
    const handleLogout = async () => {
        const confirmLogout = window.confirm('確定要登出管理後台嗎？');
        if (confirmLogout) {
            // 清除 LocalStorage
            localStorage.removeItem('strava_athlete_data');
            localStorage.removeItem('strava_athlete_meta');
            // 觸發事件通知其他元件
            window.dispatchEvent(new Event('strava-auth-changed'));

            await supabase.auth.signOut();
            window.location.href = '/manager.html';
        }
    };

    // 查詢車友
    const handleSearchAthlete = async (id: string) => {
        setSearchError('');
        setSearchedAthlete(null);

        if (!id) return;

        try {
            setIsSearching(true);
            const athlete = await checkAthleteExistence(id);
            if (athlete) {
                setSearchedAthlete(athlete);
                setSearchError('');
                setAddStep('confirm'); // Go to confirm step
            } else {
                setSearchedAthlete(null);
                setSearchError('查無此車友資料，請確認該車友是否已登入過本系統。');
            }
        } catch (err) {
            setSearchError('查詢發生錯誤，請稍後再試。');
        } finally {
            setIsSearching(false);
        }
    };

    // 新增授權車友
    const handleAddAthlete = async () => {
        if (!newAthleteId) return;

        // 如果還沒查詢過，先查詢
        if (!searchedAthlete && !searchError) {
            await handleSearchAthlete(newAthleteId);
            // 若查詢失敗或沒人，直接中止
            if (!searchedAthlete) return;
        }

        try {
            // 檢查是否已存在
            const existing = authorizations.find(a => a.athlete_id === parseInt(newAthleteId));
            if (existing) {
                // 若已存在且狀態為 pending 或 approved，則阻擋
                // 若為 rejected 或 revoked，則允許通過 (後端會處理 update)
                if (existing.status === 'pending') {
                    alert('已發送過申請，正在等待車友審核中。');
                    resetAddAthleteModal();
                    return;
                } else if (existing.status === 'approved') {
                    alert('該車友已經在您的授權清單中。');
                    resetAddAthleteModal();
                    return;
                }
            }

            await addAuthorization(parseInt(newAthleteId), 'all');
            alert('授權申請已發送！請通知車友進入系統確認授權。');
            resetAddAthleteModal();
        } catch (err: any) {
            if (err.code === '23505') {
                alert('申請失敗：該車友已在授權流程中。');
            } else {
                alert('新增失敗: ' + (err.message || '未知錯誤'));
            }
        }
    };

    const resetAddAthleteModal = () => {
        setShowAddAthleteModal(false);
        setNewAthleteId('');
        setSearchedAthlete(null);
        setSearchError('');
    };

    // 渲染載入狀態
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 gap-4">
                <div className="w-10 h-10 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-slate-400 font-bold animate-pulse">正在載入車店管理資料...</p>
            </div>
        );
    }

    // 4. 最後檢查權限：如果已登入但不是管理員，且沒有待審核資料，顯示登入介面
    if (!isAuthenticated || !isManager) {
        // 如果有角色資料但未啟用，顯示審核中 (優先於登入介面顯示)
        if (managerRole && !managerRole.is_active) {
            return (
                <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                    <div className="bg-slate-800/50 border border-amber-500/30 rounded-3xl p-8 max-w-lg text-center backdrop-blur-xl">
                        <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                            <Clock className="w-10 h-10 text-amber-500" />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2">帳號審核中</h2>
                        <div className="inline-block px-3 py-1 rounded-full bg-slate-700 text-slate-300 text-xs font-bold mb-6">
                            {ROLE_NAMES[managerRole.role] || managerRole.role} · {managerRole.shop_name}
                        </div>
                        <p className="text-slate-400 mb-8 leading-relaxed">
                            您的管理員申請已送出，目前正在等待系統管理員審核。<br />
                            如有疑問請洽 <a href="https://page.line.me/criterium" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 font-bold hover:underline transition-colors">TCU Line@官方</a> 確認。
                        </p>
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-bold transition-colors flex items-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                檢查狀態
                            </button>
                            <button
                                onClick={handleLogout}
                                className="px-6 py-2 border border-slate-600 hover:bg-slate-700 rounded-xl text-slate-300 font-bold transition-colors"
                            >
                                登出
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        if (error) {
            // 如果有具體錯誤（例如被停權），顯示錯誤
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
                    <div className="bg-slate-800 p-8 rounded-2xl border border-red-500/30 max-w-md w-full text-center">
                        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">無法存取管理後台</h2>
                        <p className="text-red-300 mb-6">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold transition-colors"
                        >
                            重新整理
                        </button>
                    </div>
                </div>
            )
        }
        return <ManagerLogin onLoginSuccess={refresh} />;
    }

    if (!managerRole?.id) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-8 max-w-lg text-center">
                    <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Shield className="w-10 h-10 text-blue-500" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-3">設定您的管理身分</h2>
                    <p className="text-slate-400 mb-6">
                        請先嘗試重新整理或重新登入，若問題持續請聯繫客服。 <br />
                        (理論上註冊後系統應自動設定身分，若見此畫面表示同步可能延遲或失敗)
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                    >
                        重新整理
                    </button>
                    <button
                        onClick={handleLogout}
                        className="mt-4 px-6 py-2 text-slate-500 hover:text-white font-bold transition-colors block mx-auto"
                    >
                        登出
                    </button>
                </div>
            </div>
        );
    }

    // 渲染主介面
    return (
        <div className={`min-h-screen bg-gradient-to-br ${theme.gradient} pb-20`}>
            {/* Header */}
            <div className={`${theme.headerBg} border-b ${theme.cardBorder} sticky top-0 z-40 backdrop-blur-xl`}>
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div
                                onClick={() => window.location.href = '/'}
                                className={`w-12 h-12 bg-gradient-to-br ${theme.accent} rounded-2xl flex items-center justify-center shadow-lg ${theme.primaryGlow} cursor-pointer hover:scale-105 transition-transform`}
                                title="回到首頁"
                            >
                                <Home className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className={`text-xl font-black text-white`}>
                                    {managerRole?.shop_name || '管理後台'}
                                </h1>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold ${theme.primary} uppercase tracking-widest`}>
                                        {ROLE_NAMES[managerRole?.role || ''] || managerRole?.role}
                                    </span>
                                </div>
                            </div>
                        </div>


                        <div className="flex items-center gap-3">
                            <button
                                onClick={refresh}
                                className="p-3 rounded-xl hover:bg-slate-700/50 transition-colors"
                            >
                                <RefreshCw className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 mt-4 overflow-x-auto pb-2 -mx-4 px-4">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${activeTab === tab.id
                                    ? `${theme.tabActive} text-white`
                                    : `text-slate-400 ${theme.tabHover}`
                                    }`}
                            >
                                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-white' : ''}`} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                <AnimatePresence mode="wait">
                    {activeTab === 'overview' && (
                        <motion.div
                            key="overview"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >

                            {/* 統計卡片 */}
                            {/* 統計卡片 */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className={`${theme.cardBg} ${theme.cardBorder} border rounded-2xl p-4`}>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`w-10 h-10 ${theme.iconBg} rounded-xl flex items-center justify-center`}>
                                            <Users className={`w-5 h-5 ${theme.primary}`} />
                                        </div>
                                        <span className="text-xs font-bold text-slate-400 uppercase">授權車友</span>
                                    </div>
                                    <p className="text-3xl font-black text-white">{totalAthletes}</p>
                                </div>

                                <div className={`${theme.cardBg} ${theme.cardBorder} border rounded-2xl p-4`}>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                                            <AlertTriangle className="w-5 h-5 text-red-500" />
                                        </div>
                                        <span className="text-xs font-bold text-slate-400 uppercase">已超期</span>
                                    </div>
                                    <p className="text-3xl font-black text-red-400">{totalOverdue}</p>
                                </div>

                                <div className={`${theme.cardBg} ${theme.cardBorder} border rounded-2xl p-4`}>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                                            <Clock className="w-5 h-5 text-amber-500" />
                                        </div>
                                        <span className="text-xs font-bold text-slate-400 uppercase">即將到期</span>
                                    </div>
                                    <p className="text-3xl font-black text-amber-400">{totalDueSoon}</p>
                                </div>

                                <div className={`${theme.cardBg} ${theme.cardBorder} border rounded-2xl p-4`}>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`w-10 h-10 ${theme.iconBg} rounded-xl flex items-center justify-center`}>
                                            <Activity className={`w-5 h-5 ${theme.primary}`} />
                                        </div>
                                        <span className="text-xs font-bold text-slate-400 uppercase">本年活動</span>
                                    </div>
                                    <p className={`text-3xl font-black ${theme.primary}`}>{totalActivities}</p>
                                </div>
                            </div>

                            {/* 待審核的申請 */}
                            {authorizations.filter(a => a.status === 'pending').length > 0 && (
                                <div className={`${theme.cardBg} ${theme.cardBorder} border rounded-2xl overflow-hidden`}>
                                    <div className={`px-6 py-4 border-b ${theme.cardBorder} flex items-center justify-between`}>
                                        <h2 className="font-bold text-white flex items-center gap-2">
                                            <Clock className={`w-5 h-5 ${theme.secondary}`} />
                                            待審核的申請
                                        </h2>
                                    </div>
                                    <div className={`divide-y ${theme.cardBorder}`}>
                                        {authorizations
                                            .filter(a => a.status === 'pending')
                                            .map(auth => {
                                                const athlete = authorizedAthletes.find(at => at.id === auth.athlete_id);
                                                return (
                                                    <div key={auth.id} className={`px-6 py-4 flex items-center justify-between ${theme.iconBg}`}>
                                                        <div className="flex items-center gap-4">
                                                            {athlete?.profile ? (
                                                                <img
                                                                    src={athlete.profile}
                                                                    alt={athlete.firstname}
                                                                    className="w-10 h-10 rounded-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                                                                    <Users className="w-5 h-5 text-slate-400" />
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="font-bold text-white">
                                                                    {athlete ? `${athlete.firstname} ${athlete.lastname}` : `Athlete ${auth.athlete_id}`}
                                                                </p>
                                                                <p className={`text-xs ${theme.secondary}`}>正在等待車友確認...</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => removeAuthorization(auth.id)}
                                                            className="text-xs font-bold text-red-400 hover:text-red-300 px-3 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
                                                        >
                                                            取消申請
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            )}

                            {/* 需要注意的車友 */}
                            <div className={`${theme.cardBg} ${theme.cardBorder} border rounded-2xl overflow-hidden`}>
                                <div className={`px-6 py-4 border-b ${theme.cardBorder} flex items-center justify-between`}>
                                    <h2 className="font-bold text-white flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                                        需要關注的車友
                                    </h2>
                                    <button
                                        onClick={() => setActiveTab('maintenance')}
                                        className={`text-xs font-bold ${theme.primary} hover:${theme.secondary} flex items-center gap-1`}
                                    >
                                        查看全部 <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className={`divide-y ${theme.cardBorder}`}>
                                    {maintenanceSummaries
                                        .filter(s => s.totalOverdue > 0 || s.totalDueSoon > 0)
                                        .slice(0, 5)
                                        .map(summary => (
                                            <div key={summary.athlete_id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-700/20 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    {summary.athlete_profile ? (
                                                        <img
                                                            src={summary.athlete_profile}
                                                            alt={summary.athlete_name}
                                                            className="w-10 h-10 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                                                            <Users className="w-5 h-5 text-slate-400" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-bold text-white">{summary.athlete_name}</p>
                                                        <p className="text-xs text-slate-400">
                                                            {summary.bikes.length} 台車輛
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {summary.totalOverdue > 0 && (
                                                        <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold">
                                                            {summary.totalOverdue} 項超期
                                                        </span>
                                                    )}
                                                    {summary.totalDueSoon > 0 && (
                                                        <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-bold">
                                                            {summary.totalDueSoon} 項即將到期
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            setSearchQuery(summary.athlete_name);
                                                            setActiveTab('maintenance');
                                                        }}
                                                        className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
                                                        title="查看保養詳情"
                                                    >
                                                        <Send className="w-4 h-4 text-slate-400" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                    {maintenanceSummaries.filter(s => s.totalOverdue > 0 || s.totalDueSoon > 0).length === 0 && (
                                        <div className="px-6 py-12 text-center">
                                            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                                            <p className="text-slate-400 font-medium">所有車友的保養狀態良好！</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 最近活動 */}
                            {/* 最近活動 */}
                            <div className={`${theme.cardBg} ${theme.cardBorder} border rounded-2xl overflow-hidden`}>
                                <div className={`px-6 py-4 border-b ${theme.cardBorder} flex items-center justify-between`}>
                                    <h2 className="font-bold text-white flex items-center gap-2">
                                        <TrendingUp className={`w-5 h-5 ${theme.primary}`} />
                                        活動概況
                                    </h2>
                                    <button
                                        onClick={() => setActiveTab('activity')}
                                        className={`text-xs font-bold ${theme.primary} hover:${theme.secondary} flex items-center gap-1`}
                                    >
                                        詳細報表 <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-slate-700/30 rounded-xl p-4 text-center">
                                        <Bike className={`w-8 h-8 ${theme.primary} mx-auto mb-2`} />
                                        <p className="text-2xl font-black text-white">
                                            {activitySummaries.reduce((sum, s) => sum + s.total_distance, 0).toFixed(0)}
                                        </p>
                                        <p className="text-xs font-bold text-slate-400 uppercase">總里程 (km)</p>
                                    </div>
                                    <div className="bg-slate-700/30 rounded-xl p-4 text-center">
                                        <Mountain className={`w-8 h-8 ${theme.secondary} mx-auto mb-2`} />
                                        <p className="text-2xl font-black text-white">
                                            {(activitySummaries.reduce((sum, s) => sum + s.total_elevation, 0) / 1000).toFixed(1)}
                                        </p>
                                        <p className="text-xs font-bold text-slate-400 uppercase">總爬升 (km)</p>
                                    </div>
                                    <div className="bg-slate-700/30 rounded-xl p-4 text-center">
                                        <Timer className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                                        <p className="text-2xl font-black text-white">
                                            {activitySummaries.reduce((sum, s) => sum + s.total_time, 0).toFixed(0)}
                                        </p>
                                        <p className="text-xs font-bold text-slate-400 uppercase">總時數</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'members' && (
                        <motion.div
                            key="members"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            {/* 標題列 */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-black text-white">車友授權管理</h2>
                                    <p className="text-slate-400 text-sm mt-1">在此管理您的授權車友清單，綁定新車友或取消授權</p>
                                </div>
                                <button
                                    onClick={() => setShowAddAthleteModal(true)}
                                    className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                                >
                                    <UserPlus className="w-5 h-5" />
                                    綁定新車友
                                </button>
                            </div>

                            {/* 待審核的申請 */}
                            {/* 待審核的申請 */}
                            {authorizations.filter(a => a.status === 'pending').length > 0 && (
                                <div className={`${theme.cardBg} ${theme.cardBorder} border rounded-2xl p-5`}>
                                    <h3 className={`font-bold ${theme.secondary} flex items-center gap-2 mb-4`}>
                                        <Clock className="w-5 h-5" />
                                        等待車友確認中 ({authorizations.filter(a => a.status === 'pending').length})
                                    </h3>
                                    <div className="space-y-3">
                                        {authorizations.filter(a => a.status === 'pending').map(auth => {
                                            const athleteInfo = authorizedAthletes.find(at => at.id === auth.athlete_id);
                                            return (
                                                <div key={auth.id} className="flex items-center justify-between bg-slate-800/50 rounded-xl px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                                                            <Users className="w-5 h-5 text-slate-400" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-white">
                                                                {athleteInfo ? `${athleteInfo.firstname || ''} ${athleteInfo.lastname || ''}`.trim() : `Athlete ${auth.athlete_id}`}
                                                            </p>
                                                            <p className="text-xs text-slate-500">ID: {auth.athlete_id}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-bold">等待確認</span>
                                                        <button
                                                            onClick={async () => {
                                                                if (confirm('確定要取消此邀請嗎？')) {
                                                                    await removeAuthorization(auth.id);
                                                                }
                                                            }}
                                                            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors"
                                                            title="取消邀請"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* 已核准的車友 */}
                            <div className={`${theme.cardBg} ${theme.cardBorder} border rounded-2xl overflow-hidden`}>
                                <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
                                    <h3 className="font-bold text-white flex items-center gap-2">
                                        <UserCheck className="w-5 h-5 text-emerald-500" />
                                        已授權車友 ({authorizations.filter(a => a.status === 'approved').length})
                                    </h3>
                                </div>
                                <div className="divide-y divide-slate-700/50">
                                    {authorizations.filter(a => a.status === 'approved').map(auth => {
                                        const athleteInfo = authorizedAthletes.find(at => at.id === auth.athlete_id);
                                        const summary = maintenanceSummaries.find(s => s.athlete_id === auth.athlete_id);
                                        return (
                                            <div key={auth.id} className="px-6 py-4 hover:bg-slate-700/30 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        {athleteInfo?.profile ? (
                                                            <img src={athleteInfo.profile} alt="" className="w-12 h-12 rounded-full object-cover" />
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center">
                                                                <Users className="w-6 h-6 text-slate-400" />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-bold text-white">
                                                                {athleteInfo ? `${athleteInfo.firstname || ''} ${athleteInfo.lastname || ''}`.trim() : `Athlete ${auth.athlete_id}`}
                                                            </p>
                                                            <p className="text-xs text-slate-500">ID: {auth.athlete_id} · 授權於 {auth.approved_at ? new Date(auth.approved_at).toLocaleDateString() : '-'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {summary && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-bold text-slate-400">{summary.bikes.length} 台車</span>
                                                                {summary.totalOverdue > 0 && (
                                                                    <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold">
                                                                        {summary.totalOverdue} 項超期
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={async () => {
                                                                if (confirm('確定要取消這位車友的授權嗎？\n取消後您將無法檢視其保養與活動資料。')) {
                                                                    await removeAuthorization(auth.id);
                                                                }
                                                            }}
                                                            className="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                                                            title="取消授權"
                                                        >
                                                            <UserX className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {authorizations.filter(a => a.status === 'approved').length === 0 && (
                                        <div className="px-6 py-12 text-center">
                                            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                            <p className="text-slate-400 font-medium">尚未有已授權的車友</p>
                                            <p className="text-slate-500 text-sm mt-1">點擊上方「綁定新車友」開始新增</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 已拒絕/過期的記錄 */}
                            {authorizations.filter(a => ['rejected', 'revoked'].includes(a.status)).length > 0 && (
                                <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl p-5">
                                    <h3 className="font-bold text-slate-500 flex items-center gap-2 mb-4">
                                        <Trash2 className="w-5 h-5" />
                                        歷史記錄 ({authorizations.filter(a => ['rejected', 'revoked'].includes(a.status)).length})
                                    </h3>
                                    <div className="space-y-4">
                                        {authorizations.filter(a => ['rejected', 'revoked'].includes(a.status)).map(auth => {
                                            const athlete = authorizedAthletes.find(a => a.id === auth.athlete_id);
                                            return (
                                                <div key={auth.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                                                            {athlete?.profile ? (
                                                                <img src={athlete.profile} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <UserX className="w-5 h-5 text-slate-400" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-white">
                                                                {athlete ? `${athlete.firstname} ${athlete.lastname}` : `Athlete ${auth.athlete_id}`}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase
                                                                    ${auth.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'}
                                                                `}>
                                                                    {auth.status === 'rejected' ? '已拒絕' : '已撤銷'}
                                                                </span>
                                                                <span className="text-xs text-slate-500">
                                                                    ID: {auth.athlete_id}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={async () => {
                                                            if (window.confirm('確定要再次發送邀請嗎？')) {
                                                                try {
                                                                    await addAuthorization(auth.athlete_id, 'all');
                                                                    alert('邀請已重新發送！');
                                                                } catch (err: any) {
                                                                    alert('發送失敗: ' + err.message);
                                                                }
                                                            }
                                                        }}
                                                        className="px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-600 hover:text-white transition-colors"
                                                    >
                                                        再次邀請
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'maintenance' && (
                        <motion.div
                            key="maintenance"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            {/* 搜尋與篩選 */}
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="搜尋車友..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-12 py-3 text-white font-medium focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <button className="flex items-center gap-2 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-400 hover:bg-slate-700/50 transition-colors">
                                    <Filter className="w-5 h-5" />
                                    <span className="font-bold">篩選</span>
                                </button>
                                <button className="flex items-center gap-2 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-400 hover:bg-slate-700/50 transition-colors">
                                    <Download className="w-5 h-5" />
                                    <span className="font-bold">匯出</span>
                                </button>
                            </div>

                            {/* 車友保養清單 */}
                            <div className="space-y-4">
                                {filteredSummaries.map(summary => (
                                    <div
                                        key={summary.athlete_id}
                                        className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden"
                                    >
                                        <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                {summary.athlete_profile ? (
                                                    <img
                                                        src={summary.athlete_profile}
                                                        alt={summary.athlete_name}
                                                        className="w-12 h-12 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center">
                                                        <Users className="w-6 h-6 text-slate-400" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-bold text-white text-lg">{summary.athlete_name}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {summary.totalOverdue > 0 && (
                                                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-xs font-bold">
                                                                {summary.totalOverdue} 超期
                                                            </span>
                                                        )}
                                                        {summary.totalDueSoon > 0 && (
                                                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-xs font-bold">
                                                                {summary.totalDueSoon} 即將到期
                                                            </span>
                                                        )}
                                                        {summary.totalOverdue === 0 && summary.totalDueSoon === 0 && (
                                                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold">
                                                                狀態良好
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => sendNotification(summary.athlete_id, '您有保養項目需要關注，請查看詳情。', 'line')}
                                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
                                            >
                                                <Send className="w-4 h-4" />
                                                發送提醒
                                            </button>
                                        </div>

                                        {/* 車輛清單 */}
                                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {summary.bikes.map(bike => {
                                                const StatusIcon = statusIcons[bike.maintenanceStatus];
                                                const isExpanded = expandedActivityRows.has(parseInt(bike.id) + 1000000); // 借用活動展開邏輯，加位移區隔
                                                const toggleBike = () => {
                                                    const newSet = new Set(expandedActivityRows);
                                                    const key = parseInt(bike.id) + 1000000;
                                                    if (newSet.has(key)) newSet.delete(key);
                                                    else newSet.add(key);
                                                    setExpandedActivityRows(newSet);
                                                };

                                                return (
                                                    <div
                                                        key={bike.id}
                                                        className={`p-4 rounded-xl border transition-all ${statusColors[bike.maintenanceStatus]} ${isExpanded ? 'lg:col-span-full' : ''}`}
                                                    >
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <Bike className="w-5 h-5" />
                                                                <span className="font-bold">{bike.name}</span>
                                                            </div>
                                                            <StatusIcon className="w-5 h-5" />
                                                        </div>
                                                        <p className="text-sm opacity-80">
                                                            里程: {bike.distance.toFixed(0)} km
                                                        </p>
                                                        {bike.lastServiceDate && (
                                                            <p className="text-xs opacity-60 mt-1">
                                                                最近保養: {bike.lastServiceDate}
                                                            </p>
                                                        )}
                                                        <div className="mt-3 flex items-center justify-between">
                                                            <div className="text-xs font-bold">
                                                                {bike.overdueCount > 0 && <span className="mr-2 text-red-400">{bike.overdueCount} 項超期</span>}
                                                                {bike.dueSoonCount > 0 && <span className="text-amber-400">{bike.dueSoonCount} 項即將到期</span>}
                                                                {bike.overdueCount === 0 && bike.dueSoonCount === 0 && <span className="text-emerald-400">所有項目正常</span>}
                                                            </div>
                                                            <button
                                                                onClick={toggleBike}
                                                                className="text-xs font-bold underline opacity-80 hover:opacity-100 flex items-center gap-1"
                                                            >
                                                                {isExpanded ? '收合詳情' : '查看清單'}
                                                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                            </button>
                                                        </div>

                                                        {/* 詳細清單 */}
                                                        {isExpanded && bike.items && (
                                                            <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                                                                {bike.items.sort((a, b) => b.percentage - a.percentage).map((item, idx) => (
                                                                    <div key={idx} className="space-y-1">
                                                                        <div className="flex items-center justify-between text-xs">
                                                                            <span className="font-bold text-white/90">{item.name}</span>
                                                                            <span className={`font-mono ${item.status === 'overdue' ? 'text-red-400' :
                                                                                    item.status === 'due_soon' ? 'text-amber-400' : 'text-slate-400'
                                                                                }`}>
                                                                                {item.mileageSince.toFixed(0)} / {item.interval} km
                                                                            </span>
                                                                        </div>
                                                                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                                                            <div
                                                                                className={`h-full transition-all ${item.status === 'overdue' ? 'bg-red-500' :
                                                                                        item.status === 'due_soon' ? 'bg-amber-500' : 'bg-emerald-500'
                                                                                    }`}
                                                                                style={{ width: `${Math.min(item.percentage, 100)}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}

                                {filteredSummaries.length === 0 && (
                                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-12 text-center">
                                        <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                        <p className="text-slate-400 font-medium">
                                            {searchQuery ? '找不到符合的車友' : '尚無授權車友'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'activity' && (
                        <motion.div
                            key="activity"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            {/* 活動統計卡片 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                            <Activity className="w-6 h-6 text-blue-500" />
                                        </div>
                                        <span className="text-sm font-bold text-slate-400">總活動數</span>
                                    </div>
                                    <p className="text-4xl font-black text-white">{totalActivities}</p>
                                </div>

                                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                                            <MapPin className="w-6 h-6 text-emerald-500" />
                                        </div>
                                        <span className="text-sm font-bold text-slate-400">總里程</span>
                                    </div>
                                    <p className="text-4xl font-black text-white">
                                        {activitySummaries.reduce((sum, s) => sum + s.total_distance, 0).toFixed(0)}
                                        <span className="text-lg text-slate-400 ml-1">km</span>
                                    </p>
                                </div>

                                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                                            <Mountain className="w-6 h-6 text-amber-500" />
                                        </div>
                                        <span className="text-sm font-bold text-slate-400">總爬升</span>
                                    </div>
                                    <p className="text-4xl font-black text-white">
                                        {(activitySummaries.reduce((sum, s) => sum + s.total_elevation, 0) / 1000).toFixed(1)}
                                        <span className="text-lg text-slate-400 ml-1">km</span>
                                    </p>
                                </div>

                                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                                            <Timer className="w-6 h-6 text-purple-500" />
                                        </div>
                                        <span className="text-sm font-bold text-slate-400">總時數</span>
                                    </div>
                                    <p className="text-4xl font-black text-white">
                                        {activitySummaries.reduce((sum, s) => sum + s.total_time, 0).toFixed(0)}
                                        <span className="text-lg text-slate-400 ml-1">hr</span>
                                    </p>
                                </div>
                            </div>

                            {/* 車友活動清單 */}
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-700/50">
                                    <h2 className="font-bold text-white">車友活動概況</h2>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-700/30">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">車友</th>
                                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">活動數</th>
                                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">里程 (km)</th>
                                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">爬升 (m)</th>
                                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">時數</th>
                                                {(managerRole?.role === 'team_coach' || managerRole?.role === 'power_coach') && (
                                                    <>
                                                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Power (Avg/Max)</th>
                                                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">HR (Avg/Max)</th>
                                                    </>
                                                )}
                                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">常用車輛</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-700/50">
                                            {activitySummaries.map(summary => (
                                                <React.Fragment key={summary.athlete_id}>
                                                    <tr className="hover:bg-slate-700/20 transition-colors cursor-pointer" onClick={() => toggleActivityRow(summary.athlete_id)}>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                {expandedActivityRows.has(summary.athlete_id) ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                                                <span className="font-bold text-white">{summary.athlete_name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-slate-300">{summary.total_activities}</td>
                                                        <td className="px-6 py-4 text-right text-slate-300">{summary.total_distance.toFixed(0)}</td>
                                                        <td className="px-6 py-4 text-right text-slate-300">{summary.total_elevation.toFixed(0)}</td>
                                                        <td className="px-6 py-4 text-right text-slate-300">{summary.total_time.toFixed(1)}</td>

                                                        {(managerRole?.role === 'team_coach' || managerRole?.role === 'power_coach') && (
                                                            <>
                                                                <td className="px-6 py-4 text-right text-slate-300 font-mono">
                                                                    {summary.avg_watts ? (
                                                                        <div className="flex flex-col items-end">
                                                                            <span className="text-white font-bold flex items-center gap-1">
                                                                                <Zap className="w-3 h-3 text-yellow-500" />
                                                                                {Math.round(summary.avg_watts)}
                                                                            </span>
                                                                            <span className="text-xs text-slate-500">{summary.max_watts || '-'} max</span>
                                                                        </div>
                                                                    ) : '-'}
                                                                </td>
                                                                <td className="px-6 py-4 text-right text-slate-300 font-mono">
                                                                    {summary.avg_heartrate ? (
                                                                        <div className="flex flex-col items-end">
                                                                            <span className="text-white font-bold flex items-center gap-1">
                                                                                <Heart className="w-3 h-3 text-red-500" />
                                                                                {Math.round(summary.avg_heartrate)}
                                                                            </span>
                                                                            <span className="text-xs text-slate-500">{summary.max_heartrate || '-'} max</span>
                                                                        </div>
                                                                    ) : '-'}
                                                                </td>
                                                            </>
                                                        )}

                                                        <td className="px-6 py-4 text-right">
                                                            {summary.bikes_used.length > 0 ? (
                                                                <span className="text-xs text-slate-400">
                                                                    {summary.bikes_used[0].bike_name}
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs text-slate-500">-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                    {expandedActivityRows.has(summary.athlete_id) && summary.recent_activities && (
                                                        <tr>
                                                            <td colSpan={10} className="px-0 py-0 bg-slate-900/50">
                                                                <div className="p-4">
                                                                    <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest pl-2">近期活動記錄</p>
                                                                    <table className="w-full text-sm">
                                                                        <thead className="bg-slate-800/80 text-slate-400">
                                                                            <tr>
                                                                                <th className="px-4 py-2 text-left">日期</th>
                                                                                <th className="px-4 py-2 text-left">名稱</th>
                                                                                <th className="px-4 py-2 text-right">距離 (km)</th>
                                                                                <th className="px-4 py-2 text-right">爬升 (m)</th>
                                                                                <th className="px-4 py-2 text-right">時間</th>
                                                                                <th className="px-4 py-2 text-right">平均功率</th>
                                                                                <th className="px-4 py-2 text-right">平均心率</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-slate-800">
                                                                            {summary.recent_activities.map(activity => (
                                                                                <tr key={activity.id} className="hover:bg-slate-800/50">
                                                                                    <td className="px-4 py-2 text-slate-300">
                                                                                        {new Date(activity.start_date).toLocaleDateString()}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 text-white font-medium">{activity.name}</td>
                                                                                    <td className="px-4 py-2 text-right text-slate-400">{(activity.distance / 1000).toFixed(1)}</td>
                                                                                    <td className="px-4 py-2 text-right text-slate-400">{activity.total_elevation_gain}</td>
                                                                                    <td className="px-4 py-2 text-right text-slate-400">{(activity.moving_time / 60).toFixed(0)}m</td>
                                                                                    <td className="px-4 py-2 text-right text-amber-400 font-mono">
                                                                                        {activity.average_watts ? Math.round(activity.average_watts) : '-'}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 text-right text-red-400 font-mono">
                                                                                        {activity.average_heartrate ? Math.round(activity.average_heartrate) : '-'}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'statistics' && (
                        <motion.div
                            key="statistics"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            {/* 保養項目統計 */}
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-700/50">
                                    <h2 className="font-bold text-white flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-blue-500" />
                                        保養項目統計
                                    </h2>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-4">
                                        {maintenanceStatistics.map(stat => (
                                            <div key={stat.type_id} className="flex items-center gap-4">
                                                <div className="w-32 flex-shrink-0">
                                                    <span className="font-bold text-white">{stat.type_name}</span>
                                                </div>
                                                <div className="flex-1 h-8 bg-slate-700/50 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full flex items-center justify-end px-3"
                                                        style={{
                                                            width: `${Math.min((stat.total_count / Math.max(...maintenanceStatistics.map(s => s.total_count))) * 100, 100)}%`
                                                        }}
                                                    >
                                                        <span className="text-xs font-bold text-white">{stat.total_count}</span>
                                                    </div>
                                                </div>
                                                <div className="w-24 text-right">
                                                    <span className="text-sm text-slate-400">
                                                        ${stat.total_cost.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* 費用統計 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                        <DollarSign className="w-5 h-5 text-emerald-500" />
                                        總花費統計
                                    </h3>
                                    <p className="text-4xl font-black text-white">
                                        ${maintenanceStatistics.reduce((sum, s) => sum + s.total_cost, 0).toLocaleString()}
                                    </p>
                                    <p className="text-sm text-slate-400 mt-2">
                                        {maintenanceStatistics.reduce((sum, s) => sum + s.total_count, 0)} 筆保養紀錄
                                    </p>
                                </div>

                                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-blue-500" />
                                        平均保養週期
                                    </h3>
                                    <p className="text-4xl font-black text-white">
                                        {maintenanceStatistics.length > 0
                                            ? Math.round(maintenanceStatistics.reduce((sum, s) => sum + s.avg_interval_km, 0) / maintenanceStatistics.length)
                                            : 0}
                                        <span className="text-lg text-slate-400 ml-1">km</span>
                                    </p>
                                    <p className="text-sm text-slate-400 mt-2">
                                        平均里程間隔
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'notifications' && (
                        <motion.div
                            key="notifications"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                                <h2 className="font-bold text-white mb-4">通知管理</h2>
                                <p className="text-slate-400">
                                    通知功能開發中，將支援 LINE 與 Email 通知。
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'settings' && (
                        <motion.div
                            key="settings"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                                <h2 className="font-bold text-white mb-4">管理者設定</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                                            {getUnitNameLabel()}
                                        </label>

                                        {isEditingName ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={tempName}
                                                    onChange={(e) => setTempName(e.target.value)}
                                                    className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500 w-full max-w-sm"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={handleUpdateShopName}
                                                    className="p-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition-colors"
                                                >
                                                    <Save className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setIsEditingName(false)}
                                                    className="p-2 bg-slate-700 rounded-lg text-slate-400 hover:bg-slate-600 hover:text-white transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <p className="text-white text-lg font-bold">
                                                    {managerRole?.shop_name || '未設定'}
                                                </p>
                                                <button
                                                    onClick={() => {
                                                        setTempName(managerRole?.shop_name || '');
                                                        setIsEditingName(true);
                                                    }}
                                                    className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-slate-700/50 rounded-lg transition-all"
                                                    title="編輯名稱"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">管理者電子郵件</label>
                                        <p className="text-white">{managerRole?.email}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">角色</label>
                                        <p className="text-white">{ROLE_NAMES[managerRole?.role || ''] || managerRole?.role}</p>
                                    </div>

                                    {/* 聯絡與社群設定 */}
                                    <div className="pt-6 border-t border-slate-700/50">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-bold text-white text-sm">聯絡與社群資訊</h3>
                                            {!isEditingContact ? (
                                                <button
                                                    onClick={() => {
                                                        initEditMode();
                                                        setIsEditingContact(true);
                                                    }}
                                                    className="text-xs font-bold text-blue-400 flex items-center gap-1 hover:text-blue-300"
                                                >
                                                    <Edit2 className="w-3 h-3" /> 編輯資訊
                                                </button>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={handleUpdateContactInfo}
                                                        className="text-xs font-bold text-green-400 flex items-center gap-1 hover:text-green-300"
                                                    >
                                                        <Save className="w-3 h-3" /> 儲存
                                                    </button>
                                                    <button
                                                        onClick={() => setIsEditingContact(false)}
                                                        className="text-xs font-bold text-slate-400 flex items-center gap-1 hover:text-slate-300"
                                                    >
                                                        <X className="w-3 h-3" /> 取消
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            {/* 地址 */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" /> 地址
                                                </label>
                                                {isEditingContact ? (
                                                    <input
                                                        type="text"
                                                        value={tempAddress}
                                                        onChange={e => setTempAddress(e.target.value)}
                                                        className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white text-sm w-full outline-none focus:border-blue-500"
                                                        placeholder="請輸入地址"
                                                    />
                                                ) : (
                                                    <p className="text-white text-sm">{managerRole?.address || '尚未設定'}</p>
                                                )}
                                            </div>

                                            {/* 電話 */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                                                    <Phone className="w-3 h-3" /> 聯絡電話
                                                </label>
                                                {isEditingContact ? (
                                                    <input
                                                        type="text"
                                                        value={tempPhone}
                                                        onChange={e => setTempPhone(e.target.value)}
                                                        className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white text-sm w-full outline-none focus:border-blue-500"
                                                        placeholder="請輸入電話號碼"
                                                    />
                                                ) : (
                                                    <p className="text-white text-sm">{managerRole?.phone || '尚未設定'}</p>
                                                )}
                                            </div>

                                            {/* 社群連結 */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                                                    <Globe className="w-3 h-3" /> 社群連結
                                                </label>
                                                <div className="grid grid-cols-1 gap-3">
                                                    <div className="flex items-center gap-2">
                                                        <Facebook className="w-4 h-4 text-blue-500" />
                                                        {isEditingContact ? (
                                                            <input
                                                                type="text"
                                                                value={tempSocials?.facebook || ''}
                                                                onChange={e => setTempSocials({ ...tempSocials, facebook: e.target.value })}
                                                                className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm flex-1 outline-none focus:border-blue-500"
                                                                placeholder="Facebook Link"
                                                            />
                                                        ) : (
                                                            <a href={managerRole?.social_links?.facebook} target="_blank" rel="noreferrer" className={`text-sm ${managerRole?.social_links?.facebook ? 'text-blue-400 hover:underline' : 'text-slate-600 cursor-default pointer-events-none'}`}>
                                                                {managerRole?.social_links?.facebook || '未設定 Facebook'}
                                                            </a>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Instagram className="w-4 h-4 text-pink-500" />
                                                        {isEditingContact ? (
                                                            <input
                                                                type="text"
                                                                value={tempSocials?.instagram || ''}
                                                                onChange={e => setTempSocials({ ...tempSocials, instagram: e.target.value })}
                                                                className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm flex-1 outline-none focus:border-blue-500"
                                                                placeholder="Instagram Link"
                                                            />
                                                        ) : (
                                                            <a href={managerRole?.social_links?.instagram} target="_blank" rel="noreferrer" className={`text-sm ${managerRole?.social_links?.instagram ? 'text-pink-400 hover:underline' : 'text-slate-600 cursor-default pointer-events-none'}`}>
                                                                {managerRole?.social_links?.instagram || '未設定 Instagram'}
                                                            </a>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Youtube className="w-4 h-4 text-red-500" />
                                                        {isEditingContact ? (
                                                            <input
                                                                type="text"
                                                                value={tempSocials?.youtube || ''}
                                                                onChange={e => setTempSocials({ ...tempSocials, youtube: e.target.value })}
                                                                className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm flex-1 outline-none focus:border-blue-500"
                                                                placeholder="YouTube Link"
                                                            />
                                                        ) : (
                                                            <a href={managerRole?.social_links?.youtube} target="_blank" rel="noreferrer" className={`text-sm ${managerRole?.social_links?.youtube ? 'text-red-400 hover:underline' : 'text-slate-600 cursor-default pointer-events-none'}`}>
                                                                {managerRole?.social_links?.youtube || '未設定 YouTube'}
                                                            </a>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Globe className="w-4 h-4 text-slate-400" />
                                                        {isEditingContact ? (
                                                            <input
                                                                type="text"
                                                                value={tempSocials?.website || ''}
                                                                onChange={e => setTempSocials({ ...tempSocials, website: e.target.value })}
                                                                className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm flex-1 outline-none focus:border-blue-500"
                                                                placeholder="Website URL"
                                                            />
                                                        ) : (
                                                            <a href={managerRole?.social_links?.website} target="_blank" rel="noreferrer" className={`text-sm ${managerRole?.social_links?.website ? 'text-slate-400 hover:underline' : 'text-slate-600 cursor-default pointer-events-none'}`}>
                                                                {managerRole?.social_links?.website || '未設定官方網站'}
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="w-full py-4 bg-red-600/10 text-red-500 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-600 hover:text-white transition-all mt-8"
                            >
                                <LogOut className="w-5 h-5" />
                                登出管理後台
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* 新增車友 Modal */}
            <AnimatePresence>
                {showAddAthleteModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setShowAddAthleteModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-slate-800 border border-slate-700 rounded-3xl p-8 max-w-md w-full"
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="text-xl font-black text-white mb-6">
                                {addStep === 'search' ? '新增授權車友' : '確認授權對象'}
                            </h3>

                            <AnimatePresence mode="wait">
                                {addStep === 'search' ? (
                                    <motion.div
                                        key="step-search"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                    >
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                            車友 Strava Athlete ID
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newAthleteId}
                                                onChange={e => {
                                                    setNewAthleteId(e.target.value);
                                                    setSearchedAthlete(null);
                                                    setSearchError('');
                                                }}
                                                placeholder="輸入 Athlete ID"
                                                className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white font-medium focus:outline-none focus:border-blue-500"
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' && newAthleteId) {
                                                        handleSearchAthlete(newAthleteId);
                                                    }
                                                }}
                                            />
                                            <button
                                                onClick={() => handleSearchAthlete(newAthleteId)}
                                                disabled={isSearching || !newAthleteId}
                                                className="px-4 py-2 bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-600 disabled:opacity-50 transition-colors"
                                            >
                                                {isSearching ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                                            </button>
                                        </div>

                                        {searchError && (
                                            <p className="text-sm text-red-400 mt-3 font-bold flex items-center gap-2 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                                {searchError}
                                            </p>
                                        )}

                                        <p className="text-xs text-slate-500 mt-4">
                                            車友需要先在系統中連結 Strava 帳號才能被搜尋到
                                        </p>

                                        <div className="flex gap-3 mt-8">
                                            <button
                                                onClick={resetAddAthleteModal}
                                                className="flex-1 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-700 transition-colors"
                                            >
                                                取消
                                            </button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="step-confirm"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                    >
                                        {searchedAthlete && (
                                            <div className="p-6 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex flex-col items-center text-center gap-4">
                                                <img
                                                    src={searchedAthlete.profile}
                                                    alt={searchedAthlete.firstname}
                                                    className="w-20 h-20 rounded-full border-4 border-blue-500 shadow-lg shadow-blue-500/20"
                                                />
                                                <div>
                                                    <p className="font-black text-white text-xl">
                                                        {searchedAthlete.firstname} {searchedAthlete.lastname}
                                                    </p>
                                                    <p className="text-sm text-blue-300 font-bold uppercase mt-1">ID: {newAthleteId}</p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex gap-3 mt-8">
                                            <button
                                                onClick={() => {
                                                    setAddStep('search');
                                                    setSearchedAthlete(null);
                                                }}
                                                className="flex-1 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-700 transition-colors"
                                            >
                                                上一步
                                            </button>
                                            <button
                                                onClick={handleAddAthlete}
                                                className={`flex-1 py-3 ${theme.buttonPrimary} text-white rounded-xl font-bold transition-colors ${theme.buttonGlow}`}
                                            >
                                                確認新增
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}

export default ManagerDashboard;
