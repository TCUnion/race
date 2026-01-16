import React, { useState } from 'react';
import { useMaintenance, StravaBike, MaintenanceReminder } from '../../hooks/useMaintenance';
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
    maintenanceTypes,
    records,
    loading,
    error,
    addMaintenanceRecord,
    deleteMaintenanceRecord,
    updateMaintenanceSetting,
    getRecordsByBike,
    getMaintenanceReminders,
    getAlertCount
  } = useMaintenance();

  const [selectedBikeId, setSelectedBikeId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'reminders' | 'history'>('reminders');
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editInterval, setEditInterval] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

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

    await addMaintenanceRecord({
      bike_id: selectedBike.id,
      athlete_id: Number(athlete.id),
      maintenance_type: maintenanceTypeValue,
      service_date: formData.service_date,
      mileage_at_service: selectedBike.converted_distance || (selectedBike.distance / 1000),
      cost: formData.cost ? parseFloat(formData.cost) : undefined,
      shop_name: formData.shop_name || undefined,
      notes: formData.notes || undefined,
      other: formData.other || undefined,
      is_diy: formData.is_diy
    });

    setFormData({
      maintenance_type: [],
      service_date: new Date().toISOString().split('T')[0],
      cost: '',
      shop_name: '',
      notes: '',
      other: '',
      is_diy: false
    });
    setIsAddModalOpen(false);
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
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{selectedBike.name}</h2>
                      <p className="text-orange-200/60">
                        總里程：<span className="text-white font-mono font-bold">
                          {(selectedBike.converted_distance || selectedBike.distance / 1000).toLocaleString()}
                        </span> km
                      </p>
                    </div>
                    <button
                      onClick={() => setIsAddModalOpen(true)}
                      className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl font-bold transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      新增保養
                    </button>
                  </div>
                </div>

                {/* 標籤切換 */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('reminders')}
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
                      const StatusIcon = statusIcons[reminder.status];
                      return (
                        <div
                          key={reminder.type.id}
                          className={`p-4 rounded-2xl border ${statusColors[reminder.status]}`}
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
                              <div className="flex items-center gap-1 group/interval">
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
                            <button
                              onClick={() => deleteMaintenanceRecord(record.id)}
                              className="p-2 text-red-400 hover:bg-red-500/20 rounded-xl transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
      )}

      {/* 新增保養紀錄 Modal */}
      {isAddModalOpen && selectedBike && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">新增保養紀錄</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-all"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-orange-200/60 mb-2">保養項目（可多選）</label>
                <div className="grid grid-cols-1 gap-2">
                  {/* 全車保養選項 */}
                  <label className="flex items-center space-x-2">
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
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-white">全車保養</span>
                  </label>
                  {/* 其他保養項目 */}
                  {maintenanceTypes.map(type => (
                    <label key={type.id} className="flex items-center space-x-2">
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
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-white">{type.name}</span>
                    </label>
                  ))}
                </div>
              </div>

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
                <input
                  type="number"
                  value={formData.cost}
                  onChange={e => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                  placeholder="0"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-orange-200/60 mb-2">店家名稱 (選填)</label>
                <input
                  type="text"
                  value={formData.shop_name}
                  onChange={e => setFormData(prev => ({ ...prev, shop_name: e.target.value }))}
                  placeholder="例：永興車行"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-orange-200/60 mb-2">備註 (選填)</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none resize-none"
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
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_diy}
                  onChange={e => setFormData(prev => ({ ...prev, is_diy: e.target.checked }))}
                  className="w-5 h-5 rounded border-white/20 bg-white/5 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-white">自己 DIY 保養</span>
              </label>

              <button
                type="submit"
                className="w-full bg-orange-600 hover:bg-orange-500 text-white py-3 rounded-xl font-bold transition-all"
              >
                儲存紀錄
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceDashboard;
