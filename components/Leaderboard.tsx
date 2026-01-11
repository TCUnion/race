
import React from 'react';
import { useState, useEffect } from 'react';
import { Participant } from '../types';

const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<Participant[]>([]);

  useEffect(() => {
    fetch('http://localhost:8000/api/leaderboard')
      .then(res => res.json())
      .then(data => setLeaderboard(data))
      .catch(err => console.error('Error fetching leaderboard:', err));
  }, []);

  return (
    <div className="flex flex-col items-center w-full pb-20">
      <div className="w-full max-w-[1200px] px-4 md:px-10 py-6 md:py-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 md:mb-10">
          <div className="flex flex-col gap-2 md:gap-3">
            <div className="inline-flex items-center gap-2 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded w-fit sm:hidden mb-1">
              <span className="text-strava-orange font-black italic text-[10px]">POWERED BY STRAVA</span>
            </div>
            <h1 className="text-slate-900 dark:text-white text-2xl md:text-3xl font-bold leading-tight tracking-tight">活動成績總排行榜</h1>
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[10px] md:text-xs">
              <span className="material-symbols-outlined text-sm">update</span>
              <p>最後更新: 2023年10月27日 • 數據由 Strava 提供</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-tsu-blue/50 hover:text-tsu-blue rounded-lg shadow-sm text-[11px] font-bold uppercase transition-all active:scale-95">
              <span className="material-symbols-outlined text-base">sync</span>
              <span>同步數據</span>
            </button>
            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-tsu-blue/50 hover:text-tsu-blue rounded-lg shadow-sm text-[11px] font-bold uppercase transition-all active:scale-95">
              <span className="material-symbols-outlined text-base">filter_list</span>
              <span>進階篩選</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mb-6 flex flex-col md:flex-row gap-3 md:items-center border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="w-full md:w-64">
            <div className="relative flex items-center">
              <span className="absolute left-3 text-slate-400 material-symbols-outlined text-sm">search</span>
              <input
                className="w-full h-10 md:h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-1 focus:ring-tsu-blue focus:border-tsu-blue dark:text-white"
                placeholder="搜尋選手..."
                type="text"
              />
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
            {['所有時間', '性別', '組別'].map((label, idx) => (
              <select key={idx} className="h-10 md:h-9 text-[11px] font-bold uppercase tracking-wider bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-tsu-blue focus:border-tsu-blue px-3 py-1 flex-shrink-0 dark:text-white">
                <option>{label}</option>
              </select>
            ))}
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest w-20 text-center">排名</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">選手</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">日期</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">平均時速</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">完成時間</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right w-24">詳情</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {leaderboard.map((rider) => (
                  <tr key={rider.id} className="hover:bg-tsu-blue/5 transition-colors group">
                    <td className="px-6 py-5 text-center">
                      <span className={`text-xl font-black italic ${rider.rank === 1 ? 'text-tsu-blue' : 'text-slate-400 dark:text-slate-600'}`}>{rider.rank}</span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-cover bg-center ring-2 ring-transparent group-hover:ring-tsu-blue/30 transition-all" style={{ backgroundImage: `url(${rider.avatar})` }}></div>
                        <span className="font-bold text-sm text-tsu-blue-light hover:underline cursor-pointer transition-colors">{rider.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-xs text-slate-500 dark:text-slate-400">{rider.date}</td>
                    <td className="px-6 py-5 text-right text-sm font-medium">{rider.speed}</td>
                    <td className="px-6 py-5 text-right font-black text-sm italic">{rider.time}</td>
                    <td className="px-6 py-5 text-right">
                      <button className="inline-flex items-center opacity-40 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-strava-orange">open_in_new</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {leaderboard.map((rider) => (
              <div key={rider.id} className="p-4 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className={`size-12 rounded-full bg-cover bg-center border-2 ${rider.rank === 1 ? 'border-tsu-blue' : 'border-slate-200 dark:border-slate-800'}`} style={{ backgroundImage: `url(${rider.avatar})` }}></div>
                      <div className={`absolute -top-1 -left-1 text-white text-[10px] font-black italic px-2 rounded-full ring-2 ring-white dark:ring-slate-900 ${rider.rank === 1 ? 'bg-tsu-blue' : 'bg-slate-500'}`}>{rider.rank}</div>
                    </div>
                    <div>
                      <p className="font-bold text-base text-tsu-blue-light">{rider.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest">{rider.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-slate-900 dark:text-white leading-none italic">{rider.time}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">{rider.speed}</p>
                  </div>
                </div>
                <button className="w-full flex items-center justify-center gap-2 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 active:scale-95 transition-all">
                  <span className="text-strava-orange font-black">STRAVA</span>
                  <span>查看活動詳情</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-xs text-slate-500 dark:text-slate-400">顯示 248 名選手中的第 1 至 3 名</p>
          <div className="flex gap-1">
            <button className="px-4 py-2 md:py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-400">上一頁</button>
            <button className="px-4 py-2 md:py-1.5 rounded-lg border border-tsu-blue bg-tsu-blue text-white text-xs font-bold">1</button>
            <button className="px-4 py-2 md:py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-tsu-blue transition-colors">2</button>
            <button className="px-4 py-2 md:py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-tsu-blue transition-colors">3</button>
            <button className="px-4 py-2 md:py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-tsu-blue transition-colors">下一頁</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
