/**
 * PowerTrainingReport 組件
 * 功率教練專用的科學化訓練報表
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    AlertCircle, User, Calendar, RefreshCw, CheckCircle, Edit2, Zap, Heart, Activity, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Clock, Flame, Target, BarChart3, ZoomOut
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
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

interface PowerTrainingReportProps {
    activitySummaries: ActivitySummary[];
    defaultFTP?: number;
    defaultMaxHR?: number;
}

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
                            <ReferenceArea
                                x1={refAreaLeft}
                                x2={refAreaRight}
                                // @ts-ignore - Recharts type definition issue with fill in some versions
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

// 單一選手報表
const AthleteReport: React.FC<{
    summary: ActivitySummary;
    ftp: number;
    maxHR?: number;
}> = ({ summary, ftp, maxHR }) => {
    const [expanded, setExpanded] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState<StravaActivity | null>(null);
    const [activityAnalysis, setActivityAnalysis] = useState<ActivityPowerAnalysis | null>(null);
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);
    const [chartActivities, setChartActivities] = useState<StravaActivity[]>([]); // For PMC Chart

    // 已存在的 Streams ID 列表
    const [availableStreams, setAvailableStreams] = useState<Set<number>>(new Set());

    const { getActivityStreams, analyzeActivityPower, checkStreamsAvailability } = usePowerAnalysis();

    useEffect(() => {
        const checkStreams = async () => {
            if (!summary.recent_activities?.length) return;
            const ids = summary.recent_activities.map(a => a.id);
            const availableIds = await checkStreamsAvailability(ids);
            setAvailableStreams(new Set(availableIds));
        };
        checkStreams();
    }, [summary.recent_activities, checkStreamsAvailability]);

    // [New] Fetch chart data (180 days) when expanded
    useEffect(() => {
        if (!expanded || chartActivities.length > 0) return;

        const fetchChartData = async () => {
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

            const { data } = await supabase
                .from('strava_activities')
                .select('id, start_date, moving_time, average_watts, weighted_average_watts, device_watts, suffer_score, sport_type, name, distance, average_heartrate, has_heartrate, max_heartrate')
                .eq('athlete_id', summary.athlete_id)
                .gte('start_date', sixMonthsAgo.toISOString())
                .order('start_date', { ascending: true });

            if (data) {
                setChartActivities(data);
            }
        };
        fetchChartData();
    }, [expanded, summary.athlete_id, chartActivities.length]);

    // 計算週 TSS（簡化版）
    const weeklyTSS = useMemo(() => {
        if (!summary.recent_activities) return 0;
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        return (summary.recent_activities || [])
            .filter(a => {
                const isRide = ['Ride', 'VirtualRide', 'MountainBikeRide', 'GravelRide', 'EBikeRide', 'Velomobile'].includes(a.sport_type);
                return new Date(a.start_date) >= oneWeekAgo && isRide && a.average_watts;
            })
            .reduce((sum, a) => {
                // 優先使用身心負荷 (Suffer Score)，次之使用功率估算
                const sufferScore = a.suffer_score ? Number(a.suffer_score) : 0;
                let activityTss = 0;
                if (sufferScore > 0) {
                    activityTss = sufferScore;
                } else if (ftp > 0 && a.average_watts) {
                    const np = Number(a.weighted_average_watts || (a.average_watts * 1.05) || 0);
                    const estimatedIF = np / ftp;
                    activityTss = (a.moving_time * np * estimatedIF) / (ftp * 3600) * 100;
                }
                return sum + activityTss;
            }, 0);
    }, [summary.recent_activities, ftp]);

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
                            const analysisFtp = streams.ftp || ftp;
                            const analysisMaxHR = streams.max_heartrate || maxHR || 190;
                            const analysis = analyzeActivityPower(selectedActivity, streams, analysisFtp, analysisMaxHR);
                            setActivityAnalysis(analysis);
                        }
                    } catch (err) {
                        console.error('自動加載分析失敗 (教練端):', err);
                    } finally {
                        setLoadingAnalysis(false);
                    }
                };
                load();
            }
        }
    }, [selectedActivity, availableStreams, getActivityStreams, analyzeActivityPower, ftp, maxHR, activityAnalysis]);

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
                const analysis = analyzeActivityPower(activity, streams, streams.ftp || ftp, streams.max_heartrate || maxHR);
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

    // 用於記錄每個活動上次點擊同步的時間 (防止連點)
    const [lastSyncTime, setLastSyncTime] = useState<Record<number, number>>({});

    // 觸發同步 (手動呼叫 Webhook)
    const handleSyncActivity = async (e: React.MouseEvent, activity: StravaActivity) => {
        e.stopPropagation(); // 防止觸發活動展開

        const now = Date.now();
        const lastTime = lastSyncTime[activity.id] || 0;

        // 檢查是否正在同步中 或 距離上次點擊未滿 5 秒
        if (syncStatus[activity.id] === 'syncing' || (now - lastTime < 5000)) {
            return;
        }

        setSyncStatus(prev => ({ ...prev, [activity.id]: 'syncing' }));
        setLastSyncTime(prev => ({ ...prev, [activity.id]: now }));

        // 設定 10 秒 Timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            // 模擬 Strava Webhook Payload
            const payload = {
                aspect_type: "create",
                event_time: Math.floor(Date.now() / 1000),
                object_id: Number(activity.id), // 確保為數字
                object_type: "activity",
                owner_id: summary.athlete_id,
                subscription_id: 0, // 手動觸發
                updates: {}
            };

            const response = await fetch('https://service.criterium.tw/webhook/strava-activity-webhook', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
                signal: controller.signal // 傳入 signal 以支援 timeout
            });

            clearTimeout(timeoutId); // 成功回傳後清除 timeout

            if (response.ok) {
                // 開始輪詢檢查資料是否已入庫
                let retries = 0;
                const maxRetries = 15; // 最多 30 秒

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
                        const ftpToSave = summary.ftp || 0;
                        const maxHrToSave = summary.max_heartrate || 190;
                        await supabase.from('strava_streams')
                            .update({
                                ftp: ftpToSave,
                                max_heartrate: maxHrToSave
                            })
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
                        // 指數退避：初始 1 秒，每次乘以 1.5，最大 8 秒
                        const delay = Math.min(1000 * Math.pow(1.5, retries - 1), 8000);
                        setTimeout(poll, delay);
                    }
                };

                // 立即開始輪詢
                poll();
            } else {
                throw new Error('Webhook call failed');
            }
        } catch (error: any) {
            clearTimeout(timeoutId); // 發生錯誤也要清除 timeout
            console.error('同步失敗:', error);

            // 區分 Timeout 錯誤與一般錯誤
            if (error.name === 'AbortError') {
                console.error('同步請求超時 (超過 10 秒)');
            }

            setSyncStatus(prev => ({ ...prev, [activity.id]: 'error' }));
            setTimeout(() => setSyncStatus(prev => ({ ...prev, [activity.id]: 'idle' })), 3000);
        }
    };

    // 更新活動特定的 FTP
    const handleUpdateFtp = async (newFtp: number) => {
        if (!selectedActivity) return;

        try {
            // 1. Update Supabase
            const { error } = await supabase
                .from('strava_streams')
                .update({ ftp: newFtp })
                .eq('activity_id', selectedActivity.id);

            if (error) throw error;

            // 2. Re-calculate Analysis
            const streams = await getActivityStreams(selectedActivity.id);
            if (streams) {
                const analysis = analyzeActivityPower(selectedActivity, streams, newFtp, activityAnalysis?.max_heartrate || maxHR);
                setActivityAnalysis(analysis);
            }

        } catch (error) {
            console.error('更新 FTP 失敗:', error);
            // Optionally show error toast
        }
    };



    return (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
            {/* 選手標題列 */}
            <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-700/30 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white flex items-center gap-2">
                            {summary.athlete_name}
                            <span className="text-xs font-mono text-slate-500 bg-slate-800/50 px-1.5 py-0.5 rounded">
                                #{summary.athlete_id}
                            </span>
                        </h3>
                        <p className="text-xs text-slate-400">
                            FTP: {ftp > 0 ? `${ftp}W` : '未設定'} • 週 TSS: {Math.round(weeklyTSS)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* 快速統計 */}


                    {expanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                </div>
            </div>

            {/* 展開內容 */}
            {expanded && (
                <div className="border-t border-slate-700/50 p-4">
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">


                        {/* 每日訓練圖表 */}
                        {/* 每日訓練圖表 & PMC */}
                        <div className="xl:col-span-12 space-y-6">
                            <DailyTrainingChart activities={chartActivities.length > 0 ? chartActivities : (summary.recent_activities || [])} ftp={ftp} />
                            <PMCChart activities={chartActivities.length > 0 ? chartActivities : (summary.recent_activities || [])} ftp={ftp} />
                        </div>

                        {/* 右側：最近活動列表 (佔 12/12) */}
                        <div className="xl:col-span-12 bg-slate-800/20 rounded-xl p-4 border border-slate-700/30">
                            <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4" />
                                最近活動分析
                            </h4>
                            <div className="space-y-2">
                                {(summary.recent_activities || []).slice(0, 10).map(activity => {
                                    const isSyncing = syncStatus[activity.id] === 'syncing';
                                    return (
                                        <div key={activity.id}>
                                            <div
                                                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${selectedActivity?.id === activity.id
                                                    ? 'bg-yellow-500/20 border border-yellow-500/50'
                                                    : 'bg-slate-700/30 hover:bg-slate-700/50'
                                                    }`}
                                                onClick={() => handleActivitySelect(activity)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {/* 同步按鈕與狀態顯示 */}
                                                    <div
                                                        onClick={(e) => handleSyncActivity(e, activity)}
                                                        className="p-1.5 rounded-full hover:bg-slate-600/50 transition-colors"
                                                        title={availableStreams.has(activity.id) ? "數據已同步 (點擊重新同步)" : "同步此活動數據"}
                                                    >
                                                        {syncStatus[activity.id] === 'syncing' ? (
                                                            <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                                                        ) : (syncStatus[activity.id] === 'success' || availableStreams.has(activity.id)) ? (
                                                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                                                        ) : syncStatus[activity.id] === 'error' ? (
                                                            <AlertCircle className="w-4 h-4 text-red-400" />
                                                        ) : (
                                                            <RefreshCw className="w-4 h-4 text-slate-500 hover:text-white" />
                                                        )}
                                                    </div>

                                                    <Calendar className="w-4 h-4 text-slate-500" />
                                                    <div>
                                                        <div className="text-sm text-white font-medium truncate max-w-[200px]">
                                                            {activity.name}
                                                        </div>
                                                        <div className="text-xs text-slate-500 flex items-center gap-2">
                                                            <span>{new Date(activity.start_date).toLocaleDateString('zh-TW')}</span>
                                                            <span className="opacity-50">•</span>
                                                            <span className="font-mono text-[10px]">{activity.id}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs">
                                                    {/* 計算與顯示訓練負荷指標 */}
                                                    {(() => {
                                                        const ftp = Number(summary.ftp || 0);
                                                        const sufferScore = activity.suffer_score ? Number(activity.suffer_score) : 0;
                                                        const np = Number(activity.weighted_average_watts || 0);
                                                        const ap = Number(activity.average_watts || 0);
                                                        // Avoid division by zero
                                                        const intensity = ftp > 0 ? np / ftp : 0;
                                                        const tss_from_power = ftp > 0 ? (activity.moving_time * np * intensity) / (ftp * 3600) * 100 : 0;
                                                        const tss = sufferScore > 0 ? sufferScore : tss_from_power;

                                                        // 若無功率與心率數據，僅顯示時間
                                                        if (ap === 0 && np === 0 && sufferScore === 0) return (
                                                            <span className="text-slate-400">
                                                                {formatDuration(activity.moving_time)}
                                                            </span>
                                                        );

                                                        return (
                                                            <>
                                                                {/* 只在已同步 (有詳細 Streams) 時顯示進階指標 */}
                                                                {availableStreams.has(activity.id) && np > 0 && (
                                                                    <>
                                                                        {/* TSS */}
                                                                        <div className="flex items-center gap-1 text-pink-400" title="Training Stress Score">
                                                                            <span className="font-mono font-bold">{Math.round(tss)}</span>
                                                                            <span className="text-[10px] opacity-70">TSS</span>
                                                                        </div>

                                                                        {/* NP */}
                                                                        <div className="flex items-center gap-1 text-orange-400" title="Normalized Power">
                                                                            <span className="font-mono font-bold">{Math.round(np)}</span>
                                                                            <span className="text-[10px] opacity-70">NP</span>
                                                                        </div>

                                                                        {/* IF */}
                                                                        <div className="hidden sm:flex items-center gap-1 text-blue-400" title="Intensity Factor">
                                                                            <span className="font-mono font-bold">{intensity.toFixed(2)}</span>
                                                                            <span className="text-[10px] opacity-70">IF</span>
                                                                        </div>
                                                                    </>
                                                                )}

                                                                {/* AP */}
                                                                {np > 0 && (
                                                                    <div className="hidden md:flex items-center gap-1 text-slate-400 ml-1" title="Average Power">
                                                                        <Zap className="w-3 h-3 text-yellow-500" />
                                                                        <span>{Math.round(ap)}W</span>
                                                                    </div>
                                                                )}

                                                                {/* Duration */}
                                                                <span className="text-slate-500 ml-1 font-mono">
                                                                    {formatDuration(activity.moving_time)}
                                                                </span>
                                                            </>
                                                        );
                                                    })()}

                                                    {selectedActivity?.id === activity.id ? (
                                                        <ChevronUp className="w-4 h-4 text-yellow-400 ml-1" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4 text-slate-500 ml-1" />
                                                    )}
                                                </div>
                                            </div>

                                            {/* 活動詳細分析 */}
                                            {selectedActivity?.id === activity.id && (
                                                <div className="mt-2 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                                    {loadingAnalysis ? (
                                                        <div className="flex items-center justify-center py-8">
                                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400" />
                                                        </div>
                                                    ) : activityAnalysis ? (
                                                        <div className="space-y-6">
                                                            {/* 訓練負荷指標 - 僅在有力數據時顯示 */}
                                                            {activityAnalysis.trainingLoad.np > 0 && (
                                                                <div>
                                                                    <h5 className="text-xs font-medium text-slate-400 mb-3">訓練負荷指標 (可點擊數值修改設定)</h5>
                                                                    <TrainingLoadCard
                                                                        load={activityAnalysis.trainingLoad}
                                                                        ftp={activityAnalysis.ftp}
                                                                        sportType={activity.sport_type}
                                                                        hasStravaZones={activityAnalysis.stravaZones && activityAnalysis.stravaZones.length > 0}
                                                                        onUpdateFtp={handleUpdateFtp}
                                                                    />
                                                                </div>
                                                            )}

                                                            {/* 功率區間分佈 - 僅限 Ride 且具備有效功率數據 */}
                                                            {activityAnalysis.powerZones && (activity.sport_type === 'Ride' || activity.sport_type === 'VirtualRide') && activityAnalysis.trainingLoad.np > 0 && (
                                                                <div>
                                                                    <h5 className="text-xs font-medium text-slate-400 mb-3">功率區間分佈</h5>
                                                                    <div className="space-y-2">
                                                                        {activityAnalysis.powerZones.map(zone => (
                                                                            <div key={zone.zone} className="flex items-center gap-3">
                                                                                <div className="w-16 text-xs text-slate-400">
                                                                                    Z{zone.zone} {zone.name}
                                                                                </div>
                                                                                <div className="flex-1 h-4 bg-slate-700/50 rounded-full overflow-hidden">
                                                                                    <div
                                                                                        className="h-full rounded-full"
                                                                                        style={{
                                                                                            width: `${zone.percentageTime}%`,
                                                                                            backgroundColor: zone.color,
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                                <div className="w-12 text-right text-xs font-mono text-slate-300">
                                                                                    {zone.percentageTime}%
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}



                                                            {/* Strava 原始區間 - 僅限 Ride 且具備有效功率數據與資料 */}
                                                            {activityAnalysis.stravaZones && activityAnalysis.stravaZones.length > 0 && (activity.sport_type === 'Ride' || activity.sport_type === 'VirtualRide') && activityAnalysis.trainingLoad.np > 0 && (
                                                                <div className="mt-8 pt-6 border-t border-slate-700/50">
                                                                    <h5 className="text-xs font-medium text-slate-300 mb-4 flex items-center gap-2">
                                                                        <Target className="w-3 h-3 text-orange-400" />
                                                                        Strava 原始功率區間分析
                                                                    </h5>
                                                                    <div className="grid grid-cols-1 gap-6">
                                                                        {(() => {
                                                                            const zones = Array.isArray(activityAnalysis.stravaZones)
                                                                                ? activityAnalysis.stravaZones
                                                                                : [{ type: 'heartrate', distribution_buckets: activityAnalysis.stravaZones }];

                                                                            // 僅處理功率區間
                                                                            return zones
                                                                                .filter((z: any) => z.type === 'power')
                                                                                .map((z: any, idx: number) => (
                                                                                    <div key={idx}>
                                                                                        <StravaZoneChart data={z.distribution_buckets} type={z.type} />
                                                                                    </div>
                                                                                ));
                                                                        })()}
                                                                    </div>
                                                                </div>
                                                            )}


                                                            {/* 活動曲線圖 */}
                                                            <div>
                                                                <h5 className="text-xs font-medium text-slate-400 mb-2">數據趨勢分析</h5>
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
                                                        <div className="text-center py-8 text-slate-500 border border-dashed border-slate-700/50 rounded-xl bg-slate-800/20">
                                                            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                                            <p className="font-medium">此活動尚無詳細數據流</p>
                                                            <p className="text-xs mt-1 text-slate-500">請點選活動列左側的同步圖示</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div >
            )}
        </div >
    );
};

// 主組件
const PowerTrainingReport: React.FC<PowerTrainingReportProps> = ({
    activitySummaries,
    defaultFTP = 200,
    defaultMaxHR = 190,
}) => {
    const [globalFTP, setGlobalFTP] = useState(defaultFTP);
    const [globalMaxHR, setGlobalMaxHR] = useState(defaultMaxHR);

    if (activitySummaries.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <Activity className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg">尚無授權選手的活動數據</p>
                <p className="text-sm mt-2">請先邀請選手並取得活動報表授權</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">


            {/* 選手報表列表 */}
            <div className="space-y-4">
                {activitySummaries.map(summary => (
                    <AthleteReport
                        key={summary.athlete_id}
                        summary={summary}
                        ftp={summary.ftp || globalFTP}
                        maxHR={globalMaxHR}
                    />
                ))}
            </div>
        </div>
    );
};

export default PowerTrainingReport;
