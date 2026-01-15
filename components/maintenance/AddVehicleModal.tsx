import React, { useState } from 'react';
import { X, Save, Car } from 'lucide-react';
import { Vehicle } from '../../types';

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (vehicle: Omit<Vehicle, 'id' | 'user_id' | 'created_at'>) => Promise<any>;
}

const AddVehicleModal: React.FC<AddVehicleModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [transmission, setTransmission] = useState('Manual');
  const [mileage, setMileage] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        brand,
        model,
        year,
        transmission,
        initial_mileage: mileage,
        current_mileage: mileage
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0f172a] border border-white/10 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-2">
            <Car className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-bold text-white">新增我的車輛</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-blue-200/50 ml-1">品牌</label>
            <input
              type="text"
              required
              placeholder="例如: Toyota, Giant, Specialized"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-blue-200/50 ml-1">型號</label>
            <input
              type="text"
              required
              placeholder="例如: Corolla, TCR, Tarmac"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-blue-200/50 ml-1">年份</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-blue-200/50 ml-1">初始里程 (km)</label>
              <input
                type="number"
                value={mileage}
                onChange={(e) => setMileage(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-blue-200/50 ml-1">變速系統 / 備註</label>
            <input
              type="text"
              placeholder="例如: Shimano Di2, Sram Force"
              value={transmission}
              onChange={(e) => setTransmission(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl text-white/40 hover:bg-white/5 font-semibold transition-all">
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-[2] py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40 disabled:opacity-50 transition-all"
            >
              <Save className="w-5 h-5" />
              {submitting ? '儲存中...' : '確認新增'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddVehicleModal;
