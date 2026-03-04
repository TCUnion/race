import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

/**
 * Strava API 額度資料介面定義
 */
interface RateLimitStatus {
    alert_level: string;
    limit_15min: number;
    limit_daily: number;
    usage_15min: number;
    usage_daily: number;
    usage_15min_pct: number | string;
    usage_daily_pct: number | string;
    last_updated: string;
    source: string;
}

interface RateLimitResets {
    next_15min_reset: string;
    next_daily_reset: string;
    minutes_to_15min_reset: number;
}

interface RateLimitRecord {
    id: number;
    limit_15min: number;
    limit_daily: number;
    usage_15min: number;
    usage_daily: number;
    usage_15min_pct: string;
    usage_daily_pct: string;
    alert_level: string;
    source_workflow: string;
    recorded_at: string;
}

interface DashboardData {
    current_status: RateLimitStatus;
    resets: RateLimitResets;
    history: RateLimitRecord[];
    generated_at: string;
}

// NOTE: n8n 儀表板 API 端點
const DASHBOARD_ENDPOINT = 'https://service.criterium.tw/webhook/strava-rate-dashboard';

const ALERT_CONFIG: Record<string, { emoji: string; label: string; color: string; bgColor: string }> = {
    normal: { emoji: '✅', label: '正常', color: 'text-green-400', bgColor: 'bg-green-400/10' },
    warning: { emoji: '⚠️', label: '警告', color: 'text-orange-400', bgColor: 'bg-orange-400/10' },
    danger: { emoji: '🔴', label: '危險', color: 'text-red-400', bgColor: 'bg-red-400/10' },
    exceeded: { emoji: '🚨', label: '超限', color: 'text-red-600', bgColor: 'bg-red-600/15' },
    unknown: { emoji: '❓', label: '未知', color: 'text-slate-400', bgColor: 'bg-slate-400/10' },
};

/**
 * 環形量表元件
 */
const GaugeRing: React.FC<{
    pct: number;
    used: number;
    total: number;
    label: string;
    type: 'min' | 'daily';
}> = React.memo(({ pct, used, total, label, type }) => {
    const size = 160;
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (Math.min(pct, 100) / 100) * circumference;

    // 根據百分比決定顏色
    const color = useMemo(() => {
        if (pct >= 95) return '#dc2626';
        if (pct >= 80) return '#f87171';
        if (pct >= 60) return '#fb923c';
        return type === 'min' ? '#38bdf8' : '#a78bfa';
    }, [pct, type]);

    return (
        <div className="flex flex-col items-center">
            <p className="text-xs text-slate-400 font-medium mb-3 tracking-wide">{label}</p>
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-slate-800" opacity={0.4} />
                    <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
                        strokeDasharray={circumference} strokeDashoffset={offset}
                        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-extrabold" style={{ color, letterSpacing: '-0.03em' }}>{pct}<span className="text-base font-normal text-slate-500">%</span></span>
                    <span className="text-[11px] text-slate-500 mt-1">{used} / {total}</span>
                </div>
            </div>
            <p className="text-sm text-slate-300 mt-3"><strong className="text-white font-semibold">{used}</strong> / {total} 次</p>
        </div>
    );
});

GaugeRing.displayName = 'GaugeRing';

/**
 * 格式化時間工具
 */
const formatTime = (isoStr: string | undefined): string => {
    if (!isoStr) return '--';
    return new Date(isoStr).toLocaleString('zh-TW', {
        month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    });
};

