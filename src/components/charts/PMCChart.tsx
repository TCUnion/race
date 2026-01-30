
import React, { useMemo } from 'react';
import {
    Activity, TrendingUp, TrendingDown, Minus, AlertCircle, Info
} from 'lucide-react';
import {
    ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, Legend
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
            // 必須確認是由功率計產生 (device_watts) 避免 Strava 估算功率干擾
            if (ftp > 0 && activity.average_watts && activity.device_watts) {
                const np = activity.average_watts * 1.05; // 簡易估算 NP
                const intensity = np / ftp;
                tss = (activity.moving_time * intensity * intensity * 100) / 3600;
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
            });

            iterDate.setDate(iterDate.getDate() + 1);
        }

        // 預設顯示最後 90 天 (或更多，視需求而定)
        const displayDays = 90;
        const filterDate = new Date(today);
        filterDate.setDate(filterDate.getDate() - displayDays);

        return fullData.filter(d => d.timestamp >= filterDate.getTime());
    }, [activities, ftp]);

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

                {/* 狀態摘要卡片 */}
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
                            domain={[-50, 50]} // TSB 通常在這個範圍波動
                            hide={true} // 隱藏軸標籤以保持簡潔
                        />

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
                                                <div className="text-blue-400">TSS: {Math.round(d.tss)}</div>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />

                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

                        {/* TSB - Bar / Area in background */}
                        <Bar
                            yAxisId="tsb"
                            dataKey="tsb"
                            name="狀態 (TSB)"
                            barSize={4}
                            opacity={0.4}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.tsb >= 0 ? '#10b981' : '#f97316'} />
                            ))}
                        </Bar>

                        {/* CTL - Area */}
                        <Area
                            yAxisId="load"
                            type="monotone"
                            dataKey="ctl"
                            name="體能 (CTL)"
                            stroke="#818cf8"
                            fill="url(#colorCtlSeparate)"
                            fillOpacity={0.2}
                            strokeWidth={2}
                            activeDot={{ r: 4 }}
                        />
                        <defs>
                            <linearGradient id="colorCtlSeparate" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.5} />
                                <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                            </linearGradient>
                        </defs>

                        {/* ATL - Line */}
                        <Line
                            yAxisId="load"
                            type="monotone"
                            dataKey="atl"
                            name="疲勞 (ATL)"
                            stroke="#f472b6"
                            strokeWidth={2}
                            strokeDasharray="3 3"
                            dot={false}
                            activeDot={{ r: 4 }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
