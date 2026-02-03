import React, { useState, useEffect } from 'react';
import { Check, X, Calendar, MapPin, User, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface RaceEvent {
    id: number;
    race_name: string;
    description: string;
    cover_image_url: string;
    created_by_email: string;
    segment_id: number;
    start_date: string;
    end_date: string;
    approval_status: string;
    created_at: string;
    segment?: {
        name: string;
        distance: number;
        average_grade: number;
    };
}

interface RaceAdminPanelProps {
    adminId: number;
}

export function RaceAdminPanel({ adminId }: RaceAdminPanelProps) {
    const [pendingRaces, setPendingRaces] = useState<RaceEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<number | null>(null);

    useEffect(() => {
        fetchPendingRaces();
    }, []);

    const fetchPendingRaces = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('race_events')
                .select(`
                    *,
                    segment:segments(name, distance, average_grade)
                `)
                .eq('approval_status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPendingRaces(data || []);
        } catch (err: any) {
            console.error('載入待審核比賽失敗:', err);
            alert('載入失敗: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (raceId: number) => {
        if (!confirm('確定要通過這場比賽嗎？')) return;

        setProcessing(raceId);
        try {
            const { error } = await supabase
                .from('race_events')
                .update({
                    approval_status: 'approved',
                    approved_by_admin_id: adminId,
                    approved_at: new Date().toISOString()
                })
                .eq('id', raceId);

            if (error) throw error;

            alert('比賽已通過審核！');
            fetchPendingRaces();
        } catch (err: any) {
            console.error('審核失敗:', err);
            alert('審核失敗: ' + err.message);
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async (raceId: number) => {
        const reason = prompt('請輸入拒絕原因：');
        if (!reason) return;

        setProcessing(raceId);
        try {
            const { error } = await supabase
                .from('race_events')
                .update({
                    approval_status: 'rejected',
                    rejection_reason: reason
                })
                .eq('id', raceId);

            if (error) throw error;

            alert('已拒絕此比賽');
            fetchPendingRaces();
        } catch (err: any) {
            console.error('拒絕失敗:', err);
            alert('拒絕失敗: ' + err.message);
        } finally {
            setProcessing(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="text-slate-400">載入中...</div>
            </div>
        );
    }

    if (pendingRaces.length === 0) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                <p className="text-slate-400">目前沒有待審核的比賽</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">
                    待審核比賽 ({pendingRaces.length})
                </h3>
                <button
                    onClick={fetchPendingRaces}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm"
                >
                    重新整理
                </button>
            </div>

            <div className="grid gap-6">
                {pendingRaces.map((race) => (
                    <div key={race.id} className="bg-[#1C1C1E] border border-slate-800 rounded-xl overflow-hidden">
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* 封面圖 */}
                            <div className="md:col-span-1">
                                <div
                                    className="w-full aspect-video bg-cover bg-center"
                                    style={{ backgroundImage: `url(${race.cover_image_url})` }}
                                />
                            </div>

                            {/* 比賽資訊 */}
                            <div className="md:col-span-2 p-6 space-y-4">
                                <div>
                                    <h4 className="text-xl font-bold text-white mb-2">{race.race_name}</h4>
                                    <p className="text-sm text-slate-400">{race.description || '無描述'}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center gap-2 text-slate-300">
                                        <User className="w-4 h-4 text-blue-400" />
                                        <span>建立者: {race.created_by_email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-300">
                                        <Calendar className="w-4 h-4 text-green-400" />
                                        <span>{race.start_date} ~ {race.end_date}</span>
                                    </div>
                                    {race.segment && (
                                        <div className="flex items-center gap-2 text-slate-300 col-span-2">
                                            <MapPin className="w-4 h-4 text-orange-400" />
                                            <span>
                                                {race.segment.name} ({(race.segment.distance / 1000).toFixed(1)}km, {race.segment.average_grade}%)
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* 審核按鈕 */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={() => handleReject(race.id)}
                                        disabled={processing === race.id}
                                        className="flex-1 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors border border-red-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <X className="w-4 h-4" />
                                        拒絕
                                    </button>
                                    <button
                                        onClick={() => handleApprove(race.id)}
                                        disabled={processing === race.id}
                                        className="flex-1 px-4 py-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors border border-green-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <Check className="w-4 h-4" />
                                        通過
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
