import React from 'react';
import { MaintenanceRecord } from '../../types';
import { Calendar, Wrench, MoreVertical, DollarSign } from 'lucide-react';

interface MaintenanceTableProps {
  records: MaintenanceRecord[];
}

const MaintenanceTable: React.FC<MaintenanceTableProps> = ({ records }) => {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20 backdrop-blur-sm">
      <table className="w-full text-left border-collapse">
        <thead className="bg-white/5 border-b border-white/10">
          <tr>
            <th className="px-6 py-4 text-xs font-bold text-blue-200/40 uppercase tracking-wider">日期</th>
            <th className="px-6 py-4 text-xs font-bold text-blue-200/40 uppercase tracking-wider">里程 (km)</th>
            <th className="px-6 py-4 text-xs font-bold text-blue-200/40 uppercase tracking-wider">類別</th>
            <th className="px-6 py-4 text-xs font-bold text-blue-200/40 uppercase tracking-wider">說明</th>
            <th className="px-6 py-4 text-xs font-bold text-blue-200/40 uppercase tracking-wider text-right">費用</th>
            <th className="px-6 py-4"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {records.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-blue-200/30">
                尚未有任何保養紀錄
              </td>
            </tr>
          ) : (
            records.map((record) => (
              <tr key={record.id} className="hover:bg-white/5 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-400/60" />
                    <span className="text-white text-sm whitespace-nowrap">{record.date}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-white font-medium">{record.mileage.toLocaleString()}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                    record.service_type === 'Shop' 
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                      : 'bg-green-500/20 text-green-400 border border-green-500/30'
                  }`}>
                    {record.service_type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-blue-100/70 text-sm truncate max-w-xs">{record.description}</p>
                  {record.items.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {record.items.map((item, idx) => (
                        <span key={idx} className="text-[10px] bg-white/5 text-blue-300/50 px-1.5 py-0.5 rounded border border-white/5">
                          {item.name}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1 text-blue-400 font-bold">
                    <DollarSign className="w-3 h-3" />
                    <span>{record.total_cost.toLocaleString()}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-1 px-2 rounded hover:bg-white/10 text-white/40 hover:text-white transition-all">
                    <MoreVertical className="w-4 h-4" />
                  </button>
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
