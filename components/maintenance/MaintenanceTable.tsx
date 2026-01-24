import React from 'react';
import { BikeMaintenanceRecord } from '../../hooks/useMaintenance';
import { Calendar, MoreVertical, DollarSign, Wrench, Edit2, Trash2 } from 'lucide-react';

interface MaintenanceTableProps {
  records: BikeMaintenanceRecord[];
  onDelete?: (id: string) => void;
  onEdit?: (record: BikeMaintenanceRecord) => void;
  loading?: boolean;
}

const MaintenanceTable: React.FC<MaintenanceTableProps> = ({ records, onDelete, onEdit, loading }) => {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20 backdrop-blur-sm">
      <table className="w-full text-left border-collapse">
        <thead className="bg-white/5 border-b border-white/10">
          <tr>
            <th className="px-6 py-4 text-xs font-bold text-blue-200/40 uppercase tracking-wider">日期</th>
            <th className="px-6 py-4 text-xs font-bold text-blue-200/40 uppercase tracking-wider">里程 (km)</th>
            <th className="px-6 py-4 text-xs font-bold text-blue-200/40 uppercase tracking-wider">項目</th>
            <th className="px-6 py-4 text-xs font-bold text-blue-200/40 uppercase tracking-wider">方式</th>
            <th className="px-6 py-4 text-xs font-bold text-blue-200/40 uppercase tracking-wider">說明</th>
            <th className="px-6 py-4 text-xs font-bold text-blue-200/40 uppercase tracking-wider text-right">費用</th>
            <th className="px-6 py-4 text-right">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {loading ? (
            <tr>
              <td colSpan={7} className="px-6 py-12 text-center text-blue-200/30">
                載入中...
              </td>
            </tr>
          ) : records.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-12 text-center text-blue-200/30">
                尚未有任何保養紀錄
              </td>
            </tr>
          ) : (
            records.map((record) => (
              <tr key={record.id} className="hover:bg-white/5 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-400/60" />
                    <span className="text-white text-sm whitespace-nowrap">{record.service_date}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-white font-medium">{record.mileage_at_service.toLocaleString()}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-white font-medium text-sm">{record.maintenance_type}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${!record.is_diy
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'bg-green-500/20 text-green-400 border border-green-500/30'
                    }`}>
                    {!record.is_diy ? (record.shop_name || '店家') : 'DIY'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-blue-100/70 text-sm truncate max-w-xs">{record.notes || '-'}</p>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1 text-blue-400 font-bold">
                    <DollarSign className="w-3 h-3" />
                    <span>{(record.cost || 0).toLocaleString()}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(record)}
                        className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                        title="編輯"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => {
                          if (window.confirm('確定要刪除此筆保養紀錄嗎？')) {
                            onDelete(record.id);
                          }
                        }}
                        className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="刪除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default MaintenanceTable;
