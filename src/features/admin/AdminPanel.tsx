import React, { useState, useEffect, useRef } from 'react';
import { Settings, Save, AlertCircle, CheckCircle2, History, ChevronRight, ClipboardCheck, RefreshCw, Edit2, Globe, Trash2, Database, Share2, FileText, LifeBuoy, MessageCircle, Search, Briefcase, Plus, Users, LogOut, Lock, XCircle, Smartphone, ExternalLink, Activity } from 'lucide-react';
import EquipmentList from './EquipmentList';
import { RaceAdminPanel } from './RaceAdminPanel';
import { ActivityRepair } from '../manager/components/ActivityRepair';
import StravaRateLimitPanel from './StravaRateLimitPanel';
import StravaActivitiesPanel from './StravaActivitiesPanel';
import { supabase } from '../../lib/supabase';
const getWebhookAuthHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { headers: { Authorization: `Bearer ${session.access_token}` } } : {};
};
import { API_BASE_URL } from '../../lib/api_config';
import { apiClient } from '../../lib/apiClient';
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
    const elevation = data.total_elevation_gain || data.elevation_gain || (data.elevationDetail?.total_gain) || 0;

    // 🔒 確保 id 為有效的整數（避免 average_grade 等小數被誤用為 id）
    const extractValidId = (val: any): number | null => {
        if (val === null || val === undefined) return null;
        const num = Number(val);
        // 必須是正整數且不能是小數
        if (!isNaN(num) && num > 0 && Number.isInteger(num)) {
            return num;
        }
        return null;
    };

    const id = extractValidId(data.id) || extractValidId(data.strava_id) || extractValidId(data.segment_id);

    // 如果沒有有效的 id，返回 null
    if (!id) {
        console.error('[normalizeSegment] 無法取得有效的 segment ID，原始資料:', data);
        return null;
    }

    // 🔧 確保所有 bigint 欄位都是整數（四捨五入）
    const toInt = (val: any): number => Math.round(Number(val) || 0);

    return {
        id: id,
        strava_id: id, // 確保 strava_id 也是有效的整數
        name: data.name || "未命名路段",
        distance: toInt(data.distance), // bigint
        average_grade: data.average_grade || 0, // 這個可以是浮點數
        maximum_grade: data.maximum_grade || 0, // 這個可以是浮點數
        elevation_gain: toInt(elevation), // bigint - 必須是整數
        elevation_high: toInt(data.elevation_high), // bigint
        elevation_low: toInt(data.elevation_low), // bigint
        total_elevation_gain: toInt(elevation), // bigint - 必須是整數
        activity_type: data.activity_type || "Ride",
        climb_category: toInt(data.climb_category), // bigint
        city: data.city || "",
        state: data.state || "",
        country: data.country || "",
        star_count: toInt(data.star_count), // bigint
        athlete_count: toInt(data.athlete_count), // bigint
        kom: data.kom || data.xoms?.kom || "",
        qom: data.QOM || data.qom || data.qom_time || data.xoms?.qom || "",
        pr_elapsed_time: data.pr_elapsed_time || data.athlete_segment_stats?.pr_elapsed_time,
        pr_date: data.pr_date || data.athlete_segment_stats?.pr_date,
        elevation_profile: data.elevation_profile,
        polyline: findPolyline(data),
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        og_image: data.og_image || null
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
    loginTime?: string; // [NEW] Add loginTime
    aiCoachSent?: boolean; // [NEW] 是否已發送 AI Coach 郵件
    aiCoachSummary?: string; // [NEW] AI Coach 摘要內容（tooltip 用）
    aiCoachSentAt?: string; // [NEW] AI Coach 發送時間
    lastActivityId?: string; // [NEW] 最新活動 ID（Strava 連結用）
    lastUploadAt?: string; // [NEW] 最後上傳時間（strava_activities.created_at）
}

// 🔐 管理員白名單 (athlete_id)


