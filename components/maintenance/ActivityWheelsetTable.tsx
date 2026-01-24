import React, { useState, useMemo } from 'react';
import { UseMaintenanceReturn } from '../../hooks/useMaintenance';
import { Wheelset, StravaActivity } from '../../types';
import { Calendar, Save, Check, AlertCircle, CheckSquare, Square } from 'lucide-react';

interface ActivityWheelsetTableProps {
    bikeId: string;
    activities: StravaActivity[];
    wheelsets: Wheelset[];
    activityWheelsets: UseMaintenanceReturn['activityWheelsets'];
    setActivityWheelsetForActivity: UseMaintenanceReturn['setActivityWheelsetForActivity'];
    batchSetActivityWheelsets?: (data: { activityId: number, wheelsetId: string }[]) => Promise<any>;
}

export const ActivityWheelsetTable: React.FC<ActivityWheelsetTableProps> = ({
    bikeId,
    activities,
    wheelsets,
    activityWheelsets,
    setActivityWheelsetForActivity,
    batchSetActivityWheelsets
}) => {
    const [batchWheelsetId, setBatchWheelsetId] = useState<string>('');
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [isLocalBatchUpdating, setIsLocalBatchUpdating] = useState(false);
    // 新增：追蹤已勾選的活動 ID
    const [selectedActivityIds, setSelectedActivityIds] = useState<Set<number>>(new Set());

    // 篩選出屬於此單車的活動
    const bikeActivities = activities.filter(a => a.gear_id === bikeId);

    // 取得該單車可用的輪組（專屬輪組 + 通用輪組）
    const availableWheelsets = wheelsets.filter(ws => ws.bike_id === bikeId || !ws.bike_id);

    // 目標輪組物件
    const targetWheelset = useMemo(() =>
        availableWheelsets.find(ws => ws.id === batchWheelsetId),
        [availableWheelsets, batchWheelsetId]
    );

    // 輔助函數：檢查輪組在特定日期是否已啟用
    const isWheelsetValidForDate = (wheelset: Wheelset, dateStr: string) => {
        if (!wheelset.active_date) return true;
        const wheelsetActiveDate = new Date(wheelset.active_date);
        const activityDate = new Date(dateStr);
        wheelsetActiveDate.setHours(0, 0, 0, 0);
        activityDate.setHours(0, 0, 0, 0);
        return activityDate >= wheelsetActiveDate;
    };

    // 計算在選擇的輪組日期範圍內的有效活動
    const validActivitiesForBatch = useMemo(() => {
        if (!targetWheelset) return [];
        return bikeActivities.filter(a => isWheelsetValidForDate(targetWheelset, a.start_date));
    }, [bikeActivities, targetWheelset]);

    // 全選/取消全選處理
    const handleToggleSelectAll = () => {
        if (selectedActivityIds.size === validActivitiesForBatch.length) {
            // 如果已全選，則取消全選
            setSelectedActivityIds(new Set());
        } else {
            // 否則全選有效活動
            setSelectedActivityIds(new Set(validActivitiesForBatch.map(a => a.id)));
        }
    };

    // 單一活動勾選處理
    const handleToggleActivity = (activityId: number) => {
        const newSet = new Set(selectedActivityIds);
        if (newSet.has(activityId)) {
            newSet.delete(activityId);
        } else {
            newSet.add(activityId);
        }
        setSelectedActivityIds(newSet);
    };

    // 當輪組切換時，重置勾選狀態
    const handleBatchWheelsetChange = (wheelsetId: string) => {
        setBatchWheelsetId(wheelsetId);
        setSelectedActivityIds(new Set()); // 重置勾選
    };

    const handleWheelsetChange = async (activityId: number, wheelsetId: string) => {
        try {
            setUpdatingId(activityId);
            await setActivityWheelsetForActivity(activityId, wheelsetId);
        } catch (error) {
            console.error('更新活動輪組失敗:', error);
            alert('更新失敗，請檢查資料庫約束 (Unique Constraint) 是否已建立');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleBatchUpdate = async () => {
        if (!batchWheelsetId) {
            alert('請先選擇要套用的輪組');
            return;
        }

        if (selectedActivityIds.size === 0) {
            alert('請勾選要套用的活動');
            return;
        }

        const selectedCount = selectedActivityIds.size;
        if (!confirm(`確定要將「${targetWheelset?.name}」套用到已勾選的 ${selectedCount} 個活動嗎？`)) {
            return;
        }

        try {
            setIsLocalBatchUpdating(true);

            const activitiesToUpdate = bikeActivities.filter(a => selectedActivityIds.has(a.id));

            if (batchSetActivityWheelsets) {
                const data = activitiesToUpdate.map(a => ({ activityId: a.id, wheelsetId: batchWheelsetId }));
                await batchSetActivityWheelsets(data);
                alert(`批量更新成功！(已更新 ${activitiesToUpdate.length} 個活動)`);
            } else {
                for (const activity of activitiesToUpdate) {
                    await setActivityWheelsetForActivity(activity.id, batchWheelsetId);
                }
                alert('批量更新完成！');
            }

            // 清除勾選
            setSelectedActivityIds(new Set());
        } catch (error) {
            console.error('批量更新失敗:', error);
            alert('批量更新失敗，請確認資料庫約束是否存在');
        } finally {
            setIsLocalBatchUpdating(false);
        }
    };

    if (bikeActivities.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center text-orange-200/40 bg-white/5 rounded-2xl border border-white/10">
                <Calendar className="w-12 h-12 mb-3 opacity-20" />
                <p>此單車尚無活動紀錄</p>
            </div>
        );
    }

    const isAllSelected = selectedActivityIds.size === validActivitiesForBatch.length && validActivitiesForBatch.length > 0;

    return (
        <div className="space-y-4">
            {/* 批量設定控制列 */}
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-900/20">
                        <Save className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h4 className="text-white font-bold text-sm">批量設定輪組</h4>
                        <p className="text-orange-200/40 text-xs">
                            {batchWheelsetId
                                ? `已選擇 ${selectedActivityIds.size} 個活動`
                                : '選擇目標輪組後勾選活動'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                        value={batchWheelsetId}
                        onChange={(e) => handleBatchWheelsetChange(e.target.value)}
                        className="flex-1 sm:w-48 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
                    >
                        <option value="" disabled>-- 選擇目標輪組 --</option>
                        {availableWheelsets.map(ws => (
                            <option key={ws.id} value={ws.id}>
                                {ws.color ? '● ' : ''}{ws.name}
                            </option>
                        ))}
                    </select>
                    {batchWheelsetId && (
                        <div
                            className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                            style={{ backgroundColor: targetWheelset?.color || 'transparent' }}
                        />
                    )}
                    <button
                        onClick={handleBatchUpdate}
                        disabled={isLocalBatchUpdating || !batchWheelsetId || selectedActivityIds.size === 0}
                        className={`
                            px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 whitespace-nowrap
                            ${isLocalBatchUpdating || !batchWheelsetId || selectedActivityIds.size === 0
                                ? 'bg-white/5 text-white/20 cursor-not-allowed'
                                : 'bg-orange-600 text-white hover:bg-orange-500 shadow-lg shadow-orange-900/20 active:scale-95'}
                        `}
                    >
                        {isLocalBatchUpdating ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <Check className="w-4 h-4" />
                        )}
                        套用到已勾選
                    </button>
                </div>
            </div>

            <div className="overflow-hidden bg-white/5 border border-white/10 rounded-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 text-orange-200/80 uppercase font-medium">
                            <tr>
                                <th className="px-4 py-3 whitespace-nowrap">日期</th>
                                <th className="px-4 py-3 whitespace-nowrap">活動名稱</th>
                                <th className="px-4 py-3 whitespace-nowrap text-right">里程 (km)</th>
                                <th className="px-4 py-3 whitespace-nowrap text-right">爬升 (m)</th>
                                {/* 全選勾選框欄位 - 只在選擇了目標輪組時顯示 */}
                                {batchWheelsetId && (
                                    <th className="px-4 py-3 w-10">
                                        <button
                                            onClick={handleToggleSelectAll}
                                            className="text-orange-400 hover:text-orange-300 transition-colors"
                                            title={isAllSelected ? '取消全選' : '全選'}
                                        >
                                            {isAllSelected ? (
                                                <CheckSquare className="w-5 h-5" />
                                            ) : (
                                                <Square className="w-5 h-5" />
                                            )}
                                        </button>
                                    </th>
                                )}
                                <th className="px-4 py-3 whitespace-nowrap">使用輪組</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10 text-orange-50">
                            {bikeActivities.map(activity => {
                                const assignedWheelset = activityWheelsets.find(aw => aw.activity_id === activity.id);
                                const currentWheelsetId = assignedWheelset?.wheelset_id || '';
                                const isSelected = selectedActivityIds.has(activity.id);
                                const isValidForBatch = targetWheelset ? isWheelsetValidForDate(targetWheelset, activity.start_date) : true;

                                return (
                                    <tr
                                        key={activity.id}
                                        className={`hover:bg-white/5 transition-colors ${!isValidForBatch && batchWheelsetId ? 'opacity-40' : ''}`}
                                    >
                                        <td className="px-4 py-3 whitespace-nowrap font-mono text-orange-200/60 text-xs">
                                            {new Date(activity.start_date).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 font-medium">
                                            <a
                                                href={`https://www.strava.com/activities/${activity.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="hover:text-orange-400 hover:underline decoration-orange-400/50 underline-offset-4 transition-all"
                                            >
                                                {activity.name}
                                            </a>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-orange-200/60">
                                            {(activity.distance / 1000).toFixed(1)}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-orange-200/60">
                                            {activity.total_elevation_gain}
                                        </td>
                                        {/* 勾選框 - 只在選擇了目標輪組時顯示，放在使用輪組前面 */}
                                        {batchWheelsetId && (
                                            <td className="px-4 py-3">
                                                {isValidForBatch ? (
                                                    <button
                                                        onClick={() => handleToggleActivity(activity.id)}
                                                        className="text-orange-400 hover:text-orange-300 transition-colors"
                                                    >
                                                        {isSelected ? (
                                                            <CheckSquare className="w-5 h-5" />
                                                        ) : (
                                                            <Square className="w-5 h-5" />
                                                        )}
                                                    </button>
                                                ) : (
                                                    <AlertCircle className="w-4 h-4 text-orange-500/50" title="此活動早於輪組啟用日期" />
                                                )}
                                            </td>
                                        )}
                                        <td className="px-4 py-3">
                                            <div className="relative">
                                                <select
                                                    value={currentWheelsetId}
                                                    onChange={(e) => handleWheelsetChange(activity.id, e.target.value)}
                                                    disabled={updatingId === activity.id}
                                                    className={`
                                                        w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-xs appearance-none cursor-pointer focus:outline-none focus:border-orange-500/50 transition-all
                                                        ${updatingId === activity.id ? 'opacity-50' : 'hover:bg-black/30'}
                                                        ${!currentWheelsetId ? 'text-orange-200/40 bg-orange-500/10 border-orange-500/20' : ''}
                                                    `}
                                                >
                                                    <option value="" disabled>-- 選擇輪組 --</option>
                                                    {availableWheelsets
                                                        .filter(ws => isWheelsetValidForDate(ws, activity.start_date))
                                                        .map(ws => (
                                                            <option key={ws.id} value={ws.id}>
                                                                {ws.color ? '● ' : ''}{ws.name}
                                                            </option>
                                                        ))}
                                                </select>
                                                {currentWheelsetId && (
                                                    <div
                                                        className="absolute -left-2 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-full"
                                                        style={{ backgroundColor: availableWheelsets.find(ws => ws.id === currentWheelsetId)?.color || 'transparent' }}
                                                    />
                                                )}
                                                {updatingId === activity.id && (
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                        <div className="w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
