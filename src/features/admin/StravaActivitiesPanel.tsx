import React, { useState, useEffect } from 'react';
import { Search, Activity, RefreshCw } from 'lucide-react';
import { supabaseAdmin as supabase } from '../../lib/supabase';

interface StravaActivitiesPanelProps {
    session: any;
}

interface ActivityData {
    id: string;
    athlete_id: string;
    name: string;
    start_date: string;
    start_date_local: string;
    distance: number;
    moving_time: number;
    has_stream?: boolean;
    owner_name?: string;
    is_bound?: boolean;
    segment_efforts_dump?: any;
}

const StravaActivitiesPanel: React.FC<StravaActivitiesPanelProps> = ({ session }) => {
    const [activities, setActivities] = useState<ActivityData[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [searchTerm, setSearchTerm] = useState('');
    const [bindFilter, setBindFilter] = useState<'all' | 'bound' | 'unbound'>('all');
    const [streamFilter, setStreamFilter] = useState<'all' | 'yes' | 'no'>('all');
    const [segmentFilter, setSegmentFilter] = useState<'all' | 'yes' | 'no'>('all');
    const [sortField, setSortField] = useState<'start_date' | 'distance' | 'moving_time'>('start_date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (session) {
            fetchActivities();
        }
    }, [session, currentPage, pageSize, bindFilter, streamFilter, segmentFilter, sortField, sortOrder]);

    const fetchActivities = async () => {
        setLoading(true);
        try {
            // 基本查詢：如果需要篩選「有 stream」，我們使用 inner join (確保有關聯)
            const selectQuery = streamFilter === 'yes'
                ? '*, strava_streams!inner(activity_id)'
                : '*';

            let query = supabase.from('strava_activities').select(selectQuery, { count: 'exact' });

            let athleteIdsFromNameMatch: string[] | null = null;
            const term = searchTerm.trim();
            const isNumber = !term ? false : !isNaN(Number(term));

            // 1. Text Search (Athlete Name)
            if (term && !isNumber) {
                const { data: athletesMatch } = await supabase
                    .from('athletes')
                    .select('id')
                    .or(`firstname.ilike.%${term}%,lastname.ilike.%${term}%`);

                athleteIdsFromNameMatch = athletesMatch?.map(a => a.id.toString()) || [];

                if (athleteIdsFromNameMatch.length === 0) {
                    setActivities([]);
                    setTotalCount(0);
                    setLoading(false);
                    return;
                }
            }

            // 2. Binding Filter Pre-fetching
            let boundIds: string[] = [];
            if (bindFilter !== 'all') {
                const { data: bindingsData } = await supabase.from('strava_member_bindings').select('strava_id');
                boundIds = bindingsData?.map(b => b.strava_id?.toString()).filter(Boolean) || [];
            }

            // 3. Apply Query Filters
            if (athleteIdsFromNameMatch !== null) {
                // Name search active
                let idsForFilter = athleteIdsFromNameMatch;
                if (bindFilter === 'bound') {
                    idsForFilter = idsForFilter.filter(id => boundIds.includes(id));
                } else if (bindFilter === 'unbound') {
                    idsForFilter = idsForFilter.filter(id => !boundIds.includes(id));
                }

                if (idsForFilter.length === 0) {
                    setActivities([]); setTotalCount(0); setLoading(false); return;
                }
                query = query.in('athlete_id', idsForFilter);
            } else if (term && isNumber) {
                // Number search active (ID or Athlete ID)
                if (bindFilter === 'bound') {
                    if (boundIds.length === 0) {
                        setActivities([]); setTotalCount(0); setLoading(false); return;
                    }
                    // limit to bound IDs AND match term
                    query = query.in('athlete_id', boundIds).or(`id.eq.${term},athlete_id.eq.${term}`);
                } else if (bindFilter === 'unbound') {
                    if (boundIds.length > 0) {
                        query = query.not('athlete_id', 'in', `(${boundIds.join(',')})`).or(`id.eq.${term},athlete_id.eq.${term}`);
                    } else {
                        query = query.or(`id.eq.${term},athlete_id.eq.${term}`);
                    }
                } else {
                    query = query.or(`id.eq.${term},athlete_id.eq.${term}`);
                }
            } else {
                // No search term
                if (bindFilter === 'bound') {
                    if (boundIds.length === 0) {
                        setActivities([]); setTotalCount(0); setLoading(false); return;
                    }
                    query = query.in('athlete_id', boundIds);
                } else if (bindFilter === 'unbound' && boundIds.length > 0) {
                    query = query.not('athlete_id', 'in', `(${boundIds.join(',')})`);
                }
            }

            // Segment Filter (Server-side)
            if (segmentFilter === 'yes') {
                query = query.not('segment_efforts_dump', 'is', null).neq('segment_efforts_dump', '[]');
            } else if (segmentFilter === 'no') {
                query = query.or('segment_efforts_dump.is.null,segment_efforts_dump.eq.[]');
            }

            // Pagination and Sorting Options
            const from = (currentPage - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.order(sortField, { ascending: sortOrder === 'asc' }).range(from, to);

            const { data, count, error } = await query;
            if (error) {
                // Supabase API errors usually contain hints
                console.error("Query Error: ", error);
                throw error;
            }

            const acts = data as any[];

            setTotalCount(count || 0);

            if (!acts || acts.length === 0) {
                setActivities([]);
                setLoading(false);
                return;
            }

            // Hydrate athlete names, streams, bindings
            const uniqueAthleteIds = [...new Set(acts.map(a => a.athlete_id?.toString()).filter(Boolean))] as string[];
            const activityIds = acts.map(a => a.id?.toString()).filter(Boolean) as string[];

            // 1. Fetch athletes (for names)
            const { data: athletesData } = await supabase
                .from('athletes')
                .select('id, firstname, lastname')
                .in('id', uniqueAthleteIds);

            const namesMap = new Map();
            if (athletesData) {
                athletesData.forEach(a => {
                    const name = [a.firstname, a.lastname].filter(Boolean).join(' ').trim();
                    namesMap.set(a.id.toString(), name || '未知');
                });
            }

            // 2. Fetch bindings (for bound checking if we didn't already have it fully resolved, though we logically do, it's safer to re-verify)
            const { data: bindingsConfirm } = await supabase
                .from('strava_member_bindings')
                .select('strava_id')
                .in('strava_id', uniqueAthleteIds);
            const boundConfirmSet = new Set(bindingsConfirm?.map(b => b.strava_id?.toString()));

            // 3. Fetch streams existence
            let streamsSet = new Set<string>();
            if (streamFilter === 'yes') {
                // 已經過濾為有 stream 的活動，可以直接標記
                activityIds.forEach(id => streamsSet.add(id));
            } else {
                const { data: streamsData } = await supabase
                    .from('strava_streams')
                    .select('activity_id')
                    .in('activity_id', activityIds);
                streamsSet = new Set(streamsData?.map(s => s.activity_id?.toString()));
            }

            let merged = acts.map(a => {
                const aId = a.athlete_id?.toString();
                return {
                    ...a,
                    owner_name: aId ? namesMap.get(aId) || '未知' : '未知',
                    is_bound: aId ? boundConfirmSet.has(aId) : false,
                    has_stream: streamsSet.has(a.id?.toString())
                };
            });

            // 針對 'no' stream 進行本地端過濾 (如果需要的話，因為 Supabase JS 無法直接 !left/not_exists)
            if (streamFilter === 'no') {
                merged = merged.filter(a => !a.has_stream);
            }

            setActivities(merged);

        } catch (err) {
            console.error('Failed to fetch activities:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1);
        fetchActivities();
    };

    const handleSort = (field: 'start_date' | 'distance' | 'moving_time') => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc'); // 換欄位時預設降幕
        }
        setCurrentPage(1);
    };

    const SortIcon = ({ field }: { field: 'start_date' | 'distance' | 'moving_time' }) => {
        if (sortField !== field) return <span className="text-slate-600 ml-1">↕</span>;
        return <span className="text-tcu-blue ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
    };

    const totalPages = Math.ceil(totalCount / pageSize) || 1;

    // 分頁計算避免超過界限
    const getPaginationLinks = () => {
        const pages = [];
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);

        if (currentPage <= 2) {
            endPage = Math.min(totalPages, 5);
        }
        if (currentPage >= totalPages - 1) {
            startPage = Math.max(1, totalPages - 4);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        return pages;
    };

    return (
        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-sm md:col-span-2">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5 text-tcu-blue" />
                    <h3 className="text-xl font-black">後台活動一覽 (Activity Overview)</h3>
                    <span className="px-3 py-1 text-xs font-bold text-tcu-blue bg-tcu-blue/10 rounded-full">
                        {totalCount} 筆
                    </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <form onSubmit={handleSearchSubmit} className="relative flex-1 md:flex-initial">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="搜尋姓名 或 ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onBlur={() => {
                                // optional auto search on blur, but we have form submit
                            }}
                            className="pl-9 pr-4 py-2 bg-slate-800 border-none rounded-xl text-sm w-full focus:ring-2 focus:ring-tcu-blue/20 transition-all text-white placeholder-slate-500"
                        />
                        <button type="submit" className="hidden">搜尋</button>
                    </form>

                    <select
                        value={bindFilter}
                        onChange={(e) => {
                            setBindFilter(e.target.value as 'all' | 'bound' | 'unbound');
                            setCurrentPage(1);
                        }}
                        className="px-3 py-2 bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-xl focus:ring-2 focus:ring-tcu-blue/20 transition-all font-bold"
                    >
                        <option value="all">全部綁定狀態</option>
                        <option value="bound">已綁定 (Bound)</option>
                        <option value="unbound">未綁定 (Unbound)</option>
                    </select>

                    <select
                        value={streamFilter}
                        onChange={(e) => {
                            setStreamFilter(e.target.value as 'all' | 'yes' | 'no');
                            setCurrentPage(1);
                        }}
                        className="px-3 py-2 bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-xl focus:ring-2 focus:ring-tcu-blue/20 transition-all font-bold"
                    >
                        <option value="all">全部活動 (Stream)</option>
                        <option value="yes">有 Stream</option>
                        <option value="no">無 Stream (本地處理)</option>
                    </select>

                    <select
                        value={segmentFilter}
                        onChange={(e) => {
                            setSegmentFilter(e.target.value as 'all' | 'yes' | 'no');
                            setCurrentPage(1);
                        }}
                        className="px-3 py-2 bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-xl focus:ring-2 focus:ring-tcu-blue/20 transition-all font-bold cursor-pointer"
                    >
                        <option value="all">全部活動 (Segment)</option>
                        <option value="yes">有 Segment</option>
                        <option value="no">無 Segment</option>
                    </select>

                    <select
                        value={pageSize}
                        onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="px-3 py-2 bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-tcu-blue/20 transition-all font-mono text-white"
                    >
                        <option value={20}>20/page</option>
                        <option value={50}>50/page</option>
                        <option value={100}>100/page</option>
                    </select>

                    <button
                        onClick={() => { setCurrentPage(1); fetchActivities(); }}
                        className="text-slate-400 hover:text-tcu-blue transition-colors p-2"
                        title="重新整理列表"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left relative">
                    <thead className="bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <tr>
                            <th className="px-4 py-3 rounded-l-lg">Athlete ID</th>
                            <th className="px-4 py-3">運動員名稱</th>
                            <th className="px-4 py-3">活動 ID</th>
                            <th className="px-4 py-3">活動名稱</th>
                            <th className="px-4 py-3 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('start_date')}>
                                活動時間 <SortIcon field="start_date" />
                            </th>
                            <th className="px-4 py-3 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('distance')}>
                                活動距離 <SortIcon field="distance" />
                            </th>
                            <th className="px-4 py-3 text-center">是否有 Stream</th>
                            <th className="px-4 py-3 text-center">是否有 Segment</th>
                            <th className="px-4 py-3 rounded-r-lg text-center">綁定狀態</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {loading && activities.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">戴入中...</td>
                            </tr>
                        ) : activities.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">找不到任何活動資料</td>
                            </tr>
                        ) : (
                            activities.map((act) => (
                                <tr key={act.id} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-4 py-3 font-mono text-xs">
                                        <a
                                            href={`https://www.strava.com/athletes/${act.athlete_id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:text-tcu-blue hover:underline transition-colors font-bold text-slate-300"
                                        >
                                            {act.athlete_id}
                                        </a>
                                    </td>
                                    <td className="px-4 py-3 font-bold text-white">
                                        {act.owner_name}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs">
                                        <a
                                            href={`https://www.strava.com/activities/${act.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:text-tcu-blue hover:underline transition-colors text-slate-400"
                                        >
                                            {act.id}
                                        </a>
                                    </td>
                                    <td className="px-4 py-3 text-slate-300">
                                        {act.name}
                                    </td>
                                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                                        {act.start_date_local ? new Date(act.start_date_local).toLocaleString('zh-TW', {
                                            year: 'numeric', month: '2-digit', day: '2-digit',
                                            hour: '2-digit', minute: '2-digit'
                                        }) : act.start_date ? new Date(act.start_date).toLocaleString('zh-TW') : 'N/A'}
                                    </td>
                                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                                        {act.distance ? `${(act.distance / 1000).toFixed(2)} km` : '0 km'}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {act.has_stream ? (
                                            <span className="inline-block px-2 py-1 bg-emerald-900/40 text-emerald-400 text-[10px] font-black rounded-lg">
                                                YES
                                            </span>
                                        ) : (
                                            <span className="inline-block px-2 py-1 bg-slate-800 text-slate-500 text-[10px] font-bold rounded-lg">
                                                NO
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {act.segment_efforts_dump && act.segment_efforts_dump.length > 0 ? (
                                            <span className="inline-block px-2 py-1 bg-yellow-900/40 text-yellow-400 text-[10px] font-black rounded-lg">
                                                YES
                                            </span>
                                        ) : (
                                            <span className="inline-block px-2 py-1 bg-slate-800 text-slate-500 text-[10px] font-bold rounded-lg">
                                                NO
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {act.is_bound ? (
                                            <span className="inline-block px-2 py-1 bg-blue-900/40 text-blue-400 text-[10px] font-black rounded-lg">
                                                已綁定
                                            </span>
                                        ) : (
                                            <span className="inline-block px-2 py-1 bg-slate-800 text-slate-500 text-[10px] font-bold rounded-lg border border-slate-700">
                                                未綁定
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-slate-500 font-mono">
                        第 {currentPage} 頁 / 共 {totalPages} 頁
                    </div>
                    <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl">
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1 || loading}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg transition-colors disabled:opacity-30 hover:bg-slate-700 text-slate-300"
                        >
                            上一頁
                        </button>

                        {getPaginationLinks().map(p => (
                            <button
                                key={p}
                                onClick={() => setCurrentPage(p)}
                                disabled={loading}
                                className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded-lg transition-colors ${currentPage === p
                                    ? 'bg-tcu-blue text-white shadow-md'
                                    : 'hover:bg-slate-700 text-slate-400'
                                    }`}
                            >
                                {p}
                            </button>
                        ))}

                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages || loading}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg transition-colors disabled:opacity-30 hover:bg-slate-700 text-slate-300"
                        >
                            下一頁
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StravaActivitiesPanel;
