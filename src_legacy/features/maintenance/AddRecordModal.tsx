import React, { useState } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { MaintenanceItem, MaintenanceRecord } from '../../types';

interface AddRecordModalProps {
  vehicleId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (record: Omit<MaintenanceRecord, 'id' | 'created_at'>) => Promise<void>;
}

const AddRecordModal: React.FC<AddRecordModalProps> = ({ vehicleId, isOpen, onClose, onSubmit }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mileage, setMileage] = useState<number>(0);
  const [serviceType, setServiceType] = useState<'Shop' | 'DIY'>('Shop');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<MaintenanceItem[]>([{ name: '', cost: 0 }]);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddItem = () => setItems([...items, { name: '', cost: 0 }]);
  const handleRemoveItem = (index: number) => setItems(items.filter((_, i) => i !== index));
  const handleItemChange = (index: number, field: keyof MaintenanceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const totalCost = items.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        vehicle_id: vehicleId,
        date,
        mileage: Number(mileage),
        total_cost: totalCost,
        description,
        service_type: serviceType,
        items
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0f172a] border border-white/10 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh] sm:mx-4">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5 flex justify-between items-center bg-white/5 shrink-0">
          <h2 className="text-lg font-bold text-white">新增保養紀錄</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content - Scrollable */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Date & Mileage - Stack on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/50 uppercase tracking-wider">保養日期</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-base"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/50 uppercase tracking-wider">目前公里數 (km)</label>
              <input
                type="number"
                required
                placeholder="例如: 15200"
                value={mileage || ''}
                onChange={(e) => setMileage(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-base"
              />
            </div>
          </div>

          {/* Service Type */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white/50 uppercase tracking-wider">服務類別</label>
            <div className="flex gap-3">
              {['Shop', 'DIY'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setServiceType(type as any)}
                  className={`flex-1 py-3 rounded-xl border font-bold text-sm transition-all ${serviceType === type
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20'
                      : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                    }`}
                >
                  {type === 'Shop' ? '專業店家' : '自行維修'}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white/50 uppercase tracking-wider">基本備註</label>
            <textarea
              rows={2}
              placeholder="簡短描述本次保養內容..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-base resize-none"
            />
          </div>

          {/* Maintenance Items */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-white/50 uppercase tracking-wider">維修項目明細</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 font-bold"
              >
                <Plus className="w-3 h-3" /> 新增
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="項目名稱"
                    required
                    value={item.name}
                    onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                    className="flex-[2] min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder="費用"
                    required
                    value={item.cost || ''}
                    onChange={(e) => handleItemChange(index, 'cost', e.target.value)}
                    className="w-24 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    disabled={items.length === 1}
                    className="p-2 text-red-500/40 hover:text-red-500 disabled:opacity-0 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Footer - Fixed at bottom */}
        <div className="px-5 py-4 bg-white/5 border-t border-white/5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex flex-col">
            <span className="text-[10px] text-white/40 uppercase font-bold">總計費用</span>
            <span className="text-lg font-bold text-blue-400">NT$ {totalCost.toLocaleString()}</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-white/50 hover:bg-white/5 font-semibold text-sm"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-900/40 disabled:opacity-50 text-sm"
            >
              <Save className="w-4 h-4" />
              {submitting ? '儲存中...' : '儲存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddRecordModal;
