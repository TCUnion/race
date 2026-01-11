
import React from 'react';
import { useState, useEffect } from 'react';
import { MOCK_SEGMENT_STATS } from '../constants';
import { Activity } from '../types';

const Dashboard: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    fetch('http://localhost:8000/api/activities')
      .then(res => res.json())
      .then(data => setActivities(data))
      .catch(err => console.error('Error fetching activities:', err));
  }, []);

  return (
    <div className="flex flex-col items-center w-full pb-20">
      <div className="w-full max-w-[1200px] px-6 md:px-10 lg:px-20 py-10 flex flex-col gap-10">
        {/* Dashboard Header */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-tsu-blue-light">
              <span className="material-symbols-outlined text-sm">mountain_flag</span>
              <span className="text-[10px] font-bold uppercase tracking-widest">TSU Challenge Series</span>
            </div>
            <h1 className="text-slate-900 dark:text-white text-2xl md:text-4xl font-black leading-tight tracking-tight">Segment: Alpe du Zwift</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base font-normal">距離挑戰結束還有 12 天。持續推動你的極限！</p>
          </div>
          <div className="flex flex-col gap-3 w-full md:w-auto">
            <button className="flex w-full md:min-w-[180px] cursor-pointer items-center justify-center gap-2 rounded-xl h-14 md:h-12 px-6 bg-tsu-blue hover:bg-tsu-blue-light text-white text-base md:text-sm font-bold transition-all shadow-lg shadow-tsu-blue/20 active:scale-95">
              <span className="material-symbols-outlined text-xl">sync</span>
              <span>立即同步數據</span>
            </button>
            <div className="text-center md:text-right">
              <p className="text-[10px] text-slate-500 leading-relaxed">為節省 API 配額，數據每小時自動更新。</p>
              <p className="text-[10px] text-tsu-blue-light uppercase tracking-wider font-bold mt-1">最後更新: 5 分鐘前</p>
            </div>
          </div>
        </section>

        {/* Performance Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex flex-col gap-2 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-tsu-blue-light/30 transition-colors">
            <div className="flex justify-between items-start mb-1">
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-widest">最佳時間</p>
              <span className="material-symbols-outlined text-tsu-blue-light text-xl">timer</span>
            </div>
            <p className="text-slate-900 dark:text-white tracking-tight text-4xl font-black leading-none">42:15</p>
            <div className="flex items-center gap-1 text-emerald-500 mt-2">
              <span className="material-symbols-outlined text-sm">trending_down</span>
              <p className="text-sm font-bold">-1:30 (PR)</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-tsu-blue-light/30 transition-colors">
            <div className="flex justify-between items-start mb-1">
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-widest">平均 VAM</p>
              <span className="material-symbols-outlined text-tsu-blue-light text-xl">speed</span>
            </div>
            <p className="text-slate-900 dark:text-white tracking-tight text-4xl font-black leading-none">1,250 <span className="text-lg font-normal text-slate-500">m/h</span></p>
            <div className="flex items-center gap-1 text-emerald-500 mt-2">
              <span className="material-symbols-outlined text-sm">trending_up</span>
              <p className="text-sm font-bold">+24 m/h</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl p-6 border-2 border-tsu-blue-light/50 bg-tsu-blue-light/5 sm:col-span-2 lg:col-span-1 shadow-inner">
            <div className="flex justify-between items-start mb-1">
              <p className="text-tsu-blue-light text-xs font-bold uppercase tracking-widest">目前排名</p>
              <span className="material-symbols-outlined text-tsu-blue-light text-2xl">leaderboard</span>
            </div>
            <p className="text-slate-900 dark:text-white tracking-tight text-5xl font-black leading-none">#14</p>
            <div className="flex items-center gap-1 text-tsu-blue-light mt-2">
              <span className="material-symbols-outlined text-sm">arrow_upward</span>
              <p className="text-sm font-bold">前 5% 的挑戰者</p>
            </div>
          </div>
        </section>

        {/* Goal Progress */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-slate-900 dark:text-white text-lg font-bold">挑戰目標進度</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">距離進入前 10 名還差 1:15</p>
              </div>
              <p className="text-tsu-blue-light text-2xl font-black">85%</p>
            </div>
            <div className="relative w-full h-4 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-tsu-blue-light rounded-full shadow-[0_0_12px_rgba(0,123,255,0.4)] transition-all duration-1000 ease-out"
                style={{ width: '85%' }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">
              <span>挑戰開始</span>
              <span>Top 10 目標 (41:00)</span>
            </div>
          </div>
        </section>

        {/* Recent Activities */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-slate-900 dark:text-white text-xl md:text-2xl font-bold leading-tight tracking-tight">近期嘗試紀錄</h2>
            <div className="flex gap-2">
              <button className="bg-tsu-blue/10 text-tsu-blue-light px-4 py-1.5 rounded-full text-xs font-bold hover:bg-tsu-blue/20 transition-colors">單週視圖</button>
              <button className="text-slate-500 dark:text-slate-400 px-4 py-1.5 rounded-full text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">全部視圖</button>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-tsu-blue-light/50 transition-all group shadow-sm">
                <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                  <div className={`flex shrink-0 size-10 md:size-12 items-center justify-center rounded-full ${activity.is_pr ? 'bg-tsu-blue/10 text-tsu-blue-light' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    <span className="material-symbols-outlined">directions_bike</span>
                  </div>
                  <div className="truncate">
                    <h4 className="text-slate-900 dark:text-white font-bold truncate block text-sm md:text-base group-hover:text-tsu-blue-light transition-colors">{activity.title}</h4>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs">{activity.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 md:gap-8 text-right shrink-0">
                  <div className="hidden sm:block">
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase">Power</p>
                    <p className="text-slate-900 dark:text-white font-medium text-sm">{activity.power}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase">Time</p>
                    <p className="text-slate-900 dark:text-white font-black text-lg">{activity.time}</p>
                  </div>
                  <button className="h-10 w-10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-tsu-blue-light">open_in_new</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Route Info Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 h-56 md:h-64 relative group shadow-lg">
            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=2070')" }}></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
            <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-md p-2 px-3 rounded-lg border border-slate-700">
              <p className="text-[10px] text-white font-bold uppercase tracking-widest">Route Profile</p>
            </div>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
              <button className="bg-tsu-blue text-white px-6 py-3 rounded-full text-sm font-bold shadow-xl hover:bg-tsu-blue-light transition-colors">在 Strava 上查看路線</button>
            </div>
          </div>
          <div className="rounded-2xl p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex flex-col justify-center shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-tsu-blue-light">info</span>
              <h4 className="text-slate-900 dark:text-white font-bold text-lg">Segment 詳細資訊</h4>
            </div>
            <div className="space-y-4">
              {[
                { label: '距離', value: MOCK_SEGMENT_STATS.distance },
                { label: '平均坡度', value: MOCK_SEGMENT_STATS.grade },
                { label: '垂直爬升', value: MOCK_SEGMENT_STATS.ascent }
              ].map((row, i) => (
                <div key={i} className={`flex justify-between border-b border-slate-100 dark:border-slate-800 pb-3 ${i === 2 ? 'border-none pb-0' : ''}`}>
                  <span className="text-slate-500 dark:text-slate-400 text-sm">{row.label}</span>
                  <span className="text-slate-900 dark:text-white text-sm font-bold">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
