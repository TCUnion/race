import React, { useState } from 'react';
import { Search, Trash2, AlertTriangle, CheckCircle2, RefreshCw, ExternalLink } from 'lucide-react';
import { apiClient } from '../../../lib/apiClient';

interface ActivityStatus {
    activity_id: string;
    db_exists: boolean;
    db_data?: {
        id: string;
        athlete_id: number;
        name: string;
        start_date: string;
    };
    strava_exists: boolean;
    strava_error?: string;
    strava_name?: string;
}

export function ActivityRepair() {
    const [activityId, setActivityId] = useState('');
    const [status, setStatus] = useState<ActivityStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [deleting, setDeleting] = useState(false);

    const handleCheck = async () => {
        if (!activityId.trim()) return;
        setLoading(true);
        setError('');
        setStatus(null);

        try {
            const res = await apiClient.get(`/api/activities/${activityId.trim()}/check`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || '檢查失敗');
            setStatus(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!status || !status.db_exists) return;
        if (!window.confirm(`確定要從資料庫刪除活動 ${activityId} 嗎？此動作不可逆！`)) return;

        setDeleting(true);
        try {
            const res = await apiClient.delete(`/api/activities/${activityId.trim()}`);
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || '刪除失敗');
            }
            alert('刪除成功！');
            setStatus(null);
            setActivityId('');
        } catch (err: any) {
            alert('刪除失敗: ' + err.message);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/5 p-6 mb-8">
            <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">活動手動修復 (Activity Repair)</h3>
                    <p className="text-sm text-slate-400">當 Strava 活動已被刪除，但系統仍不斷嘗試同步導致報錯時，可從此處檢查並強制刪除資料庫紀錄。</p>
                </div>
            </div>

            <div className="flex gap-4 mb-6">
                <input
                    type="text"
                    value={activityId}
                    onChange={(e) => setActivityId(e.target.value)}
                    placeholder="輸入 Strava 活動 ID (例如: 17256724698)"
                    className="flex-1 bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                />
                <button
                    onClick={handleCheck}
                    disabled={loading || !activityId.trim()}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 min-w-[120px]"
                >
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                    檢查狀態
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 mb-6 flex gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            {status && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Database Status */}
                        <div className={`p-5 rounded-xl border ${status.db_exists ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-800/50 border-slate-700'}`}>
                            <div className="flex items-center gap-2 mb-3">
                                <h4 className="font-bold text-white">本地資料庫狀態</h4>
                                {status.db_exists ? (
                                    <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400 font-medium">存在</span>
                                ) : (
                                    <span className="px-2 py-0.5 rounded text-xs bg-slate-700 text-slate-400 font-medium">查無資料</span>
                                )}
                            </div>
                            {status.db_exists && status.db_data && (
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">活動名稱:</span>
                                        <span className="text-slate-200 truncate ml-2">{status.db_data.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">開始時間:</span>
                                        <span className="text-slate-200">{new Date(status.db_data.start_date).toLocaleString('zh-TW')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">車友 ID:</span>
                                        <span className="text-slate-200">{status.db_data.athlete_id}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Strava Status */}
                        <div className={`p-5 rounded-xl border ${status.strava_exists ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                            <div className="flex items-center gap-2 mb-3">
                                <h4 className="font-bold text-white">Strava 遠端狀態</h4>
                                {status.strava_exists ? (
                                    <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400 font-medium">存在</span>
                                ) : (
                                    <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400 font-medium">異常</span>
                                )}
                            </div>

                            {status.strava_exists ? (
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400">遠端活動名稱:</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-200 truncate ml-2">{status.strava_name}</span>
                                            <a
                                                href={`https://www.strava.com/activities/${status.activity_id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-tcu-blue hover:text-blue-400 transition-colors"
                                                title="前往 Strava 查看活動"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-4 text-emerald-400 items-center text-xs">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>Strava 紀錄正常，無須處理。</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2 text-sm">
                                    <div className="text-red-400/80 mb-2">錯誤訊息: {status.strava_error}</div>
                                    {status.db_exists && (
                                        <div className="flex gap-2 mt-4 text-amber-400 items-start text-xs bg-amber-500/10 p-2 rounded border border-amber-500/20">
                                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                            <span>Strava 遠端已找不到此活動，但本地仍有紀錄，可能導致同步流程報錯 404，建議刪除。</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {status.db_exists && (
                        <div className="flex justify-end mt-4 pt-4 border-t border-white/5">
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-bold transition-colors flex items-center gap-2 shadow-lg shadow-red-500/20"
                            >
                                {deleting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                                強制刪除本地活動紀錄
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
