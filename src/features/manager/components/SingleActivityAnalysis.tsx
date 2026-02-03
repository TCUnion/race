import React, { useState, useEffect, useMemo } from 'react';
import {
    Zap, Heart, Activity, TrendingUp, Clock, ZoomOut, Save, Edit2, RefreshCw, BarChart3
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { usePowerAnalysis } from '../../../hooks/usePowerAnalysis';
import {
    StravaActivity,
    ActivityPowerAnalysis,
    PowerZoneAnalysis,
    TrainingLoadSummary,
} from '../../../types';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea
} from 'recharts';

// --- Shared Utility Functions ---
const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// --- Sub-components ---

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

const ActivityCharts: React.FC<{ data: any }> = ({ data }) => {
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['watts', 'heartrate', 'speed', 'altitude']);

    const metrics_config = [
        { key: 'watts', label: '功率 (W)', color: '#EAB308', icon: Zap },
        { key: 'heartrate', label: '心率 (bpm)', color: '#EF4444', icon: Heart },
        { key: 'cadence', label: '踏頻 (rpm)', color: '#3B82F6', icon: Activity },
        { key: 'speed', label: '速度 (km/h)', color: '#06b6d4', icon: Zap },
        { key: 'altitude', label: '海拔 (m)', color: '#10b981', icon: TrendingUp },
        { key: 'grade', label: '坡度 (%)', color: '#A855F7', icon: TrendingUp },
        { key: 'temp', label: '溫度 (°C)', color: '#F97316', icon: TrendingUp },
    ];

    const toggleMetric = (key: string) => {
        setSelectedMetrics(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const chartData = useMemo(() => {
        if (!data?.timeSeriesData) return [];
        const { time, watts, heartrate, cadence, grade, velocity, altitude, temp } = data.timeSeriesData;
        const result = [];
        for (let i = 0; i < time.length; i += 10) {
            result.push({
                time: time[i],
                timeStr: formatDuration(time[i]),
                watts: watts[i],
                heartrate: heartrate?.[i] || 0,
                cadence: cadence?.[i] || 0,
                grade: grade?.[i] || 0,
                speed: velocity?.[i] ? Number((velocity[i] * 3.6).toFixed(1)) : 0,
                altitude: altitude?.[i] || 0,
                temp: temp?.[i] || null,
            });
        }
        return result;
    }, [data]);

    const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
    const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
    const [left, setLeft] = useState<'dataMin' | number>('dataMin');
    const [right, setRight] = useState<'dataMax' | number>('dataMax');

    const zoom = () => {
        if (refAreaLeft === null || refAreaRight === null || refAreaLeft === refAreaRight) {
            setRefAreaLeft(null);
            setRefAreaRight(null);
            return;
        }
        let start = refAreaLeft;
        let end = refAreaRight;
        if (start > end) [start, end] = [end, start];
        setRefAreaLeft(null);
        setRefAreaRight(null);
        setLeft(start);
        setRight(end);
    };

    if (chartData.length === 0) return null;

    return (
        <div className="w-full mt-6">
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
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: isActive ? metric.color : '#64748b' }} />
                            {metric.label}
                        </button>
                    );
                })}
            </div>

            <div className="h-[400px] w-full min-w-0 overflow-hidden select-none cursor-crosshair">
                <ResponsiveContainer width="100%" height={400}>
                    <AreaChart
                        data={chartData}
                        margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                        onMouseDown={(e) => e && e.activeLabel && setRefAreaLeft(Number(e.activeLabel))}
                        onMouseMove={(e) => e && e.activeLabel && refAreaLeft !== null && setRefAreaRight(Number(e.activeLabel))}
                        onMouseUp={zoom}
                    >
                        <defs>
                            <linearGradient id="colorWatts" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EAB308" stopOpacity={0.8} /><stop offset="95%" stopColor="#EAB308" stopOpacity={0} /></linearGradient>
                            <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#EF4444" stopOpacity={0.8} /><stop offset="95%" stopColor="#EF4444" stopOpacity={0} /></linearGradient>
                            <linearGradient id="colorCadence" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} /><stop offset="95%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient>
                            <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} /><stop offset="95%" stopColor="#06b6d4" stopOpacity={0} /></linearGradient>
                            <linearGradient id="colorAltitude" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.8} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                            <linearGradient id="colorGrade" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#A855F7" stopOpacity={0.8} /><stop offset="95%" stopColor="#A855F7" stopOpacity={0} /></linearGradient>
                            <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F97316" stopOpacity={0.8} /><stop offset="95%" stopColor="#F97316" stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                        <XAxis dataKey="time" type="number" stroke="#94a3b8" tick={{ fontSize: 10 }} tickFormatter={formatDuration} domain={[left, right]} allowDataOverflow />
                        <YAxis yAxisId="watts" hide domain={[0, 'auto']} /><YAxis yAxisId="hr" hide domain={[0, 220]} /><YAxis yAxisId="cadence" hide domain={[0, 150]} /><YAxis yAxisId="speed" hide domain={[0, 100]} /><YAxis yAxisId="altitude" hide domain={['auto', 'auto']} /><YAxis yAxisId="grade" hide domain={[-20, 20]} /><YAxis yAxisId="temp" hide domain={['auto', 'auto']} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', fontSize: '12px' }}
                            labelFormatter={(label) => formatDuration(Number(label))}
                            formatter={(value: any, name: string) => {
                                const labels: Record<string, [string, string]> = {
                                    watts: [`${value}W`, '功率'], heartrate: [`${value}bpm`, '心率'], cadence: [`${value}rpm`, '踏頻'],
                                    speed: [`${value}km/h`, '速度'], altitude: [`${value}m`, '海拔'], grade: [`${value}%`, '坡度'], temp: [`${value}°C`, '溫度']
                                };
                                return labels[name] || [value, name];
                            }}
                        />
                        {selectedMetrics.includes('watts') && <Area yAxisId="watts" type="monotone" dataKey="watts" stroke="#EAB308" fillOpacity={1} fill="url(#colorWatts)" strokeWidth={1.5} />}
                        {selectedMetrics.includes('heartrate') && <Area yAxisId="hr" type="monotone" dataKey="heartrate" stroke="#EF4444" fillOpacity={1} fill="url(#colorHr)" strokeWidth={1.5} />}
                        {selectedMetrics.includes('cadence') && <Area yAxisId="cadence" type="monotone" dataKey="cadence" stroke="#3B82F6" fillOpacity={1} fill="url(#colorCadence)" strokeWidth={1.5} />}
                        {selectedMetrics.includes('speed') && <Area yAxisId="speed" type="monotone" dataKey="speed" stroke="#06b6d4" fillOpacity={1} fill="url(#colorSpeed)" strokeWidth={1.5} />}
                        {selectedMetrics.includes('altitude') && <Area yAxisId="altitude" type="monotone" dataKey="altitude" stroke="#10b981" fillOpacity={0.4} fill="url(#colorAltitude)" strokeWidth={1.5} />}
                        {selectedMetrics.includes('grade') && <Area yAxisId="grade" type="monotone" dataKey="grade" stroke="#A855F7" fillOpacity={1} fill="url(#colorGrade)" strokeWidth={1.5} />}
                        {selectedMetrics.includes('temp') && <Area yAxisId="temp" type="monotone" dataKey="temp" stroke="#F97316" fillOpacity={1} fill="url(#colorTemp)" strokeWidth={1.5} connectNulls />}
                        {refAreaLeft !== null && refAreaRight !== null && <ReferenceArea x1={refAreaLeft} x2={refAreaRight} fill="#000000" fillOpacity={0.5} />}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 px-2">
                <div>
                    {left !== 'dataMin' ? (
                        <button onClick={() => { setLeft('dataMin'); setRight('dataMax'); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-200 rounded-full transition-colors border border-slate-600">
                            <ZoomOut className="w-3 h-3" /> 重置縮放
                        </button>
                    ) : (
                        <span>按住滑鼠左鍵拖曳選取範圍進行縮放</span>
                    )}
                </div>
            </div>
        </div>
    );
};

