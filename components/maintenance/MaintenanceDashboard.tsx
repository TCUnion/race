import React, { useState } from 'react';
import { useMaintenance, StravaBike, MaintenanceReminder, MaintenanceType } from '../../hooks/useMaintenance';
import { Wheelset } from '../../types';
import {
  Wrench,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Bike,
  ChevronRight,
  Calendar,
  DollarSign,
  MapPin,
  Trash2,
  X,
  Edit2,
  Check,
  Save
} from 'lucide-react';

// 保養狀態顏色
const statusColors = {
  ok: 'bg-green-500/20 text-green-400 border-green-500/30',
  due_soon: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  overdue: 'bg-red-500/20 text-red-400 border-red-500/30'
};

const statusIcons = {
  ok: CheckCircle2,
  due_soon: Clock,
  overdue: AlertTriangle
};

const statusLabels = {
  ok: '正常',
  due_soon: '即將到期',
  overdue: '已超期'
};

const MaintenanceDashboard: React.FC = () => {
  const {
    bikes,
    wheelsets,
    maintenanceTypes,
    records,
    loading,
    error,
    addMaintenanceRecord,
    deleteMaintenanceRecord,
    updateMaintenanceRecord,
    updateMaintenanceSetting,
    updateBike,
    addWheelset,
    updateWheelset,
    deleteWheelset,
    getRecordsByBike,
    getMaintenanceReminders,
    getAlertCount,
    refresh: fetchDataintenance
  } = useMaintenance();

  const [selectedBikeId, setSelectedBikeId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'reminders' | 'history'>('reminders');
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editInterval, setEditInterval] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedHistoryType, setSelectedHistoryType] = useState<MaintenanceType | null>(null);

  // 輪組編輯狀態
  const [editingWheelset, setEditingWheelset] = useState<Wheelset | null>(null);
  const [wheelsetFormData, setWheelsetFormData] = useState({
    name: '',
    brand: '',
    model: '',
    tire_brand: '',
    tire_specs: '',
    tire_type: ''
  });

  // 當 editingWheelset 改變時，更新表單資料
  React.useEffect(() => {
    if (editingWheelset) {
      setWheelsetFormData({
        name: editingWheelset.name,
        brand: editingWheelset.brand || '',
        model: editingWheelset.model || '',
        tire_brand: editingWheelset.tire_brand || '',
        tire_specs: editingWheelset.tire_specs || '',
        tire_type: editingWheelset.tire_type || ''
      });
    }
  }, [editingWheelset]);

  const handleUpdateWheelset = async () => {
    if (!editingWheelset) return;
    try {
      await updateWheelset(editingWheelset.id, wheelsetFormData);
      setEditingWheelset(null);
    } catch (err) {
      console.error('更新輪組失敗:', err);
      alert('更新失敗，請稍後再試');
    }
  };

  const selectedBike = bikes.find(b => b.id === selectedBikeId);
  const reminders = selectedBike ? getMaintenanceReminders(selectedBike) : [];
  const bikeRecords = selectedBike ? getRecordsByBike(selectedBike.id) : [];

  const handleStartEdit = (typeId: string, currentInterval: number) => {
    setEditingTypeId(typeId);
    setEditInterval(currentInterval.toString());
  };

  const handleSaveInterval = async (bikeId: string, typeId: string) => {
    if (!editInterval || isNaN(parseInt(editInterval))) return;

    setIsSaving(true);
    try {
      await updateMaintenanceSetting(bikeId, typeId, parseInt(editInterval));
      setEditingTypeId(null);
    } catch (err) {
      console.error('儲存里程失敗:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // 新增保養紀錄表單狀態
  const [formData, setFormData] = useState({
    maintenance_type: [] as string[],
    service_date: new Date().toISOString().split('T')[0],
    cost: '',
    shop_name: '',
    notes: '',
    other: '',
    is_diy: false
  });

  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({
      maintenance_type: [],
      service_date: new Date().toISOString().split('T')[0],
      cost: '',
      shop_name: '',
      notes: '',
      other: '',
      is_diy: false
    });
    setEditingRecordId(null);
    setIsAddModalOpen(false);
  };

  const handleEditMaintenance = (record: any) => {
    let typeList: string[] = [];
    if (record.maintenance_type.startsWith('全車保養')) {
      typeList.push('full');
      const match = record.maintenance_type.match(/\((.*)\)/);
      if (match) {
        // 嘗試解析括號內的項目
        const others = match[1].split(', ');
        typeList.push(...others);
      }
    } else {
      typeList = record.maintenance_type.split(', ');
    }

    setFormData({
      maintenance_type: typeList,
      service_date: record.service_date,
      cost: record.cost ? record.cost.toString() : '',
      shop_name: record.shop_name || '',
      notes: record.notes || '',
      other: record.other || '',
      is_diy: record.is_diy
    });
    setEditingRecordId(record.id);
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBike) return;

    const athleteData = localStorage.getItem('strava_athlete_meta');
    if (!athleteData) return;
    const athlete = JSON.parse(athleteData);

    // 取得選取的保養類型，若勾選全車保養，合併其他選項
    const selectedTypes = formData.maintenance_type as string[];
    let maintenanceTypeValue = '';
    if (selectedTypes.includes('full')) {
      // 合併所有其他選取的項目（排除 full 本身）
      const merged = selectedTypes.filter(t => t !== 'full').join(', ');
      maintenanceTypeValue = merged ? `全車保養 (${merged})` : '全車保養';
    } else {
      maintenanceTypeValue = selectedTypes.join(', ');
    }

    const recordData = {
      bike_id: selectedBike.id,
      athlete_id: String(athlete.id),
      maintenance_type: maintenanceTypeValue,
      service_date: formData.service_date,
      mileage_at_service: selectedBike.converted_distance || (selectedBike.distance / 1000),
      cost: formData.cost ? parseFloat(formData.cost) : undefined,
      shop_name: formData.shop_name || undefined,
      notes: formData.notes || undefined,
      other: formData.other || undefined,
      is_diy: formData.is_diy
    };

    try {
      if (editingRecordId) {
        await updateMaintenanceRecord(editingRecordId, recordData);
      } else {
        await addMaintenanceRecord(recordData);
      }
      resetForm();
    } catch (err) {
      console.error('儲存紀錄失敗:', err);
    }
  };

  // 編輯腳踏車表單狀態
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: '',
    brand: '',
    model: '',
    groupset_name: '',
    shop_name: '',
    remarks: '',
    price: ''
  });

  const handleEditClick = (bike: StravaBike) => {
    setEditFormData({
      id: bike.id,
      brand: bike.brand || '',
      model: bike.model || '',
      groupset_name: bike.groupset_name || '',
      shop_name: bike.shop_name || '',
      remarks: bike.remarks || '',
      price: bike.price ? bike.price.toString() : ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.id) return;

    try {
      await updateBike(editFormData.id, {
        brand: editFormData.brand || undefined,
        model: editFormData.model || undefined,
        groupset_name: editFormData.groupset_name || undefined,
        shop_name: editFormData.shop_name || undefined,
        remarks: editFormData.remarks || undefined,
        price: editFormData.price ? parseFloat(editFormData.price) : undefined
      });
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('更新腳踏車資訊失敗:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-red-500/10 border border-red-500/20 text-red-100 p-6 rounded-2xl text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <h3 className="text-lg font-bold mb-2">載入失敗</h3>
          <p className="text-red-200/60">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* 標題 */}
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-orange-600 p-2.5 rounded-2xl shadow-lg shadow-orange-900/40">
          <Wrench className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white">腳踏車保養紀錄</h1>
          <p className="text-orange-200/50 text-sm">根據 Strava 里程追蹤保養狀態</p>
        </div>
      </div>

      {bikes.length === 0 ? (
        <div className="text-center py-16 bg-white/5 border border-white/10 rounded-3xl">
          <Bike className="w-16 h-16 text-orange-200/20 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">尚無腳踏車資料</h3>
          <p className="text-orange-200/40">請確認您的 Strava 帳號已連結並設定腳踏車</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-4 gap-8">
          {/* 左側：腳踏車列表 */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-sm font-bold text-orange-200/60 uppercase tracking-wider mb-4">
              我的腳踏車
            </h2>
            {bikes.map(bike => {
              const alerts = getAlertCount(bike);
              const isSelected = selectedBikeId === bike.id;
              return (
                <button
                  key={bike.id}
                  onClick={() => setSelectedBikeId(bike.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${isSelected
                    ? 'bg-orange-600/20 border-orange-500/50 shadow-lg shadow-orange-900/20'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-white">{bike.name}</h3>
                      <p className="text-sm text-orange-200/50">
                        {(bike.converted_distance || bike.distance / 1000).toLocaleString()} km
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {alerts.overdue > 0 && (
                        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                          {alerts.overdue}
                        </span>
                      )}
                      {alerts.dueSoon > 0 && (
                        <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
                          {alerts.dueSoon}
                        </span>
                      )}
                      <ChevronRight className={`w-4 h-4 text-orange-200/40 ${isSelected ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 右側：保養詳情 */}
          <div className="lg:col-span-3">
            {selectedBike ? (
              <div className="space-y-6">
                {/* 車輛資訊卡 */}
                <div className="bg-gradient-to-br from-orange-600/20 to-orange-900/20 border border-orange-500/30 rounded-3xl p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-2xl font-bold text-white">{selectedBike.name}</h2>
                        <button
                          onClick={() => handleEditClick(selectedBike)}
                          className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-orange-200/60 hover:text-white transition-all"
                          title="編輯詳情"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-orange-200/60 mb-2">
                        總里程：<span className="text-white font-mono font-bold">
                          {(selectedBike.converted_distance || selectedBike.distance / 1000).toLocaleString()}
                        </span> km
                      </p>

                      {/* 顯示新增的欄位資訊 */}
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                        {selectedBike.brand && (
                          <div className="flex flex-col">
                            <span className="text-orange-200/40 text-xs">品牌</span>
                            <span className="text-white font-medium">{selectedBike.brand}</span>
                          </div>
                        )}
                        {selectedBike.model && (
                          <div className="flex flex-col">
                            <span className="text-orange-200/40 text-xs">型號</span>
                            <span className="text-white font-medium">{selectedBike.model}</span>
                          </div>
                        )}
                        {selectedBike.groupset_name && (
                          <div className="flex flex-col">
                            <span className="text-orange-200/40 text-xs">變速系統</span>
                            <span className="text-white font-medium">{selectedBike.groupset_name}</span>
                          </div>
                        )}
                        {selectedBike.shop_name && (
                          <div className="flex flex-col">
                            <span className="text-orange-200/40 text-xs">購買地點</span>
                            <span className="text-white font-medium">{selectedBike.shop_name}</span>
                          </div>
                        )}
                        {selectedBike.price && (
                          <div className="flex flex-col">
                            <span className="text-orange-200/40 text-xs">金額</span>
                            <span className="text-white font-medium">${selectedBike.price.toLocaleString()}</span>
                          </div>
                        )}
                        {selectedBike.remarks && (
                          <div className="flex flex-col col-span-2 lg:col-span-3">
                            <span className="text-orange-200/40 text-xs">備註</span>
                            <span className="text-white font-medium">{selectedBike.remarks}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setIsAddModalOpen(true)}
                      className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      新增保養
                    </button>
                  </div>

                  {/* 輪組設定區塊 */}
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                      <div className="w-1 h-4 bg-orange-500 rounded-full"></div>
                      輪組設定
                    </h3>
                    <div className="space-y-3">
                      {wheelsets.filter(ws => ws.bike_id === selectedBike.id).map(ws => (
                        <div key={ws.id} className="flex flex-col gap-2 bg-black/20 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="active_wheelset"
                                checked={selectedBike.active_wheelset_id === ws.id}
                                onChange={async () => {
                                  try {
                                    await updateBike(selectedBike.id, { active_wheelset_id: ws.id });
                                  } catch (err) {
                                    console.error('更新預設輪組失敗:', err);
                                    alert('更新失敗，請稍後再試');
                                  }
                                }}
                                className="w-4 h-4 text-orange-600 border-white/30 focus:ring-orange-500 focus:ring-offset-0 bg-transparent"
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-white font-medium text-lg">{ws.name}</p>
                                  {selectedBike.active_wheelset_id === ws.id && (
                                    <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full">使用中</span>
                                  )}
                                </div>
                                <div className="flex flex-col gap-1">
                                  <div className="flex gap-3 text-xs text-orange-200/40">
                                    <span>{ws.brand || '---'} / {ws.model || '---'}</span>
                                    <span>•</span>
                                    <span>里程: {ws.distance.toLocaleString()} m</span>
                                  </div>
                                  {(ws.tire_brand || ws.tire_specs || ws.tire_type) && (
                                    <div className="text-xs text-orange-200/30 flex gap-2">
                                      <span className="text-orange-500/50">輪胎:</span>
                                      <span>{ws.tire_brand || ''} {ws.tire_specs || ''}</span>
                                      {ws.tire_type && <span>({ws.tire_type})</span>}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setEditingWheelset(ws)}
                                className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                                title="編輯詳情"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`確定要刪除輪組 "${ws.name}" 嗎？`)) {
                                    deleteWheelset(ws.id);
                                  }
                                }}
                                className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                title="刪除輪組"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={async () => {
                          const existingCount = wheelsets.filter(ws => ws.bike_id === selectedBike.id).length;
                          const name = `輪組 ${existingCount + 1}`;
                          await addWheelset({
                            athlete_id: String(selectedBike.athlete_id),
                            bike_id: selectedBike.id,
                            name,
                            distance: 0,
                            is_active: false
                          });
                        }}
                        className="w-full py-2 border border-dashed border-white/20 rounded-xl text-orange-200/60 hover:text-white hover:border-orange-500/50 hover:bg-orange-500/10 transition-all flex items-center justify-center gap-2 text-sm"
                      >
                        <Plus className="w-4 h-4" /> 直接新增輪組
                      </button>
                    </div>
                  </div>
                </div>

                {/* 標籤切換 */}
                <div className="flex gap-2">
                  <button
                    className={`px-4 py-2 rounded-xl font-bold transition-all ${activeTab === 'reminders'
                      ? 'bg-orange-600 text-white'
                      : 'bg-white/5 text-orange-200/60 hover:bg-white/10'
                      }`}
                  >
                    保養提醒
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 rounded-xl font-bold transition-all ${activeTab === 'history'
                      ? 'bg-orange-600 text-white'
                      : 'bg-white/5 text-orange-200/60 hover:bg-white/10'
                      }`}
                  >
                    歷史紀錄
                  </button>
                </div>

                {/* 保養提醒列表 */}
                {activeTab === 'reminders' && (
                  <div className="grid md:grid-cols-2 gap-4">
                    {reminders.map(reminder => {
                      const isReplacement = reminder.type.name === '器材更換';

                      if (isReplacement) {
                        return (
                          <div
                            key={reminder.type.id}
                            onClick={() => setSelectedHistoryType(reminder.type)}
                            className="p-4 rounded-2xl border bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer group"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-bold text-white group-hover:text-orange-400 transition-colors">
                                  {reminder.type.name}
                                </h4>
                                <p className="text-sm text-orange-200/40">{reminder.type.description}</p>
                              </div>
                              <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/60 transition-colors" />
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="opacity-60">最近一次更換</span>
                                <span className="font-mono font-bold text-white">
                                  {reminder.lastService?.service_date || '尚無紀錄'}
                                </span>
                              </div>
                              <div className="text-xs text-center p-1.5 rounded-lg bg-black/20 text-orange-200/40 font-medium">
                                點擊查看更換歷史
                              </div>
                            </div>
                          </div>
                        );
                      }

                      const StatusIcon = statusIcons[reminder.status];
                      return (
                        <div
                          key={reminder.type.id}
                          onClick={() => setSelectedHistoryType(reminder.type)}
                          className={`p-4 rounded-2xl border ${statusColors[reminder.status]} cursor-pointer transition-transform hover:scale-[1.02]`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-bold text-white">{reminder.type.name}</h4>
                              <p className="text-sm opacity-60">{reminder.type.description}</p>
                            </div>
                            <div className={`flex items-center gap-1 text-sm font-bold`}>
                              <StatusIcon className="w-4 h-4" />
                              {statusLabels[reminder.status]}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="opacity-60">距上次保養</span>
                              <span className="font-mono font-bold">
                                {reminder.mileageSinceService.toLocaleString()} km
                              </span>
                            </div>
                            <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${reminder.status === 'overdue' ? 'bg-red-500' :
                                  reminder.status === 'due_soon' ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                style={{ width: `${Math.min(reminder.percentageUsed, 100)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-xs opacity-40">
                              <span>0 km</span>
                              <div
                                className="flex items-center gap-1 group/interval"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {editingTypeId === reminder.type.id ? (
                                  <div className="flex items-center gap-1 bg-black/40 rounded-lg p-1 -m-1">
                                    <input
                                      type="number"
                                      value={editInterval}
                                      onChange={(e) => setEditInterval(e.target.value)}
                                      className="w-16 bg-transparent border-none text-right font-mono font-bold text-white focus:ring-0 p-0 text-xs"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleSaveInterval(selectedBike.id, reminder.type.id)}
                                      disabled={isSaving}
                                      className="text-green-400 hover:text-green-300 transition-colors"
                                    >
                                      {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                    </button>
                                    <button
                                      onClick={() => setEditingTypeId(null)}
                                      className="text-red-400 hover:text-red-300 transition-colors"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <span>{reminder.nextServiceMileage.toLocaleString()} km (每 {((reminder.nextServiceMileage - (reminder.lastService?.mileage_at_service || 0))).toLocaleString()} km)</span>
                                    <button
                                      onClick={() => handleStartEdit(reminder.type.id, (reminder.nextServiceMileage - (reminder.lastService?.mileage_at_service || 0)))}
                                      className="opacity-0 group-hover/interval:opacity-100 p-0.5 hover:bg-white/10 rounded transition-all"
                                      title="編輯里程間隔"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 歷史紀錄列表 */}
                {activeTab === 'history' && (
                  <div className="space-y-3">
                    {bikeRecords.length === 0 ? (
                      <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
                        <Calendar className="w-12 h-12 text-orange-200/20 mx-auto mb-3" />
                        <p className="text-orange-200/40">尚無保養紀錄</p>
                      </div>
                    ) : (
                      bikeRecords.map(record => {
                        const type = maintenanceTypes.find(t => t.id === record.maintenance_type);
                        return (
                          <div
                            key={record.id}
                            className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="bg-orange-600/20 p-2 rounded-xl">
                                <Wrench className="w-5 h-5 text-orange-400" />
                              </div>
                              <div>
                                <h4 className="font-bold text-white">{type?.name || record.maintenance_type}</h4>
                                <div className="flex items-center gap-3 text-sm text-orange-200/50">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {record.service_date}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {record.mileage_at_service.toLocaleString()} km
                                  </span>
                                  {record.cost && (
                                    <span className="flex items-center gap-1">
                                      <DollarSign className="w-3 h-3" />
                                      ${record.cost}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditMaintenance(record)}
                                className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-xl transition-all"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('確定要刪除此筆保養紀錄嗎？')) {
                                    deleteMaintenanceRecord(record.id);
                                  }
                                }}
                                className="p-2 text-red-400 hover:bg-red-500/20 rounded-xl transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 bg-white/5 border border-white/10 rounded-3xl">
                <Bike className="w-16 h-16 text-orange-200/20 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">請選擇一台腳踏車</h3>
                <p className="text-orange-200/40">從左側列表選擇要查看的腳踏車</p>
              </div>
            )}
          </div>
        </div>
      )
      }

      {/* 編輯腳踏車 Modal */}
      {
        isEditModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">編輯單車資訊</h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-all"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-orange-200/60 mb-2">車架品牌</label>
                  <input
                    type="text"
                    value={editFormData.brand}
                    onChange={e => setEditFormData(prev => ({ ...prev, brand: e.target.value }))}
                    placeholder="例：Factor"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-orange-200/60 mb-2">車架型號</label>
                  <input
                    type="text"
                    value={editFormData.model}
                    onChange={e => setEditFormData(prev => ({ ...prev, model: e.target.value }))}
                    placeholder="例：O2"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-orange-200/60 mb-2">變速系統</label>
                  <input
                    type="text"
                    value={editFormData.groupset_name}
                    onChange={e => setEditFormData(prev => ({ ...prev, groupset_name: e.target.value }))}
                    placeholder="例：Shimano Dura-Ace Di2"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-orange-200/60 mb-2">購買地點</label>
                  <input
                    type="text"
                    value={editFormData.shop_name}
                    onChange={e => setEditFormData(prev => ({ ...prev, shop_name: e.target.value }))}
                    placeholder="例：永興車行"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-orange-200/60 mb-2">金額</label>
                  <input
                    type="number"
                    value={editFormData.price}
                    onChange={e => setEditFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-orange-200/60 mb-2">備註 / 其他</label>
                  <textarea
                    value={editFormData.remarks}
                    onChange={e => setEditFormData(prev => ({ ...prev, remarks: e.target.value }))}
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white py-3 rounded-xl font-bold transition-all"
                >
                  儲存變更
                </button>
              </form>
            </div>
          </div>
        )
      }

      {/* 新增保養紀錄 Modal */}
      {
        isAddModalOpen && selectedBike && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  {editingRecordId ? '編輯保養紀錄' : '新增保養紀錄'}
                </h3>
                <button
                  onClick={resetForm}
                  className="p-2 hover:bg-white/10 rounded-xl transition-all"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-orange-200/60 mb-3">保養項目（可多選）</label>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 bg-white/5 rounded-2xl border border-white/10 max-h-[30vh] overflow-y-auto">
                    {/* 全車保養選項 */}
                    <label className="flex items-center space-x-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        value="full"
                        checked={formData.maintenance_type.includes('full')}
                        onChange={e => {
                          const checked = e.target.checked;
                          setFormData(prev => {
                            const types = prev.maintenance_type.filter((t: string) => t !== 'full');
                            if (checked) types.push('full');
                            return { ...prev, maintenance_type: types };
                          });
                        }}
                        className="w-5 h-5 rounded border-white/20 bg-white/5 text-orange-600 focus:ring-orange-500 group-hover:border-orange-500 transition-colors"
                      />
                      <span className="text-white font-medium group-hover:text-orange-400 transition-colors">全車保養</span>
                    </label>
                    {/* 其他保養項目 */}
                    {maintenanceTypes.map(type => (
                      <label key={type.id} className="flex items-center space-x-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          value={type.id}
                          checked={formData.maintenance_type.includes(type.id)}
                          onChange={e => {
                            const checked = e.target.checked;
                            setFormData(prev => {
                              const types = [...prev.maintenance_type];
                              if (checked) {
                                if (!types.includes(type.id)) types.push(type.id);
                              } else {
                                const idx = types.indexOf(type.id);
                                if (idx > -1) types.splice(idx, 1);
                              }
                              return { ...prev, maintenance_type: types };
                            });
                          }}
                          className="w-5 h-5 rounded border-white/20 bg-white/5 text-orange-600 focus:ring-orange-500 group-hover:border-orange-500 transition-colors"
                        />
                        <span className="text-white group-hover:text-orange-200 transition-colors">{type.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-orange-200/60 mb-2">保養日期</label>
                    <input
                      type="date"
                      value={formData.service_date}
                      onChange={e => setFormData(prev => ({ ...prev, service_date: e.target.value }))}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-orange-200/60 mb-2">費用 (選填)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">$</span>
                      <input
                        type="number"
                        value={formData.cost}
                        onChange={e => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                        placeholder="0"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-orange-200/60 mb-2">店家名稱 (選填)</label>
                    <input
                      type="text"
                      value={formData.shop_name}
                      onChange={e => setFormData(prev => ({ ...prev, shop_name: e.target.value }))}
                      placeholder="例：永興車行"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer mb-3 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.is_diy}
                      onChange={e => setFormData(prev => ({ ...prev, is_diy: e.target.checked }))}
                      className="w-5 h-5 rounded border-white/20 bg-white/5 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-white font-bold text-sm">自己 DIY</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-orange-200/60 mb-2">備註 (選填)</label>
                    <input
                      type="text"
                      value={formData.notes}
                      onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="簡單備註..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-orange-200/60 mb-2">其他（選填）</label>
                    <input
                      type="text"
                      value={formData.other || ''}
                      onChange={e => setFormData(prev => ({ ...prev, other: e.target.value }))}
                      placeholder="其他資訊"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-orange-900/40 mt-2"
                >
                  {editingRecordId ? '儲存變更' : '儲存紀錄'}
                </button>
              </form>
            </div>
          </div>
        )
      }

      {/* 歷史紀錄詳情 Modal (器材更換) */}
      {selectedHistoryType && selectedBike && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">{selectedHistoryType.name}紀錄</h3>
                <p className="text-orange-200/50 text-sm">歷史更換清單</p>
              </div>
              <button
                onClick={() => setSelectedHistoryType(null)}
                className="p-2 hover:bg-white/10 rounded-xl transition-all"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {bikeRecords.filter(r => r.maintenance_type === selectedHistoryType.id || r.maintenance_type.includes(selectedHistoryType.id)).length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-white/30">尚無相關紀錄</p>
                </div>
              ) : (
                bikeRecords
                  .filter(r => r.maintenance_type === selectedHistoryType.id || r.maintenance_type.includes(selectedHistoryType.id))
                  .map(record => (
                    <div
                      key={record.id}
                      className="p-4 bg-white/5 border border-white/10 rounded-xl"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-white font-bold">{record.service_date}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedHistoryType(null); // 先關閉此 Modal
                              handleEditMaintenance(record); // 開啟編輯 Modal
                            }}
                            className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('確定要刪除此筆紀錄嗎？')) {
                                deleteMaintenanceRecord(record.id);
                              }
                            }}
                            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="text-sm text-orange-200/60 space-y-1">
                        {record.maintenance_type !== selectedHistoryType.id && !record.maintenance_type.includes('全車保養') && (
                          <p className="text-white/80">{record.maintenance_type}</p>
                        )}
                        <p>里程：{record.mileage_at_service.toLocaleString()} km</p>
                        {record.cost && <p>費用：${record.cost}</p>}
                        {record.shop_name && <p>店家：{record.shop_name}</p>}
                        {record.notes && <p className="text-white/50 pt-1 border-t border-white/5 mt-1">{record.notes}</p>}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
      {/* 輪組編輯 Modal */}
      {editingWheelset && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">編輯輪組資訊</h3>
              <button
                onClick={() => setEditingWheelset(null)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-orange-200/60 mb-1">
                  名稱 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={wheelsetFormData.name}
                  onChange={(e) => setWheelsetFormData({ ...wheelsetFormData, name: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/20 focus:outline-none focus:border-orange-500 transition-colors"
                  placeholder="輸入輪組名稱"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-orange-200/60 mb-1">品牌</label>
                <input
                  type="text"
                  value={wheelsetFormData.brand}
                  onChange={(e) => setWheelsetFormData({ ...wheelsetFormData, brand: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/20 focus:outline-none focus:border-orange-500 transition-colors"
                  placeholder="例如: Zipp, Shimano"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-orange-200/60 mb-1">型號</label>
                <input
                  type="text"
                  value={wheelsetFormData.model}
                  onChange={(e) => setWheelsetFormData({ ...wheelsetFormData, model: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/20 focus:outline-none focus:border-orange-500 transition-colors"
                  placeholder="例如: 404 Firecrest, Dura-Ace C50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-orange-200/60 mb-1">目前里程 (m)</label>
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white/60 font-mono">
                  {editingWheelset.distance.toLocaleString()} m
                </div>
                <p className="text-xs text-orange-200/40 mt-1">里程會隨對應單車自動累計，不可手動修改。</p>
              </div>

              <div className="pt-4 border-t border-white/10">
                <h4 className="text-sm font-bold text-white mb-3">輪胎資訊</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-orange-200/60 mb-1">輪胎品牌</label>
                    <input
                      type="text"
                      value={wheelsetFormData.tire_brand}
                      onChange={(e) => setWheelsetFormData({ ...wheelsetFormData, tire_brand: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/20 focus:outline-none focus:border-orange-500 transition-colors"
                      placeholder="例如: Continental, Vittoria"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-orange-200/60 mb-1">規格</label>
                    <input
                      type="text"
                      value={wheelsetFormData.tire_specs}
                      onChange={(e) => setWheelsetFormData({ ...wheelsetFormData, tire_specs: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/20 focus:outline-none focus:border-orange-500 transition-colors"
                      placeholder="例如: 700x25c"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-orange-200/60 mb-1">類型</label>
                    <select
                      value={wheelsetFormData.tire_type}
                      onChange={(e) => setWheelsetFormData({ ...wheelsetFormData, tire_type: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500 transition-colors appearance-none"
                    >
                      <option value="">請選擇</option>
                      <option value="內胎 (Tube)">內胎 (Tube)</option>
                      <option value="無內胎 (Tubeless)">無內胎 (Tubeless)</option>
                      <option value="管胎 (Tubular)">管胎 (Tubular)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/10 bg-white/5 flex gap-3">
              <button
                onClick={() => setEditingWheelset(null)}
                className="flex-1 px-4 py-2 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white transition-all"
              >
                取消
              </button>
              <button
                onClick={handleUpdateWheelset}
                disabled={!wheelsetFormData.name}
                className="flex-1 px-4 py-2 rounded-xl font-bold bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                儲存變更
              </button>
            </div>
          </div>
        </div>
      )}
    </div >
  );
};

export default MaintenanceDashboard;
