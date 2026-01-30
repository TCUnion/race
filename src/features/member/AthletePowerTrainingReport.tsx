/**
 * AthletePowerTrainingReport 組件
 * 專為個人選手設計的功率分析報表
 * 移植自 PowerTrainingReport，僅顯示當前登入使用者的數據
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    AlertCircle, User, Calendar, RefreshCw, CheckCircle, Edit2, Zap, Heart, Activity, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Clock, Flame, Target, BarChart3, ChevronLeft, ChevronRight, ZoomOut, BarChart
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { usePowerAnalysis } from '../../hooks/usePowerAnalysis';
import {
    ActivitySummary,
    StravaActivity,
    ActivityPowerAnalysis,
    PowerZoneAnalysis,
    HRZoneAnalysis,
    TrainingLoadSummary,
} from '../../types';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea
} from 'recharts';
import { DailyTrainingChart } from '../../components/charts/DailyTrainingChart';
import { PMCChart } from '../../components/charts/PMCChart';

// 格式化時間 (秒 -> HH:MM:SS)
const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// TSB 狀態指示器
const TSBIndicator: React.FC<{ tsb: number }> = ({ tsb }) => {
    if (tsb > 25) {
        return (
            <div className="flex items-center gap-1 text-blue-400">
                <TrendingUp className="w-4 h-4" />
                <span>過度恢復</span>
            </div>
        );
    } else if (tsb > 5) {
        return (
            <div className="flex items-center gap-1 text-green-400">
                <TrendingUp className="w-4 h-4" />
                <span>狀態良好</span>
            </div>
        );
    } else if (tsb > -10) {
        return (
            <div className="flex items-center gap-1 text-yellow-400">
                <Minus className="w-4 h-4" />
                <span>適度疲勞</span>
            </div>
        );
    } else if (tsb > -30) {
        return (
            <div className="flex items-center gap-1 text-orange-400">
                <TrendingDown className="w-4 h-4" />
                <span>累積疲勞</span>
            </div>
        );
    } else {
        return (
            <div className="flex items-center gap-1 text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span>過度訓練風險</span>
            </div>
        );
    }
};

// 功率區間長條圖
const PowerZoneChart: React.FC<{ zones: PowerZoneAnalysis[] }> = ({ zones }) => {
    const maxPercentage = Math.max(...zones.map(z => z.percentageTime), 1);

    return (
        <div className="space-y-2">
            {zones.map(zone => (
                <div key={zone.zone} className="flex items-center gap-3">
                    <div className="w-24 text-xs text-slate-400 truncate">
                        Z{zone.zone} {zone.name}
                    </div>
                    <div className="flex-1 h-5 bg-slate-700/50 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${(zone.percentageTime / maxPercentage) * 100}%`,
                                backgroundColor: zone.color,
                            }}
                        />
                    </div>
                    <div className="w-14 text-right text-xs font-mono text-slate-300">
                        {zone.percentageTime}%
                    </div>
                    <div className="w-20 text-right text-xs font-mono text-slate-500">
                        {formatDuration(zone.timeInZone)}
                    </div>
                </div>
            ))}
        </div>
    );
};

// 活動趨勢圖表組件
const ActivityCharts: React.FC<{ data: any }> = ({ data }) => {
    // 預設顯示指標
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['watts', 'heartrate', 'speed', 'altitude']);

    // 定義所有可用指標
    const metrics_config = [
        { key: 'watts', label: '功率 (W)', color: '#EAB308', icon: Zap },
        { key: 'heartrate', label: '心率 (bpm)', color: '#EF4444', icon: Heart },
        { key: 'cadence', label: '踏頻 (rpm)', color: '#3B82F6', icon: Activity },
        { key: 'speed', label: '速度 (km/h)', color: '#06b6d4', icon: Zap },
        { key: 'altitude', label: '海拔 (m)', color: '#10b981', icon: TrendingUp }, // Emerald-500
        { key: 'grade', label: '坡度 (%)', color: '#A855F7', icon: TrendingUp },
    ];

    // 切換指標顯示
    const toggleMetric = (key: string) => {
        setSelectedMetrics(prev =>
            prev.includes(key)
                ? prev.filter(k => k !== key)
                : [...prev, key]
        );
    };

    // 轉換數據格式供 Recharts 使用 (每 10 秒取樣一次以優化效能)
    const chartData = useMemo(() => {
        if (!data?.timeSeriesData) return [];
        const { time, watts, heartrate, cadence, grade, velocity, altitude } = data.timeSeriesData;
        const result = [];
        // 取樣頻率：每 10 點取 1 點
        for (let i = 0; i < time.length; i += 10) {
            result.push({
                time: time[i],
                timeStr: formatDuration(time[i]),
                watts: watts[i],
                heartrate: heartrate?.[i] || 0,
                cadence: cadence?.[i] || 0,
                grade: grade?.[i] || 0,
                speed: velocity?.[i] ? Number((velocity[i] * 3.6).toFixed(1)) : 0, // m/s -> km/h
                altitude: altitude?.[i] || 0,
            });
        }
        return result;
    }, [data]);

    // 縮放狀態
    const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
    const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
    const [left, setLeft] = useState<'dataMin' | number>('dataMin');
    const [right, setRight] = useState<'dataMax' | number>('dataMax');

    // 重置縮放
    const zoomOut = () => {
        setRefAreaLeft(null);
        setRefAreaRight(null);
        setLeft('dataMin');
        setRight('dataMax');
    };

    // 執行縮放
    const zoom = () => {
        if (refAreaLeft === null || refAreaRight === null || refAreaLeft === refAreaRight) {
            setRefAreaLeft(null);
            setRefAreaRight(null);
            return;
        }

        // 確保 left < right
        let start = refAreaLeft;
        let end = refAreaRight;

        if (start > end) {
            [start, end] = [end, start];
        }

        setRefAreaLeft(null);
        setRefAreaRight(null);
        setLeft(start);
        setRight(end);
    };

    if (chartData.length === 0) return null;

    return (
        <div className="w-full mt-6">
            {/* 指標切換工具列 */}
            <div className="flex flex-wrap justify-center gap-4 mb-4">
                {metrics_config.map(metric => {
                    const isActive = selectedMetrics.includes(metric.key);
                    return (
                        <button
                            key={metric.key}
                            onClick={() => toggleMetric(metric.key)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all duration-300 border ${isActive
                                ? `bg-opacity-20 border-opacity-50 text-white`
                                : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-400'
                                }`}
                            style={{
                                backgroundColor: isActive ? `${metric.color}20` : undefined,
                                borderColor: isActive ? metric.color : undefined,
                            }}
                        >
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: isActive ? metric.color : '#64748b' }}
                            />
                            {metric.label}
                        </button>
                    );
                })}
            </div>

            <div className="h-[400px] w-full min-w-0 overflow-hidden select-none cursor-crosshair" style={{ width: '100%', height: 400 }}>
                <ResponsiveContainer width="100%" height={400} minWidth={0}>
                    <AreaChart
                        data={chartData}
                        margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                        onMouseDown={(e) => {
                            if (e && e.activeLabel) setRefAreaLeft(Number(e.activeLabel));
                        }}
                        onMouseMove={(e) => {
                            if (e && e.activeLabel && refAreaLeft !== null) {
                                const val = Number(e.activeLabel);
                                // 簡單優化：只有數值改變才更新 (但在 Number Axis 下可能是連續的，差異不大，但加上 check 比較保險)
                                setRefAreaRight(val);
                            }
                        }}
                        onMouseUp={zoom}
                    >
                        <defs>
                            <linearGradient id="colorWatts" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#EAB308" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#EAB308" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorCadence" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorAltitude" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorGrade" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#A855F7" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                        <XAxis
                            dataKey="time"
                            type="number"
                            stroke="#94a3b8"
                            tick={{ fontSize: 10 }}
                            tickFormatter={formatDuration}
                            interval="preserveStartEnd"
                            minTickGap={50}
                            domain={[left, right]}
                            allowDataOverflow
                        />

                        {/* Y Axes - conditionally rendered but maintain ID stability */}
                        <YAxis yAxisId="watts" stroke="#EAB308" hide domain={[0, 'auto']} />
                        <YAxis yAxisId="hr" stroke="#EF4444" hide domain={[0, 220]} />
                        <YAxis yAxisId="cadence" stroke="#3B82F6" hide domain={[0, 150]} />
                        <YAxis yAxisId="speed" stroke="#06b6d4" hide domain={[0, 100]} />
                        <YAxis yAxisId="altitude" stroke="#10b981" hide domain={['auto', 'auto']} />
                        <YAxis yAxisId="grade" stroke="#A855F7" hide domain={[-20, 20]} />

                        <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', fontSize: '12px' }}
                            itemStyle={{ padding: 0 }}
                            labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem' }}
                            labelFormatter={(label) => formatDuration(Number(label))}
                            formatter={(value: number, name: string) => {
                                if (name === 'watts') return [`${value}W`, '功率'];
                                if (name === 'heartrate') return [`${value}bpm`, '心率'];
                                if (name === 'cadence') return [`${value}rpm`, '踏頻'];
                                if (name === 'speed') return [`${value}km/h`, '速度'];
                                if (name === 'altitude') return [`${value}m`, '海拔'];
                                if (name === 'grade') return [`${value}%`, '坡度'];
                                return [value, name];
                            }}
                        />

                        {/* Areas - conditionally rendered */}
                        {selectedMetrics.includes('watts') && (
                            <Area
                                yAxisId="watts"
                                type="monotone"
                                dataKey="watts"
                                stroke="#EAB308"
                                fillOpacity={1}
                                fill="url(#colorWatts)"
                                strokeWidth={1.5}
                                activeDot={{ r: 4 }}
                                animationDuration={500}
                            />
                        )}
                        {selectedMetrics.includes('heartrate') && (
                            <Area
                                yAxisId="hr"
                                type="monotone"
                                dataKey="heartrate"
                                stroke="#EF4444"
                                fillOpacity={1}
                                fill="url(#colorHr)"
                                strokeWidth={1.5}
                                activeDot={{ r: 4 }}
                                animationDuration={500}
                            />
                        )}
                        {selectedMetrics.includes('cadence') && (
                            <Area
                                yAxisId="cadence"
                                type="monotone"
                                dataKey="cadence"
                                stroke="#3B82F6"
                                fillOpacity={1}
                                fill="url(#colorCadence)"
                                strokeWidth={1.5}
                                activeDot={{ r: 4 }}
                                animationDuration={500}
                            />
                        )}
                        {selectedMetrics.includes('speed') && (
                            <Area
                                yAxisId="speed"
                                type="monotone"
                                dataKey="speed"
                                stroke="#06b6d4"
                                fillOpacity={1}
                                fill="url(#colorSpeed)"
                                strokeWidth={1.5}
                                activeDot={{ r: 4 }}
                                animationDuration={500}
                            />
                        )}
                        {selectedMetrics.includes('altitude') && (
                            <Area
                                yAxisId="altitude"
                                type="monotone"
                                dataKey="altitude"
                                stroke="#10b981"
                                fillOpacity={0.4}
                                fill="url(#colorAltitude)"
                                strokeWidth={1.5}
                                activeDot={{ r: 4 }}
                                animationDuration={500}
                            />
                        )}
                        {selectedMetrics.includes('grade') && (
                            <Area
                                yAxisId="grade"
                                type="monotone"
                                dataKey="grade"
                                stroke="#A855F7"
                                fillOpacity={1}
                                fill="url(#colorGrade)"
                                strokeWidth={1.5}
                                activeDot={{ r: 4 }}
                                animationDuration={500}
                            />
                        )}

                        {refAreaLeft !== null && refAreaRight !== null && (
                            // @ts-ignore
                            <ReferenceArea
                                x1={refAreaLeft}
                                x2={refAreaRight}
                                fill="#000000"
                                fillOpacity={0.5}
                            />
                        )}
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* 縮放提示與控制 */}
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 px-2">
                <div>
                    {left !== 'dataMin' ? (
                        <button
                            onClick={zoomOut}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-200 rounded-full transition-colors border border-slate-600"
                        >
                            <ZoomOut className="w-3 h-3" />
                            重置縮放
                        </button>
                    ) : (
                        <span>按住滑鼠左鍵拖曳選取範圍進行縮放</span>
                    )}
                </div>
                {/* 隱藏 Brush，改用全版面 */}
            </div>
        </div>
    );
};

// Strava 原始區間圖表
const StravaZoneChart: React.FC<{ data: any[], type: 'power' | 'heartrate' }> = ({ data, type }) => {
    if (!data || data.length === 0) return null;

    const totalTime = data.reduce((acc, curr) => acc + curr.time, 0);

    // Helper to get color
    const getZoneColor = (index: number, isHr: boolean) => {
        const colors = isHr
            ? ['#94a3b8', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#ef4444']
            : ['#94a3b8', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#ef4444', '#a855f7'];
        return colors[index] || '#cbd5e1';
    };

    // Helper format duration
    const formatDuration = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        if (hrs > 0) return `${hrs}h ${mins}m`;
        return `${mins}m`;
    };

    return (
        <div className="space-y-2">
            {data.map((bucket: any, index: number) => {
                const percentage = totalTime > 0 ? (bucket.time / totalTime) * 100 : 0;
                const color = getZoneColor(index, type === 'heartrate');
                const label = bucket.max === -1 ? `> ${bucket.min}` : `${bucket.min} - ${bucket.max}`;

                return (
                    <div key={index} className="flex items-center text-xs">
                        <div className="w-20 text-slate-400 text-right pr-2 truncate">
                            {type === 'heartrate' ? 'Z' + (index + 1) : 'Z' + (index + 1)} ({label})
                        </div>
                        <div className="flex-1 h-6 bg-slate-700/50 rounded-md overflow-hidden relative group">
                            <div
                                className="h-full transition-all duration-500 rounded-md"
                                style={{
                                    width: `${percentage}%`,
                                    backgroundColor: color
                                }}
                            />
                            {/* Hover Tooltip */}
                            <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-white drop-shadow-md font-medium">{formatDuration(bucket.time)}</span>
                                <span className="text-white drop-shadow-md font-medium">{percentage.toFixed(1)}%</span>
                            </div>
                        </div>
                        <div className="w-12 text-slate-300 text-right pl-2 font-mono">
                            {percentage.toFixed(1)}%
                        </div>
                    </div>
                );
            })}
        </div>
    );
};




// 訓練負荷卡片
const TrainingLoadCard: React.FC<{
    load: TrainingLoadSummary;
    ftp: number;
    sportType?: string;
    hasStravaZones?: boolean;
    onUpdateFtp?: (newFtp: number) => void;
}> = ({ load, ftp, sportType, hasStravaZones, onUpdateFtp }) => {
    const [isEditingFtp, setIsEditingFtp] = useState(false);
    const [editFtpValue, setEditFtpValue] = useState(ftp.toString());
    const [updating, setUpdating] = useState(false);

    const handleSaveFtp = async () => {
        if (!onUpdateFtp) return;
        const val = parseInt(editFtpValue, 10);
        if (isNaN(val) || val <= 0) return;

        setUpdating(true);
        await onUpdateFtp(val);
        setUpdating(false);
        setIsEditingFtp(false);
    };

    return (
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
            {/* FTP (Editable) */}
            <div className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700/50 relative group">
                {isEditingFtp ? (
                    <div className="flex flex-col items-center justify-center h-full">
                        <input
                            type="number"
                            value={editFtpValue}
                            onChange={(e) => setEditFtpValue(e.target.value)}
                            className="w-16 px-1 py-0.5 bg-slate-700 border border-slate-600 rounded text-center text-white text-lg font-bold mb-1 focus:outline-none focus:border-yellow-500"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveFtp()}
                        />
                        <div className="flex gap-2 text-xs">
                            <button onClick={handleSaveFtp} disabled={updating} className="text-emerald-400 hover:text-emerald-300">
                                {updating ? '...' : '儲存'}
                            </button>
                            <button onClick={() => setIsEditingFtp(false)} className="text-slate-400 hover:text-slate-300">取消</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div
                            className={`text-2xl font-bold ${ftp > 0 ? 'text-blue-400' : 'text-red-400 animate-pulse'} cursor-pointer hover:text-blue-300 flex items-center justify-center gap-1`}
                            onClick={() => { setEditFtpValue(ftp.toString()); setIsEditingFtp(true); }}
                            title="點擊修改此活動的 FTP 設定"
                        >
                            {ftp > 0 ? ftp : '無功率設定'}
                            <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                        </div>
                        <div className={`text-xs mt-1 ${ftp > 0 ? 'text-slate-400' : 'text-red-500 font-medium'}`}>
                            {ftp > 0 ? '設定 FTP (W)' : '請先設定 FTP'}
                        </div>
                    </>
                )}
            </div>

            {/* Strava Zones Status (Replacing Max HR) - Only show if synced */}
            {hasStravaZones && (
                <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/50">
                    <div className="text-slate-400 text-xs mb-1">心率區間來源</div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-green-400">Strava</span>
                        <span className="text-xs text-green-500/80">已同步</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                        使用官方分析數據
                    </div>
                </div>
            )}

            {/* Power Metrics - Only for Ride */}
            {(sportType === 'Ride' || sportType === 'VirtualRide') && (
                <>
                    {/* NP */}
                    <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-yellow-400">{load.np}</div>
                        <div className="text-xs text-slate-400 mt-1">NP (W)</div>
                    </div>
                    {/* IF */}
                    <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-orange-400">{load.if.toFixed(2)}</div>
                        <div className="text-xs text-slate-400 mt-1">強度因子</div>
                    </div>
                    {/* TSS */}
                    <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-red-400">{load.tss}</div>
                        <div className="text-xs text-slate-400 mt-1">TSS</div>
                    </div>
                    {/* VI */}
                    <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-purple-400">{load.vi.toFixed(2)}</div>
                        <div className="text-xs text-slate-400 mt-1">變異指數</div>
                    </div>
                </>
            )}
        </div>
    );
};

const AthletePowerTrainingReport: React.FC = () => {
    const { athlete } = useAuth();
    const [recentActivities, setRecentActivities] = useState<StravaActivity[]>([]);
    const [chartActivities, setChartActivities] = useState<StravaActivity[]>([]); // For charts (non-paginated)
    const [loadingActivities, setLoadingActivities] = useState(true);
    const [currentFTP, setCurrentFTP] = useState(0);
    const [currentMaxHR, setCurrentMaxHR] = useState(190);

    // 分頁狀態
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    // 報表相關狀態
    const [selectedActivity, setSelectedActivity] = useState<StravaActivity | null>(null);
    const [activityAnalysis, setActivityAnalysis] = useState<ActivityPowerAnalysis | null>(null);
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);

    // 已存在的 Streams ID 列表
    const [availableStreams, setAvailableStreams] = useState<Set<number>>(new Set());

    const { getActivityStreams, analyzeActivityPower, checkStreamsAvailability } = usePowerAnalysis();

    // 1. 取得最近活動列表 & 選手基本數據
    useEffect(() => {
        if (!athlete?.id) return;

        const fetchData = async () => {
            setLoadingActivities(true);
            try {
                // 計算分頁範圍
                const from = (currentPage - 1) * itemsPerPage;
                const to = from + itemsPerPage - 1;

                const { data: activities, error, count } = await supabase
                    .from('strava_activities')
                    .select('*', { count: 'exact' })
                    .eq('athlete_id', athlete.id)
                    .order('start_date', { ascending: false })
                    .range(from, to);

                if (count !== null) setTotalCount(count);

                if (error) throw error;
                const activityList = activities || [];
                setRecentActivities(activityList);

                // 檢查哪些活動已有 Streams
                if (activityList.length > 0) {
                    const ids = activityList.map(a => a.id);
                    const availableIds = await checkStreamsAvailability(ids);
                    setAvailableStreams(new Set(availableIds));

                    // 嘗試從最近的 Streams 中找出 FTP (若有)
                    // 這邊簡單做：取最近 5 筆有 Streams 的，看有沒有 FTP 紀錄
                    // 或是直接查詢 strava_streams 最近的一筆
                    const { data: latestStream } = await supabase
                        .from('strava_streams')
                        .select('ftp, max_heartrate')
                        .in('activity_id', availableIds)
                        .gt('ftp', 0) // 找有設定 FTP 的
                        .order('activity_id', { ascending: false }) // 大概是最近的 ID
                        .limit(1)
                        .maybeSingle();

                    if (latestStream) {
                        setCurrentFTP(latestStream.ftp || 0);
                        if (latestStream.max_heartrate) setCurrentMaxHR(latestStream.max_heartrate);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch athlete activities:', err);
            } finally {
                setLoadingActivities(false);
            }
        };

        fetchData();
    }, [athlete?.id, checkStreamsAvailability, currentPage, itemsPerPage]);

    // 1.5 取得圖表用數據 (過去 180 天，不分頁)
    useEffect(() => {
        if (!athlete?.id) return;
        const fetchChartData = async () => {
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

            const { data } = await supabase
                .from('strava_activities')
                .select('id, start_date, moving_time, average_watts, suffer_score, sport_type, name, distance, average_heartrate, has_heartrate')
                .eq('athlete_id', athlete.id)
                .gte('start_date', sixMonthsAgo.toISOString())
                .order('start_date', { ascending: true }); // Charts usually want generic chronological order or we sort inside

            if (data) {
                setChartActivities(data);
            }
        };
        fetchChartData();
    }, [athlete?.id]);

    // [New] 監聽選定活動，當數據流變為可用時自動加載分析 (反應式設計)
    useEffect(() => {
        if (selectedActivity && availableStreams.has(selectedActivity.id)) {
            // 如果還沒載入分析，或者分析的 ID 不對，則加載
            if (!activityAnalysis || activityAnalysis.activityId !== selectedActivity.id) {
                const load = async () => {
                    setLoadingAnalysis(true);
                    try {
                        const streams = await getActivityStreams(selectedActivity.id);
                        if (streams) {
                            const analysisFtp = streams.ftp || currentFTP;
                            const analysisMaxHR = streams.max_heartrate || currentMaxHR;
                            const analysis = analyzeActivityPower(selectedActivity, streams, analysisFtp, analysisMaxHR);
                            setActivityAnalysis(analysis);
                        }
                    } catch (err) {
                        console.error('自動加載分析失敗:', err);
                    } finally {
                        setLoadingAnalysis(false);
                    }
                };
                load();
            }
        }
    }, [selectedActivity, availableStreams, getActivityStreams, analyzeActivityPower, currentFTP, currentMaxHR, activityAnalysis]);

    // 計算週 TSS（簡化版）
    const weeklyTSS = useMemo(() => {
        if (!recentActivities.length) return 0;
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        return recentActivities
            .filter(a => new Date(a.start_date) >= oneWeekAgo && (a.sport_type === 'Ride' || a.sport_type === 'VirtualRide') && a.average_watts)
            .reduce((sum, a) => {
                // 簡化 TSS 估算：(時間 * IF^2 * 100) / 3600
                const estimatedIF = currentFTP > 0 ? (a.average_watts || 0) / currentFTP : 0;
                const estimatedTSS = (a.moving_time * Math.pow(estimatedIF, 2) * 100) / 3600;
                return sum + estimatedTSS;
            }, 0);
    }, [recentActivities, currentFTP]);

    // 分析選定活動
    const handleActivitySelect = async (activity: StravaActivity) => {
        if (selectedActivity?.id === activity.id) {
            setSelectedActivity(null);
            setActivityAnalysis(null);
            return;
        }

        setSelectedActivity(activity);
        setLoadingAnalysis(true);
        try {
            const streams = await getActivityStreams(activity.id);
            if (streams) {
                // 使用 Streams 裡的 FTP 或是目前的 FTP
                const analysisFtp = streams.ftp || currentFTP;
                const analysisMaxHR = streams.max_heartrate || currentMaxHR;

                const analysis = analyzeActivityPower(activity, streams, analysisFtp, analysisMaxHR);
                setActivityAnalysis(analysis);
            } else {
                setActivityAnalysis(null);
            }
        } catch (err) {
            console.error('分析活動失敗:', err);
            setActivityAnalysis(null);
        } finally {
            setLoadingAnalysis(false);
        }
    };

    // 同步狀態管理: { [activityId]: 'idle' | 'syncing' | 'success' | 'error' }
    const [syncStatus, setSyncStatus] = useState<Record<number, 'idle' | 'syncing' | 'success' | 'error'>>({});
    const [lastSyncTime, setLastSyncTime] = useState<Record<number, number>>({});

    // 觸發同步 (手動呼叫 Webhook)
    const handleSyncActivity = async (e: React.MouseEvent, activity: StravaActivity) => {
        e.stopPropagation();

        const now = Date.now();
        const lastTime = lastSyncTime[activity.id] || 0;
        if (syncStatus[activity.id] === 'syncing' || (now - lastTime < 5000)) return;

        setSyncStatus(prev => ({ ...prev, [activity.id]: 'syncing' }));
        setLastSyncTime(prev => ({ ...prev, [activity.id]: now }));

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            // 模擬 Strava Webhook Payload
            const payload = {
                aspect_type: "create",
                event_time: Math.floor(Date.now() / 1000),
                object_id: Number(activity.id), // 確保為數字
                object_type: "activity",
                owner_id: athlete?.id,
                subscription_id: 0,
                updates: {}
            };

            const response = await fetch('https://service.criterium.tw/webhook/strava-activity-webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                // 開始輪詢檢查資料是否已入庫
                let retries = 0;
                const maxRetries = 20; // 延長至 40 秒，給 n8n 更多處理時間

                const checkData = async () => {
                    const { data: streamData } = await supabase
                        .from('strava_streams')
                        .select('activity_id')
                        .eq('activity_id', activity.id)
                        .maybeSingle();

                    if (streamData) {
                        // 資料已到，更新 UI
                        setSyncStatus(prev => ({ ...prev, [activity.id]: 'success' }));
                        setAvailableStreams(prev => new Set(prev).add(activity.id));

                        // 補上 FTP 設定
                        const ftpToSave = currentFTP || 0;
                        const maxHrToSave = currentMaxHR || 190;
                        await supabase.from('strava_streams')
                            .update({ ftp: ftpToSave, max_heartrate: maxHrToSave })
                            .eq('activity_id', activity.id);

                        setTimeout(() => {
                            setSyncStatus(prev => ({ ...prev, [activity.id]: 'idle' }));
                            // [Notice] 這裡不再需要手動呼叫 handleActivitySelect
                            // 因為上面的 setAvailableStreams 更新會觸發 useEffect 自動加載分析
                        }, 1000);
                        return true;
                    }
                    return false;
                };

                const poll = async () => {
                    if (retries >= maxRetries) {
                        setSyncStatus(prev => ({ ...prev, [activity.id]: 'error' }));
                        setTimeout(() => setSyncStatus(prev => ({ ...prev, [activity.id]: 'idle' })), 3000);
                        return;
                    }

                    const found = await checkData();
                    if (!found) {
                        retries++;
                        setTimeout(poll, 2000);
                    }
                };

                // 立即開始第一次檢查
                poll();
            } else {
                throw new Error('Webhook call failed');
            }
        } catch (error: any) {
            clearTimeout(timeoutId);
            console.error('同步失敗:', error);
            setSyncStatus(prev => ({ ...prev, [activity.id]: 'error' }));
            setTimeout(() => setSyncStatus(prev => ({ ...prev, [activity.id]: 'idle' })), 3000);
        }
    };

    // 更新活動特定的 FTP
    const handleUpdateFtp = async (newFtp: number) => {
        if (!selectedActivity) return;
        try {
            const { error } = await supabase
                .from('strava_streams')
                .update({ ftp: newFtp })
                .eq('activity_id', selectedActivity.id);

            if (error) throw error;

            // 更新全域狀態 (讓使用者感覺 FTP 已全域更新)
            setCurrentFTP(newFtp);

            // Re-calculate
            const streams = await getActivityStreams(selectedActivity.id);
            if (streams) {
                const analysis = analyzeActivityPower(selectedActivity, streams, newFtp, activityAnalysis?.max_heartrate || currentMaxHR);
                setActivityAnalysis(analysis);
            }
        } catch (error) {
            console.error('更新 FTP 失敗:', error);
        }
    };

    if (!athlete) return <div className="p-4 text-slate-400">請先登入 Strava</div>;

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
                {/* 標題列 */}
                <div className="p-6 border-b border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                            <User className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                {athlete.firstname} {athlete.lastname}
                                <span className="px-2 py-0.5 rounded text-xs font-normal bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                    AI 功率教室
                                </span>
                            </h2>
                            <p className="text-sm text-slate-400 mt-1">
                                目前設定 FTP: <span className="text-white font-mono">{currentFTP > 0 ? `${currentFTP}W` : '未設定'}</span> •
                                本週 TSS: <span className="text-white font-mono">{Math.round(weeklyTSS)}</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* 內容區域 - 直接顯示，不需折疊 */}
                <div className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

                        {/* 上方：每日訓練趨勢圖 & PMC */}
                        <div className="xl:col-span-12 space-y-6">
                            <DailyTrainingChart activities={chartActivities.length > 0 ? chartActivities : recentActivities} ftp={currentFTP} />
                            <PMCChart activities={chartActivities.length > 0 ? chartActivities : recentActivities} ftp={currentFTP} />
                        </div>

                        {/* 下方：最近活動紀錄 (修正為手風琴樣式) */}
                        <div className="xl:col-span-12">
                            <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                                <Activity className="w-4 h-4" />
                                最近活動紀錄
                            </h3>
                            <div className="space-y-2">
                                {loadingActivities ? (
                                    <div className="text-center py-8 text-slate-500">載入中...</div>
                                ) : recentActivities.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500">尚無活動紀錄</div>
                                ) : (
                                    recentActivities.map(activity => {
                                        const isSynced = availableStreams.has(activity.id);
                                        const isSyncing = syncStatus[activity.id] === 'syncing';

                                        // 簡單計算 TSS (若有功率) 以顯示在列表中
                                        const avgWatts = activity.average_watts || 0;
                                        const np = avgWatts * 1.05; // 簡易估算
                                        const intensity = currentFTP > 0 ? np / currentFTP : 0;
                                        const tss = (activity.moving_time * intensity * intensity * 100) / 3600;

                                        return (
                                            <div
                                                key={activity.id}
                                                className={`bg-slate-800/40 rounded-lg border transition-all duration-200 overflow-hidden
                                                    ${selectedActivity?.id === activity.id
                                                        ? 'border-blue-500/50 bg-slate-800/80 shadow-lg shadow-blue-500/10'
                                                        : 'border-slate-700/30 hover:bg-slate-800/60 hover:border-slate-600'
                                                    }`}
                                            >
                                                {/* Header Row */}
                                                <div
                                                    className="p-3 sm:px-4 flex items-center justify-between cursor-pointer group"
                                                    onClick={() => {
                                                        if (isSynced) {
                                                            handleActivitySelect(activity);
                                                        }
                                                        // 如果未同步，點擊也可以觸發選擇，讓使用者看到"請先同步" (或者自動觸發同步?)
                                                        // 這裡維持現有邏輯：點擊即選取，選取後再處理顯示
                                                        handleActivitySelect(activity);
                                                    }}
                                                >
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className={`w-1 h-8 rounded-full flex-shrink-0 ${activity.sport_type === 'Ride' || activity.sport_type === 'VirtualRide'
                                                            ? 'bg-yellow-500'
                                                            : 'bg-slate-600'
                                                            }`} />

                                                        <div className="flex flex-col min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className={`font-medium truncate transition-colors ${selectedActivity?.id === activity.id ? 'text-blue-300' : 'text-slate-200 group-hover:text-white'
                                                                    }`}>
                                                                    {activity.name}
                                                                </h4>
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 border border-slate-600">
                                                                    {activity.sport_type === 'VirtualRide' ? 'Virtual' : activity.sport_type}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3 text-xs text-slate-500">
                                                                {new Date(activity.start_date).toLocaleDateString()}
                                                                <span>•</span>
                                                                {formatDuration(activity.moving_time)}
                                                                <span>•</span>
                                                                {((activity.distance || 0) / 1000).toFixed(1)} km

                                                                {/* 同步狀態指示 */}
                                                                {isSyncing ? (
                                                                    <span className="flex items-center gap-1 text-blue-400 ml-2">
                                                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                                                        同步中...
                                                                    </span>
                                                                ) : isSynced ? (
                                                                    <span className="flex items-center gap-1 text-emerald-400 ml-2" title="數據已同步">
                                                                        <CheckCircle className="w-3 h-3" />
                                                                    </span>
                                                                ) : (
                                                                    <button
                                                                        onClick={(e) => handleSyncActivity(e, activity)}
                                                                        className="flex items-center gap-1 text-slate-500 hover:text-blue-400 ml-2 transition-colors px-1.5 py-0.5 rounded border border-transparent hover:border-blue-500/30 hover:bg-blue-500/10"
                                                                        title="點擊同步詳細數據"
                                                                    >
                                                                        <RefreshCw className="w-3 h-3" />
                                                                        <span className="text-[10px]">同步</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* 右側數據摘要 */}
                                                    <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                                                        {/* 指標顯示邏輯 (類似 PowerTrainingReport) */}
                                                        {isSynced && avgWatts > 0 && (
                                                            <>
                                                                {/* TSS - 這裡僅為列表顯示用，實際精確計算在詳細視圖 */}
                                                                <div className="hidden sm:flex flex-col items-end">
                                                                    <span className="text-xs font-mono text-pink-400 font-bold">{Math.round(tss)}</span>
                                                                    <span className="text-[10px] text-slate-600">TSS</span>
                                                                </div>
                                                                {/* Power */}
                                                                <div className="flex flex-col items-end">
                                                                    <span className="text-xs font-mono text-yellow-500 font-bold">{Math.round(avgWatts)}W</span>
                                                                    <span className="text-[10px] text-slate-600">AVG</span>
                                                                </div>
                                                            </>
                                                        )}

                                                        {selectedActivity?.id === activity.id ? (
                                                            <ChevronUp className="w-4 h-4 text-blue-400" />
                                                        ) : (
                                                            <ChevronDown className="w-4 h-4 text-slate-600" />
                                                        )}
                                                    </div>
                                                </div>

                                                {/* 展開內容區域 - 這裡我們將其保留為空，因為上面已經有獨立的詳細分析區塊。
                                                    但為了符合「手風琴」的隱喻，我們可以把選中的項目高亮顯示，
                                                    或者如果想要真正的 inline accordion，可以把上面的 <TrainingLoadCard> 等內容搬進來。
                                                    目前的設計是：點擊列表 -> 上方顯示詳細資料 (Master-Detail 模式)。
                                                    使用者希望像 Power Coach 頁面一樣 (它是 accordion)。
                                                    
                                                    為了完全一致，我們應該把詳細分析搬到這裡面。
                                                */}
                                                {selectedActivity?.id === activity.id && (
                                                    <div className="border-t border-slate-700/30 bg-slate-900/30">
                                                        {loadingAnalysis ? (
                                                            <div className="py-8 flex justify-center">
                                                                <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                                                            </div>
                                                        ) : activityAnalysis ? (
                                                            <div className="p-4 space-y-6 animate-in fade-in zoom-in-95 duration-300">
                                                                {/* 訓練負荷 */}
                                                                {activityAnalysis.trainingLoad.np > 0 && (
                                                                    <div>
                                                                        <h5 className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wider">數據概覽</h5>
                                                                        <TrainingLoadCard
                                                                            load={activityAnalysis.trainingLoad}
                                                                            ftp={activityAnalysis.ftp}
                                                                            sportType={selectedActivity.sport_type}
                                                                            hasStravaZones={!!activityAnalysis.stravaZones}
                                                                            onUpdateFtp={handleUpdateFtp}
                                                                        />
                                                                    </div>
                                                                )}

                                                                {/* 圖表區塊 */}
                                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                                    {/* 功率區間 */}
                                                                    {activityAnalysis.powerZones && (selectedActivity.sport_type === 'Ride' || selectedActivity.sport_type === 'VirtualRide') && (
                                                                        <div>
                                                                            <h5 className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                                                                                <Zap className="w-3 h-3" /> 功率區間
                                                                            </h5>
                                                                            <PowerZoneChart zones={activityAnalysis.powerZones} />
                                                                        </div>
                                                                    )}

                                                                    {/* Strava 原始區間 */}
                                                                    {activityAnalysis.stravaZones && activityAnalysis.stravaZones.length > 0 && (
                                                                        <div>
                                                                            <h5 className="text-xs font-medium text-slate-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                                                                                <Target className="w-3 h-3" /> Strava 原始分析
                                                                            </h5>
                                                                            <div className="space-y-4">
                                                                                {(() => {
                                                                                    const zones = Array.isArray(activityAnalysis.stravaZones)
                                                                                        ? activityAnalysis.stravaZones
                                                                                        : [{ type: 'heartrate', distribution_buckets: activityAnalysis.stravaZones }];

                                                                                    return zones
                                                                                        .filter((z: any) => z.type === 'power')
                                                                                        .map((z: any, idx: number) => (
                                                                                            <StravaZoneChart key={idx} data={z.distribution_buckets} type={z.type} />
                                                                                        ));
                                                                                })()}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* 詳細圖表 */}
                                                                <div className="pt-4 border-t border-slate-700/30">
                                                                    <h5 className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">趨勢圖表</h5>
                                                                    <ActivityCharts data={activityAnalysis} />
                                                                </div>
                                                            </div>
                                                        ) : isSyncing ? (
                                                            <div className="py-12 text-center text-slate-500">
                                                                <RefreshCw className="w-10 h-10 mx-auto mb-4 animate-spin text-blue-500 opacity-70" />
                                                                <p className="text-blue-400 font-medium animate-pulse">正在同步並偵測數據...</p>
                                                                <p className="text-xs mt-2 text-slate-600">偵測到數據入庫後將自動顯示圖表</p>
                                                            </div>
                                                        ) : (
                                                            <div className="py-8 text-center text-slate-500">
                                                                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                                                <p className="mb-2">此活動尚無詳細數據流</p>
                                                                {!isSynced && (
                                                                    <button
                                                                        onClick={(e) => handleSyncActivity(e, activity)}
                                                                        className="text-blue-400 hover:text-blue-300 underline text-sm"
                                                                    >
                                                                        立即同步數據
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* 分頁控制列 */}
                            <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-700/50">
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                    <span>顯示:</span>
                                    <select
                                        value={itemsPerPage}
                                        onChange={(e) => {
                                            setItemsPerPage(Number(e.target.value));
                                            setCurrentPage(1); // 切換筆數時重置回第一頁
                                        }}
                                        className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                                    >
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                    </select>
                                    <span className="ml-2 hidden sm:inline">
                                        {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} / 共 {totalCount} 筆
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-5 h-5 text-slate-400" />
                                    </button>
                                    <span className="text-sm text-slate-400 font-mono">
                                        {currentPage} / {Math.ceil(totalCount / itemsPerPage) || 1}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCount / itemsPerPage), p + 1))}
                                        disabled={currentPage >= Math.ceil(totalCount / itemsPerPage)}
                                        className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="w-5 h-5 text-slate-400" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AthletePowerTrainingReport;
