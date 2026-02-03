import React, { useState } from 'react';
import { useMaintenance } from '../../src/hooks/useMaintenance';
import {
    ChevronLeft,
    Bike,
    Wrench,
    History,
    AlertCircle,
    Clock,
    CheckCircle2,
    Plus,
    X
} from 'lucide-react';
import AddRecordModal from '../../src/features/maintenance/AddRecordModal';
import type { MaintenanceType } from '../../src/hooks/useMaintenance';

interface V2MaintenanceProps {
    onBack: () => void;
}

const statusColors = {
    ok: 'bg-green-500/10 text-green-400 border-green-500/20',
    due_soon: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    overdue: 'bg-red-500/10 text-red-400 border-red-500/20'
};

const statusIcons = {
    ok: CheckCircle2,
    due_soon: Clock,
    overdue: AlertCircle
};

export function V2Maintenance({ onBack }: V2MaintenanceProps) {
    const {
        bikes,
        getMaintenanceReminders,
        getRecordsByBike,
        maintenanceTypes,
        addMaintenanceRecord,
        calculateMetricsBetweenDates,
        loading
    } = useMaintenance();

    const [selectedBikeId, setSelectedBikeId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'reminders' | 'history'>('reminders');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedType, setSelectedType] = useState<MaintenanceType | null>(null);

    // Default to first bike
    const activeBikeId = selectedBikeId || (bikes.length > 0 ? bikes[0].id : null);
    const selectedBike = bikes.find(b => b.id === activeBikeId);
    const reminders = selectedBike ? getMaintenanceReminders(selectedBike) : [];
    const historyRecords = activeBikeId ? getRecordsByBike(activeBikeId) : [];

    // 過濾特定保養類型的歷史紀錄
    const filteredRecords = selectedType
        ? historyRecords.filter(r => r.maintenance_type.includes(selectedType.id))
        : [];

    // 計算兩筆紀錄之間的間隔（使用實際活動數據）
    const calculateInterval = (currentRecord: any, prevRecord: any, bikeId: string) => {
        if (!prevRecord) return { km: 0, hours: 0, days: 0 };
        const stats = calculateMetricsBetweenDates(bikeId, prevRecord.service_date, currentRecord.service_date);
        return {
            km: Math.round(stats.distanceKm),
            hours: Math.round(stats.movingTimeHours),
            days: stats.days
        };
    };

    return (

        <div className="h-full flex flex-col w-full bg-bg-dark overflow-hidden relative">
            {/* Header */}
            <header className="flex items-center justify-between px-5 pt-12 pb-6 bg-bg-dark/80 backdrop-blur-md z-30 flex-shrink-0">
                <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full text-white/60">
                    <ChevronLeft size={24} />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-white text-lg font-black tracking-tight italic uppercase">保養紀錄中心</h1>
                    <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest">Maintenance Hub</p>
                </div>
                <div className="w-10" />
            </header>

            <main className="flex-1 overflow-y-auto px-5 pb-10 space-y-6 scrollbar-hide">
                {/* Bike Selector - Horizontal Scroll */}
                <section>
                    <div className="flex items-center justify-between mb-3 px-1">
                        <label className="text-white/40 text-[11px] font-black uppercase tracking-widest">我的車架</label>
                        <span className="text-white/20 text-[10px]">{bikes.length} 台已登錄</span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
                        {bikes.map((bike) => (
                            <button
                                key={bike.id}
                                onClick={() => setSelectedBikeId(bike.id)}
                                className={`flex-none w-32 snap-start p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${activeBikeId === bike.id
                                    ? 'bg-orange-500/20 border-orange-500/50 text-white'
                                    : 'bg-white/5 border-white/5 text-white/40'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeBikeId === bike.id ? 'bg-orange-500 text-white' : 'bg-white/10'}`}>
                                    <Bike size={20} />
                                </div>
                                <span className="text-[11px] font-black uppercase truncate w-full text-center tracking-tight">
                                    {bike.name}
                                </span>
                            </button>
                        ))}
                    </div>
                </section>

                {selectedBike ? (
                    <>
                        {/* Selected Bike Info Card */}
                        <section className="bg-bg-card rounded-3xl p-5 border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full -mr-16 -mt-16" />

                            <div className="flex items-start justify-between mb-4 relative z-10">
                                <div>
                                    <h2 className="text-white text-xl font-black italic uppercase mb-1">{selectedBike.name}</h2>
                                    <p className="text-orange-500 font-mono text-sm">
                                        總里程: <span className="font-bold">{Math.round(selectedBike.converted_distance).toLocaleString()} km</span>
                                    </p>
                                </div>
                                <div className="p-2 bg-white/5 rounded-xl">
                                    <Wrench size={18} className="text-orange-500" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 relative z-10">
                                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                                    <p className="text-[9px] text-white/30 uppercase font-black mb-1">變速系統</p>
                                    <p className="text-white/80 text-xs font-bold leading-tight line-clamp-1">{selectedBike.groupset_name || '未註記'}</p>
                                </div>
                                <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                                    <p className="text-[9px] text-white/30 uppercase font-black mb-1">功率計</p>
                                    <p className="text-white/80 text-xs font-bold leading-tight line-clamp-1">{selectedBike.power_meter || '未註記'}</p>
                                </div>
                            </div>
                        </section>

                        {/* Tabs */}
                        <div className="flex bg-white/5 p-1 rounded-2xl gap-1">
                            <button
                                onClick={() => setActiveTab('reminders')}
                                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'reminders' ? 'bg-bg-card text-orange-500 shadow-lg' : 'text-white/40'}`}
                            >
                                <Wrench size={14} />
                                保養提醒
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'history' ? 'bg-bg-card text-orange-500 shadow-lg' : 'text-white/40'}`}
                            >
                                <History size={14} />
                                歷史紀錄
                            </button>
                        </div>

                        {/* Reminders Grid */}
                        {activeTab === 'reminders' && (
                            <section className="grid grid-cols-2 gap-4">
                                {reminders.map((reminder) => {
                                    const StatusIcon = statusIcons[reminder.status];
                                    return (
                                        <button
                                            key={reminder.type.id}
                                            onClick={() => setSelectedType(reminder.type)}
                                            className="bg-bg-card border border-white/5 rounded-3xl p-4 flex flex-col justify-between aspect-square text-left hover:border-orange-500/30 transition-all"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-white text-xs font-black uppercase leading-tight line-clamp-2 italic">{reminder.type.name}</h4>
                                                </div>
                                                <StatusIcon size={14} className={reminder.status === 'ok' ? 'text-green-500' : reminder.status === 'overdue' ? 'text-red-500' : 'text-yellow-500'} />
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex flex-col">
                                                    <span className="text-white/30 text-[9px] uppercase font-black mb-1">使用率</span>
                                                    <div className="flex items-end justify-between gap-2">
                                                        <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden mb-1">
                                                            <div
                                                                className={`h-full rounded-full ${reminder.status === 'ok' ? 'bg-green-500' : reminder.status === 'overdue' ? 'bg-red-500' : 'bg-yellow-500'}`}
                                                                style={{ width: `${Math.min(reminder.percentageUsed, 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className={`font-mono text-[10px] font-bold ${reminder.status === 'ok' ? 'text-green-400' : reminder.status === 'overdue' ? 'text-red-400' : 'text-yellow-400'}`}>
                                                            {Math.round(reminder.percentageUsed)}%
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="p-2 bg-black/20 rounded-xl border border-white/5">
                                                    <p className="text-[8px] text-white/30 uppercase font-black">距上次保養</p>
                                                    <p className="text-white font-mono text-[11px] font-bold">
                                                        {Math.round(reminder.mileageSinceService).toLocaleString()} <span className="text-[9px] opacity-40">km</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}

                                <button
                                    onClick={() => setIsAddModalOpen(true)}
                                    className="border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-2 aspect-square text-white/20 hover:text-orange-500 hover:border-orange-500/50 transition-all bg-white/5"
                                >
                                    <Plus size={24} />
                                    <span className="text-[10px] font-black uppercase">新增項目</span>
                                </button>
                            </section>
                        )}

                        {/* Modals */}
                        {selectedBike && (
                            <AddRecordModal
                                isOpen={isAddModalOpen}
                                onClose={() => setIsAddModalOpen(false)}
                                maintenanceTypes={maintenanceTypes}
                                bikeId={selectedBike.id}
                                bikeName={selectedBike.name}
                                currentMileage={Math.round(selectedBike.converted_distance)}
                                onAdd={async (record) => {
                                    await addMaintenanceRecord(record);
                                    setIsAddModalOpen(false);
                                }}
                            />
                        )}

                        {activeTab === 'history' && (
                            <section className="space-y-3">
                                {historyRecords.length > 0 ? (
                                    historyRecords.slice(0, 20).map((record) => {
                                        const typeInfo = maintenanceTypes.find(t => record.maintenance_type.includes(t.id));
                                        // 找到對應的 reminder 資料（用於開啟詳細頁）
                                        // 注意：reminders 是 MaintenanceReminder[]，其中 reminder.type 才是 MaintenanceType
                                        const reminderInfo = reminders.find(r => record.maintenance_type.includes(r.type.id));

                                        return (
                                            <button
                                                key={record.id}
                                                onClick={() => {
                                                    // 使用 reminderInfo.type 才是正確的 MaintenanceType
                                                    if (reminderInfo) {
                                                        setSelectedType(reminderInfo.type);
                                                    } else if (typeInfo) {
                                                        // Fallback: 直接使用 maintenanceTypes 中找到的類型
                                                        setSelectedType(typeInfo);
                                                    }
                                                }}
                                                className="w-full bg-bg-card border border-white/5 rounded-2xl p-4 flex items-center gap-4 text-left hover:bg-white/5 transition-colors active:scale-[0.98]"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                                                    <Wrench size={18} className="text-orange-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-white text-sm font-bold truncate">
                                                        {typeInfo?.name || record.maintenance_type}
                                                    </h4>
                                                    <p className="text-white/40 text-xs">
                                                        {new Date(record.service_date).toLocaleDateString('zh-TW')} · {record.mileage_at_service?.toLocaleString() || 0} km
                                                    </p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    {record.cost ? (
                                                        <span className="text-orange-400 font-mono text-sm font-bold">
                                                            ${record.cost.toLocaleString()}
                                                        </span>
                                                    ) : (
                                                        <span className="text-white/20 text-xs">DIY</span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })
                                ) : (
                                    <div className="p-10 flex flex-col items-center justify-center opacity-40 gap-4">
                                        <History size={48} />
                                        <p className="text-xs font-bold text-center">尚無保養紀錄</p>
                                    </div>
                                )}
                            </section>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-40 gap-4">
                        <AlertCircle size={48} />
                        <p className="text-sm font-bold">未發現車架資料</p>
                    </div>
                )}
            </main>

            {/* Detail Modal */}
            {selectedType && (
                <div className="absolute inset-0 z-50 flex items-end justify-center pointer-events-none">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
                        onClick={() => setSelectedType(null)}
                    />
                    <div className="relative w-full max-h-[85vh] bg-bg-card rounded-t-3xl border-t border-white/10 overflow-hidden flex flex-col pointer-events-auto shadow-2xl">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b border-white/5 flex-shrink-0">
                            <div>
                                <h2 className="text-white text-lg font-black italic">{selectedType.name}</h2>
                                <p className="text-white/40 text-xs">歷史更換清單</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setIsAddModalOpen(true);
                                        setSelectedType(null);
                                    }}
                                    className="px-4 py-2 bg-orange-500 text-white text-xs font-bold rounded-xl flex items-center gap-1"
                                >
                                    <Plus size={14} />
                                    新增紀錄
                                </button>
                                <button
                                    onClick={() => setSelectedType(null)}
                                    className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full text-white/60"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-3">
                            {filteredRecords.length > 0 ? (
                                filteredRecords.map((record, index) => {
                                    const prevRecord = filteredRecords[index + 1];
                                    const interval = calculateInterval(record, prevRecord, selectedBike?.id || '');
                                    return (
                                        <div
                                            key={record.id}
                                            className="bg-black/30 border border-white/5 rounded-2xl p-4"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <p className="text-white font-bold">
                                                        {new Date(record.service_date).toLocaleDateString('zh-TW')}
                                                    </p>
                                                    <p className="text-white/40 text-xs">
                                                        {record.mileage_at_service?.toLocaleString() || 0} km
                                                    </p>
                                                </div>
                                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${record.is_diy ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                    {record.is_diy ? 'DIY' : (record.shop_name || '店家')}
                                                </span>
                                            </div>

                                            {/* Interval Stats */}
                                            <div className="grid grid-cols-3 gap-2 mb-3">
                                                <div className="bg-black/40 rounded-xl p-2 text-center">
                                                    <p className="text-orange-400 font-mono text-sm font-bold">
                                                        {interval.km.toLocaleString()}
                                                    </p>
                                                    <p className="text-white/30 text-[9px] uppercase">km</p>
                                                </div>
                                                <div className="bg-black/40 rounded-xl p-2 text-center">
                                                    <p className="text-white font-mono text-sm font-bold">
                                                        {interval.hours}
                                                    </p>
                                                    <p className="text-white/30 text-[9px] uppercase">hr</p>
                                                </div>
                                                <div className="bg-black/40 rounded-xl p-2 text-center">
                                                    <p className="text-white font-mono text-sm font-bold">
                                                        {interval.days}
                                                    </p>
                                                    <p className="text-white/30 text-[9px] uppercase">天</p>
                                                </div>
                                            </div>

                                            {/* Product Info */}
                                            {(() => {
                                                const detail = record.parts_details?.find((d: any) => d.type_id === selectedType.id);
                                                return (detail?.brand || detail?.model) && (
                                                    <div className="flex items-center gap-2 text-xs mb-2">
                                                        <span className="text-cyan-400 font-bold">{detail?.brand || ''}</span>
                                                        {detail?.model && <span className="text-white/40">{detail.model}</span>}
                                                    </div>
                                                );
                                            })()}

                                            {/* Notes */}
                                            {(record.notes || record.other) && (
                                                <p className="text-white/40 text-xs line-clamp-2">{record.notes || record.other}</p>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="py-10 flex flex-col items-center justify-center opacity-40 gap-4">
                                    <History size={48} />
                                    <p className="text-xs font-bold text-center">此項目尚無保養紀錄</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add Record Modal */}
            {selectedBike && (
                <div className="absolute inset-0 z-50 pointer-events-none">
                    <AddRecordModal
                        vehicleId={selectedBike.id}
                        isOpen={isAddModalOpen}
                        onClose={() => setIsAddModalOpen(false)}
                        onSubmit={async (record) => {
                            const adaptedRecord: any = {
                                bike_id: selectedBike.id,
                                athlete_id: selectedBike.athlete_id,
                                maintenance_type: 'Other',
                                service_date: record.date,
                                mileage_at_service: record.mileage,
                                cost: record.total_cost,
                                notes: record.description,
                                is_diy: record.service_type === 'DIY',
                                other: JSON.stringify(record.items)
                            };

                            await addMaintenanceRecord(adaptedRecord);
                            setIsAddModalOpen(false);
                        }}
                    />
                </div>
            )}
        </div>
    );
}