const AdminPanel: React.FC = () => {
    const [previewRefreshKey, setPreviewRefreshKey] = useState(0);

    const [session, setSession] = useState<any>(null);
    const [stravaSession, setStravaSession] = useState<any>(null); // Strava 登入狀態
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
                    alert(`權限檢查失敗: \nEmail: ${session.user.email} \nRole: ${managerData?.role} \nActive: ${managerData?.is_active} \nError: ${error?.message} `);
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
                    // [FIX] 只保留 email，不嘗試讀取 admin_password，防止憑證外洩
                    const savedEmail = localStorage.getItem('admin_email');
                    if (savedEmail) {
                        setEmail(savedEmail);
                        setRememberMe(true);
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
    const [regSortField, setRegSortField] = useState<string>('registered_at');
    const [regSortOrder, setRegSortOrder] = useState<'asc' | 'desc'>('desc');
    const [regCurrentPage, setRegCurrentPage] = useState(1);
    const [regPageSize, setRegPageSize] = useState(50);

    const handleRegSort = (field: string) => {
        if (regSortField === field) {
            setRegSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setRegSortField(field);
            setRegSortOrder('desc'); // Default to desc for new field
        }
    };

    const getSortedRegistrations = () => {
        const filtered = registrations.filter(reg =>
            reg.athlete_name.toLowerCase().includes(regSearchTerm.toLowerCase()) ||
            (reg.team || '').toLowerCase().includes(regSearchTerm.toLowerCase()) ||
            (reg.tcu_id || '').toLowerCase().includes(regSearchTerm.toLowerCase()) ||
            String(reg.strava_athlete_id || '').includes(regSearchTerm)
        );

        return filtered.sort((a, b) => {
            let aVal: any = a[regSortField as keyof typeof a];
            let bVal: any = b[regSortField as keyof typeof b];

            if (regSortField === 'segment_name') {
                aVal = a.segments?.name || '';
                bVal = b.segments?.name || '';
            }

            // Normalize null/undefined to empty strings for string comparison or 0 for numbers if needed, 
            // but here mostly we deal with strings or things that can be strings.
            if (aVal === null || aVal === undefined) aVal = '';
            if (bVal === null || bVal === undefined) bVal = '';

            if (aVal < bVal) return regSortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return regSortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    };

    // 會員管理 - 搜尋與分頁狀態
    const [memberSearchTerm, setMemberSearchTerm] = useState('');
    const [memberPageSize, setMemberPageSize] = useState(10);
    const [memberCurrentPage, setMemberCurrentPage] = useState(1);
    const [memberSortField, setMemberSortField] = useState<string>('real_name');
    const [memberSortOrder, setMemberSortOrder] = useState<'asc' | 'desc'>('asc');

    const toggleMemberSort = (field: string) => {
        if (memberSortField === field) {
            setMemberSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setMemberSortField(field);
            setMemberSortOrder('asc');
        }
    };

    // Strava Token 顯示與搜尋/分頁狀態
    const [tokenSearchTerm, setTokenSearchTerm] = useState('');
    const [tokenPageSize, setTokenPageSize] = useState(10);
    const [tokenCurrentPage, setTokenCurrentPage] = useState(1);
    const [tokenSortField, setTokenSortField] = useState<string>('isBound');
    const [tokenSortOrder, setTokenSortOrder] = useState<'asc' | 'desc'>('desc');
    const [tokenBindFilter, setTokenBindFilter] = useState<'all' | 'bound' | 'unbound'>('all');
    const [aiCoachPreview, setAiCoachPreview] = useState<{ name: string; sentAt: string; summary: string } | null>(null);

    // NOTE: 按 ESC 關閉 AI Coach 預覽 Modal
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setAiCoachPreview(null);
        };
        if (aiCoachPreview) {
            window.addEventListener('keydown', handleEsc);
            return () => window.removeEventListener('keydown', handleEsc);
        }
    }, [aiCoachPreview]);

    // 管理員管理
    const [managers, setManagers] = useState<any[]>([]);
    const [editingManager, setEditingManager] = useState<any>(null); // New editing state
    const [managerSearchTerm, setManagerSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'segments' | 'members' | 'tokens' | 'activities' | 'managers' | 'seo' | 'footer' | 'equipment' | 'races' | 'team_races' | 'announcements' | 'api_quota' | 'repair'>('managers'); // 預設顯示管理員管理

    // 車隊賽事管理
    const [teamRaces, setTeamRaces] = useState<any[]>([]);
    const [editingTeamRace, setEditingTeamRace] = useState<any>(null);
    const [isSavingTeamRace, setIsSavingTeamRace] = useState(false);
    const [teamRaceSearchTerm, setTeamRaceSearchTerm] = useState('');

    // 廣告/公告管理
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);
    const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);


    async function fetchSegments() {
        try {
            // 1. Fetch core segments
            const { data: segmentsData, error: segmentsError } = await supabase
                .from('segments')
                .select('*')
                .order('created_at', { ascending: false });

            if (segmentsError) throw segmentsError;

            // 2. Fetch metadata
            const { data: metadataData, error: metadataError } = await supabase
                .from('segment_metadata')
                .select('*');

            // Note: We don't throw metadataError because the table might be empty or missing 
            // during migration transition, though we want it to work.
            if (metadataError) console.warn('Metadata fetch warning:', metadataError);

            if (segmentsData) {
                // Merge metadata into the segment objects in memory
                const metadataMap = (metadataData || []).reduce((acc: any, item: any) => {
                    // Use string keys to ensure matching regardless of number vs string types
                    acc[String(item.segment_id)] = item;
                    return acc;
                }, {});

                const mergedData = segmentsData.map(seg => ({
                    ...seg,
                    // Use String(seg.id) to match the keys
                    og_image: metadataMap[String(seg.id)]?.og_image || seg.og_image,
                    team_name: metadataMap[String(seg.id)]?.team_name || seg.team_name,
                    race_description: metadataMap[String(seg.id)]?.race_description || ''
                }));
                setSegments(mergedData);
            }
        } catch (err: any) {
            console.error('Fetch segments error:', err);
            setError('讀取路段失敗: ' + err.message);
        }
    }

    async function fetchAnnouncements() {
        try {
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .order('priority', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setAnnouncements(data);
        } catch (err: any) {
            console.error('Fetch announcements error:', err);
        }
    }

    async function fetchTeamRaces() {
        try {
            // Join segments to get the default name if needed, though we store 'name' in team_races now
            const { data, error } = await supabase
                .from('team_races')
                .select(`
    *,
    segment: segments(name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setTeamRaces(data);
        } catch (err: any) {
            console.error('Fetch team races error:', err);
            setError('讀取車隊賽事失敗: ' + err.message);
        }
    }

    const handleUpdateTeamRace = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTeamRace) return;

        setIsSavingTeamRace(true);
        try {
            const payload = {
                team_name: editingTeamRace.team_name,
                segment_id: editingTeamRace.segment_id, // Must be selected from existing segments
                name: editingTeamRace.name,
                start_date: editingTeamRace.start_date,
                end_date: editingTeamRace.end_date,
                is_active: editingTeamRace.is_active,
                // created_by should be set on insert, maybe from session user
            };

            // Basic validation
            if (!payload.team_name || !payload.segment_id || !payload.name) {
                alert('請填寫所有必填欄位 (車隊名稱, 路段, 賽事名稱)');
                setIsSavingTeamRace(false);
                return;
            }

            let error;
            if (editingTeamRace.id === 'new') {
                const { error: insertError } = await supabase
                    .from('team_races')
                    .insert([{
                        ...payload,
                        created_by: session?.user?.id
                    }]);
                error = insertError;
            } else {
                const { error: updateError } = await supabase
                    .from('team_races')
                    .update(payload)
                    .eq('id', editingTeamRace.id);
                error = updateError;
            }

            if (error) throw error;

            alert(editingTeamRace.id === 'new' ? '新增成功' : '更新成功');
            setEditingTeamRace(null);
            fetchTeamRaces();
        } catch (err: any) {
            console.error('Save team race error:', err);
            alert('儲存失敗: ' + err.message);
        } finally {
            setIsSavingTeamRace(false);
        }
    };

    const handleDeleteTeamRace = async (id: number) => {
        if (!confirm('確定要刪除此車隊賽事嗎？此動作無法復原。')) return;

        try {
            const { error } = await supabase
                .from('team_races')
                .delete()
                .eq('id', id);

            if (error) throw error;
            alert('刪除成功');
            fetchTeamRaces();
        } catch (err: any) {
            console.error('Delete team race error:', err);
            alert('刪除失敗: ' + err.message);
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

            const response = await apiClient.post('/webhook/segment_set', { segment_id: sid }, await getWebhookAuthHeader());

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
            const btn = document.getElementById(`sync - btn - ${seg.id} `);
            if (btn) btn.classList.add('animate-spin');

            const response = await apiClient.post('/webhook/segment_effor_syn', {
                segment_id: sid,
                force_refresh: true
            }, await getWebhookAuthHeader());

            if (btn) btn.classList.remove('animate-spin');

            if (response.ok) {
                alert('同步請求已發送！資料庫將在後台更新。');
            } else {
                throw new Error(`伺服器回傳錯誤: ${response.status} `);
            }
        } catch (err: any) {
            alert('同步失敗: ' + err.message);
            const btn = document.getElementById(`sync - btn - ${seg.id} `);
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
                    await apiClient.post('/webhook/segment_effor_syn', {
                        segment_id: seg.strava_id
                    }, await getWebhookAuthHeader());
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

    async function fetchRegistrations(filterSegmentId: string | null = null) {
        setLoading(true);
        try {
            // 分離查詢避免 PGRST200 錯誤
            let query = supabase
                .from('registrations')
                .select('*')
                .order('registered_at', { ascending: false });

            if (filterSegmentId) {
                query = query.eq('segment_id', filterSegmentId);
            }

            const { data: regData, error } = await query;

            if (error) throw error;

            if (regData && regData.length > 0) {
                // 取得所有相關的 segment_ids
                const segmentIds = [...new Set(regData.map(r => r.segment_id).filter(Boolean))];

                // 分別查詢 segments 資料
                const { data: segmentsData } = await supabase
                    .from('segments')
                    .select('id, name, strava_id')
                    .in('id', segmentIds);

                // 合併資料
                const segmentsMap = new Map(segmentsData?.map(s => [s.id, s]) || []);
                const mergedData = regData.map(reg => ({
                    ...reg,
                    segments: segmentsMap.get(reg.segment_id) || null
                }));

                setRegistrations(mergedData);
            } else {
                setRegistrations([]);
            }
        } catch (err: any) {
            console.error('Fetch registrations error:', err);
            setError('讀取報名資料失敗: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (session || stravaSession) fetchRegistrations();
    }, [session, stravaSession]);

    // 已移除繞過登入模式
    const bypassLoginEnabled = false;

    useEffect(() => {
        if (session || stravaSession) {
            fetchAllMembers();
            fetchStravaTokens();
            fetchSiteSettings();
            fetchManagers();
            fetchSegments(); // 補上路段資料抓取
            fetchAnnouncements(); // 補上廣告公告抓取
        }
    }, [session, stravaSession]);

    const handleSaveAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAnnouncement) return;

        setIsSavingAnnouncement(true);
        try {
            const payload = {
                title: editingAnnouncement.title,
                content: editingAnnouncement.content,
                image_url: editingAnnouncement.image_url,
                button_url: editingAnnouncement.button_url,
                button_text: editingAnnouncement.button_text || '了解更多',
                target_group: editingAnnouncement.target_group || 'all',
                priority: parseInt(editingAnnouncement.priority) || 0,
                is_active: editingAnnouncement.is_active ?? true,
                start_date: editingAnnouncement.start_date || new Date().toISOString(),
                end_date: editingAnnouncement.end_date || null,
                updated_at: new Date().toISOString()
            };

            let error;
            if (editingAnnouncement.id === 'new') {
                const { error: err } = await supabase.from('announcements').insert(payload);
                error = err;
            } else {
                const { error: err } = await supabase
                    .from('announcements')
                    .update(payload)
                    .eq('id', editingAnnouncement.id);
                error = err;
            }

            if (error) throw error;
            alert('公告已儲存');
            setEditingAnnouncement(null);
            fetchAnnouncements();
        } catch (err: any) {
            alert('儲存失敗: ' + err.message);
        } finally {
            setIsSavingAnnouncement(false);
        }
    };

    const handleDeleteAnnouncement = async (id: string) => {
        if (!confirm('確定要刪除此公告嗎？')) return;
        try {
            const { error } = await supabase.from('announcements').delete().eq('id', id);
            if (error) throw error;
            fetchAnnouncements();
        } catch (err: any) {
            alert('刪除失敗: ' + err.message);
        }
    };

    const handleUpdateSegment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSegment) return;

        console.log("🚀 Starting segment update/insert...", editingSegment);

        try {
            let error;
            // 處理日期格式，避免空字串導致 toISOString() 崩潰
            const formatDate = (dateStr: any) => {
                if (!dateStr) return null;
                try {
                    const d = new Date(dateStr);
                    return isNaN(d.getTime()) ? null : d.toISOString();
                } catch (e) {
                    return null;
                }
            };

            const startDate = formatDate(editingSegment.start_date);
            const endDate = formatDate(editingSegment.end_date);

            if (editingSegment.id === 'new') {
                const { error: insertError } = await supabase.from('segments').insert({
                    id: editingSegment.strava_id,
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
                    start_date: startDate,
                    end_date: endDate
                });
                error = insertError;

                // [NEW] Upsert metadata
                if (!error) {
                    const { error: metaError } = await supabase.from('segment_metadata').upsert({
                        segment_id: editingSegment.strava_id,
                        og_image: editingSegment.og_image,
                        team_name: editingSegment.team_name,
                        race_description: editingSegment.race_description
                    });
                    if (metaError) {
                        console.error('Metadata upsert error:', metaError);
                        alert('基本資料已儲存，但擴充資訊 (OG Image/車隊) 儲存失敗: ' + metaError.message);
                    }
                }
            } else {
                const payload = {
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
                    start_date: startDate,
                    end_date: endDate
                };

                const { error: updateError } = await supabase
                    .from('segments')
                    .update(payload)
                    .eq('id', editingSegment.id);
                error = updateError;

                // [NEW] Upsert metadata
                if (!error) {
                    const { error: metaError } = await supabase.from('segment_metadata').upsert({
                        segment_id: editingSegment.id,
                        og_image: editingSegment.og_image,
                        team_name: editingSegment.team_name,
                        race_description: editingSegment.race_description
                    });
                    if (metaError) {
                        console.error('Metadata update error:', metaError);
                        alert('基本資料已更新，但擴充資訊 (OG Image/車隊) 更新失敗: ' + metaError.message);
                    }
                }
            }

            if (error) {
                console.error("❌ Database operation failed:", error);
                alert((editingSegment.id === 'new' ? '新增' : '更新') + '失敗: ' + (error.message || '未知資料庫錯誤'));
            } else {
                console.log("✅ Operation successful");
                alert((editingSegment.id === 'new' ? '新增' : '更新') + '成功！');
                setEditingSegment(null);
                fetchSegments();
            }
        } catch (err: any) {
            console.error("💥 Critical error in handleUpdateSegment:", err);
            alert('系統發生嚴重錯誤: ' + err.message);
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
            } else {
                localStorage.removeItem('admin_email');
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

    // Strava OAuth 登入 (使用 n8n webhook + postMessage)
    const authWindowRef = useRef<Window | null>(null);
    const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);

    const STRAVA_AUTH_CONFIG = {
        stravaAuthUrl: `${API_BASE_URL} /webhook/strava / auth / start`,
        storageKey: 'strava_athlete_data',
        pollingInterval: 1000,
        pollingTimeout: 120000
    };

    const stopPolling = () => {
        if (pollingTimerRef.current) {
            clearInterval(pollingTimerRef.current);
            pollingTimerRef.current = null;
        }
        if (authWindowRef.current && !authWindowRef.current.closed) {
            authWindowRef.current.close();
        }
        authWindowRef.current = null;
        setLoading(false);
    };

    const handleStravaLogin = () => {
        setLoading(true);
        setError(null);

        // 清除舊的暫存
        localStorage.removeItem(STRAVA_AUTH_CONFIG.storageKey + '_temp');

        const width = 600;
        const height = 700;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        const returnUrl = encodeURIComponent(window.location.href);
        const url = `${STRAVA_AUTH_CONFIG.stravaAuthUrl}?return_url = ${returnUrl} `;

        authWindowRef.current = window.open(
            url,
            'strava_auth',
            `width = ${width}, height = ${height}, left = ${left}, top = ${top}, scrollbars = yes`
        );

        if (!authWindowRef.current) {
            setLoading(false);
            setError('請允許彈出視窗以進行 Strava 授權');
            return;
        }

        // 開始輪詢
        const startTime = Date.now();
        pollingTimerRef.current = setInterval(() => {
            // 超時檢查
            if (Date.now() - startTime > STRAVA_AUTH_CONFIG.pollingTimeout) {
                stopPolling();
                setError('授權超時，請重試');
                return;
            }

            try {
                if (authWindowRef.current && authWindowRef.current.closed) {
                    // 視窗關閉，檢查暫存資料
                    const tempData = localStorage.getItem(STRAVA_AUTH_CONFIG.storageKey + '_temp');
                    if (tempData) {
                        try {
                            const athleteData = JSON.parse(tempData);
                            localStorage.removeItem(STRAVA_AUTH_CONFIG.storageKey + '_temp');
                            validateAndSetStravaSession(athleteData);
                        } catch (e) {
                            console.error('處理授權暫存資料失敗', e);
                        }
                    }
                    stopPolling();
                    return;
                }
            } catch (e) {
                // COOP 阻擋，繼續依賴 postMessage
            }

            // 檢查 localStorage
            const tempData = localStorage.getItem(STRAVA_AUTH_CONFIG.storageKey + '_temp');
            if (tempData) {
                try {
                    const athleteData = JSON.parse(tempData);
                    localStorage.removeItem(STRAVA_AUTH_CONFIG.storageKey + '_temp');
                    validateAndSetStravaSession(athleteData);
                    stopPolling();
                } catch (e) {
                    console.error('處理授權暫存資料失敗', e);
                }
            }
        }, STRAVA_AUTH_CONFIG.pollingInterval);
    };

    // 驗證並設定 Strava Session
    const validateAndSetStravaSession = async (athleteData: any) => {
        const athleteId = Number(athleteData.id || athleteData.athlete?.id);

        if (!athleteId || isNaN(athleteId)) {
            setError('無法取得運動員資訊');
            setLoading(false);
            return;
        }

        // [FIX] 移除硬編碼的 ADMIN_ATHLETE_WHITELIST，純粹依賴資料庫 manager_roles
        const { data: managerData } = await supabase
            .from('manager_roles')
            .select('role, is_active')
            .eq('athlete_id', athleteId)
            .maybeSingle();

        if (!managerData || managerData.role !== 'admin' || !managerData.is_active) {
            setError('權限不足：此 Strava 帳號未獲得管理員授權。');
            setLoading(false);
            return;
        }

        // 驗證通過
        const name = `${athleteData.firstname || athleteData.firstName || ''} ${athleteData.lastname || athleteData.lastName || ''} `.trim() || 'Admin';
        setStravaSession({
            athlete_id: athleteId,
            name: name
        });

        // 載入資料
        fetchSegments();
        fetchAllMembers();
        fetchStravaTokens();
        fetchSiteSettings();
        fetchManagers();

        setLoading(false);
    };

    // 監聽 postMessage
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'STRAVA_AUTH_SUCCESS') {
                stopPolling();
                const fullData = {
                    ...event.data,
                    ...(event.data.athlete || {})
                };
                validateAndSetStravaSession(fullData);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setStravaSession(null);
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

            // 2. 抓取 Binding 資料
            const { data: bindings, error: bError } = await supabase
                .from('strava_member_bindings')
                .select('strava_id, tcu_member_email, tcu_account');

            if (bError) console.warn('[WARN] strava_member_bindings 查詢失敗:', bError.message);

            // 建立 Search Maps
            const accountMap = new Map();
            const emailMap = new Map();

            if (!bError && bindings) {
                bindings.forEach(b => {
                    if (b.tcu_account) {
                        accountMap.set(b.tcu_account, b.strava_id);
                    } else if (b.tcu_member_email) {
                        // 如果綁定紀錄沒有指定 account，才放入 emailMap 作為備援
                        emailMap.set(b.tcu_member_email.toLowerCase(), b.strava_id);
                    }
                });
            }

            // 3. 抓取 Strava 選手資料
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
            const membersWithBindings = (members || []).map(m => {
                let stravaId = null;

                if (m.account && accountMap.has(m.account)) {
                    stravaId = accountMap.get(m.account);
                } else if (emailMap.has(m.email?.toLowerCase())) {
                    stravaId = emailMap.get(m.email?.toLowerCase());
                }

                const athlete = stravaId ? athleteMap.get(stravaId.toString()) : null;

                return {
                    ...m,
                    strava_id: stravaId,
                    strava_name: athlete ? `${athlete.firstname || ''} ${athlete.lastname || ''} `.trim() : null,
                    athletes: athlete // 關鍵：存入組件預期的 athletes 屬性
                };
            }).sort((a, b) => {
                const aBound = !!a.strava_id;
                const bBound = !!b.strava_id;
                if (aBound && !bBound) return -1;
                if (!aBound && bBound) return 1;
                return 0;
            });

            setAllMembers(membersWithBindings);
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
            const { data: authData, error: authError } = await supabase
                .from('user_authorizations')
                .select('manager_athlete_id, manager_email, status');

            // 如果表不存在，顯示警告但繼續執行
            if (authError) {
                console.warn('[WARN] user_authorizations 查詢失敗:', authError.message);
            }

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
        if (!confirm(`確定要${isActive ? '啟用' : '停用'} 此管理員權限嗎？`)) return;

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

    const handleUnbindManagerStrava = async () => {
        if (!editingManager || !editingManager.athlete_id) return;

        if (!confirm(`確定要解除管理員「${editingManager.real_name || editingManager.email}」的 Strava 帳號綁定嗎？\n\n解除後該管理員需重新進行綁定才能使用 Strava 登入。`)) return;

        try {
            const { error } = await supabase
                .from('manager_roles')
                .update({ athlete_id: null })
                .eq('id', editingManager.id);

            if (error) throw error;

            alert('已成功解除 Strava 綁定');
            // Update local editing state
            setEditingManager({ ...editingManager, athlete_id: null });
            // Refresh main list
            fetchManagers();
        } catch (err: any) {
            alert('解除綁定失敗: ' + err.message);
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
            // 1. 呼叫 n8n Webhook 刪除 auth.users
            if (manager.user_id || manager.email) {
                try {
                    await apiClient.post('/webhook/delete-auth-user', {
                        uid: manager.user_id,
                        admin_email: session?.user?.email
                    }, await getWebhookAuthHeader());
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
            // [NEW] 加入 access_token 和 refresh_token 以檢查異常狀態
            const { data: tokens, error: tError } = await supabase
                .from('strava_tokens')
                .select('athlete_id, updated_at, expires_at, created_at, last_activity_at, name, login_time, access_token, refresh_token')
                .order('updated_at', { ascending: true });

            const tokenMap = new Map();
            if (!tError && tokens) {
                tokens.forEach(t => tokenMap.set(t.athlete_id.toString(), t));
            }

            // 3. 抓取會員綁定資訊 (改從 strava_member_bindings 抓取，這是新的 Single Source of Truth)
            const { data: bindings, error: bError } = await supabase
                .from('strava_member_bindings')
                .select('strava_id');

            const boundSet = new Set();
            if (!bError && bindings) {
                bindings.forEach(b => {
                    if (b.strava_id) boundSet.add(b.strava_id.toString());
                });
            }

            // 4. [NEW] 抓取每個 athlete 的 strava_activities 數量
            const { data: activitiesCounts, error: actError } = await supabase
                .from('strava_activities')
                .select('athlete_id, id, start_date, created_at')
                .order('start_date', { ascending: false });

            const activitiesCountMap = new Map<string, number>();
            // [NEW] 同時記錄每人最新活動 ID（用於 Strava 連結）
            const latestActivityMap = new Map<string, { id: string; date: string; uploadDate: string }>();
            if (!actError && activitiesCounts) {
                activitiesCounts.forEach(a => {
                    const id = a.athlete_id?.toString();
                    if (id) {
                        activitiesCountMap.set(id, (activitiesCountMap.get(id) || 0) + 1);
                    }
                });
            }

            // NOTE: 從已排序的活動清單中，每人僅保留第一筆（最新）作為最新活動 ID
            if (!actError && activitiesCounts) {
                activitiesCounts.forEach(a => {
                    const athleteId = a.athlete_id?.toString();
                    if (athleteId && !latestActivityMap.has(athleteId)) {
                        latestActivityMap.set(athleteId, {
                            id: a.id?.toString(),
                            date: a.start_date || '',
                            uploadDate: a.created_at || ''
                        });
                    }
                });
            }

            // 5. [NEW] 抓取已同步 strava_streams 的數量 (透過 activity_id 關聯)
            const { data: streamsCounts, error: streamError } = await supabase
                .from('strava_streams')
                .select('activity_id');

            // 需要先取得 activity_id 對應的 athlete_id
            const { data: activitiesForStreams, error: actForStreamError } = await supabase
                .from('strava_activities')
                .select('id, athlete_id');

            const activityToAthleteMap = new Map<string, string>();
            if (!actForStreamError && activitiesForStreams) {
                activitiesForStreams.forEach(a => {
                    activityToAthleteMap.set(a.id?.toString(), a.athlete_id?.toString());
                });
            }

            const streamsCountMap = new Map<string, number>();
            if (!streamError && streamsCounts) {
                streamsCounts.forEach(s => {
                    const athleteId = activityToAthleteMap.get(s.activity_id?.toString());
                    if (athleteId) {
                        streamsCountMap.set(athleteId, (streamsCountMap.get(athleteId) || 0) + 1);
                    }
                });
            }

            // 6. [NEW] 抓取 AI Coach 日誌（每人最新一筆 summary）
            const { data: aiCoachLogs, error: aiLogError } = await supabase
                .from('ai_coach_logs')
                .select('athlete_id, ai_response, created_at')
                .eq('type', 'summary')
                .order('created_at', { ascending: false });

            // NOTE: 由於 Supabase JS SDK 不支援 DISTINCT ON，以 Map 取代，僅保留每人最新一筆
            const aiCoachMap = new Map<string, { summary: string; sentAt: string }>();
            if (!aiLogError && aiCoachLogs) {
                aiCoachLogs.forEach(log => {
                    const id = log.athlete_id?.toString();
                    if (id && !aiCoachMap.has(id)) {
                        aiCoachMap.set(id, {
                            summary: log.ai_response || '',
                            sentAt: log.created_at || ''
                        });
                    }
                });
            }

            // 7. 合併資料 - 改為以 strava_tokens 為主，確保顯示所有權杖
            // 建立所有獨特的 IDSet (聯集)
            const allIds = new Set<string>();
            (athletes || []).forEach(a => allIds.add(a.id.toString()));
            // @ts-ignore
            tokens.forEach(t => allIds.add(t.athlete_id.toString()));

            const combined = Array.from(allIds).map(id => {
                const athlete = (athletes || []).find(a => a.id.toString() === id);
                const token = tokenMap.get(id);

                // [FIX] 優先使用 athlete 表的名字，若無則使用 token 表的名字，最後才顯示 Unknown
                const athleteName = athlete ? `${athlete.firstname} ${athlete.lastname} ` : null;
                const tokenName = token?.name || null;

                // [NEW] 檢查 token 是否有效 (access_token 和 refresh_token 都不能為空)
                const hasValidToken = token &&
                    token.access_token && token.access_token.trim() !== '' &&
                    token.refresh_token && token.refresh_token.trim() !== '';

                return {
                    athleteID: id,
                    name: athleteName || tokenName || 'Unknown Athlete',
                    createdAt: token?.created_at || null,
                    updatedAt: token?.updated_at || null,
                    expires_at: token?.expires_at || null,
                    isBound: boundSet.has(id),
                    hasToken: !!token,
                    hasValidToken: hasValidToken, // [NEW] Token 有效性標記
                    activitiesCount: activitiesCountMap.get(id) || 0, // [NEW] 活動數量
                    streamsCount: streamsCountMap.get(id) || 0, // [NEW] 已同步串流數量
                    // NOTE: 統一從 strava_activities 取最新活動時間，避免與 strava_tokens.last_activity_at 不一致
                    lastActivityAt: latestActivityMap.get(id)?.date || null,
                    // @ts-ignore
                    loginTime: token?.login_time || null,
                    // [NEW] 最新活動 ID（Strava 連結用）
                    lastActivityId: latestActivityMap.get(id)?.id || null,
                    lastUploadAt: latestActivityMap.get(id)?.uploadDate || null,
                    // [NEW] AI Coach 郵件發送狀態
                    aiCoachSent: aiCoachMap.has(id),
                    aiCoachSummary: aiCoachMap.get(id)?.summary || '',
                    aiCoachSentAt: aiCoachMap.get(id)?.sentAt || ''
                };
            })
                // 過濾掉沒有 Token 的資料 (如果只想看有 Token 的)
                // 但使用者可能是想看 "所有潛在的連接"，原本邏輯是 map athletes
                // 根據使用者問題 "strava_tokens 有44筆...只有40筆"，表示漏掉了 4 筆有 Token 但沒 Athlete 的資料
                // 所以我們必須包含那些有 Token 但沒有 Athlete 的資料
                // 這裡我們保留所有資料，並在 UI 上做區分或排序
                .filter(item => item.hasToken) // 只顯示有 Token 的資料，符合 "API 權杖管理" 的定義
                .sort((a, b) => {
                    // [NEW] 異常 token 優先顯示
                    if (!a.hasValidToken && b.hasValidToken) return -1;
                    if (a.hasValidToken && !b.hasValidToken) return 1;
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
            const response = await apiClient.post('/api/auth/unbind', {
                email: member.email,
                admin_id: adminId
            });

            // 處理非 OK 回應
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`伺服器錯誤(${response.status}): ${errorText || '未知錯誤'} `);
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
            alert(`解除綁定失敗: ${error.message || '未知錯誤'} `);
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
            alert(`版本已更新至 ${newVersion} `);
            fetchSiteSettings();
        } catch (err: any) {
            alert('更新版本失敗: ' + err.message);
        } finally {
            setIsUpdatingVersion(false);
        }
    };

    // 根據搜尋條件與綁定狀態過濾後的權杖
    const filteredTokens = stravaTokens.filter(t => {
        // 綁定狀態篩選
        if (tokenBindFilter === 'bound' && !t.isBound) return false;
        if (tokenBindFilter === 'unbound' && t.isBound) return false;
        // 關鍵字搜尋
        return String(t.athleteID).toLowerCase().includes(tokenSearchTerm.toLowerCase()) ||
            (t.name || '').toLowerCase().includes(tokenSearchTerm.toLowerCase());
    }).sort((a, b) => {
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
        if (diff <= 0) return 'text-red-500 font-black bg-red-900/20 px-1 rounded';
        if (diff <= 2 * 3600) return 'text-orange-500 font-black bg-orange-900/20 px-1 rounded';
        return 'text-emerald-400 font-bold';
    };


    if (loading && !session) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tcu-blue"></div>
            </div>
        );
    }

    // 登入驗證
    const isAuthenticated = session || stravaSession;

    if (!isAuthenticated) {
        return (
            <div className="max-w-md mx-auto my-20 p-8 bg-slate-900 rounded-3xl shadow-xl border border-slate-800">
                <h2 className="text-2xl font-black italic mb-6 uppercase tracking-tight text-white">管理員登入</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-tcu-blue"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">密碼</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-tcu-blue"
                            required
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="rememberMe"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-tcu-blue focus:ring-tcu-blue"
                        />
                        <label htmlFor="rememberMe" className="text-sm font-bold text-slate-400 cursor-pointer">記住密碼</label>
                    </div>
                    {error && <p className="text-red-400 text-sm font-bold">{error}</p>}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-tcu-blue hover:bg-tcu-blue-light text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-tcu-blue/20"
                    >
                        {loading ? '登入中...' : '立即登入'}
                    </button>
                </form>

                {/* 分隔線 */}
                <div className="flex items-center gap-4 my-6">
                    <div className="flex-1 h-px bg-slate-700"></div>
                    <span className="text-xs font-bold text-slate-500 uppercase">或</span>
                    <div className="flex-1 h-px bg-slate-700"></div>
                </div>

                {/* Strava 登入按鈕 */}
                <button
                    onClick={handleStravaLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-[#FC4C02] hover:bg-[#E34402] text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-[#FC4C02]/30"
                >
                    <StravaLogo className="w-5 h-5" />
                    {loading ? '連線中...' : '使用 Strava 登入'}
                </button>

                <p className="text-center text-xs text-slate-500 mt-4">
                    僅限授權管理員使用
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 sm:mb-10 gap-4">
                <div>
                    <h1 className="text-4xl font-black italic uppercase tracking-tighter">
                        後台總表 <span className="text-tcu-blue text-lg not-italic opacity-50 ml-2">Backend Dashboard</span>
                    </h1>
                    <p className="text-slate-400 font-bold mt-1">
                        目前登入身份: {session?.user?.email || stravaSession?.name || '未知'}
                        {stravaSession && <span className="ml-2 text-[#FC4C02]">（Strava）</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-black uppercase tracking-widest bg-tcu-blue/10 text-tcu-blue px-2 py-0.5 rounded-full">
                            Settings: {siteSettings.find(s => s.key === 'app_version')?.value || 'v1.0.0'}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full flex items-center gap-1">
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
                        className="px-6 py-2 bg-slate-800 hover:bg-red-500 hover:text-white text-slate-300 font-bold rounded-xl transition-all"
                    >
                        登出
                    </button>
                </div>
            </div>

            <div className="flex gap-4 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                <button
                    onClick={() => setActiveTab('managers')}
                    className={`px - 4 py - 2 rounded - xl font - bold transition - all whitespace - nowrap ${activeTab === 'managers'
                        ? 'bg-tcu-blue text-white shadow-lg shadow-tcu-blue/30'
                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                        } `}
                >
                    <Briefcase className="w-4 h-4 inline-block mr-2" />
                    管理員管理
                </button>
                <button
                    onClick={() => setActiveTab('members')}
                    className={`px - 4 py - 2 rounded - xl font - bold transition - all whitespace - nowrap ${activeTab === 'members'
                        ? 'bg-tcu-blue text-white shadow-lg shadow-tcu-blue/30'
                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                        } `}
                >
                    <Users className="w-4 h-4 inline-block mr-2" />
                    會員管理
                </button>
                <button
                    onClick={() => setActiveTab('segments')}
                    className={`px - 4 py - 2 rounded - xl font - bold transition - all whitespace - nowrap ${activeTab === 'segments'
                        ? 'bg-tcu-blue text-white shadow-lg shadow-tcu-blue/30'
                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                        } `}
                >
                    <Database className="w-4 h-4 inline-block mr-2" />
                    路段管理
                </button>
                <button
                    onClick={() => setActiveTab('tokens')}
                    className={`px - 4 py - 2 rounded - xl font - bold transition - all whitespace - nowrap ${activeTab === 'tokens'
                        ? 'bg-tcu-blue text-white shadow-lg shadow-tcu-blue/30'
                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                        } `}
                >
                    <Settings className="w-4 h-4 inline-block mr-2" />
                    Strava Tokens
                </button>
                <button
                    onClick={() => setActiveTab('activities')}
                    className={`px - 4 py - 2 rounded - xl font - bold transition - all whitespace - nowrap ${activeTab === 'activities'
                        ? 'bg-tcu-blue text-white shadow-lg shadow-tcu-blue/30'
                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                        } `}
                >
                    <Activity className="w-4 h-4 inline-block mr-2" />
                    活動一覽
                </button>
                <button
                    onClick={() => setActiveTab('repair')}
                    className={`px - 4 py - 2 rounded - xl font - bold transition - all whitespace - nowrap ${activeTab === 'repair'
                        ? 'bg-tcu-blue text-white shadow-lg shadow-tcu-blue/30'
                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                        } `}
                >
                    <RefreshCw className="w-4 h-4 inline-block mr-2" />
                    活動修復
                </button>
                <button
                    onClick={() => setActiveTab('seo')}
                    className={`px - 4 py - 2 rounded - xl font - bold transition - all whitespace - nowrap ${activeTab === 'seo'
                        ? 'bg-tcu-blue text-white shadow-lg shadow-tcu-blue/30'
                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                        } `}
                >
                    <Globe className="w-4 h-4 inline-block mr-2" />
                    SEO 設定
                </button>
                <button
                    onClick={() => setActiveTab('footer')}
                    className={`px - 4 py - 2 rounded - xl font - bold transition - all whitespace - nowrap ${activeTab === 'footer'
                        ? 'bg-tcu-blue text-white shadow-lg shadow-tcu-blue/30'
                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                        } `}
                >
                    <Share2 className="w-4 h-4 inline-block mr-2" />
                    頁尾連結
                </button>
                <button
                    onClick={() => setActiveTab('equipment')}
                    className={`px - 4 py - 2 rounded - xl font - bold transition - all whitespace - nowrap ${activeTab === 'equipment'
                        ? 'bg-tcu-blue text-white shadow-lg shadow-tcu-blue/30'
                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                        } `}
                >
                    <Smartphone className="w-4 h-4 inline-block mr-2" />
                    器材管理
                </button>
                <button
                    onClick={() => setActiveTab('races')}
                    className={`px - 4 py - 2 rounded - xl font - bold transition - all whitespace - nowrap ${activeTab === 'races'
                        ? 'bg-tcu-blue text-white shadow-lg shadow-tcu-blue/30'
                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                        } `}
                >
                    <ClipboardCheck className="w-4 h-4 inline-block mr-2" />
                    比賽審核
                </button>
                <button
                    onClick={() => setActiveTab('announcements')}
                    className={`px - 4 py - 2 rounded - xl font - bold transition - all whitespace - nowrap ${activeTab === 'announcements'
                        ? 'bg-tcu-blue text-white shadow-lg shadow-tcu-blue/30'
                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                        } `}
                >
                    <MessageCircle className="w-4 h-4 inline-block mr-2" />
                    廣告推送
                </button>
                <button
                    onClick={() => setActiveTab('api_quota')}
                    className={`px - 4 py - 2 rounded - xl font - bold transition - all whitespace - nowrap ${activeTab === 'api_quota'
                        ? 'bg-tcu-blue text-white shadow-lg shadow-tcu-blue/30'
                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                        } `}
                >
                    <Globe className="w-4 h-4 inline-block mr-2" />
                    API 額度
                </button>
            </div>

            {/* 器材管理 Tab */}
            {
                activeTab === 'equipment' && (
                    <EquipmentList />
                )
            }

            {/* 比賽審核 Tab */}
            {
                activeTab === 'races' && session && (
                    <RaceAdminPanel adminId={session.user.id} />
                )
            }

            {/* 管理員管理 Tab */}
            {
                activeTab === 'managers' && (
                    <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-sm mb-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black">管理員清單</h3>
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="搜尋 Email 或名稱..."
                                    value={managerSearchTerm}
                                    onChange={(e) => setManagerSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 rounded-xl bg-slate-800 border-none focus:ring-2 focus:ring-tcu-blue w-64"
                                />
                            </div>
                        </div>

                        {editingManager && (
                            <div className="mb-8 p-6 bg-slate-800/50 rounded-2xl border-2 border-tcu-blue border-dashed">
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
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Strava 綁定狀態</label>
                                        <div className="flex items-center gap-2 h-[42px]">
                                            {editingManager.athlete_id ? (
                                                <>
                                                    <span className="font-mono font-bold text-[#FC4C02]">
                                                        ID: {editingManager.athlete_id}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={handleUnbindManagerStrava}
                                                        className="px-3 py-1 bg-red-100 text-red-600 hover:bg-red-200 text-xs font-bold rounded-lg transition-colors"
                                                    >
                                                        解除綁定
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="text-slate-400 text-sm italic">未綁定 Strava 帳號</span>
                                            )}
                                        </div>
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
                                <div className="overflow-x-auto bg-red-900/10 rounded-2xl border border-red-900/30">
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
                                        <tbody className="divide-y divide-red-900/30">
                                            {managers.filter(m => !m.is_active).map((manager) => (
                                                <tr key={manager.id} className="hover:bg-red-900/20 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-white">
                                                            {manager.real_name || '管理者'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm font-mono text-slate-500">
                                                            {manager.email || '-'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-slate-800 text-slate-500">
                                                            {manager.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 font-bold text-sm text-slate-300">
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
                                                                className="p-1.5 hover:bg-red-900/30 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
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
                                <thead className="bg-slate-800/50 text-slate-500 uppercase text-xs font-bold">
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
                                <tbody className="divide-y divide-slate-800">
                                    {managers.filter(m =>
                                    (m.email?.toLowerCase().includes(managerSearchTerm.toLowerCase()) ||
                                        m.shop_name?.toLowerCase().includes(managerSearchTerm.toLowerCase()) ||
                                        String(m.athlete_id || '').includes(managerSearchTerm))
                                    ).map((manager) => (
                                        <tr key={manager.id} className={`hover: bg - slate - 800 / 30 transition - colors ${!manager.is_active ? 'opacity-50 grayscale' : ''} `}>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-white">
                                                    {manager.real_name || '管理者'}
                                                    {!manager.is_active && <span className="ml-2 text-[10px] bg-slate-200 text-slate-500 px-1 rounded">停用中</span>}
                                                </div>
                                                <div className={`text - xs mt - 0.5 font - bold ${manager.athlete_id ? 'text-[#FC4C02]' : 'text-slate-500'} `}>
                                                    Strava ID: {manager.athlete_id || '未綁定'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-mono text-tcu-blue-light">
                                                    {manager.email || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px - 2 py - 1 rounded - lg text - [10px] font - black uppercase
                                                ${manager.role === 'shop_owner' ? 'bg-blue-900/30 text-blue-400' :
                                                        manager.role === 'team_coach' ? 'bg-emerald-900/30 text-emerald-400' :
                                                            manager.role === 'power_coach' ? 'bg-orange-900/30 text-orange-400' :
                                                                'bg-slate-800 text-slate-500'
                                                    } `}>
                                                    {manager.role === 'shop_owner' ? 'Shop Owner' :
                                                        manager.role === 'team_coach' ? 'Team Coach' :
                                                            manager.role === 'power_coach' ? 'Power Coach' :
                                                                manager.role}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 font-bold text-sm text-slate-300">
                                                {manager.shop_name || '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1 font-mono font-bold text-orange-500 bg-blue-500/20 px-2.5 py-1 rounded-lg w-fit border border-blue-500/30">
                                                    <Users className="w-3 h-3" />
                                                    {manager.authorizedCount || 0}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`flex items - center gap - 1 font - mono font - bold px - 2.5 py - 1 rounded - lg w - fit border transition - all
                                                ${(manager.pendingCount || 0) > 0
                                                        ? 'text-orange-500 bg-orange-500/20 border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.2)]'
                                                        : 'text-slate-500 bg-slate-500/10 border-slate-500/20 opacity-40'
                                                    } `}>
                                                    <AlertCircle className="w-3 h-3" />
                                                    {manager.pendingCount || 0}
                                                </div>
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
                                                                const response = await apiClient.post('/webhook/reset-auth-password', {
                                                                    email: manager.email,
                                                                    password: newPassword
                                                                }, await getWebhookAuthHeader());
                                                                if (response.ok) {
                                                                    alert('密碼重設成功！請通知使用者使用新密碼登入。');
                                                                } else {
                                                                    throw new Error('Webhook 回傳錯誤');
                                                                }
                                                            } catch (err: any) {
                                                                alert('重設失敗: ' + err.message);
                                                            }
                                                        }}
                                                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-500 transition-colors"
                                                        title="重設密碼"
                                                    >
                                                        <Lock className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditManager(manager)}
                                                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-500 transition-colors"
                                                        title="編輯"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateManagerStatus(manager.id, !manager.is_active)}
                                                        className={`p - 2 hover: bg - slate - 800 rounded - lg transition - colors ${manager.is_active ? 'text-slate-400 hover:text-orange-500' : 'text-slate-400 hover:text-emerald-500'
                                                            } `}
                                                        title={manager.is_active ? "停用" : "啟用"}
                                                    >
                                                        {manager.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteManager(manager)}
                                                        className="p-2 hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
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
                )
            }

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* 路段管理 Tab Content */}
                {activeTab === 'segments' && (<>
                    <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-sm md:col-span-2">
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
                                <span className="text-xs font-bold bg-slate-800 px-2 py-1 rounded text-slate-500">{segments.length} 個路段</span>
                            </div>
                        </div>

                        {editingSegment ? (
                            <form onSubmit={handleUpdateSegment} className="space-y-4 p-4 bg-slate-800 rounded-2xl border border-tcu-blue">
                                <h4 className="font-bold text-tcu-blue uppercase text-sm">
                                    {editingSegment.id === 'new' ? '新增路段' : `編輯路段: ${editingSegment.strava_id} `}
                                </h4>
                                {editingSegment.id === 'new' && (
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Strava ID</label>
                                        <input
                                            type="number"
                                            value={editingSegment.strava_id}
                                            onChange={(e) => setEditingSegment({ ...editingSegment, strava_id: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-sm"
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
                                        className={`w - full px - 3 py - 2 rounded - lg border border - slate - 700 bg - slate - 900 text - sm ${editingSegment.id !== 'new' ? 'bg-slate-800/50 cursor-not-allowed opacity-70' : ''} `}
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
                                        className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-sm"
                                        placeholder="例如：台中經典挑戰：136檢定"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">比賽敘述（多行詳細說明）</label>
                                    <textarea
                                        value={editingSegment.race_description || ''}
                                        onChange={(e) => setEditingSegment({ ...editingSegment, race_description: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-sm"
                                        placeholder="輸入比賽的詳細敘述，支援多行文字..."
                                        rows={4}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">詳情連結</label>
                                    <input
                                        type="text"
                                        value={editingSegment.link || ''}
                                        onChange={(e) => setEditingSegment({ ...editingSegment, link: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-sm"
                                        placeholder="https://..."
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">距離 (公尺)</label>
                                        <input
                                            type="number"
                                            value={editingSegment.distance || ''}
                                            onChange={(e) => setEditingSegment({ ...editingSegment, distance: parseFloat(e.target.value) })}
                                            className={`w - full px - 3 py - 2 rounded - lg border border - slate - 700 bg - slate - 900 text - sm ${editingSegment.id !== 'new' ? 'bg-slate-800/50 cursor-not-allowed opacity-70' : ''} `}
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
                                            className={`w - full px - 3 py - 2 rounded - lg border border - slate - 700 bg - slate - 900 text - sm ${editingSegment.id !== 'new' ? 'bg-slate-800/50 cursor-not-allowed opacity-70' : ''} `}
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
                                            className={`w - full px - 3 py - 2 rounded - lg border border - slate - 700 bg - slate - 900 text - sm ${editingSegment.id !== 'new' ? 'bg-slate-800/50 cursor-not-allowed opacity-70' : ''} `}
                                            readOnly={editingSegment.id !== 'new'}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Polyline (路線編碼)</label>
                                    <textarea
                                        value={editingSegment.polyline || ''}
                                        onChange={(e) => setEditingSegment({ ...editingSegment, polyline: e.target.value })}
                                        className={`w - full px - 3 py - 2 rounded - lg border border - slate - 700 bg - slate - 900 text - sm h - 16 font - mono ${editingSegment.id !== 'new' ? 'bg-slate-800/50 cursor-not-allowed opacity-70' : ''} `}
                                        readOnly={editingSegment.id !== 'new'}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">開始日期</label>
                                        <input
                                            type="datetime-local"
                                            value={editingSegment.start_date ? (() => {
                                                const d = new Date(editingSegment.start_date);
                                                // 修正: 手動格式化為本地時間字串 (YYYY-MM-DDTHH:mm) 以避免 toISOString 的 UTC 轉換導致時區偏移
                                                const pad = (n: number) => n.toString().padStart(2, '0');
                                                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                                            })() : ''}
                                            onChange={(e) => setEditingSegment({ ...editingSegment, start_date: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">結束日期</label>
                                        <input
                                            type="datetime-local"
                                            value={editingSegment.end_date ? (() => {
                                                const d = new Date(editingSegment.end_date);
                                                const pad = (n: number) => n.toString().padStart(2, '0');
                                                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                                            })() : ''}
                                            onChange={(e) => setEditingSegment({ ...editingSegment, end_date: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-slate-800">
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase">OG Image (預覽圖網址)</label>
                                            <button
                                                type="button"
                                                onClick={() => setPreviewRefreshKey(prev => prev + 1)}
                                                className="text-[10px] text-tcu-blue hover:text-white flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-slate-700/50"
                                                title="重新生成預覽圖"
                                            >
                                                <RefreshCw className="w-3 h-3" />
                                                重新生成預覽
                                            </button>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <textarea
                                                value={editingSegment.og_image || `${(import.meta.env.VITE_API_URL || 'https://service.criterium.tw')}/api/share/image/${editingSegment.id === 'new' ? '{STRAVA_ID}' : editingSegment.id}`}
                                                readOnly
                                                className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-sm h-16 font-mono text-slate-400 cursor-default focus:outline-none focus:border-slate-700 resize-none"
                                            />
                                        </div>
                                    </div>

                                    {(editingSegment.og_image || (editingSegment.id !== 'new')) && (
                                        <div className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-900/50 aspect-[1200/630]">
                                            <img
                                                key={previewRefreshKey}
                                                src={(editingSegment.og_image || `${(import.meta.env.VITE_API_URL || 'https://service.criterium.tw')}/api/share/image/${editingSegment.id}`) + `?t=${previewRefreshKey}`}
                                                alt="OG Preview"
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://placehold.co/1200x630/1e293b/64748b?text=Image+Load+Error';
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-4 pointer-events-none">
                                                <p className="text-[10px] font-bold text-tcu-blue/80 uppercase tracking-wider mb-1">
                                                    {editingSegment.og_image ? '自定義圖片預覽' : '自動產生圖片預覽'}
                                                </p>
                                            </div>
                                            <a
                                                href={(editingSegment.og_image || `${(import.meta.env.VITE_API_URL || 'https://service.criterium.tw')}/api/share/image/${editingSegment.id}`) + `?t=${previewRefreshKey}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="absolute bottom-4 right-4 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-2 py-1 rounded text-[10px] font-bold transition-colors pointer-events-auto"
                                            >
                                                查看大圖
                                            </a>
                                        </div>
                                    )}
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
                                        className="flex-1 bg-slate-700 text-slate-300 font-bold py-2 rounded-lg text-sm"
                                    >
                                        取消
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-800 text-slate-500 uppercase font-bold text-xs">
                                            <tr>
                                                <th className="px-4 py-3 rounded-l-lg">路段名稱</th>
                                                <th className="px-4 py-3">Strava ID</th>
                                                <th className="px-4 py-3">敘述</th>
                                                <th className="px-4 py-3">比賽敘述</th>
                                                <th className="px-4 py-3">距離</th>
                                                <th className="px-4 py-3">坡度</th>
                                                <th className="px-4 py-3">所屬車隊</th>
                                                <th className="px-4 py-3">開始日期</th>
                                                <th className="px-4 py-3">結束日期</th>
                                                <th className="px-4 py-3">狀態</th>
                                                <th className="px-4 py-3 rounded-r-lg text-center">操作</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {segments.map((seg) => (
                                                <tr key={seg.id} className="hover:bg-slate-800/50 transition-colors group">
                                                    <td className="px-4 py-3">
                                                        <p className="font-bold text-sm">{seg.name}</p>
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{seg.strava_id || seg.id}</td>
                                                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px] truncate" title={seg.description || ''}>{seg.description || '-'}</td>
                                                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px] truncate" title={seg.race_description || ''}>{seg.race_description ? seg.race_description.substring(0, 30) + '...' : '-'}</td>
                                                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{seg.distance ? `${(seg.distance / 1000).toFixed(2)} km` : '-'}</td>
                                                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{seg.average_grade ? `${seg.average_grade}% ` : '-'}</td>
                                                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{seg.team_name || '-'}</td>
                                                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{seg.start_date ? new Date(seg.start_date).toLocaleDateString() : '-'}</td>
                                                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{seg.end_date ? new Date(seg.end_date).toLocaleDateString() : '-'}</td>
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
                                                            className={`px - 2 py - 1 ${seg.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'} text - xs font - bold rounded - full transition - colors cursor - pointer whitespace - nowrap`}
                                                        >
                                                            {seg.is_active ? '啟用中' : '已停用'}
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button
                                                                onClick={() => handleRefreshSegment(seg)}
                                                                className="text-slate-400 hover:text-tcu-blue transition-colors p-1.5 rounded-lg hover:bg-slate-700"
                                                                title="重新整理路段資料"
                                                            >
                                                                <RefreshCw className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                id={`sync - btn - ${seg.id} `}
                                                                onClick={() => handleSyncEfforts(seg)}
                                                                className="text-slate-400 hover:text-tcu-blue transition-colors p-1.5 rounded-lg hover:bg-slate-700"
                                                                title="同步成績至 DB"
                                                            >
                                                                <Database className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingSegment({
                                                                    ...seg,
                                                                    link: seg.link || `https://www.strava.com/segments/${seg.id}`
                                                                })}
                                                                className="text-slate-400 hover:text-tcu-blue transition-colors p-1.5 rounded-lg hover:bg-slate-700"
                                                                title="編輯路段"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button >
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
                                                                className="text-slate-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-900/20"
                                                                title="刪除路段"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div >
                                                    </td >
                                                </tr >
                                            ))}
                                        </tbody >
                                    </table >
                                    {
                                        segments.length === 0 && !loading && (
                                            <div className="text-center py-10 bg-slate-800 rounded-2xl border-2 border-dashed border-slate-700 mt-4">
                                                <p className="text-slate-400 font-bold">目前無路段資料</p>
                                            </div>
                                        )
                                    }
                                </div >
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
                                            const response = await apiClient.post('/webhook/segment_set', { segment_id: parsedId }, await getWebhookAuthHeader());

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
                                            // 排除擴充欄位以符合 segments 資料表結構
                                            const { og_image, team_name, ...coreData } = normalized;
                                            const { error } = await supabase.from('segments').insert({
                                                ...coreData,
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
                                    className="w-full border-2 border-dashed border-slate-700 p-4 rounded-2xl text-slate-400 font-bold hover:border-tcu-blue hover:text-tcu-blue transition-all mt-4"
                                >
                                    + 新增挑戰路段
                                </button>
                            </>
                        )}
                    </div >

                    {/* 報名審核列表 */}
                    < div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-sm md:col-span-2" >
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
                                        className="pl-9 pr-4 py-2 bg-slate-800 border-none rounded-xl text-sm w-full focus:ring-2 focus:ring-tcu-blue/20 transition-all"
                                    />
                                </div>
                                <select
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        fetchRegistrations(val);
                                        setRegCurrentPage(1);
                                    }}
                                    className="px-3 py-2 bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-xl focus:ring-2 focus:ring-tcu-blue/20 transition-all font-bold"
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
                                    className="px-3 py-2 bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-tcu-blue/20 transition-all font-mono"
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

                        {
                            registrations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-slate-700 rounded-2xl">
                                    <ClipboardCheck className="w-10 h-10 text-slate-300 mb-2" />
                                    <p className="text-slate-400 font-bold">目前無待處理報名</p>
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-800 text-slate-500 uppercase font-bold text-xs">
                                                <tr>
                                                    <th className="px-4 py-3 rounded-l-lg cursor-pointer hover:text-tcu-blue" onClick={() => handleRegSort('athlete_name')}>
                                                        選手 {regSortField === 'athlete_name' && (regSortOrder === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="px-4 py-3 cursor-pointer hover:text-tcu-blue" onClick={() => handleRegSort('segment_name')}>
                                                        路段 {regSortField === 'segment_name' && (regSortOrder === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="px-4 py-3 cursor-pointer hover:text-tcu-blue" onClick={() => handleRegSort('number')}>
                                                        號碼 {regSortField === 'number' && (regSortOrder === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="px-4 py-3 cursor-pointer hover:text-tcu-blue" onClick={() => handleRegSort('team')}>
                                                        車隊 {regSortField === 'team' && (regSortOrder === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="px-4 py-3 cursor-pointer hover:text-tcu-blue" onClick={() => handleRegSort('tcu_id')}>
                                                        TCU ID {regSortField === 'tcu_id' && (regSortOrder === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="px-4 py-3 cursor-pointer hover:text-tcu-blue" onClick={() => handleRegSort('status')}>
                                                        狀態 {regSortField === 'status' && (regSortOrder === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="px-4 py-3 rounded-r-lg">操作</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800">
                                                {getSortedRegistrations()
                                                    .slice((regCurrentPage - 1) * regPageSize, regCurrentPage * regPageSize)
                                                    .map((reg) => (
                                                        <tr key={reg.id} className="hover:bg-slate-800/50 transition-colors">
                                                            <td className="px-4 py-3">
                                                                <div className="font-bold">{reg.athlete_name}</div>
                                                                <a
                                                                    href={`https://www.strava.com/athletes/${reg.strava_athlete_id}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-[10px] text-slate-500 hover:text-strava-orange font-mono flex items-center gap-1 mt-0.5"
                                                                >
                                                                    <ExternalLink className="w-3 h-3" />
                                                                    #{reg.strava_athlete_id}
                                                                </a>
                                                            </td>
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
                                                            <td className="px-4 py-3 text-slate-500">
                                                                {/* 僅有 TCU ID 的會員才顯示車隊，否則顯示 - */}
                                                                {reg.tcu_id ? (reg.team || '-') : '-'}
                                                            </td>
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
                                    <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4 border-t border-slate-800 pt-8">
                                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                            Showing {(regCurrentPage - 1) * regPageSize + 1} to {Math.min(regCurrentPage * regPageSize, getSortedRegistrations().length)} of {getSortedRegistrations().length} registrations
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setRegCurrentPage(prev => Math.max(1, prev - 1))}
                                                disabled={regCurrentPage === 1}
                                                className="px-4 py-2 bg-slate-800 text-slate-400 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-slate-700 transition-colors"
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
                            )
                        }
                    </div >
                </>
                )}

                {
                    activeTab === 'tokens' && (<div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-sm md:col-span-2">
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
                                        placeholder="搜尋姓名 或 Athlete ID..."
                                        value={tokenSearchTerm}
                                        onChange={(e) => {
                                            setTokenSearchTerm(e.target.value);
                                            setTokenCurrentPage(1);
                                        }}
                                        className="pl-9 pr-4 py-2 bg-slate-800 border-none rounded-xl text-sm w-full focus:ring-2 focus:ring-tcu-blue/20 transition-all"
                                    />
                                </div>
                                <select
                                    value={tokenBindFilter}
                                    onChange={(e) => {
                                        setTokenBindFilter(e.target.value as 'all' | 'bound' | 'unbound');
                                        setTokenCurrentPage(1);
                                    }}
                                    className="px-3 py-2 bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-xl focus:ring-2 focus:ring-tcu-blue/20 transition-all font-bold"
                                >
                                    <option value="all">全部狀態</option>
                                    <option value="bound">已綁定 (Bound)</option>
                                    <option value="unbound">未綁定 (Unbound)</option>
                                </select>
                                <select
                                    value={tokenPageSize}
                                    onChange={(e) => {
                                        setTokenPageSize(Number(e.target.value));
                                        setTokenCurrentPage(1);
                                    }}
                                    className="px-3 py-2 bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-tcu-blue/20 transition-all font-mono"
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
                                <thead className="bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
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
                                        <th className="px-4 py-3 cursor-pointer hover:text-tcu-blue transition-colors text-center" onClick={() => toggleTokenSort('activitiesCount')}>
                                            活動數 {tokenSortField === 'activitiesCount' && (tokenSortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="px-4 py-3 cursor-pointer hover:text-tcu-blue transition-colors text-center" onClick={() => toggleTokenSort('streamsCount')}>
                                            串流數 {tokenSortField === 'streamsCount' && (tokenSortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="px-4 py-3 cursor-pointer hover:text-tcu-blue transition-colors" onClick={() => toggleTokenSort('expires_at')}>
                                            過期時間 {tokenSortField === 'expires_at' && (tokenSortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="px-4 py-3 border-x border-slate-700 cursor-pointer hover:text-tcu-blue transition-colors" onClick={() => toggleTokenSort('isBound')}>
                                            綁定狀態 {tokenSortField === 'isBound' && (tokenSortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="px-4 py-3 cursor-pointer hover:text-tcu-blue transition-colors text-center" onClick={() => toggleTokenSort('aiCoachSent')}>
                                            AI Coach {tokenSortField === 'aiCoachSent' && (tokenSortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="px-4 py-3 cursor-pointer hover:text-tcu-blue transition-colors" onClick={() => toggleTokenSort('lastActivityAt')}>
                                            最後活動 {tokenSortField === 'lastActivityAt' && (tokenSortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="px-4 py-3 cursor-pointer hover:text-tcu-blue transition-colors" onClick={() => toggleTokenSort('lastUploadAt')}>
                                            最後上傳 {tokenSortField === 'lastUploadAt' && (tokenSortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="px-4 py-3 rounded-r-lg text-right cursor-pointer hover:text-tcu-blue transition-colors" onClick={() => toggleTokenSort('loginTime')}>
                                            最後登入 {tokenSortField === 'loginTime' && (tokenSortOrder === 'asc' ? '↑' : '↓')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {displayedTokens
                                        .map((token) => (
                                            <tr key={token.athleteID} className={`hover:bg-slate-800/50 transition-colors ${!token.hasValidToken ? 'bg-red-900/10' : ''}`}>
                                                <td className="px-4 py-3 font-mono text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <a
                                                            href={`https://www.strava.com/athletes/${token.athleteID}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={`hover:underline transition-colors font-bold ${!token.hasValidToken ? 'text-red-500' : 'hover:text-tcu-blue'}`}
                                                        >
                                                            {token.athleteID}
                                                        </a>
                                                        {!token.hasValidToken && (
                                                            <span className="px-1.5 py-0.5 bg-red-500 text-white rounded text-[8px] font-black uppercase animate-pulse" title="Access Token 或 Refresh Token 為空">
                                                                ⚠️ 異常
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-bold">{token.name}</td>
                                                <td className="px-4 py-3 text-slate-500">
                                                    {token.createdAt ? new Date(token.createdAt).toLocaleDateString('zh-TW') : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`font-mono font-bold ${token.activitiesCount > 0 ? 'text-tcu-blue' : 'text-slate-400'}`}>
                                                        {token.activitiesCount.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`font-mono font-bold ${token.streamsCount > 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                        {token.streamsCount.toLocaleString()}
                                                    </span>
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
                                                        <span className="px-2 py-1 bg-slate-800 text-slate-400 rounded-full text-[10px] font-black uppercase">Unbound</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {token.aiCoachSent ? (() => {
                                                        // NOTE: AI Coach 發送時間 >= 最後活動時間 → 綠色（已分析）；反之 → 紅色（有新活動未分析）
                                                        const sentTime = token.aiCoachSentAt ? new Date(token.aiCoachSentAt).getTime() : 0;
                                                        const lastActTime = token.lastActivityAt ? new Date(token.lastActivityAt).getTime() : 0;
                                                        const isUpToDate = sentTime >= lastActTime || lastActTime === 0;
                                                        return (
                                                            <span
                                                                className={`px-2 py-1 rounded-full text-[10px] font-black cursor-pointer transition-colors whitespace-nowrap ${isUpToDate
                                                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                                                                    }`}
                                                                onClick={() => setAiCoachPreview({
                                                                    name: token.name || token.athleteID,
                                                                    sentAt: token.aiCoachSentAt || '',
                                                                    summary: token.aiCoachSummary || ''
                                                                })}
                                                            >
                                                                {token.aiCoachSentAt ? new Date(token.aiCoachSentAt).toLocaleString('zh-TW', {
                                                                    timeZone: 'Asia/Taipei', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                                                                }) : '已發送'}
                                                            </span>
                                                        );
                                                    })() : (
                                                        <span className="text-[10px] text-slate-600">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-[10px] font-bold text-slate-500">
                                                        {token.lastActivityAt ? (
                                                            token.lastActivityId ? (
                                                                <a
                                                                    href={`https://www.strava.com/activities/${token.lastActivityId}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-tcu-blue hover:text-tcu-blue-light hover:underline transition-colors"
                                                                >
                                                                    {new Date(token.lastActivityAt).toLocaleString('zh-TW', {
                                                                        timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                                                                    })}
                                                                </a>
                                                            ) : (
                                                                new Date(token.lastActivityAt).toLocaleString('zh-TW', {
                                                                    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                                                                })
                                                            )
                                                        ) : '-'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-[10px] font-bold text-slate-500">
                                                        {token.lastUploadAt ? new Date(token.lastUploadAt).toLocaleString('zh-TW', {
                                                            timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                                                        }) : '-'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="text-[10px] font-bold text-slate-400">
                                                        {token.loginTime ? new Date(token.loginTime).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }) : '-'}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination for Tokens */}
                        <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4 border-t border-slate-800 pt-8">
                            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                Showing {(tokenCurrentPage - 1) * tokenPageSize + 1} to {Math.min(tokenCurrentPage * tokenPageSize, filteredTokens.length)} of {filteredTokens.length} athletes
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setTokenCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={tokenCurrentPage === 1}
                                    className="px-4 py-2 bg-slate-800 text-slate-400 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-slate-700 transition-colors"
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

                        {/* AI Coach 預覽 Modal - 點擊「✉ 已發送」badge 後彈出 */}
                        {aiCoachPreview && (
                            <div
                                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                                onClick={() => setAiCoachPreview(null)}
                            >
                                <div
                                    className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col"
                                    style={{ width: '80vw', height: '80vh' }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* Modal 標題列 */}
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                                        <div>
                                            <h3 className="text-lg font-bold text-white">AI Coach 日誌 — {aiCoachPreview.name}</h3>
                                            <div className="text-xs text-indigo-400 font-bold mt-1">
                                                📅 {aiCoachPreview.sentAt ? new Date(aiCoachPreview.sentAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }) : ''}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setAiCoachPreview(null)}
                                            className="text-slate-400 hover:text-white text-2xl font-bold transition-colors px-2"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    {/* Modal 內容 */}
                                    <div className="flex-1 overflow-y-auto px-6 py-4">
                                        <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                                            {aiCoachPreview.summary}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>)
                }

                {/* 後台活動一覽分頁 */}
                {activeTab === 'activities' && session && (
                    <StravaActivitiesPanel session={session} />
                )}

                {/* 活動手動修復 Tab */}
                {
                    activeTab === 'repair' && (
                        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-sm md:col-span-2">
                            <ActivityRepair />
                        </div>
                    )
                }


                {
                    activeTab === 'members' && (<div className="bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-800 md:col-span-2">
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
                                        placeholder="搜尋姓名, Email 或 Strava ID..."
                                        value={memberSearchTerm}
                                        onChange={(e) => {
                                            setMemberSearchTerm(e.target.value);
                                            setMemberCurrentPage(1); // 搜尋時重設頁碼
                                        }}
                                        className="w-full bg-slate-800 border-none rounded-xl h-10 px-4 text-xs focus:ring-2 focus:ring-tcu-blue"
                                    />
                                </div>

                                {/* 每頁筆數 */}
                                <select
                                    value={memberPageSize}
                                    onChange={(e) => {
                                        setMemberPageSize(Number(e.target.value));
                                        setMemberCurrentPage(1);
                                    }}
                                    className="bg-slate-800 border-none rounded-xl h-10 px-3 text-xs font-bold focus:ring-tcu-blue"
                                >
                                    <option value={10}>10 筆/頁</option>
                                    <option value={100}>100 筆/頁</option>
                                    <option value={500}>500 筆/頁</option>
                                </select>

                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-500 px-2 py-1 rounded-full whitespace-nowrap">
                                        {new Set(allMembers.filter(m => m.strava_id).map(m => m.strava_id)).size} Bound
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
                                (m.athletes && `${m.athletes.firstname} ${m.athletes.lastname}`.toLowerCase().includes(memberSearchTerm.toLowerCase())) ||
                                m.tcu_id?.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
                                m.account?.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
                                m.team?.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
                                m.strava_id?.toString().includes(memberSearchTerm)
                            );

                            // Sorting
                            const sortedFiltered = [...filtered].sort((a, b) => {
                                // 1. Primary Sort: Binding Status (Always prioritize bound members)
                                const aBound = !!a.strava_id;
                                const bBound = !!b.strava_id;
                                if (aBound && !bBound) return -1;
                                if (!aBound && bBound) return 1;

                                // 2. Secondary Sort: Selected Field
                                let valA, valB;

                                switch (memberSortField) {
                                    case 'strava_id':
                                        valA = a.strava_id || '';
                                        valB = b.strava_id || '';
                                        break;
                                    case 'strava_name':
                                        valA = a.strava_name || '';
                                        valB = b.strava_name || '';
                                        break;
                                    case 'real_name': // 會員資訊
                                        const nameA = a.real_name || '';
                                        const emailA = a.email || '';
                                        valA = nameA + emailA;
                                        const nameB = b.real_name || '';
                                        const emailB = b.email || '';
                                        valB = nameB + emailB;
                                        break;
                                    case 'tcu_id': // TCU ID / 帳號
                                        const tcuA = a.tcu_id || '';
                                        const accA = a.account || '';
                                        valA = tcuA + accA;
                                        const tcuB = b.tcu_id || '';
                                        const accB = b.account || '';
                                        valB = tcuB + accB;
                                        break;
                                    case 'team':
                                        valA = a.team || '';
                                        valB = b.team || '';
                                        break;
                                    case 'member_type':
                                        valA = a.member_type || '';
                                        valB = b.member_type || '';
                                        break;
                                    case 'action':
                                        valA = a.strava_id ? 'Unbind' : 'NoAction';
                                        valB = b.strava_id ? 'Unbind' : 'NoAction';
                                        break;
                                    default:
                                        valA = a[memberSortField] || '';
                                        valB = b[memberSortField] || '';
                                }

                                if (valA < valB) return memberSortOrder === 'asc' ? -1 : 1;
                                if (valA > valB) return memberSortOrder === 'asc' ? 1 : -1;
                                return 0;
                            });

                            const totalPages = Math.ceil(sortedFiltered.length / memberPageSize);
                            const displayedMembers = sortedFiltered.slice(
                                (memberCurrentPage - 1) * memberPageSize,
                                memberCurrentPage * memberPageSize
                            );

                            return (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                <tr>
                                                    <th className="px-4 py-3 rounded-l-lg cursor-pointer hover:text-tcu-blue transition-colors" onClick={() => toggleMemberSort('strava_id')}>
                                                        Strava ID {memberSortField === 'strava_id' && (memberSortOrder === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="px-4 py-3 cursor-pointer hover:text-tcu-blue transition-colors" onClick={() => toggleMemberSort('strava_name')}>
                                                        Strava Name {memberSortField === 'strava_name' && (memberSortOrder === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="px-4 py-3 cursor-pointer hover:text-tcu-blue transition-colors" onClick={() => toggleMemberSort('real_name')}>
                                                        會員資訊 {memberSortField === 'real_name' && (memberSortOrder === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="px-4 py-3 cursor-pointer hover:text-tcu-blue transition-colors" onClick={() => toggleMemberSort('tcu_id')}>
                                                        TCU ID / 帳號 {memberSortField === 'tcu_id' && (memberSortOrder === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="px-4 py-3 cursor-pointer hover:text-tcu-blue transition-colors" onClick={() => toggleMemberSort('team')}>
                                                        車隊 {memberSortField === 'team' && (memberSortOrder === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="px-4 py-3 border-x border-slate-700 cursor-pointer hover:text-tcu-blue transition-colors" onClick={() => toggleMemberSort('member_type')}>
                                                        會員類別 {memberSortField === 'member_type' && (memberSortOrder === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                    <th className="px-4 py-3 rounded-r-lg text-right cursor-pointer hover:text-tcu-blue transition-colors" onClick={() => toggleMemberSort('action')}>
                                                        操作 {memberSortField === 'action' && (memberSortOrder === 'asc' ? '↑' : '↓')}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800">
                                                {displayedMembers.map((m) => (
                                                    <tr key={m.tcu_id || m.email} className={`hover:bg-slate-800/50 transition-colors ${!m.strava_id ? 'opacity-60' : ''}`}>
                                                        <td className="px-4 py-4">
                                                            {m.strava_id ? (
                                                                <a
                                                                    href={`https://www.strava.com/athletes/${m.strava_id}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-orange-500 hover:underline font-mono text-xs font-black bg-orange-950/20 px-2 py-1 rounded"
                                                                >
                                                                    {m.strava_id}
                                                                </a>
                                                            ) : (
                                                                <span className="text-slate-400 font-mono text-xs italic tracking-widest">UNBOUND</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            {m.athletes ? (
                                                                <div className="font-bold text-orange-400">
                                                                    {m.athletes.firstname} {m.athletes.lastname}
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-300 italic text-xs">-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <div className="font-bold text-white flex items-center gap-2">
                                                                {m.real_name}
                                                                {!m.strava_id && <span className="text-[8px] font-black uppercase bg-slate-700 text-slate-500 px-1 rounded">Offline</span>}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 font-mono">{m.email}</div>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <div className="text-xs font-bold text-slate-400">{m.tcu_id}</div>
                                                            <div className="text-[10px] text-slate-400 font-mono">{m.account ? m.account.replace(/(.{3})(.*)(.{3})/, "$1****$3") : '-'}</div>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <div className="text-[10px] font-bold text-slate-400">{m.team || '-'}</div>
                                                        </td>
                                                        <td className="px-4 py-4 border-x border-slate-700">
                                                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-tighter ${(m.member_type === '付費車隊管理員')
                                                                ? 'bg-purple-900/30 text-purple-300'
                                                                : (m.member_type === '付費會員')
                                                                    ? 'bg-tcu-blue/10 text-tcu-blue'
                                                                    : 'bg-slate-800 text-slate-400'
                                                                }`}>
                                                                {m.member_type || '一般會員'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4 text-right">
                                                            {m.strava_id ? (
                                                                <button
                                                                    onClick={(e) => handleUnbindMemberByAdmin(m, e)}
                                                                    disabled={isUnbindingMember === m.email}
                                                                    className="px-3 py-1 bg-red-900/20 hover:bg-red-900/200 text-red-500 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all border border-red-900/30 disabled:opacity-50 shadow-sm"
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
                                        <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-800">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                顯示第 {(memberCurrentPage - 1) * memberPageSize + 1} 至 {Math.min(memberCurrentPage * memberPageSize, filtered.length)} 筆 / 共 {filtered.length} 筆
                                            </p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setMemberCurrentPage(prev => Math.max(1, prev - 1))}
                                                    disabled={memberCurrentPage === 1}
                                                    className="px-4 py-2 bg-slate-800 rounded-xl text-xs font-bold text-slate-400 disabled:opacity-30 hover:bg-slate-700 transition-all"
                                                >
                                                    上一頁
                                                </button>
                                                <div className="flex items-center px-4 bg-slate-800 rounded-xl">
                                                    <span className="text-xs font-black text-tcu-blue">{memberCurrentPage}</span>
                                                    <span className="text-xs font-bold text-slate-400 mx-2">/</span>
                                                    <span className="text-xs font-bold text-slate-400">{totalPages}</span>
                                                </div>
                                                <button
                                                    onClick={() => setMemberCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                    disabled={memberCurrentPage === totalPages}
                                                    className="px-4 py-2 bg-slate-800 rounded-xl text-xs font-bold text-slate-400 disabled:opacity-30 hover:bg-slate-700 transition-all"
                                                >
                                                    下一頁
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>)
                }

                {/* SEO 設定區塊 */}
                {
                    activeTab === 'seo' && (
                        <div className="bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-800 md:col-span-2">
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
                                                className="bg-slate-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-tcu-blue min-h-[100px]"
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                value={setting.value || ''}
                                                onChange={(e) => handleUpdateSetting(setting.key, e.target.value)}
                                                className="bg-slate-800 border-none rounded-xl h-12 px-4 text-sm focus:ring-2 focus:ring-tcu-blue"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                }

                {/* 頁尾連結設定區塊 */}
                {
                    activeTab === 'footer' && (
                        <div className="bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-800 md:col-span-2">
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
                                                className="bg-slate-800 border-none rounded-xl h-12 px-4 text-sm focus:ring-2 focus:ring-tcu-blue"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
                }

                {/* 廣告/公告管理 Tab */}
                {
                    activeTab === 'announcements' && (
                        <div className="space-y-6 md:col-span-2">
                            <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-black">廣告公告清單</h3>
                                    <button
                                        onClick={() => setEditingAnnouncement({ id: 'new', title: '', content: '', target_group: 'all', priority: 0, is_active: true, button_text: '立即參加' })}
                                        className="flex items-center gap-2 px-6 py-2 bg-tcu-blue hover:bg-tcu-blue-light text-white font-bold rounded-xl transition-all shadow-lg shadow-tcu-blue/20"
                                    >
                                        <Plus className="w-4 h-4" />
                                        新增廣告
                                    </button>
                                </div>

                                {editingAnnouncement && (
                                    <div className="mb-8 p-8 bg-slate-800/50 rounded-3xl border-2 border-tcu-blue border-dashed animate-in fade-in slide-in-from-top-4">
                                        <h4 className="font-bold text-tcu-blue mb-4 flex items-center gap-2">
                                            <Edit2 className="w-4 h-4" />
                                            {editingAnnouncement.id === 'new' ? '新增廣告' : '編輯廣告'}
                                        </h4>
                                        <form onSubmit={handleSaveAnnouncement} className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="md:col-span-2">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">廣告標題</label>
                                                    <input
                                                        type="text"
                                                        value={editingAnnouncement.title}
                                                        onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, title: e.target.value })}
                                                        className="w-full px-4 py-3 rounded-xl border-none bg-slate-800 focus:ring-2 focus:ring-tcu-blue"
                                                        required
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">廣告內容</label>
                                                    <textarea
                                                        value={editingAnnouncement.content}
                                                        onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, content: e.target.value })}
                                                        className="w-full px-4 py-3 rounded-xl border-none bg-slate-800 focus:ring-2 focus:ring-tcu-blue h-32"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">圖片 URL</label>
                                                    <input
                                                        type="text"
                                                        value={editingAnnouncement.image_url || ''}
                                                        onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, image_url: e.target.value })}
                                                        className="w-full px-4 py-3 rounded-xl border-none bg-slate-800 focus:ring-2 focus:ring-tcu-blue"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">目標對象</label>
                                                    <select
                                                        value={editingAnnouncement.target_group}
                                                        onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, target_group: e.target.value })}
                                                        className="w-full px-4 py-3 rounded-xl border-none bg-slate-800 focus:ring-2 focus:ring-tcu-blue font-bold"
                                                    >
                                                        <option value="all">所有會員 (All)</option>
                                                        <option value="bound">僅限已綁定 (Bound only)</option>
                                                        <option value="unbound">僅限未綁定 (Unbound only)</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">按鈕文字</label>
                                                    <input
                                                        type="text"
                                                        value={editingAnnouncement.button_text || ''}
                                                        onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, button_text: e.target.value })}
                                                        className="w-full px-4 py-3 rounded-xl border-none bg-slate-800 focus:ring-2 focus:ring-tcu-blue"
                                                        placeholder="了解更多"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">連結 URL</label>
                                                    <input
                                                        type="text"
                                                        value={editingAnnouncement.button_url || ''}
                                                        onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, button_url: e.target.value })}
                                                        className="w-full px-4 py-3 rounded-xl border-none bg-slate-800 focus:ring-2 focus:ring-tcu-blue"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">優先級 (數字大較前)</label>
                                                    <input
                                                        type="number"
                                                        value={editingAnnouncement.priority}
                                                        onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, priority: e.target.value })}
                                                        className="w-full px-4 py-3 rounded-xl border-none bg-slate-800 focus:ring-2 focus:ring-tcu-blue"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            id="isActive"
                                                            checked={editingAnnouncement.is_active}
                                                            onChange={(e) => setEditingAnnouncement({ ...editingAnnouncement, is_active: e.target.checked })}
                                                            className="w-5 h-5 rounded border-slate-300 text-tcu-blue focus:ring-tcu-blue"
                                                        />
                                                        <label htmlFor="isActive" className="text-sm font-bold text-slate-300 cursor-pointer">啟用公告</label>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-700 mt-6">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingAnnouncement(null)}
                                                    className="px-6 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-700 transition-all"
                                                >
                                                    取消編輯
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={isSavingAnnouncement}
                                                    className="px-8 py-2 bg-tcu-blue text-white font-bold rounded-xl transition-all shadow-lg shadow-tcu-blue/20 hover:brightness-110 flex items-center gap-2"
                                                >
                                                    {isSavingAnnouncement ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                    儲存公告
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-800/50 text-slate-500 uppercase text-xs font-bold">
                                            <tr>
                                                <th className="px-6 py-4 rounded-l-xl">優先級</th>
                                                <th className="px-6 py-4 text-center">狀態</th>
                                                <th className="px-6 py-4">標題</th>
                                                <th className="px-6 py-4">目標</th>
                                                <th className="px-6 py-4">按鈕</th>
                                                <th className="px-6 py-4 rounded-r-xl text-right">操作</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800">
                                            {announcements.map((item) => (
                                                <tr key={item.id} className="hover:bg-slate-800/50 transition-colors group">
                                                    <td className="px-6 py-4 font-mono font-bold text-slate-400 group-hover:text-tcu-blue transition-colors">
                                                        {item.priority}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {item.is_active ? (
                                                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30" title="啟用中"></span>
                                                        ) : (
                                                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-700" title="已停用"></span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-white truncate max-w-md">{item.title}</div>
                                                        <div className="text-xs text-slate-500 truncate max-w-md mt-0.5">{item.content}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${item.target_group === 'bound' ? 'bg-blue-100 text-blue-600' :
                                                            item.target_group === 'unbound' ? 'bg-orange-100 text-orange-600' :
                                                                'bg-slate-800 text-slate-400'
                                                            }`}>
                                                            {item.target_group}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-xs font-bold px-2 py-1 bg-slate-800 rounded-lg text-slate-600">
                                                            {item.button_text}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button
                                                                onClick={() => setEditingAnnouncement(item)}
                                                                className="p-2 hover:bg-tcu-blue/10 rounded-lg text-slate-400 hover:text-tcu-blue transition-all"
                                                                title="編輯"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteAnnouncement(item.id)}
                                                                className="p-2 hover:bg-red-900/30 rounded-lg text-slate-400 hover:text-red-500 transition-all"
                                                                title="刪除"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {announcements.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold italic">
                                                        目前沒有廣告公告
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Strava API 額度監控 Tab */}
                {
                    activeTab === 'api_quota' && (
                        <StravaRateLimitPanel />
                    )
                }
            </div >
        </div >
    );
};

export default AdminPanel;
