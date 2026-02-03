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
import type { MaintenanceType, StravaBike } from '../../src/hooks/useMaintenance';

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
        updateBike,
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

    // [NEW] Edit Bike State
    const [isEditBikeModalOpen, setIsEditBikeModalOpen] = useState(false);
    const [editBikeFormData, setEditBikeFormData] = useState({
        id: '',
        brand: '',
        model: '',
        groupset_name: '',
        groupset_brand: '',
        groupset_model: '',
        groupset_speed: '',
        power_meter: '',
        power_meter_type: '',
        power_meter_detail: '',
        shop_name: '',
        remarks: '',
        price: ''
    });

    const handleEditBikeClick = (bike: any) => {
        // Parse Groupset
        let gBrand = '';
        let gSpeed = '';
        let gModel = bike.groupset_name || '';

        const brands = ['Shimano', 'SRAM', 'Campagnolo', '其他'];
        const speeds = ['11速', '12速', '13速', '其他'];

        brands.forEach(b => {
            if (gModel.includes(b)) {
                gBrand = b;
                gModel = gModel.replace(b, '').trim();
            }
        });

        speeds.forEach(s => {
            if (gModel.includes(s)) {
                gSpeed = s;
                gModel = gModel.replace(s, '').trim();
            }
        });

        // Parse Power Meter
        let pType = '';
        let pDetail = bike.power_meter || '';
        const pTypes = ['功率大盤', '功率踏板', '功率輪組', '其他', '無'];

        pTypes.forEach(t => {
            if (pDetail.includes(t)) {
                pType = t;
                pDetail = pDetail.replace(t, '').trim();
            }
        });

        if (bike.power_meter === '無') {
            pType = '無';
            pDetail = '';
        } else if (!pType && bike.power_meter) {
            pType = '其他';
        }

        setEditBikeFormData({
            id: bike.id,
            brand: bike.brand || '',
            model: bike.model || '',
            groupset_name: bike.groupset_name || '',
            groupset_brand: gBrand,
            groupset_model: gModel,
            groupset_speed: gSpeed,
            power_meter: bike.power_meter || '',
            power_meter_type: pType,
            power_meter_detail: pDetail,
            shop_name: bike.shop_name || '',
            remarks: bike.remarks || '',
            price: bike.price ? bike.price.toString() : ''
        });
        setIsEditBikeModalOpen(true);
    };

    const handleEditBikeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editBikeFormData.id) return;

        try {
            const { groupset_brand, groupset_speed, groupset_model } = editBikeFormData;
            const combinedGroupset = `${groupset_brand} ${groupset_speed} ${groupset_model} `.trim().replace(/\s+/g, ' ');

            let combinedPower = '';
            if (editBikeFormData.power_meter_type === '無') {
                combinedPower = '無';
            } else {
                combinedPower = `${editBikeFormData.power_meter_type} ${editBikeFormData.power_meter_detail} `.trim();
            }

            await updateBike(editBikeFormData.id, {
                brand: editBikeFormData.brand || undefined,
                model: editBikeFormData.model || undefined,
                groupset_name: combinedGroupset || undefined,
                power_meter: combinedPower || undefined,
                shop_name: editBikeFormData.shop_name || undefined,
                remarks: editBikeFormData.remarks || undefined,
                price: editBikeFormData.price ? parseFloat(editBikeFormData.price) : undefined
            });
            setIsEditBikeModalOpen(false);
        } catch (err) {
            console.error('更新腳踏車資訊失敗:', err);
            alert('更新失敗');
        }
    };

    return (
        <div className="h-full flex flex-col w-full bg-background overflow-hidden relative">
            {/* Header */}
            <header className="flex items-center justify-between px-5 pt-12 pb-6 bg-background/80 backdrop-blur-md z-30 flex-shrink-0">
                <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-secondary/10 rounded-full text-muted-foreground">
                    <ChevronLeft size={24} />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-foreground text-lg font-black tracking-tight italic uppercase">保養紀錄中心</h1>
                    <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-widest">Maintenance Hub</p>
                </div>
                <div className="w-10" />
            </header>

            <main className="flex-1 overflow-y-auto px-5 pb-10 space-y-6 scrollbar-hide">
                {/* Bike Selector */}
                <section>
                    <div className="flex items-center justify-between mb-3 px-1">
                        <label className="text-muted-foreground text-[11px] font-black uppercase tracking-widest">我的車架</label>
                        <span className="text-muted-foreground/50 text-[10px]">{bikes.length} 台已登錄</span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
                        {bikes.map((bike) => (
                            <button
                                key={bike.id}
                                onClick={() => setSelectedBikeId(bike.id)}
                                className={`flex-none w-32 snap-start p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${activeBikeId === bike.id
                                    ? 'bg-primary/10 border-primary/50 text-foreground'
                                    : 'bg-secondary/5 border-border text-muted-foreground'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeBikeId === bike.id ? 'bg-primary text-primary-foreground' : 'bg-secondary/10'}`}>
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
                        <section className="bg-card rounded-3xl p-5 border border-border relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16" />

                            <div className="flex items-start justify-between mb-4 relative z-10">
                                <div>
                                    <h2 className="text-foreground text-xl font-black italic uppercase mb-1">{selectedBike.name}</h2>
                                    <p className="text-primary font-mono text-sm">
                                        總里程: <span className="font-bold">{Math.round(selectedBike.converted_distance).toLocaleString()} km</span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleEditBikeClick(selectedBike)}
                                    className="p-2 bg-secondary/10 rounded-xl hover:bg-primary/20 hover:text-primary transition-colors cursor-pointer"
                                >
                                    <Wrench size={18} className="text-primary" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 relative z-10">
                                <div className="bg-secondary/20 rounded-xl p-3 border border-border">
                                    <p className="text-[9px] text-muted-foreground uppercase font-black mb-1">變速系統</p>
                                    <p className="text-foreground/80 text-xs font-bold leading-tight line-clamp-1">{selectedBike.groupset_name || '未註記'}</p>
                                </div>
                                <div className="bg-secondary/20 rounded-xl p-3 border border-border">
                                    <p className="text-[9px] text-muted-foreground uppercase font-black mb-1">功率計</p>
                                    <p className="text-foreground/80 text-xs font-bold leading-tight line-clamp-1">{selectedBike.power_meter || '未註記'}</p>
                                </div>
                            </div>
                        </section>

                        {/* Tabs */}
                        <div className="flex bg-secondary/5 p-1 rounded-2xl gap-1">
                            <button
                                onClick={() => setActiveTab('reminders')}
                                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'reminders' ? 'bg-card text-primary shadow-sm border border-border' : 'text-muted-foreground'}`}
                            >
                                <Wrench size={14} />
                                保養提醒
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'history' ? 'bg-card text-primary shadow-sm border border-border' : 'text-muted-foreground'}`}
                            >
                                <History size={14} />
                                歷史紀錄
                            </button>
                        </div>

                        {/* Reminders Grid */}
                        {activeTab === 'reminders' && (
                            <section className="grid grid-cols-2 gap-4">
                                {reminders.map((reminder: any) => {
                                    const StatusIcon = statusIcons[reminder.status as keyof typeof statusIcons];
                                    return (
                                        <button
                                            key={reminder.type.id}
                                            onClick={() => setSelectedType(reminder.type)}
                                            className="bg-card border border-border rounded-3xl p-4 flex flex-col justify-between aspect-square text-left hover:border-primary/50 transition-all"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-foreground text-xs font-black uppercase leading-tight line-clamp-2 italic">{reminder.type.name}</h4>
                                                </div>
                                                <StatusIcon size={14} className={reminder.status === 'ok' ? 'text-green-500' : reminder.status === 'overdue' ? 'text-red-500' : 'text-yellow-500'} />
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex flex-col">
                                                    <span className="text-muted-foreground text-[9px] uppercase font-black mb-1">使用率</span>
                                                    <div className="flex items-end justify-between gap-2">
                                                        <div className="flex-1 h-1.5 bg-secondary/40 rounded-full overflow-hidden mb-1">
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

                                                <div className="p-2 bg-secondary/10 rounded-xl border border-border">
                                                    <p className="text-[8px] text-muted-foreground uppercase font-black">距上次保養</p>
                                                    <p className="text-foreground font-mono text-[11px] font-bold">
                                                        {Math.round(reminder.mileageSinceService).toLocaleString()} <span className="text-[9px] opacity-40">km</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}

                                <button
                                    onClick={() => setIsAddModalOpen(true)}
                                    className="border-2 border-dashed border-border rounded-3xl flex flex-col items-center justify-center gap-2 aspect-square text-muted-foreground hover:text-primary hover:border-primary/50 transition-all bg-card/50"
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
                                    historyRecords.slice(0, 20).map((record: any) => {
                                        const typeInfo = maintenanceTypes.find(t => record.maintenance_type.includes(t.id));
                                        const reminderInfo = reminders.find((r: any) => record.maintenance_type.includes(r.type.id));

                                        return (
                                            <button
                                                key={record.id}
                                                onClick={() => {
                                                    if (reminderInfo) {
                                                        setSelectedType(reminderInfo.type);
                                                    } else if (typeInfo) {
                                                        setSelectedType(typeInfo);
                                                    }
                                                }}
                                                className="w-full bg-card border border-border rounded-2xl p-4 flex items-center gap-4 text-left hover:bg-accent/50 transition-colors active:scale-[0.98]"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                    <Wrench size={18} className="text-primary" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-foreground text-sm font-bold truncate">
                                                        {typeInfo?.name || record.maintenance_type}
                                                    </h4>
                                                    <p className="text-muted-foreground text-xs">
                                                        {new Date(record.service_date).toLocaleDateString('zh-TW')} · {record.mileage_at_service?.toLocaleString() || 0} km
                                                    </p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    {record.cost ? (
                                                        <span className="text-orange-400 font-mono text-sm font-bold">
                                                            ${record.cost.toLocaleString()}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">DIY</span>
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

            {/* Edit Bike Modal */}
            {isEditBikeModalOpen && (
                <div className="absolute inset-0 z-50 flex items-end justify-center pointer-events-none">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
                        onClick={() => setIsEditBikeModalOpen(false)}
                    />
                    <div className="relative w-full max-h-[90vh] bg-card rounded-t-3xl border-t border-border overflow-hidden flex flex-col pointer-events-auto shadow-2xl">
                        <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
                            <h3 className="text-xl font-bold text-foreground">編輯單車資訊</h3>
                            <button
                                onClick={() => setIsEditBikeModalOpen(false)}
                                className="p-2 hover:bg-secondary/10 rounded-xl transition-all"
                            >
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                            <form onSubmit={handleEditBikeSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-muted-foreground mb-2">車架品牌</label>
                                    <input
                                        type="text"
                                        value={editBikeFormData.brand}
                                        onChange={e => setEditBikeFormData(prev => ({ ...prev, brand: e.target.value }))}
                                        className="w-full bg-secondary/10 border border-border rounded-xl px-4 py-3 text-foreground focus:border-primary focus:outline-none"
                                        placeholder="例：Factor"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-muted-foreground mb-2">車架型號</label>
                                    <input
                                        type="text"
                                        value={editBikeFormData.model}
                                        onChange={e => setEditBikeFormData(prev => ({ ...prev, model: e.target.value }))}
                                        className="w-full bg-secondary/10 border border-border rounded-xl px-4 py-3 text-foreground focus:border-primary focus:outline-none"
                                        placeholder="例：O2"
                                    />
                                </div>
                                {/* Groupset */}
                                <div>
                                    <label className="block text-sm font-bold text-muted-foreground mb-2">變速系統</label>
                                    <div className="space-y-3 p-4 bg-secondary/5 rounded-2xl border border-border">
                                        <div className="flex flex-wrap gap-2">
                                            {['Shimano', 'SRAM', 'Campagnolo', '其他'].map(brand => (
                                                <label key={brand} className="flex-1 min-w-[80px]">
                                                    <input
                                                        type="radio"
                                                        name="groupset_brand"
                                                        value={brand}
                                                        checked={editBikeFormData.groupset_brand === brand}
                                                        onChange={e => setEditBikeFormData(prev => ({ ...prev, groupset_brand: e.target.value }))}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="text-center py-2 px-3 rounded-xl border border-border text-sm text-muted-foreground peer-checked:bg-primary/20 peer-checked:border-primary peer-checked:text-primary cursor-pointer hover:bg-secondary/10 transition-all">
                                                        {brand}
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                        <input
                                            type="text"
                                            value={editBikeFormData.groupset_model}
                                            onChange={e => setEditBikeFormData(prev => ({ ...prev, groupset_model: e.target.value }))}
                                            placeholder="型號 (例：Dura-Ace)"
                                            className="w-full bg-secondary/10 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                                        />
                                        <div className="flex flex-wrap gap-2">
                                            {['11速', '12速', '13速', '其他'].map(speed => (
                                                <label key={speed} className="flex-1 min-w-[70px]">
                                                    <input
                                                        type="radio"
                                                        name="groupset_speed"
                                                        value={speed}
                                                        checked={editBikeFormData.groupset_speed === speed}
                                                        onChange={e => setEditBikeFormData(prev => ({ ...prev, groupset_speed: e.target.value }))}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="text-center py-2 px-3 rounded-xl border border-border text-sm text-muted-foreground peer-checked:bg-primary/20 peer-checked:border-primary peer-checked:text-primary cursor-pointer hover:bg-secondary/10 transition-all">
                                                        {speed}
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                {/* Power Meter */}
                                <div>
                                    <label className="block text-sm font-bold text-muted-foreground mb-2">功率計</label>
                                    <div className="space-y-3 p-4 bg-secondary/5 rounded-2xl border border-border">
                                        <div className="flex flex-wrap gap-2">
                                            {['功率大盤', '功率踏板', '功率輪組', '其他', '無'].map(type => (
                                                <label key={type} className="flex-1 min-w-[80px]">
                                                    <input
                                                        type="radio"
                                                        name="power_meter_type"
                                                        value={type}
                                                        checked={editBikeFormData.power_meter_type === type}
                                                        onChange={e => setEditBikeFormData(prev => ({ ...prev, power_meter_type: e.target.value }))}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="text-center py-2 px-3 rounded-xl border border-border text-xs text-muted-foreground peer-checked:bg-primary/20 peer-checked:border-primary peer-checked:text-primary cursor-pointer hover:bg-secondary/10 transition-all">
                                                        {type}
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                        {editBikeFormData.power_meter_type !== '無' && (
                                            <input
                                                type="text"
                                                value={editBikeFormData.power_meter_detail}
                                                onChange={e => setEditBikeFormData(prev => ({ ...prev, power_meter_detail: e.target.value }))}
                                                placeholder="品牌型號 (例：Garmin Rally)"
                                                className="w-full bg-secondary/10 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                                            />
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-muted-foreground mb-2">金額</label>
                                    <input
                                        type="number"
                                        value={editBikeFormData.price}
                                        onChange={e => setEditBikeFormData(prev => ({ ...prev, price: e.target.value }))}
                                        placeholder="0"
                                        className="w-full bg-secondary/10 border border-border rounded-xl px-4 py-3 text-foreground focus:border-primary focus:outline-none"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-bold transition-all shadow-lg mt-4"
                                >
                                    儲存變更
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {selectedType && (
                <div className="absolute inset-0 z-50 flex items-end justify-center pointer-events-none">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
                        onClick={() => setSelectedType(null)}
                    />
                    <div className="relative w-full max-h-[85vh] bg-card rounded-t-3xl border-t border-border overflow-hidden flex flex-col pointer-events-auto shadow-2xl">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
                            <div>
                                <h2 className="text-foreground text-lg font-black italic">{selectedType.name}</h2>
                                <p className="text-muted-foreground text-xs">歷史更換清單</p>
                            </div>
                            <button
                                onClick={() => setSelectedType(null)}
                                className="p-2 hover:bg-secondary/10 rounded-xl transition-all"
                            >
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                            {filteredRecords.length > 0 ? (
                                <div className="space-y-4">
                                    {filteredRecords.map((record: any, index: number) => {
                                        const prevRecord = filteredRecords[index + 1];
                                        const interval = calculateInterval(record, prevRecord, activeBikeId!);

                                        return (
                                            <div
                                                key={record.id}
                                                className="bg-secondary/20 border border-border rounded-2xl p-4"
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <p className="text-foreground font-bold">
                                                            {new Date(record.service_date).toLocaleDateString('zh-TW')}
                                                        </p>
                                                        <p className="text-muted-foreground text-xs">
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
                                    }
                                </div>
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
        </div>
    );
}
