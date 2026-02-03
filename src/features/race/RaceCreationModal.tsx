import React, { useState, useEffect } from 'react';
import { X, Upload, Calendar, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Segment {
    id: number;
    name: string;
    distance: number;
    average_grade: number;
}

interface DefaultImage {
    id: number;
    image_name: string;
    image_url: string;
    theme: string;
}

interface RaceCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    managerId: number;
    managerEmail: string;
}

export function RaceCreationModal({ isOpen, onClose, onSuccess, managerId, managerEmail }: RaceCreationModalProps) {
    const [loading, setLoading] = useState(false);
    const [segments, setSegments] = useState<Segment[]>([]);
    const [defaultImages, setDefaultImages] = useState<DefaultImage[]>([]);

    const [formData, setFormData] = useState({
        raceName: '',
        description: '',
        segmentId: '',
        startDate: '',
        endDate: '',
        coverImageUrl: ''
    });

    useEffect(() => {
        if (isOpen) {
            fetchSegments();
            fetchDefaultImages();
        }
    }, [isOpen]);

    const fetchSegments = async () => {
        const { data } = await supabase
            .from('segments')
            .select('id, name, distance, average_grade')
            .order('name');
        if (data) setSegments(data);
    };

    const fetchDefaultImages = async () => {
        const { data } = await supabase
            .from('race_default_images')
            .select('*')
            .order('id');
        if (data) setDefaultImages(data);
    };

    const validateForm = () => {
        if (!formData.raceName.trim()) {
            alert('請輸入比賽名稱');
            return false;
        }
        if (!formData.segmentId) {
            alert('請選擇賽事路段');
            return false;
        }
        if (!formData.startDate || !formData.endDate) {
            alert('請選擇比賽日期範圍');
            return false;
        }
        if (new Date(formData.startDate) > new Date(formData.endDate)) {
            alert('開始日期不能晚於結束日期');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);
        try {
            // 檢查數量限制
            const { count } = await supabase
                .from('race_events')
                .select('*', { count: 'exact', head: true })
                .eq('created_by_manager_id', managerId)
                .in('approval_status', ['pending', 'approved']);

            if (count && count >= 1) {
                alert('您目前已有 1 場進行中或待審核的比賽，無法建立新比賽');
                return;
            }

            // 建立比賽
            const { error } = await supabase
                .from('race_events')
                .insert({
                    created_by_manager_id: managerId,
                    created_by_email: managerEmail,
                    race_name: formData.raceName,
                    description: formData.description,
                    cover_image_url: formData.coverImageUrl || defaultImages[0]?.image_url,
                    segment_id: parseInt(formData.segmentId),
                    start_date: formData.startDate,
                    end_date: formData.endDate,
                    approval_status: 'pending'
                });

            if (error) throw error;

            alert('比賽建立成功！等待管理員審核');
            onSuccess();
            onClose();

            // 重置表單
            setFormData({
                raceName: '',
                description: '',
                segmentId: '',
                startDate: '',
                endDate: '',
                coverImageUrl: ''
            });
        } catch (err: any) {
            console.error('建立比賽失敗:', err);
            alert('建立失敗: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1C1C1E] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-[#1C1C1E] border-b border-slate-800 p-6 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white">建立比賽</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* 比賽名稱 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            比賽名稱 <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.raceName}
                            onChange={(e) => setFormData({ ...formData, raceName: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="例如：2026 春季爬坡挑戰賽"
                        />
                    </div>

                    {/* 比賽描述 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            比賽描述
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="簡述比賽規則、獎勵等資訊..."
                        />
                    </div>

                    {/* 選擇路段 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            <MapPin className="w-4 h-4 inline mr-1" />
                            賽事路段 <span className="text-red-400">*</span>
                        </label>
                        <select
                            value={formData.segmentId}
                            onChange={(e) => setFormData({ ...formData, segmentId: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">請選擇路段</option>
                            {segments.map((seg) => (
                                <option key={seg.id} value={seg.id}>
                                    {seg.name} ({(seg.distance / 1000).toFixed(1)}km, {seg.average_grade}%)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 日期範圍 */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                <Calendar className="w-4 h-4 inline mr-1" />
                                開始日期 <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                <Calendar className="w-4 h-4 inline mr-1" />
                                結束日期 <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* 封面圖選擇 */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            <Upload className="w-4 h-4 inline mr-1" />
                            封面圖片
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {defaultImages.map((img) => (
                                <button
                                    key={img.id}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, coverImageUrl: img.image_url })}
                                    className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${formData.coverImageUrl === img.image_url
                                            ? 'border-blue-500 ring-2 ring-blue-500/50'
                                            : 'border-slate-700 hover:border-slate-600'
                                        }`}
                                >
                                    <img src={img.image_url} alt={img.theme} className="w-full h-full object-cover" />
                                    {formData.coverImageUrl === img.image_url && (
                                        <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">✓</div>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 提交按鈕 */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? '建立中...' : '提交審核'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
