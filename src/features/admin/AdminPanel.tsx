import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, CheckCircle2, History, ChevronRight, ClipboardCheck, RefreshCw, Edit2, Globe, Trash2, Database, Share2, FileText, LifeBuoy, MessageCircle, Search, Briefcase, Plus, Users, LogOut, Lock, XCircle } from 'lucide-react';
import { supabaseAdmin as supabase } from '../../lib/supabase';
import { API_BASE_URL } from '../../lib/api_config';
import StravaLogo from '../../components/ui/StravaLogo';

// 宣告全域變數 (由 vite.config.ts 注入)
declare const __APP_VERSION__: string;

// 🚀 深度搜索 Polyline 函式 (地毯式搜尋)
const findPolyline = (obj: any): string => {
    if (!obj || typeof obj !== 'object') return "";

    // 1. 常見直接欄位
    if (typeof obj.polyline === 'string' && obj.polyline.length > 10) return obj.polyline;
    if (typeof obj.summary_polyline === 'string' && obj.summary_polyline.length > 10) return obj.summary_polyline;
    if (typeof obj.map_polyline === 'string' && obj.map_polyline.length > 10) return obj.map_polyline;

    // 2. map 欄位處理 (支援物件或直接字串)
    if (obj.map) {
        // 如果 map 直接就是 polyline 字串 (n8n 格式)
        if (typeof obj.map === 'string' && obj.map.length > 10) return obj.map;
        // 如果 map 是物件 (Strava 標準格式)
        if (typeof obj.map === 'object') {
            if (typeof obj.map.polyline === 'string' && obj.map.polyline.length > 10) return obj.map.polyline;
            if (typeof obj.map.summary_polyline === 'string' && obj.map.summary_polyline.length > 10) return obj.map.summary_polyline;
        }
    }

    // 3. map_id 欄位 (有時候會是 s + segment_id 格式，需要忽略)
    // 不處理 map_id，因為它不是 polyline

    // 4. 遞迴搜索 (限深二層以防循環)
    for (const key in obj) {
        if (obj[key] && typeof obj[key] === 'object' && key !== 'map') {
            const found = findPolyline(obj[key]);
            if (found && found.length > 10) return found;
        }
    }
    return "";
};

const normalizeSegment = (raw: any): any => {
    const data = Array.isArray(raw) ? raw[0] : raw;
    if (!data) return null;

    // 🚀 多重備援 Key 檢查 (Strava API 有時會變動，或經過 n8n 轉換)
    const elevation = data.total_elevation_gain || data.elevation_gain || (data.elevationDetail?.total_gain);
    const id = data.id || data.strava_id || data.segment_id;

    return {
        id: id,
        qom: data.QOM || data.qom || data.qom_time,
        pr_elapsed_time: data.pr_elapsed_time || data.athlete_segment_stats?.pr_elapsed_time,
        pr_date: data.pr_date || data.athlete_segment_stats?.pr_date,
        elevation_profile: data.elevation_profile,
        polyline: findPolyline(data),
        strava_id: data.strava_id || id // 確保 strava_id 存在
    };
};

interface StravaToken {
    id: number;
    athleteID: string;
    createdAt: string;
    updatedAt: string;
    expires_at: number;
    name?: string;
    isBound?: boolean;
    lastActivityAt?: string;
}