const StravaZoneChart: React.FC<{ data: any[], type: 'power' | 'heartrate' }> = ({ data, type }) => {
    if (!data || data.length === 0) return null;
    const totalTime = data.reduce((acc, curr) => acc + curr.time, 0);
    const getZoneColor = (index: number, isHr: boolean) => {
        const colors = isHr ? ['#94a3b8', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#ef4444'] : ['#94a3b8', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#ef4444', '#a855f7'];
        return colors[index] || '#cbd5e1';
    };
    const formatDurationShort = (seconds: number) => {
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
                        <div className="w-20 text-slate-400 text-right pr-2 truncate">Z{index + 1} ({label})</div>
                        <div className="flex-1 h-6 bg-slate-700/50 rounded-md overflow-hidden relative group">
                            <div className="h-full transition-all duration-500 rounded-md" style={{ width: `${percentage}%`, backgroundColor: color }} />
                            <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-white drop-shadow-md font-medium">{formatDurationShort(bucket.time)}</span>
                                <span className="text-white drop-shadow-md font-medium">{percentage.toFixed(1)}%</span>
                            </div>
                        </div>
                        <div className="w-12 text-slate-300 text-right pl-2 font-mono">{percentage.toFixed(1)}%</div>
                    </div>
                );
            })}
        </div>
    );
};

