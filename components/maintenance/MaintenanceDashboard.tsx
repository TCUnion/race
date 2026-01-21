import React, { useState, useEffect } from 'react';
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
  Save,
  Download,
  Upload,
  FileText
} from 'lucide-react';
import { exportToCSV, parseCSV, downloadFile } from '../../lib/csvUtils';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Item Component
const SortableMaintenanceItem: React.FC<{
  id: string;
  children: React.ReactNode;
}> = ({
  id,
  children
}) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging
    } = useSortable({ id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 10 : 1,
      opacity: isDragging ? 0.5 : 1
    };

    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        {children}
      </div>
    );
  };

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
    calculateMetricsSinceDate,
    calculateMetricsBetweenDates,
    calculateTotalDistanceAtDate,
    refresh: fetchData,
    updateAppSetting,
    getAppSetting,
    appSettings
  } = useMaintenance();

  // 排序狀態
  const [orderedTypeIds, setOrderedTypeIds] = useState<string[]>([]);

  useEffect(() => {
    // 1. Load from App Settings (Supabase)
    const savedOrder = getAppSetting('maintenance_order');
    let initialOrder: string[] = [];

    // Check if savedOrder is an array (JSONB from DB)
    if (savedOrder && Array.isArray(savedOrder)) {
      initialOrder = savedOrder;
    } else if (typeof savedOrder === 'string') {
      // Fallback for potentially stringified data or localStorage migration if needed
      try {
        initialOrder = JSON.parse(savedOrder);
      } catch (e) {
        console.error('Failed to parse maintenance order', e);
      }
    } else {
      // Fallback to localStorage if not found in DB (migration path)
      const localOrder = localStorage.getItem('maintenance_order');
      if (localOrder) {
        try {
          initialOrder = JSON.parse(localOrder);
          // Optional: Migrate to DB immediately? 
          // Let's just respect local storage as a fallback data source
        } catch (e) {
          console.error('Failed to parse local maintenance order', e);
        }
      }
    }

    // 2. Sync with currently available maintenanceTypes
    // Filter out obsolete IDs and add new ones
    const currentTypeIds = maintenanceTypes
      .filter(type =>
        type.id !== 'full_service' &&
        type.id !== 'wheel_check' &&
        !type.name.includes('輪框檢查')
      )
      .map(t => t.id);

    // Filter valid saved IDs
    const validSavedOrder = initialOrder.filter(id => currentTypeIds.includes(id));

    // Find new IDs that are not in saved order
    const newIds = currentTypeIds.filter(id => !validSavedOrder.includes(id));

    // Combine valid saved IDs + new IDs
    const finalOrder = [...validSavedOrder, ...newIds];

    setOrderedTypeIds(finalOrder);
  }, [maintenanceTypes, appSettings, getAppSetting]); // Re-run when maintenanceTypes or settings change

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement to start drag, preventing accidental drags during clicks
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setOrderedTypeIds((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over?.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);

        // Save to Supabase
        updateAppSetting('maintenance_order', newOrder).catch(err => {
          console.error("Failed to save order to Supabase", err);
          // Fallback to localStorage just in case of offline/error
          localStorage.setItem('maintenance_order', JSON.stringify(newOrder));
        });

        // Also update localStorage for immediate redundancy/optimistic UI feels (though state update handles UI)
        localStorage.setItem('maintenance_order', JSON.stringify(newOrder));

        return newOrder;
      });
    }
  };

  const [selectedBikeId, setSelectedBikeId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'reminders' | 'history'>('reminders');
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editInterval, setEditInterval] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedHistoryType, setSelectedHistoryType] = useState<MaintenanceType | null>(null);
  const [returnToHistoryType, setReturnToHistoryType] = useState<MaintenanceType | null>(null);

  // 輪組編輯狀態
  const [editingWheelset, setEditingWheelset] = useState<Wheelset | null>(null);
  const [wheelsetFormData, setWheelsetFormData] = useState({
    name: '',
    brand: '',
    model: '',
    tire_brand: '',
    tire_specs: '',
    tire_type: '',
    active_date: ''
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
        tire_type: editingWheelset.tire_type || '',
        active_date: editingWheelset.active_date || ''
      });
    }
  }, [editingWheelset]);

  const handleUpdateWheelset = async () => {
    if (!editingWheelset) return;
    try {
      const updates = { ...wheelsetFormData };
      if (updates.active_date === '') {
        updates.active_date = undefined;
      }
      await updateWheelset(editingWheelset.id, updates);
      setEditingWheelset(null);
    } catch (err) {
      console.error('更新輪組失敗:', err);
      alert('更新失敗，請稍後再試');
    }
  };

  const selectedBike = bikes.find(b => b.id === selectedBikeId);
  const reminders = selectedBike ? getMaintenanceReminders(selectedBike) : [];
  const bikeRecords = selectedBike ? getRecordsByBike(selectedBike.id) : [];

  // 處理與過濾保養項目
  const displayMaintenanceTypes = maintenanceTypes
    .filter(type =>
      type.id !== 'full_service' &&
      type.id !== 'wheel_check' &&
      !type.name.includes('輪框檢查')
    )
    .map(type => {
      if (type.id === 'gear_replacement' || type.name === '器材更換') {
        return { ...type, name: '其他' };
      }
      return type;
    });

  // Sort reminders based on orderedTypeIds
  const sortedReminders = [...reminders].sort((a, b) => {
    const indexA = orderedTypeIds.indexOf(a.type.id);
    const indexB = orderedTypeIds.indexOf(b.type.id);
    // If not found in order list (shouldn't happen with sync logic), put at end
    const safeIndexA = indexA === -1 ? 999 : indexA;
    const safeIndexB = indexB === -1 ? 999 : indexB;
    return safeIndexA - safeIndexB;
  });

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
    details: {} as Record<string, { brand: string; model: string; other: string }>,
    service_date: new Date().toISOString().split('T')[0],
    cost: '',
    shop_name: 'seh STUDIO',
    notes: '',
    other: '',
    is_diy: false,
    wheelset_id: ''
  });

  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [targetType, setTargetType] = useState<any>(null);

  const resetForm = () => {
    setFormData({
      maintenance_type: [],
      details: {},
      service_date: new Date().toISOString().split('T')[0],
      cost: '',
      shop_name: 'seh STUDIO',
      notes: '',
      other: '',
      is_diy: false
    });
    setEditingRecordId(null);
    setTargetType(null);
    setIsAddModalOpen(false);
  };

  const handleEditMaintenance = (record: any) => {
    if (selectedHistoryType) {
      setReturnToHistoryType(selectedHistoryType);
      setSelectedHistoryType(null);
    }
    const typeList = record.maintenance_type.split(', ');

    const detailsMap: Record<string, { brand: string; model: string; other: string }> = {};
    if (record.parts_details && Array.isArray(record.parts_details)) {
      record.parts_details.forEach((d: any) => {
        detailsMap[d.type_id] = {
          brand: d.brand || '',
          model: d.model || '',
          other: d.other || ''
        };
      });
    }

    setFormData({
      maintenance_type: typeList,
      details: detailsMap,
      service_date: record.service_date,
      cost: record.cost ? record.cost.toString() : '',
      shop_name: record.shop_name || '',
      notes: record.notes || '',
      other: record.other || '',
      is_diy: record.is_diy || false,
      wheelset_id: record.wheelset_id || ''
    });

    // 如果是單一保養項目，自動設定 targetType 進入顯示專用模式
    if (typeList.length === 1 && !typeList[0].includes('full')) {
      const singleType = displayMaintenanceTypes.find(t => t.id === typeList[0]);
      if (singleType) {
        setTargetType(singleType);
      }
    }

    setEditingRecordId(record.id);
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBike) return;

    const athleteData = localStorage.getItem('strava_athlete_meta');
    if (!athleteData) return;
    const athlete = JSON.parse(athleteData);

    const selectedTypes = formData.maintenance_type as string[];

    // 移除不合理的強制檢查
    if (selectedTypes.length === 0) {
      alert('請至少選擇一個保養項目');
      return;
    }

    // 決定維修類型字串
    // 儲存為逗號分隔的 ID 列表 (例如: "chain_lube, tire_change")
    const maintenanceTypeValue = selectedTypes.join(', ');

    // 準備 parts_details
    const parts_details = selectedTypes.map(typeId => {
      const detail = formData.details[typeId] || { brand: '', model: '', other: '' };
      return {
        type_id: typeId,
        brand: detail.brand,
        model: detail.model,
        other: detail.other
      };
    });

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
      is_diy: formData.is_diy,
      parts_details: parts_details,
      wheelset_id: formData.wheelset_id || undefined
    };

    try {
      if (editingRecordId) {
        await updateMaintenanceRecord(editingRecordId, recordData);
      } else {
        await addMaintenanceRecord(recordData);
      }

      // 如果勾選了輪胎更換且有選擇輪組，連動更新輪組的輪胎資訊
      if (selectedTypes.includes('tires') && formData.wheelset_id) {
        const tireDetail = formData.details['tires'];
        if (tireDetail && (tireDetail.brand || tireDetail.model)) {
          await updateWheelset(formData.wheelset_id, {
            tire_brand: tireDetail.brand,
            tire_specs: tireDetail.model
          });
        }
      }

      resetForm();
      if (returnToHistoryType) {
        setSelectedHistoryType(returnToHistoryType);
        setReturnToHistoryType(null);
      }
      fetchData();
    } catch (err) {
      console.error('儲存紀錄失敗:', err);
    }
  };

  // CSV 匯出處理
  const handleExportCSV = () => {
    if (!selectedBike) return;
    const bikeRecords = getRecordsByBike(selectedBike.id);

    // 轉換保養項目名稱為中文
    const exportRecords = bikeRecords.map(record => {
      let displayName = record.maintenance_type;

      // 嘗試解析顯示名稱邏輯 (與列表顯示共用)
      if (record.maintenance_type === '全車保養' || record.maintenance_type.startsWith('全車保養')) {
        displayName = '全車保養';
      } else {
        const typeIds = record.maintenance_type.split(',').map(s => s.trim());
        const names = typeIds.map(id => {
          const t = maintenanceTypes.find(type => type.id === id);
          return t ? t.name : id;
        });
        displayName = names.join(' + ');
      }

      if (displayName.includes('gear_replacement')) {
        displayName = displayName.replace('gear_replacement', '器材更換');
      }

      return {
        ...record,
        maintenance_type: displayName
      };
    });

    const csvContent = exportToCSV(exportRecords);
    const fileName = `maintenance_records_${selectedBike.name}_${new Date().toISOString().split('T')[0]}.csv`;
    downloadFile(csvContent, fileName);
  };

  // CSV 匯入處理
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBike) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvString = event.target?.result as string;
      const parsedRecords = parseCSV(csvString);

      if (parsedRecords.length === 0) {
        alert('CSV 格式不正確或無有效紀錄');
        setIsImporting(false);
        return;
      }

      if (confirm(`確定要匯入 ${parsedRecords.length} 筆紀錄嗎？`)) {
        try {
          const athleteData = localStorage.getItem('strava_athlete_meta');
          if (!athleteData) return;
          const athlete = JSON.parse(athleteData);

          // 批次匯入 (使用 Promise.all 並行執行提升速度)
          const importPromises = parsedRecords.map(record => {
            let typeId = record.maintenance_type;

            // 1. 嘗試直接對應 ID (如果 CSV 是舊版或英文)
            // 2. 嘗試反向查找中文名稱
            const foundType = maintenanceTypes.find(t => t.name === record.maintenance_type);
            if (foundType) {
              typeId = foundType.id;
            } else if (record.maintenance_type === '全車保養') {
              typeId = 'full_service';
            } else if (record.maintenance_type.includes(' + ')) {
              // 處理組合項目 (例如: 鍊條上油 + 飛輪清潔)
              const names = record.maintenance_type.split(' + ');
              const ids = names.map(name => {
                const t = maintenanceTypes.find(type => type.name === name);
                return t ? t.id : name; // 找不到則保留原值
              });
              typeId = ids.join(',');
            }

            return addMaintenanceRecord({
              ...record,
              maintenance_type: typeId,
              bike_id: selectedBike.id,
              athlete_id: String(athlete.id)
            });
          });

          await Promise.all(importPromises);
          alert('匯入成功！');
        } catch (err) {
          console.error('匯入出錯:', err);
          alert('部分紀錄匯入失敗');
        }
      }
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // 編輯腳踏車表單狀態
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
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

  const handleEditClick = (bike: StravaBike) => {
    // 解析現有的 groupset_name
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

    // 解析現有的 power_meter
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

    setEditFormData({
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
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.id) return;

    try {
      // 組合變速系統名稱：[品牌] [速別] [型號]
      const { groupset_brand, groupset_speed, groupset_model } = editFormData;
      const combinedGroupset = `${groupset_brand} ${groupset_speed} ${groupset_model}`.trim().replace(/\s+/g, ' ');

      // 組合功率計名稱：[類型] [明細]
      let combinedPower = '';
      if (editFormData.power_meter_type === '無') {
        combinedPower = '無';
      } else {
        combinedPower = `${editFormData.power_meter_type} ${editFormData.power_meter_detail}`.trim();
      }

      await updateBike(editFormData.id, {
        brand: editFormData.brand || undefined,
        model: editFormData.model || undefined,
        groupset_name: combinedGroupset || undefined,
        power_meter: combinedPower || undefined,
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

            {/* 輪組設定區塊 (從右側移至於此) */}
            {selectedBike && (
              <div className="mt-8 pt-8 border-t border-white/10">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-orange-500 rounded-full"></div>
                  輪組設定
                </h3>
                <div className="space-y-3">
                  {/* 專屬輪組列表 */}
                  {wheelsets.filter(ws => ws.bike_id === selectedBike.id).map(ws => (
                    <div key={ws.id} className="flex flex-col gap-2 bg-black/20 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                      {/* 輪組項目內容 (與原本相同) */}
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
                              <div className="flex flex-wrap gap-2 text-xs text-orange-200/40">
                                <span>{ws.brand || '---'} / {ws.model || '---'}</span>
                                <span>•</span>
                                <span>里程: {ws.distance.toLocaleString()} m</span>
                                {ws.active_date && (
                                  <>
                                    <span>•</span>
                                    <span>啟用: {ws.active_date}</span>
                                  </>
                                )}
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
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 通用輪組列表 */}
                  {wheelsets.filter(ws => !ws.bike_id).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <h4 className="text-sm font-bold text-orange-200/60 mb-2">通用輪組庫</h4>
                      {wheelsets.filter(ws => !ws.bike_id).map(ws => (
                        <div key={ws.id} className="flex flex-col gap-2 bg-black/20 p-3 mb-2 rounded-xl border border-white/5 hover:border-white/10 transition-all">
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
                                  <span className="text-[10px] bg-white/10 text-white/50 px-1.5 py-0.5 rounded">通用</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <div className="flex flex-wrap gap-2 text-xs text-orange-200/40">
                                    <span>{ws.brand || '---'} / {ws.model || '---'}</span>
                                    <span>•</span>
                                    <span>里程: {ws.distance.toLocaleString()} m</span>
                                  </div>
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
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2 mt-2">
                    <button
                      onClick={async () => {
                        const existingCount = wheelsets.filter(ws => ws.bike_id === selectedBike.id).length;
                        const newItem = await addWheelset({
                          athlete_id: JSON.parse(localStorage.getItem('strava_athlete_meta') || '{}').id,
                          bike_id: selectedBike.id,
                          name: `輪組 ${existingCount + 1}`,
                          brand: '',
                          model: '',
                          distance: 0,
                          is_active: false
                        });
                        setEditingWheelset(newItem);
                      }}
                      className="py-2.5 sm:py-3 border-2 border-dashed border-white/10 rounded-xl text-orange-200/40 hover:text-white hover:border-orange-500/50 hover:bg-orange-500/5 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm font-bold"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden xs:inline">新增</span>專屬輪組
                    </button>
                    <button
                      onClick={async () => {
                        const existingCount = wheelsets.filter(ws => !ws.bike_id).length;
                        const newItem = await addWheelset({
                          athlete_id: JSON.parse(localStorage.getItem('strava_athlete_meta') || '{}').id,
                          bike_id: null,
                          name: `通用輪組 ${existingCount + 1}`,
                          brand: '',
                          model: '',
                          distance: 0,
                          is_active: false
                        });
                        setEditingWheelset(newItem);
                      }}
                      className="py-2.5 sm:py-3 border-2 border-dashed border-white/10 rounded-xl text-orange-200/40 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm font-bold"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden xs:inline">新增</span>通用輪組
                    </button>
                  </div>
                </div>
              </div>
            )}
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

                      {/* 顯示單車詳細配置 */}
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-sm mt-4 p-4 bg-black/20 rounded-2xl border border-white/5">
                        <div className="flex flex-col">
                          <span className="text-orange-200/40 text-xs font-bold uppercase tracking-wider mb-1">品牌</span>
                          <span className="text-white font-medium">{selectedBike.brand || '-'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-orange-200/40 text-xs font-bold uppercase tracking-wider mb-1">型號</span>
                          <span className="text-white font-medium">{selectedBike.model || '-'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-orange-200/40 text-xs font-bold uppercase tracking-wider mb-1">變速系統</span>
                          <span className="text-white font-medium">{selectedBike.groupset_name || '-'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-orange-200/40 text-xs font-bold uppercase tracking-wider mb-1">功率計</span>
                          <span className="text-white font-medium">{selectedBike.power_meter || '-'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-orange-200/40 text-xs font-bold uppercase tracking-wider mb-1">購買地點</span>
                          <span className="text-white font-medium">{selectedBike.shop_name || '-'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-orange-200/40 text-xs font-bold uppercase tracking-wider mb-1">金額</span>
                          <span className="text-white font-medium">
                            {selectedBike.price ? `$${selectedBike.price.toLocaleString()}` : '-'}
                          </span>
                        </div>
                        {selectedBike.remarks && (
                          <div className="flex flex-col col-span-2 lg:col-span-3 pt-2 border-t border-white/5">
                            <span className="text-orange-200/40 text-xs font-bold uppercase tracking-wider mb-1">備註</span>
                            <span className="text-white/80 font-medium whitespace-pre-wrap">{selectedBike.remarks}</span>
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

                </div>

                {/* 標籤切換 */}
                <div className="flex gap-2">
                  <button
                    className={`px-4 py-2 rounded-xl font-bold transition-all ${activeTab === 'reminders'
                      ? 'bg-orange-600 text-white'
                      : 'bg-white/5 text-orange-200/60 hover:bg-white/10'
                      }`}
                    onClick={() => setActiveTab('reminders')}
                  >
                    保養提醒
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 rounded-xl font-bold transition-all ${activeTab === 'history'
                      ? 'bg-orange-600 text-white'
                      : 'bg-white/5 text-orange-200/60 hover:text-white rounded-xl border border-white/10'
                      }`}
                  >
                    歷史紀錄
                  </button>
                  {activeTab === 'history' && selectedBike && (
                    <div className="flex gap-2 ml-auto">
                      <input
                        type="file"
                        accept=".csv"
                        ref={fileInputRef}
                        onChange={handleImportCSV}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isImporting}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-orange-200/60 hover:text-white rounded-xl text-sm transition-all border border-white/10"
                        title="匯入 CSV 紀錄"
                      >
                        {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        匯入
                      </button>
                      <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-orange-200/60 hover:text-white rounded-xl text-sm transition-all border border-white/10"
                        title="下載備份 CSV"
                      >
                        <Download className="w-4 h-4" />
                        匯出
                      </button>
                    </div>
                  )}
                </div>

                {/* 保養提醒列表 */}
                {activeTab === 'reminders' && (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={sortedReminders.map(r => r.type.id)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="grid md:grid-cols-2 gap-4">
                        {sortedReminders.map(reminder => {
                          const isReplacement = reminder.type.name === '器材更換';
                          const StatusIcon = statusIcons[reminder.status];
                          // Wrap content in SortableMaintenanceItem
                          return (
                            <SortableMaintenanceItem key={reminder.type.id} id={reminder.type.id}>
                              {isReplacement ? (
                                <div
                                  onClick={() => setSelectedHistoryType(reminder.type)}
                                  className="p-4 rounded-2xl border bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer group h-full"
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
                              ) : (
                                <div
                                  onClick={() => setSelectedHistoryType(reminder.type)}
                                  className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border ${statusColors[reminder.status]} cursor-pointer transition-transform hover:scale-[1.02] h-full`}
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-bold text-white text-sm sm:text-base">{reminder.type.name}</h4>
                                      <p className="text-xs sm:text-sm opacity-60 truncate">{reminder.type.description}</p>
                                    </div>
                                    <div className={`flex items-center gap-1 text-xs sm:text-sm font-bold shrink-0`}>
                                      <div className="p-1 rounded hover:bg-black/10 cursor-move active:cursor-grabbing hidden sm:block" title="拖曳排序" onClick={e => e.stopPropagation()}>
                                        <div className="flex flex-col gap-[2px]">
                                          <div className="w-3 h-[2px] bg-current opacity-30"></div>
                                          <div className="w-3 h-[2px] bg-current opacity-30"></div>
                                          <div className="w-3 h-[2px] bg-current opacity-30"></div>
                                        </div>
                                      </div>
                                      <StatusIcon className="w-4 h-4" />
                                      <span className="whitespace-nowrap">{statusLabels[reminder.status]}</span>
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
                                              className="p-1.5 bg-orange-500/90 hover:bg-orange-500 text-white shadow-sm rounded-lg transition-all"
                                              title="編輯里程間隔"
                                            >
                                              <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </SortableMaintenanceItem>
                          );
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}

                {/* 歷史紀錄列表 */}
                {activeTab === 'history' && (
                  <div className="overflow-hidden bg-white/5 border border-white/10 rounded-2xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 text-orange-200/80 uppercase font-medium">
                          <tr>
                            <th className="px-4 py-3 whitespace-nowrap">日期</th>
                            <th className="px-4 py-3 whitespace-nowrap">保養項目</th>
                            <th className="px-4 py-3 whitespace-nowrap text-right">里程 (km)</th>
                            <th className="px-4 py-3 whitespace-nowrap text-right">金額</th>
                            <th className="px-4 py-3 whitespace-nowrap">地點/店家</th>
                            <th className="px-4 py-3 whitespace-nowrap text-center">DIY</th>
                            <th className="px-4 py-3 whitespace-nowrap">備註/詳情</th>
                            <th className="px-4 py-3 whitespace-nowrap text-right">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {bikeRecords.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="px-4 py-12 text-center text-orange-200/40">
                                <Calendar className="w-12 h-12 text-orange-200/20 mx-auto mb-3" />
                                尚無保養紀錄
                              </td>
                            </tr>
                          ) : (
                            bikeRecords.map(record => {
                              let displayName = record.maintenance_type;

                              // 嘗試解析顯示名稱
                              if (record.maintenance_type === '全車保養' || record.maintenance_type.startsWith('全車保養')) {
                                displayName = '全車保養';
                              } else {
                                // 解析逗號分隔的 ID
                                const typeIds = record.maintenance_type.split(',').map(s => s.trim());
                                const names = typeIds.map(id => {
                                  const t = maintenanceTypes.find(type => type.id === id);
                                  return t ? t.name : id; // 找不到就顯示 ID
                                });
                                // 如果有多個，用 " + " 連接
                                displayName = names.join(' + ');
                              }

                              // 如果名稱是 gear_replacement，轉換為 "器材更換"
                              if (displayName.includes('gear_replacement')) {
                                displayName = displayName.replace('gear_replacement', '器材更換');
                              }

                              return (
                                <tr key={record.id} className="hover:bg-white/5 transition-colors group">
                                  <td className="px-4 py-3 font-medium text-white whitespace-nowrap tabular-nums">
                                    {record.service_date}
                                  </td>
                                  <td className="px-4 py-3 text-orange-100 font-medium">
                                    {displayName}
                                  </td>
                                  <td className="px-4 py-3 text-right text-orange-200/70 tabular-nums">
                                    {calculateTotalDistanceAtDate(selectedBike, record.service_date).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                  </td>
                                  <td className="px-4 py-3 text-right text-orange-200/70 tabular-nums">
                                    {record.cost ? `$${record.cost}` : '-'}
                                  </td>
                                  <td className="px-4 py-3 text-orange-200/70">
                                    {record.shop_name || '-'}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    {record.is_diy ? (
                                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">是</span>
                                    ) : (
                                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-orange-500/10 text-orange-400">否</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-orange-200/60 max-w-xs truncate" title={record.notes}>
                                    {record.notes || '-'}
                                  </td>
                                  <td className="px-4 py-3 text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => handleEditMaintenance(record)}
                                        className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                                        title="編輯"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (confirm('確定要刪除此筆保養紀錄嗎？')) {
                                            deleteMaintenanceRecord(record.id);
                                          }
                                        }}
                                        className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                        title="刪除"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
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
                  <div className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/10">
                    {/* 品牌選擇 */}
                    <div className="flex flex-wrap gap-2">
                      {['Shimano', 'SRAM', 'Campagnolo', '其他'].map(brand => (
                        <label key={brand} className="flex-1 min-w-[80px]">
                          <input
                            type="radio"
                            name="groupset_brand"
                            value={brand}
                            checked={editFormData.groupset_brand === brand}
                            onChange={e => setEditFormData(prev => ({ ...prev, groupset_brand: e.target.value }))}
                            className="sr-only peer"
                          />
                          <div className="text-center py-2 px-3 rounded-xl border border-white/10 text-sm text-white/60 peer-checked:bg-orange-600/20 peer-checked:border-orange-500 peer-checked:text-white cursor-pointer hover:bg-white/5 transition-all">
                            {brand}
                          </div>
                        </label>
                      ))}
                    </div>

                    {/* 型號輸入 */}
                    <input
                      type="text"
                      value={editFormData.groupset_model}
                      onChange={e => setEditFormData(prev => ({ ...prev, groupset_model: e.target.value }))}
                      placeholder="請輸入型號 (例：Dura-Ace)"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                    />

                    {/* 速別選擇 */}
                    <div className="flex flex-wrap gap-2">
                      {['11速', '12速', '13速', '其他'].map(speed => (
                        <label key={speed} className="flex-1 min-w-[70px]">
                          <input
                            type="radio"
                            name="groupset_speed"
                            value={speed}
                            checked={editFormData.groupset_speed === speed}
                            onChange={e => setEditFormData(prev => ({ ...prev, groupset_speed: e.target.value }))}
                            className="sr-only peer"
                          />
                          <div className="text-center py-2 px-3 rounded-xl border border-white/10 text-sm text-white/60 peer-checked:bg-orange-600/20 peer-checked:border-orange-500 peer-checked:text-white cursor-pointer hover:bg-white/5 transition-all">
                            {speed}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-orange-200/60 mb-2">功率計</label>
                  <div className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/10">
                    {/* 功率計類型選擇 */}
                    <div className="flex flex-wrap gap-2">
                      {['功率大盤', '功率踏板', '功率輪組', '其他', '無'].map(type => (
                        <label key={type} className="flex-1 min-w-[80px]">
                          <input
                            type="radio"
                            name="power_meter_type"
                            value={type}
                            checked={editFormData.power_meter_type === type}
                            onChange={e => setEditFormData(prev => ({ ...prev, power_meter_type: e.target.value }))}
                            className="sr-only peer"
                          />
                          <div className="text-center py-2 px-3 rounded-xl border border-white/10 text-xs text-white/60 peer-checked:bg-orange-600/20 peer-checked:border-orange-500 peer-checked:text-white cursor-pointer hover:bg-white/5 transition-all">
                            {type}
                          </div>
                        </label>
                      ))}
                    </div>

                    {/* 品牌型號輸入 (僅當類型非 '無' 時顯示) */}
                    {editFormData.power_meter_type !== '無' && (
                      <input
                        type="text"
                        value={editFormData.power_meter_detail}
                        onChange={e => setEditFormData(prev => ({ ...prev, power_meter_detail: e.target.value }))}
                        placeholder="請輸入品牌型號 (例：Garmin Rally RS200)"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                      />
                    )}
                  </div>
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
            <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
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
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-bold text-orange-200/60">保養項目</label>
                  </div>

                  {targetType ? (
                    <div className="space-y-3">
                      <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        <span className="text-white font-bold">{targetType.name}</span>
                        <div className="flex gap-2 ml-auto">
                          <span className="text-[10px] px-2 py-0.5 bg-orange-500/20 text-orange-200 rounded-full border border-orange-500/30 uppercase tracking-wider font-bold">單一項目</span>
                        </div>
                      </div>

                      {/* 單一項目的詳細資訊輸入 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                        <div className="space-y-4">
                          <div>
                            <label className="text-xs text-orange-200/50 mb-1.5 block font-bold uppercase tracking-wider">品牌 Brand</label>
                            <input
                              type="text"
                              placeholder="品牌"
                              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none transition-all"
                              value={formData.details[targetType.id]?.brand || ''}
                              onChange={e => setFormData(prev => ({
                                ...prev,
                                details: {
                                  ...prev.details,
                                  [targetType.id]: {
                                    ...(prev.details[targetType.id] || { brand: '', model: '', other: '' }),
                                    brand: e.target.value
                                  }
                                }
                              }))}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-orange-200/50 mb-1.5 block font-bold uppercase tracking-wider">型號 Model</label>
                            <input
                              type="text"
                              placeholder="型號"
                              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none transition-all"
                              value={formData.details[targetType.id]?.model || ''}
                              onChange={e => setFormData(prev => ({
                                ...prev,
                                details: {
                                  ...prev.details,
                                  [targetType.id]: {
                                    ...(prev.details[targetType.id] || { brand: '', model: '', other: '' }),
                                    model: e.target.value
                                  }
                                }
                              }))}
                            />
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <label className="text-xs text-orange-200/50 mb-1.5 block font-bold uppercase tracking-wider">備註 / 其他規格 Remarks</label>
                          <textarea
                            placeholder="其他規格說明..."
                            className="flex-1 w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none transition-all resize-none min-h-[100px]"
                            value={formData.details[targetType.id]?.other || ''}
                            onChange={e => setFormData(prev => ({
                              ...prev,
                              details: {
                                ...prev.details,
                                [targetType.id]: {
                                  ...(prev.details[targetType.id] || { brand: '', model: '', other: '' }),
                                  other: e.target.value
                                }
                              }
                            }))}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-y-3 p-4 bg-white/5 rounded-2xl border border-white/10 max-h-[40vh] overflow-y-auto custom-scrollbar">
                      {/* 全車保養（全選/取消全選） */}
                      <label className="flex items-center space-x-3 cursor-pointer group pb-3 border-b border-white/5">
                        <input
                          type="checkbox"
                          checked={formData.maintenance_type.length === displayMaintenanceTypes.length && displayMaintenanceTypes.length > 0}
                          onChange={e => {
                            const checked = e.target.checked;
                            setFormData(prev => ({
                              ...prev,
                              maintenance_type: checked ? displayMaintenanceTypes.map(t => t.id) : []
                            }));
                          }}
                          className="w-5 h-5 rounded border-white/20 bg-white/5 text-orange-600 focus:ring-orange-500 group-hover:border-orange-500 transition-colors"
                        />
                        <span className="text-white font-bold group-hover:text-orange-400 transition-colors underline underline-offset-4 decoration-orange-500/50">全車保養 (全選)</span>
                      </label>

                      {/* 其他保養項目列表 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {displayMaintenanceTypes.map(type => {
                          const isSelected = formData.maintenance_type.includes(type.id);
                          return (
                            <div key={type.id} className={`flex flex-col gap-3 p-3 rounded-xl transition-all ${isSelected ? 'bg-orange-500/10 border border-orange-500/30' : 'hover:bg-white/5 border border-transparent'}`}>
                              <label className="flex items-center space-x-3 cursor-pointer group">
                                <input
                                  type="checkbox"
                                  value={type.id}
                                  checked={isSelected}
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
                                <span className={`font-bold transition-colors ${isSelected ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>{type.name}</span>
                              </label>

                              {/* 詳細資訊輸入區塊 - 僅在選取時顯示 */}
                              {isSelected && (
                                <div className="grid grid-cols-1 gap-2 pl-8 animate-in slide-in-from-top-2 fade-in duration-200">
                                  <input
                                    type="text"
                                    placeholder="品牌 (例：Shimano)"
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:border-orange-500 focus:outline-none placeholder:text-white/20"
                                    value={formData.details[type.id]?.brand || ''}
                                    onChange={e => setFormData(prev => ({
                                      ...prev,
                                      details: {
                                        ...prev.details,
                                        [type.id]: {
                                          ...(prev.details[type.id] || { brand: '', model: '', other: '' }),
                                          brand: e.target.value
                                        }
                                      }
                                    }))}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <input
                                    type="text"
                                    placeholder="型號 (例：Dura-Ace)"
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:border-orange-500 focus:outline-none placeholder:text-white/20"
                                    value={formData.details[type.id]?.model || ''}
                                    onChange={e => setFormData(prev => ({
                                      ...prev,
                                      details: {
                                        ...prev.details,
                                        [type.id]: {
                                          ...(prev.details[type.id] || { brand: '', model: '', other: '' }),
                                          model: e.target.value
                                        }
                                      }
                                    }))}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <input
                                    type="text"
                                    placeholder="其他 (選填)"
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:border-orange-500 focus:outline-none placeholder:text-white/20"
                                    value={formData.details[type.id]?.other || ''}
                                    onChange={e => setFormData(prev => ({
                                      ...prev,
                                      details: {
                                        ...prev.details,
                                        [type.id]: {
                                          ...(prev.details[type.id] || { brand: '', model: '', other: '' }),
                                          other: e.target.value
                                        }
                                      }
                                    }))}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 輪組選擇 - 僅在勾選輪胎更換時顯示 */}
                {formData.maintenance_type.includes('tires') && (
                  <div>
                    <label className="block text-sm font-bold text-orange-200/60 mb-2">關聯輪組 (選填)</label>
                    <div className="relative">
                      <select
                        value={formData.wheelset_id}
                        onChange={e => setFormData(prev => ({ ...prev, wheelset_id: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none appearance-none cursor-pointer"
                      >
                        <option value="" className="bg-gray-900">未指定輪組</option>
                        {wheelsets
                          .filter(ws => !selectedBikeId || ws.bike_id === selectedBikeId)
                          .map(ws => (
                            <option key={ws.id} value={ws.id} className="bg-gray-900">
                              {ws.name} ({ws.brand} {ws.model}) {ws.is_active ? ' [作用中]' : ''}
                            </option>
                          ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronRight className="w-4 h-4 text-white/20 rotate-90" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-orange-200/60 mb-2">保養日期</label>
                    <input
                      type="date"
                      value={formData.service_date}
                      onChange={e => setFormData(prev => ({ ...prev, service_date: e.target.value }))}
                      required
                      className="w-full bg-white/5 border border-white/20 hover:border-orange-500/50 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none transition-colors"
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
                        className="w-full bg-white/5 border border-white/20 hover:border-orange-500/50 rounded-xl pl-8 pr-4 py-3 text-white focus:border-orange-500 focus:outline-none transition-colors appearance-none"
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
                      placeholder="seh STUDIO"
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
      {
        selectedHistoryType && selectedBike && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-6xl p-6 max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedHistoryType.name}紀錄</h3>
                  <p className="text-orange-200/50 text-sm">歷史更換清單</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setTargetType(selectedHistoryType);
                      setFormData(prev => ({
                        ...prev,
                        maintenance_type: [selectedHistoryType.id]
                      }));
                      setIsAddModalOpen(true);
                      setSelectedHistoryType(null);
                    }}
                    className="p-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl transition-all flex items-center gap-1.5 px-3"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-bold">新增紀錄</span>
                  </button>
                  <button
                    onClick={() => setSelectedHistoryType(null)}
                    className="p-2 hover:bg-white/10 rounded-xl transition-all"
                  >
                    <X className="w-5 h-5 text-white/60" />
                  </button>
                </div>
              </div>

              {/* 表格呈現模式 */}
              <div className="flex-1 overflow-y-auto custom-scrollbar rounded-xl border border-white/10">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse relative">
                    <thead className="sticky top-0 z-10 bg-[#0f172a] shadow-sm">
                      <tr className="text-xs text-orange-200/60 uppercase tracking-wider">
                        <th className="p-4 font-bold whitespace-nowrap bg-[#0f172a]">日期</th>
                        <th className="p-4 font-bold whitespace-nowrap bg-[#0f172a]">週期里程</th>
                        <th className="p-4 font-bold whitespace-nowrap bg-[#0f172a]">時數</th>
                        <th className="p-4 font-bold whitespace-nowrap bg-[#0f172a]">天數</th>
                        <th className="p-4 font-bold whitespace-nowrap bg-[#0f172a]">品牌/型號</th>
                        <th className="p-4 font-bold whitespace-nowrap bg-[#0f172a]">保養方式</th>
                        <th className="p-4 font-bold whitespace-nowrap bg-[#0f172a]">備註/詳情</th>
                        <th className="p-4 font-bold text-right whitespace-nowrap bg-[#0f172a]">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm bg-slate-900/50">
                      {bikeRecords
                        .filter(r =>
                          r.maintenance_type === selectedHistoryType.id ||
                          r.maintenance_type.split(', ').includes(selectedHistoryType.id)
                        ).length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-12 text-white/30">
                            尚無相關紀錄
                          </td>
                        </tr>
                      ) : (
                        bikeRecords
                          .filter(r =>
                            r.maintenance_type === selectedHistoryType.id ||
                            r.maintenance_type.split(', ').includes(selectedHistoryType.id)
                          )
                          .map(record => {
                            // 獲取該類型在該單車的所有紀錄（已按日期排序：由新到舊）
                            const typedRecords = bikeRecords.filter(r =>
                              r.maintenance_type === selectedHistoryType?.id ||
                              r.maintenance_type.split(', ').includes(selectedHistoryType?.id || '')
                            );

                            // 找出當前紀錄在過濾後列表中的索引
                            const recordIndex = typedRecords.findIndex(r => r.id === record.id);
                            // 下一筆紀錄（時間更早的）即為上一個維護週期起點
                            const previousRecord = typedRecords[recordIndex + 1];

                            const stats = previousRecord
                              ? calculateMetricsBetweenDates(selectedBike.id, previousRecord.service_date, record.service_date)
                              : calculateMetricsSinceDate(selectedBike.id, record.service_date);

                            const detail = record.parts_details?.find(d => d.type_id === selectedHistoryType.id);

                            return (
                              <tr key={record.id} className="hover:bg-white/5 transition-colors group">
                                <td className="p-4 text-white font-bold whitespace-nowrap align-top">
                                  {record.service_date}
                                  <div className="text-[10px] text-white/30 font-mono mt-1">
                                    {calculateTotalDistanceAtDate(selectedBike, record.service_date).toLocaleString(undefined, { maximumFractionDigits: 1 })} km
                                  </div>
                                </td>
                                <td className="p-4 align-top">
                                  <span className="text-orange-300 font-mono">{stats.distanceKm.toFixed(1)} km</span>
                                  {!previousRecord && <span className="text-[10px] text-white/30 block">累積</span>}
                                </td>
                                <td className="p-4 text-white/80 font-mono align-top">
                                  {stats.movingTimeHours.toFixed(1)} hr
                                </td>
                                <td className="p-4 text-white/80 font-mono align-top">
                                  {stats.days} 天
                                </td>
                                <td className="p-4 align-top">
                                  <div className="flex flex-col gap-0.5">
                                    {detail?.brand ? <span className="text-white font-medium">{detail.brand}</span> : <span className="text-white/20">-</span>}
                                    {detail?.model && <span className="text-xs text-white/50">{detail.model}</span>}
                                  </div>
                                </td>
                                <td className="p-4 align-top">
                                  {record.is_diy ? (
                                    <span className="text-orange-400 font-bold border border-orange-500/30 bg-orange-500/10 px-2 py-1 rounded text-xs">DIY</span>
                                  ) : (
                                    record.shop_name ? (
                                      <span className="text-white font-medium">{record.shop_name}</span>
                                    ) : (
                                      <span className="text-white/20">-</span>
                                    )
                                  )}
                                </td>
                                <td className="p-4 max-w-[200px] align-top">
                                  <div className="space-y-1">
                                    {record.cost && (
                                      <div className="flex flex-wrap gap-2 text-xs text-orange-200/60">
                                        <span>💰 ${record.cost.toLocaleString()}</span>
                                      </div>
                                    )}
                                    {(detail?.other || record.notes) && (
                                      <div className="text-xs text-white/60 truncate" title={detail?.other || record.notes}>
                                        {detail?.other || record.notes}
                                      </div>
                                    )}
                                    {!record.cost && !detail?.other && !record.notes && (
                                      <span className="text-white/20">-</span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-4 text-right align-top">
                                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => {
                                        handleEditMaintenance(record);
                                      }}
                                      className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                      title="編輯"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (confirm('確定要刪除此筆紀錄嗎？')) {
                                          deleteMaintenanceRecord(record.id);
                                        }
                                      }}
                                      className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                      title="刪除"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div >
        )
      }
      {/* 輪組編輯 Modal */}
      {
        editingWheelset && (
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
                  <label className="flex items-center space-x-3 cursor-pointer p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all">
                    <input
                      type="checkbox"
                      checked={!wheelsetFormData.bike_id}
                      onChange={(e) => {
                        setWheelsetFormData({
                          ...wheelsetFormData,
                          bike_id: e.target.checked ? null : (selectedBike?.id || null)
                        });
                      }}
                      className="w-5 h-5 rounded border-white/20 bg-white/5 text-orange-600 focus:ring-orange-500"
                    />
                    <div>
                      <span className="text-white font-bold block">設為通用輪組</span>
                      <span className="text-xs text-orange-200/40 block">如果不勾選，則此輪組僅會顯示在當前車輛下</span>
                    </div>
                  </label>
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
                  <label className="block text-sm font-medium text-orange-200/60 mb-1">初始里程 (m)</label>
                  <input
                    type="number"
                    value={wheelsetFormData.distance}
                    onChange={(e) => setWheelsetFormData({ ...wheelsetFormData, distance: parseInt(e.target.value) || 0 })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/20 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                  <p className="text-xs text-orange-200/40 mt-1">設定初始里程後，新騎乘紀錄將會自動累加。</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-orange-200/60 mb-1">啟用日期</label>
                  <input
                    type="date"
                    value={wheelsetFormData.active_date}
                    onChange={(e) => setWheelsetFormData({ ...wheelsetFormData, active_date: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500 transition-colors"
                  />
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
                  onClick={() => {
                    if (confirm(`確定要刪除輪組 "${wheelsetFormData.name}" 嗎？這項動作無法復原。`)) {
                      if (editingWheelset) {
                        deleteWheelset(editingWheelset.id);
                        setEditingWheelset(null);
                      }
                    }
                  }}
                  className="px-4 py-2 rounded-xl font-bold bg-red-600/10 hover:bg-red-600/20 text-red-500 hover:text-red-400 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  刪除
                </button>
                <div className="flex-1"></div>
                <button
                  onClick={() => setEditingWheelset(null)}
                  className="px-4 py-2 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleUpdateWheelset}
                  disabled={!wheelsetFormData.name}
                  className="px-4 py-2 rounded-xl font-bold bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  儲存
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default MaintenanceDashboard;
