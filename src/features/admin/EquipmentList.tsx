import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Bike, Smartphone, ExternalLink } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabaseAdmin } from '../../lib/supabase';

interface EquipmentRow {
    athlete_id: string; // Strava ID or TCU ID if not linked
    name: string;
    device_name: string | null;
    bikes: {
        id: string;
        name: string;
        distance: number;
        primary: boolean;
    }[];
    last_activity_date: string | null;
}

interface DeviceStat {
    name: string;
    count: number;
}

const EquipmentList: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<EquipmentRow[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [deviceStats, setDeviceStats] = useState<DeviceStat[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch TCU Members for names
            const { data: members, error: mError } = await supabaseAdmin
                .from('tcu_members')
                .select('tcu_id, real_name, email, account')
                .order('real_name');

            if (mError) throw mError;

            // 2. Fetch Strava Bindings to link TCU -> Strava
            const { data: bindings, error: bError } = await supabaseAdmin
                .from('strava_bindings')
                .select('strava_id, tcu_member_email, tcu_account');

            if (bError) throw bError;

            // Map bindings
            const stravaIdToNameMap = new Map<string, string>();
            const stravaIds: string[] = [];

            // Helper to find strava ID
            const getStravaId = (member: any) => {
                const binding = bindings?.find(b =>
                    (member.account && b.tcu_account === member.account) ||
                    (member.email && b.tcu_member_email === member.email)
                );
                return binding?.strava_id?.toString();
            };

            members?.forEach(m => {
                const sid = getStravaId(m);
                if (sid) {
                    stravaIdToNameMap.set(sid, m.real_name);
                    stravaIds.push(sid);
                }
            });

            // 3. Fetch Bikes
            const { data: bikesData, error: bikesError } = await supabaseAdmin
                .from('bikes')
                .select('id, athlete_id, name, distance, primary_gear')
                .order('distance', { ascending: false });

            if (bikesError) throw bikesError;

            // 4. Fetch Latest Activities for Device Name
            // We can't easily "group by" in standard Supabase client without writing a View or RPC.
            // So we'll fetch recent activities and deduce the device.
            // Fetching last 1000 activities should cover most active users.
            const { data: activitiesData, error: actError } = await supabaseAdmin
                .from('strava_activities')
                .select('athlete_id, device_name, start_date')
                .order('start_date', { ascending: false })
                .limit(2000); // Increased limit to ensure coverage

            if (actError) throw actError;

            // Process Data
            const rowsMap = new Map<string, EquipmentRow>();

            // Initialize with Members who have Strava ID
            stravaIds.forEach(sid => {
                rowsMap.set(sid, {
                    athlete_id: sid,
                    name: stravaIdToNameMap.get(sid) || 'Unknown',
                    device_name: null,
                    bikes: [],
                    last_activity_date: null
                });
            });

            // Fill Device Name from Activities (Latest wins)
            activitiesData?.forEach(act => {
                if (!act.athlete_id) return; // Defensive check
                const sid = act.athlete_id.toString();
                if (rowsMap.has(sid)) {
                    const row = rowsMap.get(sid)!;
                    // Only update if we haven't found a device yet (since we ordered by date desc, first one is latest)
                    // Or if we specifically want to track the latest date
                    if (!row.last_activity_date) {
                        row.last_activity_date = act.start_date;
                        row.device_name = act.device_name || '未知裝置';
                    }
                } else {
                    // Optional: Include athletes not in TCU member list?
                    // For "Equipment List", maybe we only care about linked members or all strava athletes.
                    // Let's include them if they have a device, using ID as name initially
                    rowsMap.set(sid, {
                        athlete_id: sid,
                        name: `Strava User ${sid}`, // Will try to improve name later if needed
                        device_name: act.device_name || '未知裝置',
                        bikes: [],
                        last_activity_date: act.start_date
                    });
                }
            });

            // If we added unknown athletes, try to fetch their names from 'athletes' table
            const unknownIds = Array.from(rowsMap.values())
                .filter(r => r.name.startsWith('Strava User'))
                .map(r => r.athlete_id);

            if (unknownIds.length > 0) {
                const { data: ethData } = await supabaseAdmin
                    .from('athletes')
                    .select('id, firstname, lastname')
                    .in('id', unknownIds);

                ethData?.forEach(a => {
                    if (!a.id) return; // Defensive check
                    const sid = a.id.toString();
                    if (rowsMap.has(sid)) {
                        const row = rowsMap.get(sid)!;
                        row.name = `${a.firstname || ''} ${a.lastname || ''}`.trim();
                    }
                });
            }

            // Fill Bikes
            bikesData?.forEach(bike => {
                const sid = bike.athlete_id?.toString();
                if (sid && rowsMap.has(sid)) {
                    rowsMap.get(sid)!.bikes.push({
                        id: bike.id,
                        name: bike.name,
                        distance: bike.distance,
                        primary: bike.primary_gear || false
                    });
                }
            });

            const processedData = Array.from(rowsMap.values()).sort((a, b) => {
                return a.name.localeCompare(b.name, 'zh-TW');
            });
            setData(processedData);

            // Calculate Device Stats
            const stats = new Map<string, number>();
            processedData.forEach(row => {
                if (row.device_name && row.device_name !== '未知裝置') {
                    stats.set(row.device_name, (stats.get(row.device_name) || 0) + 1);
                }
            });

            const sortedStats = Array.from(stats.entries())
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count); // Sort by count desc

            setDeviceStats(sortedStats);

        } catch (err: any) {
            console.error('Error fetching equipment:', err);
            alert('讀取失敗: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredData = data.filter(row =>
        row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (row.device_name && row.device_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Smartphone className="w-6 h-6 text-blue-400" />
                    車友設備一覽表
                </h2>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="搜尋姓名或裝置..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        onClick={fetchData}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                        title="重新整理"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Device Statistics Chart */}
            {!loading && deviceStats.length > 0 && (
                <div className="bg-[#161618] border border-slate-800 p-6 rounded-xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Smartphone className="w-5 h-5 text-purple-400" />
                            碼錶設備統計
                        </h3>
                        <span className="text-sm text-slate-400 font-mono">
                            目前統計人數: <span className="text-white font-bold">{deviceStats.reduce((acc, curr) => acc + curr.count, 0)}</span> 人
                        </span>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={deviceStats}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#94a3b8"
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                    minTickGap={10} // 防止標籤過度擁擠
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                                    itemStyle={{ color: '#f1f5f9' }}
                                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                />
                                <Bar dataKey="count" name="使用人數" radius={[4, 4, 0, 0]}>
                                    {deviceStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index < 3 ? '#60a5fa' : '#475569'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            <div className="bg-[#161618] border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#1C1C1E] text-slate-400 text-sm border-b border-slate-800">
                                <th className="py-4 px-6 font-medium">車友 (Strava / 真名)</th>
                                <th className="py-4 px-6 font-medium">使用的車錶 (Device)</th>
                                <th className="py-4 px-6 font-medium">車輛清單 (Bikes)</th>
                                <th className="py-4 px-6 font-medium text-right">最後活動日期</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center text-slate-500">
                                        <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin opacity-50" />
                                        <p>正在讀取設備資料...</p>
                                    </td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center text-slate-500">
                                        沒有找到符合的資料
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((row) => (
                                    <tr key={row.athlete_id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="py-4 px-6">
                                            <a
                                                href={`https://www.strava.com/athletes/${row.athlete_id}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="group inline-flex flex-col"
                                            >
                                                <div className="font-medium text-white group-hover:text-blue-400 transition-colors flex items-center gap-1">
                                                    {row.name}
                                                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                                <div className="text-xs text-slate-500 font-mono mt-0.5">ID: {row.athlete_id}</div>
                                            </a>
                                        </td>
                                        <td className="py-4 px-6">
                                            {row.device_name ? (

                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 text-sm border border-blue-500/20">
                                                    <Smartphone className="w-3.5 h-3.5" />
                                                    {row.device_name}
                                                </span>
                                            ) : (
                                                <span className="text-slate-600 text-sm italic">無資料</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="space-y-1.5">
                                                {row.bikes.length > 0 ? (
                                                    row.bikes.sort((a, b) => b.distance - a.distance).map(bike => (
                                                        <div key={bike.id} className="flex items-center gap-2 text-sm text-slate-300">
                                                            <Bike className={`w-3.5 h-3.5 ${bike.primary ? 'text-yellow-500' : 'text-slate-600'}`} />
                                                            <span className={bike.primary ? 'text-yellow-100/90' : ''}>{bike.name}</span>
                                                            <span className="text-xs text-slate-600">({Math.round(bike.distance / 1000).toLocaleString()} km)</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-slate-600 text-sm italic">無車輛資料</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            {row.last_activity_date ? (
                                                <span className="text-sm text-slate-400 font-mono">
                                                    {new Date(row.last_activity_date).toLocaleDateString('zh-TW')}
                                                </span>
                                            ) : (
                                                <span className="text-slate-700 text-xs">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default EquipmentList;