const TrainingLoadCard: React.FC<{
    load: TrainingLoadSummary;
    ftp: number;
    sportType?: string;
    hasStravaZones?: boolean;
    onUpdateFtp?: (newFtp: number) => Promise<void>;
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
            <div className="bg-slate-800/80 rounded-xl p-4 text-center border border-slate-700/50 relative group">
                {isEditingFtp ? (
                    <div className="flex flex-col items-center justify-center h-full">
                        <input type="number" value={editFtpValue} onChange={(e) => setEditFtpValue(e.target.value)} className="w-16 px-1 py-0.5 bg-slate-700 border border-slate-600 rounded text-center text-white text-lg font-bold mb-1 focus:outline-none focus:border-yellow-500" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleSaveFtp()} />
                        <div className="flex gap-2 text-xs">
                            <button onClick={handleSaveFtp} disabled={updating} className="text-emerald-400 hover:text-emerald-300">{updating ? '...' : '儲存'}</button>
                            <button onClick={() => setIsEditingFtp(false)} className="text-slate-400 hover:text-slate-300">取消</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className={`text-2xl font-bold ${ftp > 0 ? 'text-blue-400' : 'text-red-400'} cursor-pointer hover:text-blue-300 flex items-center justify-center gap-1`} onClick={() => { setEditFtpValue(ftp.toString()); setIsEditingFtp(true); }} title="點擊修改 FTP 設定">
                            {ftp > 0 ? ftp : '無設定'} <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                        </div>
                        <div className="text-xs mt-1 text-slate-400">設定 FTP (W)</div>
                    </>
                )}
            </div>
            {hasStravaZones && (
                <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/50">
                    <div className="text-slate-400 text-xs mb-1">Strava 數據</div>
                    <div className="flex items-baseline gap-1"><span className="text-2xl font-bold text-green-400">Synced</span></div>
                </div>
            )}
            {(sportType === 'Ride' || sportType === 'VirtualRide') && (
                <>
                    <div className="bg-slate-800/80 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-yellow-400">{load.np}</div><div className="text-xs text-slate-400 mt-1">NP (W)</div>
                    </div>
                    <div className="bg-slate-800/80 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-orange-400">{load.if.toFixed(2)}</div><div className="text-xs text-slate-400 mt-1">強度因子</div>
                    </div>
                    <div className="bg-slate-800/80 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-red-400">{load.tss}</div><div className="text-xs text-slate-400 mt-1">TSS</div>
                    </div>
                    <div className="bg-slate-800/80 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-purple-400">{load.vi.toFixed(2)}</div><div className="text-xs text-slate-400 mt-1">變異指數</div>
                    </div>
                </>
            )}
        </div>
    );
};

