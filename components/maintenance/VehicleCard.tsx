import React from 'react';
import { Vehicle } from '../../types';
import { Settings, Calendar, Navigation, Tool } from 'lucide-react';

interface VehicleCardProps {
  vehicle: Vehicle;
  onViewDetails: (id: string) => void;
  onAddRecord: (id: string) => void;
}

const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, onViewDetails, onAddRecord }) => {
  const lastRecord = vehicle.maintenance_records?.[0];
  const totalCost = vehicle.maintenance_records?.reduce((sum, rec) => sum + Number(rec.total_cost), 0) || 0;

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 group">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
            {vehicle.brand} {vehicle.model}
          </h3>
          <p className="text-blue-200/60 text-sm font-medium">
            {vehicle.year} • {vehicle.transmission}
          </p>
        </div>
        <div className="bg-blue-500/20 p-2 rounded-lg">
          <Settings className="w-5 h-5 text-blue-400" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-black/20 rounded-xl p-3 border border-white/5">
          <div className="flex items-center gap-2 text-blue-200/50 text-xs mb-1">
            <Navigation className="w-3 h-3" />
            <span>目前里程</span>
          </div>
          <div className="text-white font-bold text-lg">
            {vehicle.current_mileage.toLocaleString()} <span className="text-xs font-normal text-blue-200/40">km</span>
          </div>
        </div>
        <div className="bg-black/20 rounded-xl p-3 border border-white/5">
          <div className="flex items-center gap-2 text-blue-200/50 text-xs mb-1">
            <Tool className="w-3 h-3" />
            <span>保養次數</span>
          </div>
          <div className="text-white font-bold text-lg">
            {vehicle.maintenance_records?.length || 0} <span className="text-xs font-normal text-blue-200/40">次</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-blue-200/50">上次保養</span>
          <span className="text-blue-100 font-medium">{lastRecord ? lastRecord.date : '尚未紀錄'}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-blue-200/50">累積費用</span>
          <span className="text-blue-400 font-bold">NT$ {totalCost.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => onViewDetails(vehicle.id)}
          className="flex-1 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold py-2.5 rounded-xl border border-white/10 transition-all"
        >
          查看詳情
        </button>
        <button
          onClick={() => onAddRecord(vehicle.id)}
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-blue-900/40"
        >
          新增紀錄
        </button>
      </div>
    </div>
  );
};

export default VehicleCard;