const AdminPanel: React.FC = () => {

    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [segments, setSegments] = useState<any[]>([]);

    useEffect(() => {
        let mounted = true;

        const checkSessionAndRole = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                // [NEW] Session 恢復時，也必須嚴格檢查角色
                // console.log("Checking role for:", session.user.email);
                const { data: managerData, error } = await supabase
                    .from('manager_roles')
                    .select('role, is_active')
                    .eq('email', session.user.email)
                    .maybeSingle();

                // console.log("Role check result:", managerData, error);

                if (!mounted) return;

                if (error || !managerData || managerData.role !== 'admin' || !managerData.is_active) {

                    // [FIX] 自動導向：若是其他有效管理角色，轉址到 Manager Dashboard
                    if (managerData && managerData.is_active && ['shop_owner', 'team_coach', 'power_coach'].includes(managerData.role)) {
                        console.log(`REDIRECT: User ${session.user.email} is ${managerData.role}, redirecting to manager dashboard.`);
                        // 使用 setTimeout 讓 alert 有機會顯示 (或直接省略 alert 追求流暢體驗，但這裡保留提示)
                        alert(`您目前的身份為「${managerData.role}」，即將為您跳轉至管理專用後台。`);
                        window.location.href = '/manager.html';
                        return;
                    }

                    console.warn('非 Admin 角色或權限不足，強制登出', managerData);
                    alert(`權限檢查失敗:\nEmail: ${session.user.email}\nRole: ${managerData?.role}\nActive: ${managerData?.is_active}\nError: ${error?.message}`);
                    await supabase.auth.signOut();
                    if (mounted) {
                        setSession(null);
                        setLoading(false);
                        setError('權限不足：此頁面僅限系統管理員訪問。');
                    }
                    return;
                }

                if (mounted) {
                    setSession(session);
                    fetchSegments();
                    fetchSiteSettings();
                }
            } else {
                if (mounted) {
                    // 嘗試從 localStorage 讀取記住的登入資訊
                    const savedEmail = localStorage.getItem('admin_email');
                    const savedPassword = localStorage.getItem('admin_password');
                    if (savedEmail) {
                        setEmail(savedEmail);
                        setRememberMe(true);
                    }
                    if (savedPassword) {
                        setPassword(savedPassword);
                    }
                }
            }
            if (mounted) setLoading(false);
        };

        checkSessionAndRole();

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            // [FIX] 僅當發生明確登出時才清空 Session，防止 INITIAL_SESSION 覆蓋 role check
            if (event === 'SIGNED_OUT' || !session) {
                if (mounted) setSession(null);
            }
        });

        return () => {
            mounted = false;
            authListener.subscription.unsubscribe();
        };
    }, []);

    const [editingSegment, setEditingSegment] = useState<any>(null);
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [siteSettings, setSiteSettings] = useState<any[]>([]);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [isUpdatingVersion, setIsUpdatingVersion] = useState(false);
    const [allMembers, setAllMembers] = useState<any[]>([]);
    const [isUnbindingMember, setIsUnbindingMember] = useState<string | null>(null);
    const [stravaTokens, setStravaTokens] = useState<StravaToken[]>([]);
    const [isRefreshingTokens, setIsRefreshingTokens] = useState(false);

    // 報名列表搜尋與分頁狀態
    const [regSearchTerm, setRegSearchTerm] = useState('');
    const [regPageSize, setRegPageSize] = useState(10);
    const [regCurrentPage, setRegCurrentPage] = useState(1);

    // 會員管理 - 搜尋與分頁狀態
    const [memberSearchTerm, setMemberSearchTerm] = useState('');
    const [memberPageSize, setMemberPageSize] = useState(10);
    const [memberCurrentPage, setMemberCurrentPage] = useState(1);

    // Strava Token 顯示與搜尋/分頁狀態
    const [tokenSearchTerm, setTokenSearchTerm] = useState('');
    const [tokenPageSize, setTokenPageSize] = useState(10);
    const [tokenCurrentPage, setTokenCurrentPage] = useState(1);
    const [tokenSortField, setTokenSortField] = useState<string>('isBound');
    const [tokenSortOrder, setTokenSortOrder] = useState<'asc' | 'desc'>('desc');

    // 管理員管理
    const [managers, setManagers] = useState<any[]>([]);
    const [editingManager, setEditingManager] = useState<any>(null); // New editing state
    const [managerSearchTerm, setManagerSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'segments' | 'members' | 'tokens' | 'managers' | 'seo' | 'footer'>('managers'); // 預設顯示管理員管理


    const fetchSegments = async () => {
        const { data, error } = await supabase.from('segments').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error('Fetch error:', error);
            setError('讀取路段失敗: ' + error.message);
        } else if (data) {
            setSegments(data);
        }
    };

    const handleRefreshSegment = async (seg: any) => {
        if (!confirm(`確定要重新整理「${seg.name}」的資料與地圖嗎？`)) return;

        try {
            const sid = seg.strava_id;
            if (!sid) {
                alert('缺少 Strava ID，無法重新整理');
                return;
            }

            const response = await fetch('https://n8n.criterium.tw/webhook/segment_set', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ segment_id: sid })
            });

            const responseText = await response.text();
            if (!responseText || responseText.trim() === "") throw new Error("伺服器回傳了空內容");

            const segmentData = JSON.parse(responseText);
            const normalized = normalizeSegment(segmentData);
            if (!normalized) throw new Error("正規化資料後為空，請檢查伺服器回傳格式");

            if (!normalized.polyline) {
                alert('警告：雖然成功取得資料，地圖路線 (Polyline) 仍然缺失。');
            }

            const { error } = await supabase
                .from('segments')
                .update({
                    name: normalized.name || seg.name,
                    distance: normalized.distance || seg.distance,
                    average_grade: normalized.average_grade || seg.average_grade,
                    maximum_grade: normalized.maximum_grade || seg.maximum_grade,
                    elevation_gain: normalized.elevation_gain || seg.elevation_gain,
                    elevation_high: normalized.elevation_high,
                    elevation_low: normalized.elevation_low,
                    total_elevation_gain: normalized.total_elevation_gain,
                    activity_type: normalized.activity_type,
                    climb_category: normalized.climb_category,
                    city: normalized.city,
                    state: normalized.state,
                    country: normalized.country,
                    star_count: normalized.star_count,
                    athlete_count: normalized.athlete_count,
                    kom: normalized.kom,
                    qom: normalized.qom,
                    pr_elapsed_time: normalized.pr_elapsed_time,
                    pr_date: normalized.pr_date,
                    elevation_profile: normalized.elevation_profile,
                    polyline: normalized.polyline || seg.polyline
                })
                .eq('id', seg.id);

            if (error) throw error;
            alert('路段資料更新成功！');
            fetchSegments();
        } catch (err: any) {
            alert('更新失敗: ' + err.message);
        }
    };
    const handleSyncEfforts = async (seg: any) => {
        if (!confirm(`確定要同步「${seg.name}」的詳細成績數據嗎？\n這可能需要幾秒鐘的時間。`)) return;

        try {
            const sid = seg.strava_id;
            if (!sid) {
                alert('缺少 Strava ID，無法同步');
                return;
            }

            // 顯示載入提示（簡易版）
            const btn = document.getElementById(`sync-btn-${seg.id}`);
            if (btn) btn.classList.add('animate-spin');

            const response = await fetch('https://n8n.criterium.tw/webhook/segment_effor_syn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ segment_id: sid })
            });

            if (btn) btn.classList.remove('animate-spin');

            if (response.ok) {
                alert('同步請求已發送！資料庫將在後台更新。');
            } else {
                throw new Error(`伺服器回傳錯誤: ${response.status}`);
            }
        } catch (err: any) {
            alert('同步失敗: ' + err.message);
            const btn = document.getElementById(`sync-btn-${seg.id}`);
            if (btn) btn.classList.remove('animate-spin');
        }
    };

    const handleBulkSync = async () => {
        const targetSegments = segments.filter(s => s.strava_id);
        if (!confirm(`確定要同步所有 ${targetSegments.length} 個路段的詳細成績數據嗎？\n這將會依序觸發同步請求，請勿頻繁操作。`)) return;

        try {
            let successCount = 0;
            // 讓使用者知道開始了
            const originalText = document.getElementById('bulk-sync-btn')?.innerHTML;
            const btn = document.getElementById('bulk-sync-btn');
            if (btn) {
                btn.innerHTML = '<span class="animate-spin">⏳</span>'; // 簡易 Loading
                btn.setAttribute('disabled', 'true');
            }

            // 使用 Promise.all 並行請求，或用迴圈序列請求。考量 n8n 負載，用序列請求比較保險。
            for (const seg of targetSegments) {
                try {
                    // 觸發個別同步
                    await fetch('https://n8n.criterium.tw/webhook/segment_effor_syn', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ segment_id: seg.strava_id })
                    });
                    successCount++;
                } catch (e) {
                    console.error(`Segment ${seg.name} sync failed`, e);
                }
                // 稍微延遲避免瞬間爆發 (雖然後端應該扛得住，但前端保險起見)
                await new Promise(r => setTimeout(r, 30000));
            }

            alert(`已成功發送 ${successCount} 個路段的同步請求！`);

            if (btn && originalText) {
                btn.innerHTML = originalText;
                btn.removeAttribute('disabled');
            }
        } catch (err: any) {
            alert('批量同步發生異常: ' + err.message);
            const btn = document.getElementById('bulk-sync-btn');
            if (btn) btn.removeAttribute('disabled');
        }
    };

    const fetchRegistrations = async (filterSegmentId: string | null = null) => {
        let query = supabase
            .from('registrations')
            .select('*, segments(name, strava_id)')
            .order('registered_at', { ascending: false });

        if (filterSegmentId) {
            query = query.eq('segment_id', filterSegmentId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Fetch registrations error:', error);
            setError('讀取報名資料失敗: ' + error.message);
        } else if (data) {
            setRegistrations(data);
        }
    };

    useEffect(() => {
        if (session) fetchRegistrations();
    }, [session]);

    useEffect(() => {
        if (session) {
            fetchAllMembers();
            fetchStravaTokens();
            fetchSiteSettings();
            fetchManagers();
        }
    }, [session]);

    const handleUpdateSegment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSegment) return;

        let error;
        if (editingSegment.id === 'new') {
            const { error: insertError } = await supabase.from('segments').insert({
                id: editingSegment.strava_id, // 顯式傳遞 Strava ID 作為主鍵
                strava_id: editingSegment.strava_id,
                name: editingSegment.name,
                description: editingSegment.description,
                link: editingSegment.link,
                distance: editingSegment.distance,
                average_grade: editingSegment.average_grade,
                maximum_grade: editingSegment.maximum_grade,
                elevation_gain: editingSegment.elevation_gain,
                polyline: editingSegment.polyline,
                is_active: editingSegment.is_active,
                start_date: editingSegment.start_date,
                end_date: editingSegment.end_date
            });
            error = insertError;
        } else {
            const { error: updateError } = await supabase
                .from('segments')
                .update({
                    strava_id: editingSegment.strava_id,
                    name: editingSegment.name,
                    description: editingSegment.description,
                    link: editingSegment.link,
                    distance: editingSegment.distance,
                    average_grade: editingSegment.average_grade,
                    maximum_grade: editingSegment.maximum_grade,
                    elevation_gain: editingSegment.elevation_gain,
                    polyline: editingSegment.polyline,
                    is_active: editingSegment.is_active,
                    start_date: editingSegment.start_date,
                    end_date: editingSegment.end_date
                })
                .eq('id', editingSegment.id);
            error = updateError;
        }

        if (error) {
            alert((editingSegment.id === 'new' ? '新增' : '更新') + '失敗: ' + error.message);
        } else {
            setEditingSegment(null);
            fetchSegments();
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. 一般登入流程
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

            if (authError) {
                setError(authError.message);
                setLoading(false);
                return;
            }

            // 2. 權限驗證：檢查是否在 manager_roles 表中且為啟用狀態
            const { data: managerData, error: managerError } = await supabase
                .from('manager_roles')
                .select('is_active, role')
                .eq('email', email)
                .maybeSingle();

            if (managerError || !managerData || !managerData.is_active) {
                // 權限不足，強制登出
                await supabase.auth.signOut();
                setError('權限不足：此帳號未獲得管理員授權，或帳號已被停用。');
                setLoading(false);
                return;
            }

            // [NEW] 嚴格限制：僅允許 admin 角色登入 (若為其他管理員則導向)
            if (managerData.role !== 'admin') {
                if (['shop_owner', 'team_coach', 'power_coach'].includes(managerData.role)) {
                    alert(`您目前的身份為「${managerData.role}」，即將為您跳轉至管理專用後台。`);
                    window.location.href = '/manager.html';
                    return;
                }

                await supabase.auth.signOut();
                setError('權限不足：此登入入口僅限系統管理員使用。請前往「車店/教練管理後台」登入。');
                setLoading(false);
                return;
            }

            // 3. 通過驗證，處理「記住我」
            if (rememberMe) {
                localStorage.setItem('admin_email', email);
                localStorage.setItem('admin_password', password);
            } else {
                localStorage.removeItem('admin_email');
                localStorage.removeItem('admin_password');
            }

            // 登入後重整資料
            // 並且更新 Session 狀態以觸發 UI 重繪
            setSession(authData.session);

            // 登入後重整資料
            fetchSegments();
            // [FIX] 登入成功後必須關閉 Loading 狀態
            setLoading(false);

        } catch (err: any) {
            console.error("Auth check failed:", err);
            await supabase.auth.signOut();
            setError('驗證過程發生錯誤，請稍後再試');
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setSegments([]);
    };

    const fetchAllMembers = async () => {
        try {
            // 1. 抓取會員基本資料
            const { data: members, error: mError } = await supabase
                .from('tcu_members')
                .select('real_name, email, team, tcu_id, member_type, status, account') // 補上 account 欄位
                .order('real_name');

            if (mError) throw mError;

            // 2. 抓取 Binding 資料 (真理來源)
            const { data: bindings, error: bError } = await supabase
                .from('strava_bindings')
                .select('strava_id, tcu_member_email, tcu_account');

            // 建立 Search Maps
            const accountMap = new Map(); // key: account, value: strava_id
            const emailMap = new Map();   // key: email, value: strava_id

            if (!bError && bindings) {
                bindings.forEach(b => {
                    if (b.tcu_account) {
                        accountMap.set(b.tcu_account, b.strava_id);
                    }
                    if (b.tcu_member_email) {
                        emailMap.set(b.tcu_member_email, b.strava_id);
                    }
                });
            }

            // 3. 抓取 Strava 選手資料
            // 收集所有 unique strava ids
            const stravaIds = Array.from(new Set(bindings?.map(b => b.strava_id) || []));

            let athleteMap = new Map();
            if (stravaIds.length > 0) {
                const { data: athletes, error: aError } = await supabase
                    .from('athletes')
                    .select('id, firstname, lastname')
                    .in('id', stravaIds);

                if (!aError && athletes) {
                    athletes.forEach(a => athleteMap.set(a.id.toString(), a));
                }
            }

            // 4. 合併與排序
            const sorted = (members || []).map(m => {
                // 邏輯修正：嚴格優先使用 account 對應
                // 如果該會員 record 有 account，則只看 accountMap 是否有對應
                // 如果 record 沒有 account (較少見)，才 fallback 到 email

                let stravaId = null;

                if (m.account && accountMap.has(m.account)) {
                    stravaId = accountMap.get(m.account);
                } else if (!m.account && emailMap.has(m.email)) {
                    // 只有在會員資料本身沒有 account 欄位時，才允許用 email 寬鬆匹配
                    stravaId = emailMap.get(m.email);
                }
                // 注意：如果 m.account 存在但沒對應到 binding，就算 email 相同也不視為綁定 (解決多重帳號共用 email 問題)

                return {
                    ...m,
                    strava_id: stravaId,
                    athletes: stravaId ? athleteMap.get(stravaId.toString()) : null
                };
            }).sort((a, b) => {
                const aBound = !!a.strava_id;
                const bBound = !!b.strava_id;
                if (aBound && !bBound) return -1;
                if (!aBound && bBound) return 1;
                return 0;
            });

            setAllMembers(sorted);
        } catch (err: any) {
            console.error('Fetch members error:', err);
        }
    };

    const fetchManagers = async () => {
        const { data: managersData, error } = await supabase
            .from('manager_roles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Fetch managers error:', error);
        } else {
            // Fetch authorizations statistics
            const { data: authData } = await supabase
                .from('user_authorizations')
                .select('manager_athlete_id, manager_email, status');

            const managersWithStats = (managersData || []).map(m => {
                const myAuths = (authData || []).filter(a => {
                    const matchId = m.athlete_id && a.manager_athlete_id && Number(m.athlete_id) === Number(a.manager_athlete_id);
                    const matchEmail = m.email && a.manager_email && m.email.toLowerCase() === a.manager_email.toLowerCase();
                    return matchId || matchEmail;
                });

                return {
                    ...m,
                    authorizedCount: myAuths.filter(a => a.status === 'approved').length,
                    pendingCount: myAuths.filter(a => a.status === 'pending').length
                };
            });

            setManagers(managersWithStats);
        }
    };

    const handleUpdateManagerStatus = async (id: number, isActive: boolean) => {
        if (!confirm(`確定要${isActive ? '啟用' : '停用'}此管理員權限嗎？`)) return;

        const { error } = await supabase
            .from('manager_roles')
            .update({ is_active: isActive })
            .eq('id', id);

        if (error) {
            alert('更新失敗: ' + error.message);
        } else {
            fetchManagers();
        }
    };

    const handleEditManager = (manager: any) => {
        setEditingManager({ ...manager });
    };

    const handleUpdateManagerSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingManager) return;

        const { error } = await supabase
            .from('manager_roles')
            .update({
                shop_name: editingManager.shop_name,
                role: editingManager.role
            })
            .eq('id', editingManager.id);

        if (error) {
            alert('更新失敗: ' + error.message);
        } else {
            alert('管理員資料已更新');
            setEditingManager(null);
            fetchManagers();
        }
    };

    const handleDeleteManager = async (manager: any) => {
        // 🔒 受保護的系統管理員帳號 (禁止刪除)
        const PROTECTED_EMAILS = [
            'service@tsu.com.tw',
            'admin@criterium.tw',
        ];

        if (PROTECTED_EMAILS.includes(manager.email.toLowerCase())) {
            alert('⚠️ 此為系統管理員帳號，無法刪除。');
            return;
        }

        if (!confirm(`確定要永久刪除管理員「${manager.email}」嗎？\n\n⚠️ 此操作無法復原！`)) return;

        // 二次確認 (防誤刪)
        const confirmText = prompt('請輸入「DELETE」以確認刪除：');
        if (confirmText !== 'DELETE') {
            alert('刪除已取消');
            return;
        }

        try {
            // 1. 呼叫 n8n Webhook 刪除 auth.users (需要 Service Role Key)
            if (manager.user_id || manager.email) {
                try {
                    await fetch('https://service.criterium.tw/webhook/delete-auth-user', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            user_id: manager.user_id,
                            email: manager.email
                        })
                    });
                } catch (webhookErr) {
                    console.warn('刪除 auth.users Webhook 請求失敗 (但不影響 manager_roles 刪除):', webhookErr);
                }
            }

            // 2. 刪除 manager_verifications 中的相關記錄
            await supabase
                .from('manager_verifications')
                .delete()
                .eq('email', manager.email);

            // 3. 刪除 manager_roles 記錄
            const { error } = await supabase
                .from('manager_roles')
                .delete()
                .eq('id', manager.id);

            if (error) throw error;

            alert('管理員已永久刪除');
            fetchManagers();
        } catch (err: any) {
            alert('刪除失敗: ' + err.message);
        }
    };


    const fetchStravaTokens = async () => {
        setIsRefreshingTokens(true);
        try {
            // 1. 抓取所有運動員作為基礎
            const { data: athletes, error: aError } = await supabase
                .from('athletes')
                .select('id, firstname, lastname');

            if (aError) throw aError;

            // 2. 抓取所有權杖資訊 (正確資料來源為 strava_tokens)
            const { data: tokens, error: tError } = await supabase
                .from('strava_tokens')
                .select('athlete_id, updated_at, expires_at, created_at, last_activity_at'); // 確保包含 created_at, last_activity_at

            const tokenMap = new Map();
            if (!tError && tokens) {
                tokens.forEach(t => tokenMap.set(t.athlete_id.toString(), t));
            }

            // 3. 抓取會員綁定資訊 (改從 strava_bindings 抓取，這是新的 Single Source of Truth)
            const { data: bindings, error: bError } = await supabase
                .from('strava_bindings')
                .select('strava_id');

            const boundSet = new Set();
            if (!bError && bindings) {
                bindings.forEach(b => {
                    if (b.strava_id) boundSet.add(b.strava_id.toString());
                });
            }


            // 4. 合併資料 - 改為以 strava_tokens 為主，確保顯示所有權杖
            // 建立所有獨特的 IDSet (聯集)
            const allIds = new Set<string>();
            (athletes || []).forEach(a => allIds.add(a.id.toString()));
            // @ts-ignore
            tokens.forEach(t => allIds.add(t.athlete_id.toString()));

            const combined = Array.from(allIds).map(id => {
                const athlete = (athletes || []).find(a => a.id.toString() === id);
                const token = tokenMap.get(id);

                // 只有當有 Token 或是 Athlete 資料時才顯示
                // 但為了修正 "API 權杖管理" 的數量差異，我們應該優先顯示有 Token 的資料
                // 如果只有 Athlete 但沒有 Token，這通常只是單純的會員資料，不屬於 "API 權杖" 的管理範疇
                // 但原本的邏輯似乎是想顯示所有 Athlete 的狀態 (有無 Token)
                // 為了符合 "API 權杖管理" 的語意，這裡我們調整為：顯示所有有 Token 的 ID，以及所有在 athletes 表中的 ID

                return {
                    athleteID: id,
                    name: athlete ? `${athlete.firstname} ${athlete.lastname}` : 'Unknown Athlete',
                    createdAt: token?.created_at || null,
                    updatedAt: token?.updated_at || null,
                    expires_at: token?.expires_at || null,
                    isBound: boundSet.has(id),
                    hasToken: !!token,
                    // @ts-ignore
                    lastActivityAt: token?.last_activity_at || null
                };
            })
                // 過濾掉沒有 Token 的資料 (如果只想看有 Token 的)
                // 但使用者可能是想看 "所有潛在的連接"，原本邏輯是 map athletes
                // 根據使用者問題 "strava_tokens 有44筆...只有40筆"，表示漏掉了 4 筆有 Token 但沒 Athlete 的資料
                // 所以我們必須包含那些有 Token 但沒有 Athlete 的資料
                // 這裡我們保留所有資料，並在 UI 上做區分或排序
                .filter(item => item.hasToken) // 只顯示有 Token 的資料，符合 "API 權杖管理" 的定義
                .sort((a, b) => {
                    if (a.updatedAt && !b.updatedAt) return -1;
                    if (!a.updatedAt && b.updatedAt) return 1;
                    return a.name.localeCompare(b.name, 'zh-TW');
                });

            setStravaTokens(combined);
        } catch (err: any) {
            console.error('Fetch strava tokens error:', err);
        } finally {
            setIsRefreshingTokens(false);
        }
    };

    const handleUnbindMemberByAdmin = async (member: any, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();

        setIsUnbindingMember(member.email);
        try {
            // 從 localStorage 取得管理員的 Strava Athlete ID
            const athleteMeta = localStorage.getItem('strava_athlete_data');
            let adminId: string | null = null;

            if (athleteMeta) {
                try {
                    const parsed = JSON.parse(athleteMeta);
                    adminId = parsed.id?.toString();
                } catch (parseError) {
                    console.error('解析 athlete_meta 失敗:', parseError);
                }
            }

            if (!adminId) {
                alert('管理員資訊缺失，請重新登入 Strava 後再試。');
                return;
            }

            // 呼叫後端 API 進行解綁（包含權限驗證）
            const response = await fetch(`${API_BASE_URL}/api/auth/unbind`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: member.email,
                    admin_id: adminId
                })
            });

            // 處理非 OK 回應
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`伺服器錯誤 (${response.status}): ${errorText || '未知錯誤'}`);
            }

            // 安全解析 JSON（處理空回應）
            const text = await response.text();
            const result = text ? JSON.parse(text) : { success: true };

            if (result.success) {
                // 重新整理列表（不顯示提示，靜默執行）
                await fetchAllMembers();
            } else {
                throw new Error(result.message || '解除綁定失敗');
            }
        } catch (error: any) {
            console.error('解除綁定失敗:', error);
            alert(`解除綁定失敗: ${error.message || '未知錯誤'}`);
        } finally {
            setIsUnbindingMember(null);
        }
    };



    const fetchSiteSettings = async () => {
        const { data, error } = await supabase.from('site_settings').select('*');
        if (!error && data) {
            setSiteSettings(data);
        }
    };

    const handleUpdateSetting = (key: string, value: string) => {
        setSiteSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
    };

    const handleSaveAllSettings = async () => {
        setIsSavingSettings(true);
        try {
            const { error } = await supabase.from('site_settings').upsert(
                siteSettings.map(s => ({
                    key: s.key,
                    value: s.value,
                    updated_at: new Date().toISOString()
                }))
            );
            if (error) throw error;
            alert('設定已儲存');
        } catch (err: any) {
            alert('儲存失敗: ' + err.message);
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handleVersionUpdate = async () => {
        const currentVersion = siteSettings.find(s => s.key === 'app_version')?.value || 'v1.0.0';
        const newVersion = prompt('請輸入新版本號:', currentVersion);
        if (!newVersion || newVersion === currentVersion) return;

        setIsUpdatingVersion(true);
        try {
            const { error } = await supabase
                .from('site_settings')
                .upsert({
                    key: 'app_version',
                    value: newVersion,
                    updated_at: new Date().toISOString()
                });
            if (error) throw error;
            alert(`版本已更新至 ${newVersion}`);
            fetchSiteSettings();
        } catch (err: any) {
            alert('更新版本失敗: ' + err.message);
        } finally {
            setIsUpdatingVersion(false);
        }
    };

    // 根據搜尋條件過濾後的權杖
    const filteredTokens = stravaTokens.filter(t =>
        t.athleteID.toLowerCase().includes(tokenSearchTerm.toLowerCase()) ||
        t.name.toLowerCase().includes(tokenSearchTerm.toLowerCase())
    ).sort((a, b) => {
        const factor = tokenSortOrder === 'asc' ? 1 : -1;
        const valA = a[tokenSortField] || '';
        const valB = b[tokenSortField] || '';

        if (typeof valA === 'number' && typeof valB === 'number') {
            return (valA - valB) * factor;
        }
        return String(valA).localeCompare(String(valB), 'zh-TW') * factor;
    });

    const totalTokenPages = Math.ceil(filteredTokens.length / tokenPageSize);
    const displayedTokens = filteredTokens.slice((tokenCurrentPage - 1) * tokenPageSize, tokenCurrentPage * tokenPageSize);

    const toggleTokenSort = (field: string) => {
        if (tokenSortField === field) {
            setTokenSortOrder(tokenSortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setTokenSortField(field);
            setTokenSortOrder('asc');
        }
    };

    const getExpiryColor = (expires_at: number | null) => {
        if (!expires_at) return 'text-slate-400';
        const now = Math.floor(Date.now() / 1000);
        const diff = expires_at - now;
        if (diff <= 0) return 'text-red-500 font-black bg-red-50 dark:bg-red-900/20 px-1 rounded';
        if (diff <= 2 * 3600) return 'text-orange-500 font-black bg-orange-50 dark:bg-orange-900/20 px-1 rounded';
        return 'text-emerald-600 dark:text-emerald-400 font-bold';
    };


    if (loading && !session) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tcu-blue"></div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="max-w-md mx-auto my-20 p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800">
                <h2 className="text-2xl font-black italic mb-6 uppercase tracking-tight">管理員登入</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-tcu-blue"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">密碼</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-tcu-blue"
                            required
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="rememberMe"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-tcu-blue focus:ring-tcu-blue"
                        />
                        <label htmlFor="rememberMe" className="text-sm font-bold text-slate-500 cursor-pointer">記住密碼</label>
                    </div>
                    {error && <p className="text-red-500 text-sm font-bold">{error}</p>}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-tcu-blue hover:bg-tcu-blue-light text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-tcu-blue/20"
                    >
                        {loading ? '登入中...' : '立即登入'}
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-black italic uppercase tracking-tighter">
                        後台總表 <span className="text-tcu-blue text-lg not-italic opacity-50 ml-2">Backend Dashboard</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-bold mt-1">
                        目前登入身份: {session.user.email}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-black uppercase tracking-widest bg-tcu-blue/10 text-tcu-blue px-2 py-0.5 rounded-full">
                            Settings: {siteSettings.find(s => s.key === 'app_version')?.value || 'v1.0.0'}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <History className="w-3 h-3" />
                            Build: {__APP_VERSION__}
                        </span>
                        <button
                            onClick={handleVersionUpdate}
                            disabled={isUpdatingVersion}
                            className="text-slate-400 hover:text-tcu-blue transition-colors"
                            title="更新偏好版本資訊"
                        >
                            <Edit2 className="w-3 h-3" />
                        </button>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={handleLogout}
                        className="px-6 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-red-500 hover:text-white text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all"
                    >
                        登出
                    </button>
                </div>
            </div>

            <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
                <button
                    onClick={() => setActiveTab('managers')}
                    className={`px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'managers'
                        ? 'bg-tcu-blue text-white shadow-lg shadow-tcu-blue/30'
                        : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                >
                    <Briefcase className="w-4 h-4 inline-block mr-2" />
                    管理員管理
                </button>
                <button
                    onClick={() => setActiveTab('members')}
                    className={`px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'members'
                        ? 'bg-tcu-blue text-white shadow-lg shadow-tcu-blue/30'
                        : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                >
                    <Users className="w-4 h-4 inline-block mr-2" />
                    會員管理
                </button>
                <button
                    onClick={() => setActiveTab('segments')}
                    className={`px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'segments'
                        ? 'bg-tcu-blue text-white shadow-lg shadow-tcu-blue/30'
                        : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                >
                    <Database className="w-4 h-4 inline-block mr-2" />
                    路段管理
                </button>
                <button
                    onClick={() => setActiveTab('tokens')}
                    className={`px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'tokens'
                        ? 'bg-tcu-blue text-white shadow-lg shadow-tcu-blue/30'
                        : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                >
                    <Settings className="w-4 h-4 inline-block mr-2" />
                    Strava Tokens
                </button>
                <button
                    onClick={() => setActiveTab('seo')}
                    className={`px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'seo'
                        ? 'bg-tcu-blue text-white shadow-lg shadow-tcu-blue/30'
                        : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                >
                    <Globe className="w-4 h-4 inline-block mr-2" />
                    SEO 設定
                </button>
                <button
                    onClick={() => setActiveTab('footer')}
                    className={`px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'footer'
                        ? 'bg-tcu-blue text-white shadow-lg shadow-tcu-blue/30'
                        : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                >
                    <Share2 className="w-4 h-4 inline-block mr-2" />
                    頁尾連結
                </button>
            </div>

            {/* 管理員管理 Tab */}
            {activeTab === 'managers' && (
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-black">管理員清單</h3>
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                            <input
                                type="text"
                                placeholder="搜尋 Email 或名稱..."
                                value={managerSearchTerm}
                                onChange={(e) => setManagerSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-none focus:ring-2 focus:ring-tcu-blue w-64"
                            />
                        </div>
                    </div>

                    {editingManager && (
                        <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-tcu-blue border-dashed">
                            <h4 className="font-bold text-tcu-blue mb-4 flex items-center gap-2">
                                <Edit2 className="w-4 h-4" />
                                編輯管理員: {editingManager.email}
                            </h4>
                            <form onSubmit={handleUpdateManagerSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">單位名稱 (車店/車隊)</label>
                                    <input
                                        type="text"
                                        value={editingManager.shop_name || ''}
                                        onChange={(e) => setEditingManager({ ...editingManager, shop_name: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border-none focus:ring-2 focus:ring-tcu-blue"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">角色權限</label>
                                    <select
                                        value={editingManager.role}
                                        onChange={(e) => setEditingManager({ ...editingManager, role: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border-none focus:ring-2 focus:ring-tcu-blue"
                                    >
                                        <option value="shop_owner">Shop Owner (車店老闆)</option>
                                        <option value="team_coach">Team Coach (車隊教練)</option>
                                        <option value="power_coach">Power Coach (功率教練)</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditingManager(null)}
                                        className="px-4 py-2 rounded-lg text-slate-500 font-bold hover:bg-slate-200 transaction-colors"
                                    >
                                        取消
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 rounded-lg bg-tcu-blue text-white font-bold hover:brightness-110 transaction-colors shadow-lg shadow-tcu-blue/20"
                                    >
                                        儲存變更
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* 待審核管理員列表 */}
                    {managers.some(m => !m.is_active) && (
                        <div className="mb-8">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                </span>
                                <h4 className="text-lg font-bold text-red-500">待審核管理員 (Pending Approval)</h4>
                            </div>
                            <div className="overflow-x-auto bg-red-50/50 dark:bg-red-900/10 rounded-2xl border border-red-200 dark:border-red-900/30">
                                <table className="w-full text-left">
                                    <thead className="text-red-400 uppercase text-xs font-bold">
                                        <tr>
                                            <th className="px-6 py-4">管理員姓名</th>
                                            <th className="px-6 py-4">Email 帳號</th>
                                            <th className="px-6 py-4">角色</th>
                                            <th className="px-4 py-4">單位名稱</th>
                                            <th className="px-6 py-4 text-right">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-red-100 dark:divide-red-900/30">
                                        {managers.filter(m => !m.is_active).map((manager) => (
                                            <tr key={manager.id} className="hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-900 dark:text-white">
                                                        {manager.real_name || '管理者'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-mono text-slate-500">
                                                        {manager.email || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-500">
                                                        {manager.role}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 font-bold text-sm text-slate-700 dark:text-slate-300">
                                                    {manager.shop_name || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={async () => {
                                                                if (confirm(`確定要啟用 ${manager.real_name || manager.email} 嗎？`)) {
                                                                    await handleUpdateManagerStatus(manager.id, true);
                                                                }
                                                            }}
                                                            className="flex items-center gap-1 px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                                                        >
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            核准啟用
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteManager(manager)}
                                                            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                                                            title="拒絕/刪除"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase text-xs font-bold">
                                <tr>
                                    <th className="px-6 py-4 rounded-l-xl">管理員姓名</th>
                                    <th className="px-6 py-4">Email 帳號</th>
                                    <th className="px-6 py-4">角色</th>
                                    <th className="px-4 py-4">單位名稱</th>
                                    <th className="px-6 py-4">已授權</th>
                                    <th className="px-6 py-4">待授權</th>
                                    <th className="px-6 py-4">狀態</th>
                                    <th className="px-6 py-4 rounded-r-xl text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {managers.filter(m =>
                                (m.email?.toLowerCase().includes(managerSearchTerm.toLowerCase()) ||
                                    m.shop_name?.toLowerCase().includes(managerSearchTerm.toLowerCase()) ||
                                    String(m.athlete_id || '').includes(managerSearchTerm))
                                ).map((manager) => (
                                    <tr key={manager.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${!manager.is_active ? 'opacity-50 grayscale' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900 dark:text-white">
                                                {manager.real_name || '管理者'}
                                                {!manager.is_active && <span className="ml-2 text-[10px] bg-slate-200 text-slate-500 px-1 rounded">停用中</span>}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-0.5">
                                                Strava ID: {manager.athlete_id || '未綁定'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-mono text-tcu-blue dark:text-tcu-blue-light">
                                                {manager.email || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase
                                                ${manager.role === 'shop_owner' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                                                    manager.role === 'team_coach' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                                                        manager.role === 'power_coach' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                                                            'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                                {manager.role === 'shop_owner' ? 'Shop Owner' :
                                                    manager.role === 'team_coach' ? 'Team Coach' :
                                                        manager.role === 'power_coach' ? 'Power Coach' :
                                                            manager.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 font-bold text-sm text-slate-700 dark:text-slate-300">
                                            {manager.shop_name || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 font-mono font-bold text-slate-600 dark:text-slate-400">
                                                <Users className="w-3 h-3 text-slate-400" />
                                                {manager.authorizedCount || 0}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {(manager.pendingCount || 0) > 0 ? (
                                                <div className="flex items-center gap-1 font-mono font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg w-fit">
                                                    <AlertCircle className="w-3 h-3" />
                                                    {manager.pendingCount}
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 font-mono text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {manager.is_active ? (
                                                <span className="flex items-center gap-1 text-emerald-500 text-xs font-bold">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    啟用中
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-red-500 text-xs font-bold">
                                                    <AlertCircle className="w-3 h-3" />
                                                    已停用
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={async () => {
                                                        if (!manager.email) {
                                                            alert('此帳號無 Email 資訊，無法重設密碼。');
                                                            return;
                                                        }

                                                        // 1. 詢問新密碼
                                                        const newPassword = prompt(`請為 ${manager.email} 輸入新的登入密碼：`);
                                                        if (!newPassword || newPassword.trim().length < 6) {
                                                            alert('密碼長度至少需 6 碼，操作已取消。');
                                                            return;
                                                        }

                                                        if (!confirm(`確定要將密碼重設為「${newPassword}」嗎？`)) return;

                                                        try {
                                                            // 2. 呼叫 Webhook 重設密碼
                                                            const response = await fetch('https://service.criterium.tw/webhook/reset-auth-password', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({
                                                                    email: manager.email,
                                                                    password: newPassword
                                                                })
                                                            });

                                                            if (response.ok) {
                                                                alert('密碼重設成功！請通知使用者使用新密碼登入。');
                                                            } else {
                                                                throw new Error('Webhook 回傳錯誤');
                                                            }
                                                        } catch (err: any) {
                                                            alert('重設失敗: ' + err.message);
                                                        }
                                                    }}
                                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-500 transition-colors"
                                                    title="重設密碼"
                                                >
                                                    <Lock className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleEditManager(manager)}
                                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-500 transition-colors"
                                                    title="編輯"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateManagerStatus(manager.id, !manager.is_active)}
                                                    className={`p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors ${manager.is_active ? 'text-slate-400 hover:text-orange-500' : 'text-slate-400 hover:text-emerald-500'
                                                        }`}
                                                    title={manager.is_active ? "停用" : "啟用"}
                                                >
                                                    {manager.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteManager(manager)}
                                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                                                    title="永久刪除"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {managers.length === 0 && (
                            <div className="text-center py-12 text-slate-400">
                                暫無管理員資料
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* 路段管理 Tab Content */}
                {activeTab === 'segments' && (<>
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm md:col-span-2">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black">路段管理</h3>
                            <div className="flex items-center gap-3">
                                <button
                                    id="bulk-sync-btn"
                                    onClick={handleBulkSync}
                                    className="flex items-center gap-1 bg-tcu-blue/10 hover:bg-tcu-blue/20 text-tcu-blue px-3 py-1 rounded-lg text-xs font-bold transition-all border border-tcu-blue/20"
                                    title="同步所有路段成績"
                                >
                                    <Database className="w-4 h-4" />
                                    <span>全部同步</span>
                                </button>
                                <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-500">{segments.length} 個路段</span>
                            </div>
                        </div>

                        {editingSegment ? (
                            <form onSubmit={handleUpdateSegment} className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-tcu-blue">
                                <h4 className="font-bold text-tcu-blue uppercase text-sm">
                                    {editingSegment.id === 'new' ? '新增路段' : `編輯路段: ${editingSegment.strava_id}`}
                                </h4>
                                {editingSegment.id === 'new' && (
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Strava ID</label>
                                        <input
                                            type="number"
                                            value={editingSegment.strava_id}
                                            onChange={(e) => setEditingSegment({ ...editingSegment, strava_id: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                            required
                                        />
                                    </div>
                                )}
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">路段名稱</label>
                                    <input
                                        type="text"
                                        value={editingSegment.name}
                                        onChange={(e) => setEditingSegment({ ...editingSegment, name: e.target.value })}
                                        className={`w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm ${editingSegment.id !== 'new' ? 'bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed opacity-70' : ''}`}
                                        required
                                        readOnly={editingSegment.id !== 'new'}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">敘述 (對應首頁標題)</label>
                                    <input
                                        type="text"
                                        value={editingSegment.description || ''}
                                        onChange={(e) => setEditingSegment({ ...editingSegment, description: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                        placeholder="例如：台中經典挑戰：136檢定"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">詳情連結</label>
                                    <input
                                        type="text"
                                        value={editingSegment.link || ''}
                                        onChange={(e) => setEditingSegment({ ...editingSegment, link: e.target.value })}
                                        className={`w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm ${editingSegment.id !== 'new' ? 'bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed opacity-70' : ''}`}
                                        placeholder="https://..."
                                        readOnly={editingSegment.id !== 'new'}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">距離 (公尺)</label>
                                        <input
                                            type="number"
                                            value={editingSegment.distance || ''}
                                            onChange={(e) => setEditingSegment({ ...editingSegment, distance: parseFloat(e.target.value) })}
                                            className={`w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm ${editingSegment.id !== 'new' ? 'bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed opacity-70' : ''}`}
                                            readOnly={editingSegment.id !== 'new'}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">平均坡度 (%)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={editingSegment.average_grade || ''}
                                            onChange={(e) => setEditingSegment({ ...editingSegment, average_grade: parseFloat(e.target.value) })}
                                            className={`w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm ${editingSegment.id !== 'new' ? 'bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed opacity-70' : ''}`}
                                            readOnly={editingSegment.id !== 'new'}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">總爬升 (公尺)</label>
                                        <input
                                            type="number"
                                            value={editingSegment.elevation_gain || ''}
                                            onChange={(e) => setEditingSegment({ ...editingSegment, elevation_gain: parseFloat(e.target.value) })}
                                            className={`w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm ${editingSegment.id !== 'new' ? 'bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed opacity-70' : ''}`}
                                            readOnly={editingSegment.id !== 'new'}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Polyline (路線編碼)</label>
                                    <textarea
                                        value={editingSegment.polyline || ''}
                                        onChange={(e) => setEditingSegment({ ...editingSegment, polyline: e.target.value })}
                                        className={`w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm h-16 font-mono ${editingSegment.id !== 'new' ? 'bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed opacity-70' : ''}`}
                                        readOnly={editingSegment.id !== 'new'}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">開始日期</label>
                                        <input
                                            type="datetime-local"
                                            value={editingSegment.start_date ? new Date(editingSegment.start_date).toISOString().slice(0, 16) : ''}
                                            onChange={(e) => setEditingSegment({ ...editingSegment, start_date: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">結束日期</label>
                                        <input
                                            type="datetime-local"
                                            value={editingSegment.end_date ? new Date(editingSegment.end_date).toISOString().slice(0, 16) : ''}
                                            onChange={(e) => setEditingSegment({ ...editingSegment, end_date: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="submit"
                                        className="flex-1 bg-tcu-blue text-white font-bold py-2 rounded-lg text-sm"
                                    >
                                        儲存變更
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditingSegment(null)}
                                        className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2 rounded-lg text-sm"
                                    >
                                        取消
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase font-bold text-xs">
                                            <tr>
                                                <th className="px-4 py-3 rounded-l-lg">路段名稱</th>
                                                <th className="px-4 py-3">Strava ID</th>
                                                <th className="px-4 py-3">敘述</th>
                                                <th className="px-4 py-3">距離</th>
                                                <th className="px-4 py-3">坡度</th>
                                                <th className="px-4 py-3">狀態</th>
                                                <th className="px-4 py-3 rounded-r-lg text-center">操作</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {segments.map((seg) => (
                                                <tr key={seg.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                                    <td className="px-4 py-3">
                                                        <p className="font-bold text-sm">{seg.name}</p>
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{seg.strava_id || seg.id}</td>
                                                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px] truncate" title={seg.description || ''}>{seg.description || '-'}</td>
                                                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{seg.distance ? `${(seg.distance / 1000).toFixed(2)} km` : '-'}</td>
                                                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{seg.average_grade ? `${seg.average_grade}%` : '-'}</td>
                                                    <td className="px-4 py-3">
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    const { error } = await supabase
                                                                        .from('segments')
                                                                        .update({ is_active: !seg.is_active })
                                                                        .eq('id', seg.id);
                                                                    if (error) throw error;
                                                                    fetchSegments();
                                                                } catch (err: any) {
                                                                    alert('更新失敗: ' + err.message);
                                                                }
                                                            }}
                                                            className={`px-2 py-1 ${seg.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'} text-xs font-bold rounded-full transition-colors cursor-pointer whitespace-nowrap`}
                                                        >
                                                            {seg.is_active ? '啟用中' : '已停用'}
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button
                                                                onClick={() => handleRefreshSegment(seg)}
                                                                className="text-slate-400 hover:text-tcu-blue transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                                                                title="重新整理路段資料"
                                                            >
                                                                <RefreshCw className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                id={`sync-btn-${seg.id}`}
                                                                onClick={() => handleSyncEfforts(seg)}
                                                                className="text-slate-400 hover:text-tcu-blue transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                                                                title="同步成績至 DB"
                                                            >
                                                                <Database className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingSegment(seg)}
                                                                className="text-slate-400 hover:text-tcu-blue transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                                                                title="編輯路段"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (!confirm(`確定要刪除路段「${seg.name}」？\n\n此操作將同時刪除所有相關的報名資料，且無法復原！`)) return;
                                                                    try {
                                                                        const { error: regError } = await supabase
                                                                            .from('registrations')
                                                                            .delete()
                                                                            .eq('segment_id', seg.id);
                                                                        if (regError) throw regError;
                                                                        const { error: segError } = await supabase
                                                                            .from('segments')
                                                                            .delete()
                                                                            .eq('id', seg.id);
                                                                        if (segError) throw segError;
                                                                        alert('路段已刪除');
                                                                        fetchSegments();
                                                                        fetchRegistrations();
                                                                    } catch (err: any) {
                                                                        alert('刪除失敗: ' + err.message);
                                                                    }
                                                                }}
                                                                className="text-slate-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                                                title="刪除路段"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {segments.length === 0 && !loading && (
                                        <div className="text-center py-10 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 mt-4">
                                            <p className="text-slate-400 font-bold">目前無路段資料</p>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={async () => {
                                        const strava_id = prompt('請輸入 Strava 路段 ID (數字):');
                                        if (!strava_id) return;

                                        const parsedId = parseInt(strava_id);
                                        if (isNaN(parsedId)) {
                                            alert('請輸入有效的數字 ID');
                                            return;
                                        }

                                        try {
                                            // 呼叫 n8n webhook 取得路段資料
                                            const response = await fetch('https://n8n.criterium.tw/webhook/segment_set', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ segment_id: parsedId })
                                            });

                                            const responseText = await response.text();


                                            if (!responseText || responseText.trim() === "") {
                                                throw new Error("伺服器回傳了空內容，請稍後再試或檢查 Strava ID 是否正確。");
                                            }

                                            // 解析並正規化資料 (處理 Array 與多重 Key)
                                            const segment = JSON.parse(responseText);
                                            const normalized = normalizeSegment(segment);
                                            if (!normalized) throw new Error('無法正規化路段資料');



                                            if (!normalized.polyline) {
                                                if (!confirm('警告：無法從 Strava 取得路線資訊 (Polyline)。\n這將導致排行榜地圖無法顯示。\n\n是否仍要強行新增該路段？')) {
                                                    return;
                                                }
                                            }

                                            // 顯示預覽並確認
                                            const confirmMsg = `確認新增此路段？\n\n路段名稱: ${normalized.name}\nStrava ID: ${normalized.id}\n距離: ${(normalized.distance / 1000).toFixed(2)} km\n平均坡度: ${normalized.average_grade}%\n總爬升: ${normalized.elevation_gain} m`;

                                            if (!confirm(confirmMsg)) return;

                                            // 計算預設日期：今天的前後 7 天 (00:00)
                                            const now = new Date();
                                            const startDate = new Date(now);
                                            startDate.setDate(now.getDate() - 7);
                                            startDate.setHours(0, 0, 0, 0);

                                            const endDate = new Date(now);
                                            endDate.setDate(now.getDate() + 7);
                                            endDate.setHours(0, 0, 0, 0);

                                            // 寫入 Supabase (包含所有 Strava 資料與預設日期)
                                            const { error } = await supabase.from('segments').insert({
                                                ...normalized,
                                                is_active: true,
                                                start_date: startDate.toISOString(),
                                                end_date: endDate.toISOString()
                                            });

                                            if (error) {
                                                // 錯誤中文化
                                                if (error.code === '23505') {
                                                    alert('新增失敗: 此路段 ID 已存在於系統中，請勿重複新增。');
                                                } else {
                                                    alert('新增失敗: ' + error.message);
                                                }
                                            } else {
                                                alert('路段新增成功！');
                                                fetchSegments();
                                            }
                                        } catch (err: any) {
                                            alert('取得路段資料失敗: ' + (err.message || '請檢查 Strava ID 是否正確'));
                                            console.error('Segment fetch error:', err);
                                        }
                                    }}
                                    className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 p-4 rounded-2xl text-slate-400 font-bold hover:border-tcu-blue hover:text-tcu-blue transition-all mt-4"
                                >
                                    + 新增挑戰路段
                                </button>
                            </>
                        )}
                    </div>

                    {/* 報名審核列表 */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm md:col-span-2">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                            <h3 className="text-xl font-black">報名列表</h3>
                            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                <div className="relative flex-1 md:flex-initial">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="搜尋姓名、車隊或 ID..."
                                        value={regSearchTerm}
                                        onChange={(e) => {
                                            setRegSearchTerm(e.target.value);
                                            setRegCurrentPage(1);
                                        }}
                                        className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm w-full focus:ring-2 focus:ring-tcu-blue/20 transition-all"
                                    />
                                </div>
                                <select
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        fetchRegistrations(val);
                                        setRegCurrentPage(1);
                                    }}
                                    className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm rounded-xl focus:ring-2 focus:ring-tcu-blue/20 transition-all font-bold"
                                >
                                    <option value="">全部路段</option>
                                    {segments.map(seg => (
                                        <option key={seg.id} value={seg.id}>{seg.name}</option>
                                    ))}
                                </select>
                                <select
                                    value={regPageSize}
                                    onChange={(e) => {
                                        setRegPageSize(Number(e.target.value));
                                        setRegCurrentPage(1);
                                    }}
                                    className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-tcu-blue/20 transition-all font-mono"
                                >
                                    <option value={10}>10/page</option>
                                    <option value={20}>20/page</option>
                                    <option value={50}>50/page</option>
                                </select>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => fetchRegistrations()} className="text-slate-400 hover:text-tcu-blue transition-colors p-2" title="重新整理">
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {registrations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
                                <ClipboardCheck className="w-10 h-10 text-slate-300 mb-2" />
                                <p className="text-slate-400 font-bold">目前無待處理報名</p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase font-bold text-xs">
                                            <tr>
                                                <th className="px-4 py-3 rounded-l-lg">選手</th>
                                                <th className="px-4 py-3">路段</th>
                                                <th className="px-4 py-3">號碼</th>
                                                <th className="px-4 py-3">車隊</th>
                                                <th className="px-4 py-3">TCU ID</th>
                                                <th className="px-4 py-3">狀態</th>
                                                <th className="px-4 py-3 rounded-r-lg">操作</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {registrations
                                                .filter(reg =>
                                                    reg.athlete_name.toLowerCase().includes(regSearchTerm.toLowerCase()) ||
                                                    (reg.team || '').toLowerCase().includes(regSearchTerm.toLowerCase()) ||
                                                    (reg.tcu_id || '').toLowerCase().includes(regSearchTerm.toLowerCase())
                                                )
                                                .slice((regCurrentPage - 1) * regPageSize, regCurrentPage * regPageSize)
                                                .map((reg) => (
                                                    <tr key={reg.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                        <td className="px-4 py-3 font-bold">{reg.athlete_name}</td>
                                                        <td className="px-4 py-3 text-slate-500 text-xs">{reg.segments?.name || reg.segment_id}</td>
                                                        <td className="px-4 py-3">
                                                            <button
                                                                onClick={() => {
                                                                    const newNum = prompt('修改選手號碼:', reg.number);
                                                                    if (newNum !== null) {
                                                                        supabase.from('registrations')
                                                                            .update({ number: newNum })
                                                                            .eq('id', reg.id)
                                                                            .then(({ error }) => {
                                                                                if (error) alert('更新失敗:' + error.message);
                                                                                else fetchRegistrations();
                                                                            });
                                                                    }
                                                                }}
                                                                className="font-mono text-tcu-blue hover:underline font-bold"
                                                            >
                                                                {reg.number || '派發'}
                                                            </button>
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-500">{reg.team || '-'}</td>
                                                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">{reg.tcu_id || '-'}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${reg.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                                reg.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                                    'bg-yellow-100 text-yellow-700'
                                                                }`}>
                                                                {reg.status || 'Pending'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <button
                                                                onClick={() => {
                                                                    if (confirm('刪除報名紀錄？')) {
                                                                        supabase.from('registrations').delete().eq('id', reg.id).then(() => fetchRegistrations());
                                                                    }
                                                                }}
                                                                className="text-red-400 hover:text-red-500 font-bold text-xs"
                                                            >
                                                                刪除
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination for Registrations */}
                                <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4 border-t border-slate-100 dark:border-slate-800 pt-8">
                                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                        Showing {(regCurrentPage - 1) * regPageSize + 1} to {Math.min(regCurrentPage * regPageSize, registrations.filter(reg => reg.athlete_name.toLowerCase().includes(regSearchTerm.toLowerCase()) || (reg.team || '').toLowerCase().includes(regSearchTerm.toLowerCase()) || (reg.tcu_id || '').toLowerCase().includes(regSearchTerm.toLowerCase())).length)} of {registrations.filter(reg => reg.athlete_name.toLowerCase().includes(regSearchTerm.toLowerCase()) || (reg.team || '').toLowerCase().includes(regSearchTerm.toLowerCase()) || (reg.tcu_id || '').toLowerCase().includes(regSearchTerm.toLowerCase())).length} registrations
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setRegCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={regCurrentPage === 1}
                                            className="px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-slate-100 transition-colors"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setRegCurrentPage(prev => prev + 1)}
                                            disabled={regCurrentPage * regPageSize >= registrations.filter(reg => reg.athlete_name.toLowerCase().includes(regSearchTerm.toLowerCase()) || (reg.team || '').toLowerCase().includes(regSearchTerm.toLowerCase()) || (reg.tcu_id || '').toLowerCase().includes(regSearchTerm.toLowerCase())).length}
                                            className="px-4 py-2 bg-tcu-blue text-white rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-tcu-blue-dark transition-colors"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </>
                )}

                {activeTab === 'tokens' && (<div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm md:col-span-2">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <Database className="w-5 h-5 text-tcu-blue" />
                            <h3 className="text-xl font-black">API 權杖管理 (Strava Tokens)</h3>
                            <span className="px-3 py-1 text-xs font-bold text-tcu-blue bg-tcu-blue/10 rounded-full">
                                {stravaTokens.length} 筆
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:flex-initial">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="搜尋姓名或 ID..."
                                    value={tokenSearchTerm}
                                    onChange={(e) => {
                                        setTokenSearchTerm(e.target.value);
                                        setTokenCurrentPage(1);
                                    }}
                                    className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm w-full focus:ring-2 focus:ring-tcu-blue/20 transition-all"
                                />
                            </div>
                            <select
                                value={tokenPageSize}
                                onChange={(e) => {
                                    setTokenPageSize(Number(e.target.value));
                                    setTokenCurrentPage(1);
                                }}
                                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-tcu-blue/20 transition-all font-mono"
                            >
                                <option value={10}>10/page</option>
                                <option value={20}>20/page</option>
                                <option value={50}>50/page</option>
                                <option value={100}>100/page</option>
                            </select>
                            <button
                                onClick={fetchStravaTokens}
                                className="text-slate-400 hover:text-tcu-blue transition-colors p-2"
                                title="重新整理列表"
                            >
                                <RefreshCw className={`w-4 h-4 ${isRefreshingTokens ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg cursor-pointer hover:text-tcu-blue transition-colors" onClick={() => toggleTokenSort('athleteID')}>
                                        Athlete ID {tokenSortField === 'athleteID' && (tokenSortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-4 py-3 cursor-pointer hover:text-tcu-blue transition-colors" onClick={() => toggleTokenSort('name')}>
                                        運動員名稱 {tokenSortField === 'name' && (tokenSortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-4 py-3 cursor-pointer hover:text-tcu-blue transition-colors" onClick={() => toggleTokenSort('createdAt')}>
                                        建立日期 {tokenSortField === 'createdAt' && (tokenSortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-4 py-3 cursor-pointer hover:text-tcu-blue transition-colors" onClick={() => toggleTokenSort('expires_at')}>
                                        過期時間 {tokenSortField === 'expires_at' && (tokenSortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-4 py-3 border-x border-slate-100 dark:border-slate-700 cursor-pointer hover:text-tcu-blue transition-colors" onClick={() => toggleTokenSort('isBound')}>
                                        綁定狀態 {tokenSortField === 'isBound' && (tokenSortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-4 py-3 cursor-pointer hover:text-tcu-blue transition-colors" onClick={() => toggleTokenSort('lastActivityAt')}>
                                        最後活動 {tokenSortField === 'lastActivityAt' && (tokenSortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="px-4 py-3 rounded-r-lg text-right cursor-pointer hover:text-tcu-blue transition-colors" onClick={() => toggleTokenSort('updatedAt')}>
                                        最後登入 {tokenSortField === 'updatedAt' && (tokenSortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {displayedTokens
                                    .map((token) => (
                                        <tr key={token.athleteID} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-4 py-3 font-mono text-xs">
                                                <a
                                                    href={`https://www.strava.com/athletes/${token.athleteID}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="hover:text-tcu-blue hover:underline transition-colors font-bold"
                                                >
                                                    {token.athleteID}
                                                </a>
                                            </td>
                                            <td className="px-4 py-3 font-bold">{token.name}</td>
                                            <td className="px-4 py-3 text-slate-500">
                                                {token.createdAt ? new Date(token.createdAt).toLocaleDateString('zh-TW') : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-xs">
                                                <span className={getExpiryColor(token.expires_at)}>
                                                    {token.expires_at
                                                        ? new Date(token.expires_at * 1000).toLocaleString('zh-TW', {
                                                            timeZone: 'Asia/Taipei',
                                                            year: 'numeric',
                                                            month: '2-digit',
                                                            day: '2-digit',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })
                                                        : '-'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {token.isBound ? (
                                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase">Bound</span>
                                                ) : (
                                                    <span className="px-2 py-1 bg-slate-100 text-slate-400 rounded-full text-[10px] font-black uppercase">Unbound</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-[10px] font-bold text-slate-500">
                                                    {token.lastActivityAt ? new Date(token.lastActivityAt).toLocaleDateString('zh-TW') : '-'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="text-[10px] font-bold text-slate-400">
                                                    {token.updatedAt ? new Date(token.updatedAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }) : '-'}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination for Tokens */}
                    <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4 border-t border-slate-100 dark:border-slate-800 pt-8">
                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                            Showing {(tokenCurrentPage - 1) * tokenPageSize + 1} to {Math.min(tokenCurrentPage * tokenPageSize, filteredTokens.length)} of {filteredTokens.length} athletes
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setTokenCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={tokenCurrentPage === 1}
                                className="px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-slate-100 transition-colors"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setTokenCurrentPage(prev => prev + 1)}
                                disabled={tokenCurrentPage * tokenPageSize >= filteredTokens.length}
                                className="px-4 py-2 bg-tcu-blue text-white rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-tcu-blue-dark transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>)}


                {activeTab === 'members' && (<div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-800 md:col-span-2">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div className="flex items-center gap-3">
                            <StravaLogo className="w-5 h-5 font-bold text-orange-500 fill-current" />
                            <h3 className="text-xl font-black uppercase italic">Strava 綁定管理</h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            {/* 搜尋框 */}
                            <div className="relative flex-1 md:w-64">
                                <input
                                    type="text"
                                    placeholder="搜尋姓名或 Email..."
                                    value={memberSearchTerm}
                                    onChange={(e) => {
                                        setMemberSearchTerm(e.target.value);
                                        setMemberCurrentPage(1); // 搜尋時重設頁碼
                                    }}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl h-10 px-4 text-xs focus:ring-2 focus:ring-tcu-blue"
                                />
                            </div>

                            {/* 每頁筆數 */}
                            <select
                                value={memberPageSize}
                                onChange={(e) => {
                                    setMemberPageSize(Number(e.target.value));
                                    setMemberCurrentPage(1);
                                }}
                                className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl h-10 px-3 text-xs font-bold focus:ring-tcu-blue"
                            >
                                <option value={10}>10 筆/頁</option>
                                <option value={100}>100 筆/頁</option>
                                <option value={500}>500 筆/頁</option>
                            </select>

                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-500 px-2 py-1 rounded-full whitespace-nowrap">
                                    {allMembers.filter(m => m.strava_id).length} Bound
                                </span>
                                <button
                                    onClick={fetchAllMembers}
                                    className="text-slate-400 hover:text-tcu-blue transition-colors p-2"
                                    title="重新整理列表"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 資料過濾與分頁計算 */}
                    {(() => {
                        const filtered = allMembers.filter(m =>
                            m.real_name?.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
                            m.email?.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
                            (m.athletes && `${m.athletes.firstname} ${m.athletes.lastname}`.toLowerCase().includes(memberSearchTerm.toLowerCase()))
                        );

                        const totalPages = Math.ceil(filtered.length / memberPageSize);
                        const displayedMembers = filtered.slice(
                            (memberCurrentPage - 1) * memberPageSize,
                            memberCurrentPage * memberPageSize
                        );

                        return (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <tr>
                                                <th className="px-4 py-3 rounded-l-lg">Strava ID</th>
                                                <th className="px-4 py-3">Strava Name</th>
                                                <th className="px-4 py-3">會員資訊</th>
                                                <th className="px-4 py-3">TCU ID / 帳號</th>
                                                <th className="px-4 py-3 border-x border-slate-100 dark:border-slate-700">會員類別</th>
                                                <th className="px-4 py-3 rounded-r-lg text-right">操作</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {displayedMembers.map((m) => (
                                                <tr key={m.email} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${!m.strava_id ? 'opacity-60' : ''}`}>
                                                    <td className="px-4 py-4">
                                                        {m.strava_id ? (
                                                            <a
                                                                href={`https://www.strava.com/athletes/${m.strava_id}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-orange-500 hover:underline font-mono text-xs font-black bg-orange-50 dark:bg-orange-950/20 px-2 py-1 rounded"
                                                            >
                                                                {m.strava_id}
                                                            </a>
                                                        ) : (
                                                            <span className="text-slate-400 font-mono text-xs italic tracking-widest">UNBOUND</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        {m.athletes ? (
                                                            <div className="font-bold text-orange-600 dark:text-orange-400">
                                                                {m.athletes.firstname} {m.athletes.lastname}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-300 italic text-xs">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                            {m.real_name}
                                                            {!m.strava_id && <span className="text-[8px] font-black uppercase bg-slate-200 dark:bg-slate-700 text-slate-500 px-1 rounded">Offline</span>}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-mono">{m.email}</div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <div className="text-xs font-bold text-slate-600 dark:text-slate-400">{m.tcu_id}</div>
                                                        <div className="text-[10px] text-slate-400 font-mono">{m.account ? m.account.replace(/(.{3})(.*)(.{3})/, "$1****$3") : '-'}</div>
                                                    </td>
                                                    <td className="px-4 py-4 border-x border-slate-100 dark:border-slate-700">
                                                        <span className="px-2 py-0.5 bg-tcu-blue/10 text-tcu-blue text-[10px] font-bold rounded-full uppercase tracking-tighter">
                                                            {m.member_type || '一般會員'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-right">
                                                        {m.strava_id ? (
                                                            <button
                                                                onClick={(e) => handleUnbindMemberByAdmin(m, e)}
                                                                disabled={isUnbindingMember === m.email}
                                                                className="px-3 py-1 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all border border-red-100 dark:border-red-900/30 disabled:opacity-50 shadow-sm"
                                                            >
                                                                {isUnbindingMember === m.email ? '處理中...' : '解除綁定'}
                                                            </button>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-300 font-black uppercase italic">No Action</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {displayedMembers.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="py-10 text-center text-slate-400 font-bold italic">
                                                        {allMembers.length === 0 ? '載入中或無會員記錄...' : '找不到匹配的會員...'}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* 分頁導航 */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            顯示第 {(memberCurrentPage - 1) * memberPageSize + 1} 至 {Math.min(memberCurrentPage * memberPageSize, filtered.length)} 筆 / 共 {filtered.length} 筆
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setMemberCurrentPage(prev => Math.max(1, prev - 1))}
                                                disabled={memberCurrentPage === 1}
                                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 disabled:opacity-30 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                                            >
                                                上一頁
                                            </button>
                                            <div className="flex items-center px-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                                <span className="text-xs font-black text-tcu-blue">{memberCurrentPage}</span>
                                                <span className="text-xs font-bold text-slate-400 mx-2">/</span>
                                                <span className="text-xs font-bold text-slate-400">{totalPages}</span>
                                            </div>
                                            <button
                                                onClick={() => setMemberCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                disabled={memberCurrentPage === totalPages}
                                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 disabled:opacity-30 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                                            >
                                                下一頁
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>)}

                {/* SEO 設定區塊 */}
                {activeTab === 'seo' && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-800 md:col-span-2">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black uppercase italic flex items-center gap-2">
                                <Globe className="w-5 h-5 text-tcu-blue" />
                                SEO & 站點設定
                            </h3>
                            <button
                                onClick={handleSaveAllSettings}
                                disabled={isSavingSettings}
                                className="bg-tcu-blue text-white px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest hover:brightness-110 disabled:opacity-50 transition-all"
                            >
                                {isSavingSettings ? '儲存中...' : '儲存設定'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {siteSettings.filter(s => !s.key.startsWith('footer_link_')).map((setting) => (
                                <div key={setting.key} className="flex flex-col gap-2">
                                    <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest flex flex-col sm:flex-row sm:justify-between gap-1">
                                        <span className="break-all">{setting.key.replace(/_/g, ' ')}</span>
                                        <span className="text-slate-300 font-normal normal-case text-[9px] sm:text-[10px] whitespace-nowrap">
                                            {setting.updated_at ? new Date(setting.updated_at).toLocaleDateString() : '剛剛'}
                                        </span>
                                    </label>
                                    {setting.key.includes('description') || setting.key.includes('keywords') ? (
                                        <textarea
                                            value={setting.value || ''}
                                            onChange={(e) => handleUpdateSetting(setting.key, e.target.value)}
                                            className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-tcu-blue min-h-[100px]"
                                        />
                                    ) : (
                                        <input
                                            type="text"
                                            value={setting.value || ''}
                                            onChange={(e) => handleUpdateSetting(setting.key, e.target.value)}
                                            className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl h-12 px-4 text-sm focus:ring-2 focus:ring-tcu-blue"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 頁尾連結設定區塊 */}
                {activeTab === 'footer' && (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-800 md:col-span-2">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black uppercase italic flex items-center gap-2">
                                <Share2 className="w-5 h-5 text-tcu-blue" />
                                頁尾連結設定
                            </h3>
                            <button
                                onClick={handleSaveAllSettings}
                                disabled={isSavingSettings}
                                className="bg-tcu-blue text-white px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest hover:brightness-110 disabled:opacity-50 transition-all"
                            >
                                {isSavingSettings ? '儲存中...' : '儲存設定'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {siteSettings.filter(s => s.key.startsWith('footer_link_')).map((setting) => {
                                // 根據 key 決定圖示
                                const getIcon = (key: string) => {
                                    if (key === 'footer_link_share') return <Share2 className="w-4 h-4 text-tcu-blue" />;
                                    if (key === 'footer_link_doc') return <FileText className="w-4 h-4 text-tcu-blue" />;
                                    if (key === 'footer_link_support') return <LifeBuoy className="w-4 h-4 text-tcu-blue" />;
                                    if (key === 'footer_link_line') return <MessageCircle className="w-4 h-4 text-[#06c755]" />;
                                    if (key === 'footer_link_web') return <Globe className="w-4 h-4 text-tcu-blue" />;
                                    return null;
                                };
                                return (
                                    <div key={setting.key} className="flex flex-col gap-2">
                                        <label className="text-slate-500 text-[10px] font-black uppercase tracking-widest flex flex-col sm:flex-row sm:justify-between gap-1">
                                            <span className="flex items-center gap-2">
                                                {getIcon(setting.key)}
                                                <span className="break-all">{setting.key.replace(/_/g, ' ')}</span>
                                            </span>
                                            <span className="text-slate-300 font-normal normal-case text-[9px] sm:text-[10px] whitespace-nowrap">
                                                {setting.updated_at ? new Date(setting.updated_at).toLocaleDateString() : '剛剛'}
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            value={setting.value || ''}
                                            onChange={(e) => handleUpdateSetting(setting.key, e.target.value)}
                                            placeholder="https://..."
                                            className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl h-12 px-4 text-sm focus:ring-2 focus:ring-tcu-blue"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

export default AdminPanel;
