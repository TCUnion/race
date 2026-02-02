
import React, { useMemo, useState } from 'react';
import {
    Activity, TrendingUp, TrendingDown, Minus, AlertCircle, Info
} from 'lucide-react';
import {
    ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';
import { StravaActivity } from '../../types';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface PMCChartProps {
    activities: StravaActivity[];
    ftp: number;
}

// 體能管理圖表 (Performance Management Chart)
export const PMCChart: React.FC<PMCChartProps> = ({ activities, ftp }) => {
    const [showTSS, setShowTSS] = useState(true);
    const [showAll, setShowAll] = useState(true); // 新增全開關

    const data = useMemo(() => {
        if (!activities || activities.length === 0) return [];

        // 1. 準備基礎數據：將所有活動轉換為每日 TSS Map
        const activityMap = new Map<string, number>();

        // 確保活動按日期排序
        const sortedActivities = [...activities].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

        const startDate = new Date(sortedActivities[0].start_date);
        const today = new Date();
        const endDate = new Date(today);

        // 填充每日 TSS
        sortedActivities.forEach(activity => {
            const dateStr = activity.start_date.split('T')[0];

            let tss = 0;
            // 優先使用身心負荷 (Suffer Score)
            const sufferScore = activity.suffer_score ? Number(activity.suffer_score) : 0;
            if (sufferScore > 0) {
                tss = sufferScore;
            } else if (ftp > 0 && (activity.average_watts || (activity as any).weighted_average_watts)) {
                // 次之使用功率計算
                const watts = Number((activity as any).weighted_average_watts || (activity.average_watts ? activity.average_watts * 1.05 : 0));
                if (watts > 0) {
                    const intensity = watts / ftp;
                    tss = (activity.moving_time * watts * intensity) / (ftp * 3600) * 100;
                }
            }

            const currentTss = activityMap.get(dateStr) || 0;
            activityMap.set(dateStr, currentTss + tss);
        });

        // 2. 計算 PMC (CTL, ATL, TSB)
        // CTL time constant = 42 days
        // ATL time constant = 7 days
        const kCTL = 42;
        const kATL = 7;

        const fullData = [];
        let currentCTL = 0;
        let currentATL = 0;

        const iterDate = new Date(startDate);
        iterDate.setHours(0, 0, 0, 0);

        while (iterDate <= endDate) {
            const dateStr = iterDate.toISOString().split('T')[0];
            const displayDate = format(iterDate, 'MM/dd');
            const tss = activityMap.get(dateStr) || 0;

            // EWMA Calculations
            if (fullData.length === 0) {
                currentCTL = tss / kCTL;
                currentATL = tss / kATL;
            } else {
                currentCTL = currentCTL + (tss - currentCTL) / kCTL;
                currentATL = currentATL + (tss - currentATL) / kATL;
            }

            fullData.push({
                dateStr: displayDate,
                fullDate: dateStr,
                timestamp: iterDate.getTime(),
                tss,
                ctl: Math.round(currentCTL),
                atl: Math.round(currentATL),
                tsb: Math.round(currentCTL - currentATL),
                dayOfWeek: iterDate.getDay(), // 0=Sunday, 6=Saturday
            });

            iterDate.setDate(iterDate.getDate() + 1);
        }

        // 預設顯示最後 90 天 (或更多，視需求而定)
        const displayDays = 90;
        const filterDate = new Date(today);
        filterDate.setDate(filterDate.getDate() - displayDays);

        return fullData.filter(d => d.timestamp >= filterDate.getTime());
    }, [activities, ftp]);

    // 計算 TSS 和 TSB 各自的對稱 Y 軸 domain，讓 0 都在中間
    // 注意：此 Hook 必須在任何條件返回之前呼叫
    const { tssDomain, tsbDomain } = useMemo(() => {
        if (!data || data.length === 0) return { tssDomain: [-100, 100] as [number, number], tsbDomain: [-50, 50] as [number, number] };
        // TSS 只有正值，用對稱範圍讓 0 在中間
        const maxTss = Math.max(...data.map(d => d.tss || 0), 50);
        const tssDomain: [number, number] = [-maxTss, maxTss];
        // TSB 有正負值，用對稱範圍讓 0 在中間
        const maxTsbAbs = Math.max(...data.map(d => Math.abs(d.tsb || 0)), 30);
        const tsbDomain: [number, number] = [-maxTsbAbs, maxTsbAbs];
        return { tssDomain, tsbDomain };
    }, [data]);

    if (data.length === 0) return null;

    // 取得最新狀態
    const latest = data[data.length - 1] || { ctl: 0, atl: 0, tsb: 0 };

    return (
        <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                    <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        進階體能追蹤 (PMC)
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                        追蹤您的長期體能 (Fitness) 與短期疲勞 (Fatigue) 趨勢
                    </p>
                </div>

                {/* 狀態摘要卡片 & 控制項 */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowTSS(!showTSS)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${showTSS
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'
                            : 'bg-slate-800/50 text-slate-500 border-slate-700 hover:text-slate-400'
                            }`}
                    >
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        訓練量 (TSS)
                    </button>

                    <button
                        onClick={() => setShowAll(!showAll)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${showAll
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20'
                            : 'bg-slate-800/50 text-slate-500 border-slate-700 hover:text-slate-400'
                            }`}
                    >
                        <div className={`w-1.5 h-1.5 rounded-full ${showAll ? 'bg-indigo-500' : 'bg-slate-500'}`} />
                        {showAll ? '隱藏 PMC' : '顯示 PMC'}
                    </button>



                    <div className="flex gap-4">
                        <div className="bg-slate-900/50 rounded-lg p-2 px-3 border border-slate-700/50">
                            <div className="text-[10px] text-slate-400">體能 (CTL)</div>
                            <div className="text-lg font-bold text-indigo-400">{latest.ctl}</div>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-2 px-3 border border-slate-700/50">
                            <div className="text-[10px] text-slate-400">疲勞 (ATL)</div>
                            <div className="text-lg font-bold text-pink-400">{latest.atl}</div>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-2 px-3 border border-slate-700/50">
                            <div className="text-[10px] text-slate-400">狀態 (TSB)</div>
                            <div className={`text-lg font-bold ${latest.tsb >= 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
                                {latest.tsb > 0 ? '+' : ''}{latest.tsb}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                        <XAxis
                            dataKey="dateStr"
                            stroke="#64748b"
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            interval="preserveStartEnd"
                            minTickGap={30}
                        />
                        <XAxis
                            xAxisId="tsb_axis"
                            dataKey="dateStr"
                            hide
                        />
                        <YAxis
                            yAxisId="load"
                            stroke="#64748b"
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            domain={[0, 'auto']}
                        />
                        <YAxis
                            yAxisId="tsb"
                            orientation="right"
                            stroke="#94a3b8"
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            domain={tsbDomain} // TSB 專用對稱軸，0 在中間
                            hide={true}
                        />
                        <YAxis
                            yAxisId="tss"
                            orientation="right"
                            stroke="#10b981"
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            domain={tssDomain} // TSS 專用對稱軸，0 在中間
                            hide={true}
                        />
                        {/* TSS 和 TSB 各自用對稱軸，0 點都在圖表正中間 */}
                        <Tooltip
                            cursor={{ fill: '#334155', opacity: 0.2 }}
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    return (
                                        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs z-50">
                                            <p className="text-slate-400 mb-2 font-medium border-b border-slate-700 pb-1">{d.fullDate}</p>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                <div className="text-indigo-400 font-medium">體能 (CTL): {d.ctl}</div>
                                                <div className="text-pink-400 font-medium">疲勞 (ATL): {d.atl}</div>
                                                <div className={`${d.tsb >= 0 ? 'text-emerald-400' : 'text-orange-400'} font-medium`}>
                                                    狀態 (TSB): {d.tsb}
                                                </div>
                                                <div className="text-green-500 font-medium">TSS: {Math.round(d.tss)}</div>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />

                        {/* 隱藏 Recharts 內建 Legend，改用右上角自定義顯示 */}

                        {/* TSB - Bar (狀態) - Legend 顯示橘色 */}
                        <Bar
                            yAxisId="tsb"
                            xAxisId="tsb_axis"
                            dataKey="tsb"
                            name="狀態 (TSB)"
                            fill="#f97316" // 橘色，用於 Legend 顯示
                            barSize={6}
                            opacity={0.9}
                            hide={!showAll}
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={`tsb-${index}`}
                                    fill={entry.tsb >= 0 ? '#10b981' : '#f97316'}
                                />
                            ))}
                        </Bar>

                        {/* ATL - Line */}
                        <Line
                            yAxisId="load"
                            type="monotone"
                            dataKey="atl"
                            name="疲勞 (ATL)"
                            stroke="#f472b6"
                            strokeWidth={3}
                            strokeDasharray="4 4"
                            dot={false}
                            activeDot={{ r: 5 }}
                            hide={!showAll}
                        />

                        {/* CTL - Area */}
                        <Area
                            yAxisId="load"
                            type="monotone"
                            dataKey="ctl"
                            name="體能 (CTL)"
                            stroke="#818cf8"
                            fill="url(#colorCtlSeparate)"
                            fillOpacity={0.2}
                            strokeWidth={3}
                            activeDot={{ r: 5 }}
                            hide={!showAll}
                        />
                        <defs>
                            <linearGradient id="colorCtlSeparate" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.5} />
                                <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                            </linearGradient>
                        </defs>

                        {/* TSB - 0 軸參考線 */}
                        <ReferenceLine y={0} yAxisId="tsb" stroke="#475569" strokeDasharray="3 3" />

                        {/* TSS - Bar (紅色) */}
                        <Bar
                            yAxisId="tss"
                            dataKey="tss"
                            name="訓練量 (TSS)"
                            fill="#ef4444"
                            radius={[2, 2, 0, 0]}
                            maxBarSize={8}
                            opacity={0.7}
                            hide={!showTSS}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
