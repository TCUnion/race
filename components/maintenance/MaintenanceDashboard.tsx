import React, { useState } from 'react';
import { useMaintenance } from '../../hooks/useMaintenance';
import VehicleCard from './VehicleCard';
import MaintenanceTable from './MaintenanceTable';
import AddRecordModal from './AddRecordModal';
import AddVehicleModal from './AddVehicleModal';
import { Plus, Car, ArrowLeft, Loader2, Wrench, X, Calendar } from 'lucide-react';

const MaintenanceDashboard: React.FC = () => {
  const { vehicles, loading, error, addMaintenanceRecord, addVehicle, refresh } = useMaintenance();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [activeVehicleIdForModal, setActiveVehicleIdForModal] = useState<string | null>(null);

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  const handleOpenRecordModal = (id: string) => {
    setActiveVehicleIdForModal(id);
    setIsRecordModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-900/40">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">車輛保養紀錄</h1>
          </div>
          <p className="text-blue-200/50 font-medium">追蹤您愛車的每一次保養細節與費用</p>
        </div>
        
        {!selectedVehicleId && (
          <button 
            onClick={() => setIsVehicleModalOpen(true)}
            className="flex items-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-2xl font-bold hover:bg-blue-50 transition-all shadow-xl shadow-blue-900/20 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            新增車輛
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-100 p-4 rounded-2xl mb-8 flex items-center gap-3">
          <div className="bg-red-500 rounded-full p-1">
            <X className="w-4 h-4 text-white" />
          </div>
          {error}
        </div>
      )}

      {selectedVehicleId && selectedVehicle ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button
            onClick={() => setSelectedVehicleId(null)}
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-bold group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            返回列表
          </button>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <VehicleCard
                vehicle={selectedVehicle}
                onViewDetails={() => {}}
                onAddRecord={handleOpenRecordModal}
              />
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="flex justify-between items-end">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  保養歷史明細
                </h2>
              </div>
              <MaintenanceTable records={selectedVehicle.maintenance_records || []} />
            </div>
          </div>
        </div>
      ) : (
        <>
          {vehicles.length === 0 ? (
            <div className="text-center py-24 bg-white/5 border border-white/10 rounded-[2.5rem] border-dashed">
              <Car className="w-16 h-16 text-blue-200/10 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">尚未新增任何車輛</h3>
              <p className="text-blue-200/40 mb-8">開始記錄您的第一台愛車，輕鬆管理保養時程</p>
              <button 
                onClick={() => setIsVehicleModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-xl shadow-blue-900/40"
              >
                立即新增車輛
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {vehicles.map(vehicle => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  onViewDetails={(id) => setSelectedVehicleId(id)}
                  onAddRecord={handleOpenRecordModal}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeVehicleIdForModal && (
        <AddRecordModal
          vehicleId={activeVehicleIdForModal}
          isOpen={isRecordModalOpen}
          onClose={() => setIsRecordModalOpen(false)}
          onSubmit={addMaintenanceRecord}
        />
      )}

      <AddVehicleModal
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
        onSubmit={addVehicle}
      />
    </div>
  );
};

export default MaintenanceDashboard;