const formatTimeUntil = (isoStr: string | undefined): string => {
    if (!isoStr) return '--';
    const diff = new Date(isoStr).getTime() - Date.now();
    if (diff <= 0) return '即將重置';
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hours} 時 ${mins} 分`;
};

/**
 * Strava API 額度監控元件
 * 內嵌於 AdminPanel 的分頁中
 */
const StravaRateLimitPanel: React.FC = () => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [countdown15, setCountdown15] = useState('--:--');
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(DASHBOARD_ENDPOINT, {
                headers: {
                    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
                }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json: DashboardData = await res.json();
            setData(json);
        } catch (err: any) {
            setError(err.message || '無法連線');
        } finally {
            setLoading(false);
        }
    }, []);

    // 初始載入 + 60 秒自動更新
    useEffect(() => {
        fetchData();
        autoRefreshRef.current = setInterval(fetchData, 60000);
        return () => {
            if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
        };
    }, [fetchData]);

    // 15 分鐘倒數計時
    useEffect(() => {
        timerRef.current = setInterval(() => {
            const now = new Date();
            const minutesPast = now.getMinutes() % 15;
            const remaining = (15 - minutesPast) * 60 - now.getSeconds();
            const m = Math.floor(remaining / 60);
            const s = remaining % 60;
            setCountdown15(`${m}:${String(s).padStart(2, '0')}`);
        }, 1000);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const status = data?.current_status;
    const resets = data?.resets;
    const history = data?.history || [];
    const alertLevel = status?.alert_level || 'unknown';
    const alertInfo = ALERT_CONFIG[alertLevel] || ALERT_CONFIG.unknown;

    const pct15 = useMemo(() => {
        if (!status) return 0;
        return status.limit_15min > 0
            ? Math.round((status.usage_15min / status.limit_15min) * 100)
            : Number(status.usage_15min_pct) || 0;
    }, [status]);

    const pctD = useMemo(() => {
        if (!status) return 0;
        return status.limit_daily > 0
            ? Math.round((status.usage_daily / status.limit_daily) * 100)
            : Number(status.usage_daily_pct) || 0;
    }, [status]);

    // 錯誤狀態
    if (error && !data) {
        return (
            <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">無法連線至額度管理 API</h3>
                <p className="text-slate-400 text-sm mb-2">{error}</p>
                <p className="text-slate-500 text-xs mb-4">請確認 n8n 工作流「TCU-Strava-API額度管理」已啟用</p>
                <button onClick={fetchData} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-sm text-white transition-all">
                    重試
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* 標題區 */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-purple-500 flex items-center justify-center text-lg shadow-lg shadow-sky-400/20">⚡</div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Strava API 額度監控</h3>
                            <p className="text-xs text-slate-400">即時速率限制追蹤</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                            <span className="text-[11px] font-semibold text-green-400 tracking-wider">LIVE</span>
                        </div>
                        <button onClick={fetchData} disabled={loading}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs text-slate-300 transition-all disabled:opacity-50">
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                            重新整理
                        </button>
                    </div>
                </div>

                {loading && !data ? (
                    <div className="flex items-center justify-center py-16">
                        <RefreshCw className="w-6 h-6 text-sky-400 animate-spin" />
                        <span className="ml-3 text-slate-400 text-sm">載入額度資料...</span>
                    </div>
                ) : (
                    <>
                        {/* 狀態標籤 */}
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${alertInfo.bgColor} mb-6`}>
                            <span>{alertInfo.emoji}</span>
                            <span className={`text-sm font-bold tracking-wider ${alertInfo.color}`}>{alertInfo.label}</span>
                        </div>

                        {/* 雙環形量表 */}
                        <div className="grid grid-cols-2 gap-8 mb-6">
                            <GaugeRing pct={pct15} used={status?.usage_15min || 0} total={status?.limit_15min || 100} label="⏱ 15 分鐘額度" type="min" />
                            <GaugeRing pct={pctD} used={status?.usage_daily || 0} total={status?.limit_daily || 1000} label="📅 每日額度" type="daily" />
                        </div>

                        {/* 重置倒數 */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                                <div className="w-9 h-9 rounded-lg bg-sky-400/10 flex items-center justify-center text-base">⏱</div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">15 分鐘重置</p>
                                    <p className="text-lg font-bold text-white tabular-nums">{countdown15}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                                <div className="w-9 h-9 rounded-lg bg-purple-400/10 flex items-center justify-center text-base">🌙</div>
                                <div>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">每日重置 (UTC 00:00)</p>
                                    <p className="text-lg font-bold text-white">{formatTimeUntil(resets?.next_daily_reset)}</p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* 最近紀錄 */}
            {history.length > 0 && (
                <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
                    <h3 className="text-base font-bold text-white mb-4">📋 最近紀錄</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left text-[10px] text-slate-500 uppercase tracking-wider py-2 px-3">時間</th>
                                    <th className="text-left text-[10px] text-slate-500 uppercase tracking-wider py-2 px-3">15分鐘</th>
                                    <th className="text-left text-[10px] text-slate-500 uppercase tracking-wider py-2 px-3">每日</th>
                                    <th className="text-left text-[10px] text-slate-500 uppercase tracking-wider py-2 px-3">狀態</th>
                                    <th className="text-left text-[10px] text-slate-500 uppercase tracking-wider py-2 px-3">來源</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.slice(0, 15).map((row, idx) => {
                                    const rowAlert = ALERT_CONFIG[row.alert_level] || ALERT_CONFIG.unknown;
                                    return (
                                        <tr key={row.id || idx} className="border-b border-slate-800/50 hover:bg-sky-400/[0.02] transition-colors">
                                            <td className="py-2.5 px-3 text-slate-400 tabular-nums text-xs">{formatTime(row.recorded_at)}</td>
                                            <td className="py-2.5 px-3 text-slate-300 tabular-nums text-xs">{row.usage_15min}/{row.limit_15min} ({row.usage_15min_pct || '?'}%)</td>
                                            <td className="py-2.5 px-3 text-slate-300 tabular-nums text-xs">{row.usage_daily}/{row.limit_daily} ({row.usage_daily_pct || '?'}%)</td>
                                            <td className="py-2.5 px-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${rowAlert.bgColor} ${rowAlert.color}`}>
                                                    {rowAlert.label}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-500 text-xs max-w-[120px] truncate">{row.source_workflow || '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-3 text-right">
                        最後更新：{formatTime(status?.last_updated || data?.generated_at)}
                    </p>
                </div>
            )}
        </div>
    );
};

export default StravaRateLimitPanel;