// --- Main Exported Component ---

interface SingleActivityAnalysisProps {
    activity: StravaActivity;
    athleteId: number;
    defaultFtp?: number;
    defaultMaxHR?: number;
}

export const SingleActivityAnalysis: React.FC<SingleActivityAnalysisProps> = ({
    activity,
    athleteId,
    defaultFtp = 0,
    defaultMaxHR = 190
}) => {
    const { getActivityStreams, analyzeActivityPower } = usePowerAnalysis();
    const [analysis, setAnalysis] = useState<ActivityPowerAnalysis | null>(null);
    const [loading, setLoading] = useState(false);
    const [localFtp, setLocalFtp] = useState(defaultFtp);

    const loadAnalysis = async (ftpToUse: number) => {
        setLoading(true);
        try {
            const streams = await getActivityStreams(activity.id);
            if (streams) {
                const finalFtp = streams.ftp || ftpToUse;
                const finalMaxHR = streams.max_heartrate || defaultMaxHR;
                const result = analyzeActivityPower(activity, streams, finalFtp, finalMaxHR);
                setAnalysis(result);
                if (streams.ftp) setLocalFtp(streams.ftp);
            }
        } catch (err) {
            console.error('Single activity analysis failed:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAnalysis(defaultFtp);
    }, [activity.id, defaultFtp]);

    const handleUpdateFtp = async (newFtp: number) => {
        // Update local activity/stream FTP cache if possible, or just re-calculate
        await supabase.from('strava_streams').update({ ftp: newFtp }).eq('activity_id', activity.id);
        setLocalFtp(newFtp);
        loadAnalysis(newFtp);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12 bg-slate-900/40 rounded-xl">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mr-3" />
                <span className="text-slate-400">正在加載全量深度分析...</span>
            </div>
        );
    }

    if (!analysis) {
        return (
            <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-dashed border-slate-700">
                <p className="text-slate-500">無法加載此活動的數據流。請確保活動已正確同步。</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 border border-white/5 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Header / Meta */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                        <Activity className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold">{activity.name}</h3>
                        <p className="text-slate-400 text-xs">
                            {new Date(activity.start_date).toLocaleString()} • {activity.sport_type}
                        </p>
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <TrainingLoadCard
                load={analysis.trainingLoad}
                ftp={localFtp}
                sportType={activity.sport_type}
                hasStravaZones={!!analysis.stravaPowerZones || !!analysis.stravaHeartRateZones}
                onUpdateFtp={handleUpdateFtp}
            />

            {/* Zones Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-800/40 rounded-xl p-5 border border-white/5">
                    <div className="flex items-center gap-2 mb-4">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        <h4 className="text-sm font-bold text-slate-200">功率區間分佈</h4>
                    </div>
                    {analysis.stravaPowerZones ? (
                        <StravaZoneChart data={analysis.stravaPowerZones} type="power" />
                    ) : (
                        <PowerZoneChart zones={analysis.powerZones} />
                    )}
                </div>

                <div className="bg-slate-800/40 rounded-xl p-5 border border-white/5">
                    <div className="flex items-center gap-2 mb-4">
                        <Heart className="w-4 h-4 text-red-400" />
                        <h4 className="text-sm font-bold text-slate-200">心率區間分佈</h4>
                    </div>
                    {analysis.stravaHeartRateZones ? (
                        <StravaZoneChart data={analysis.stravaHeartRateZones} type="heartrate" />
                    ) : (
                        <div className="text-xs text-slate-500 italic text-center py-8">未提供心率區間數據</div>
                    )}
                </div>
            </div>

            {/* Charts */}
            <div className="bg-slate-800/40 rounded-xl p-5 border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-sm font-bold text-slate-200">數據趨勢圖</h4>
                </div>
                <ActivityCharts data={analysis} />
            </div>
        </div>
    );
};
