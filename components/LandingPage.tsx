
import React from 'react';
import { MOCK_LEADERBOARD } from '../constants';

interface LandingPageProps {
  onRegister: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onRegister }) => {
  return (
    <div className="flex flex-col items-center w-full pb-20">
      {/* Hero Section */}
      <div className="w-full max-w-[1200px] px-4 py-8">
        <div className="relative overflow-hidden rounded-2xl bg-strava-grey-dark shadow-2xl">
          <div 
            className="flex min-h-[480px] flex-col gap-6 bg-cover bg-center bg-no-repeat items-center justify-center p-8 text-center relative" 
            style={{ backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4) 0%, rgba(18, 18, 18, 0.95) 100%), url("https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&q=80&w=2070")` }}
          >
            <div className="flex flex-col gap-4 max-w-3xl">
              <span className="inline-block px-4 py-1 rounded bg-tsu-blue text-white text-[10px] font-black self-center uppercase tracking-[0.2em] shadow-lg">Limited Time Challenge</span>
              <h1 className="text-white text-4xl md:text-6xl font-black leading-tight tracking-tight uppercase italic drop-shadow-md">
                巔峰挑戰：陽明山 P 字山道
              </h1>
              <p className="text-slate-300 text-base md:text-xl font-medium leading-relaxed max-w-2xl mx-auto">
                連結你的 Strava，挑戰經典路段，與全台頂尖好手一決高下。
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <button 
                onClick={onRegister}
                className="flex min-w-[200px] cursor-pointer items-center justify-center rounded h-14 px-8 bg-tsu-blue text-white text-lg font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-tsu-blue/30 active:scale-95"
              >
                <span>立即報名</span>
              </button>
              <button className="flex min-w-[200px] cursor-pointer items-center justify-center rounded h-14 px-8 bg-white/10 text-white border border-white/20 text-lg font-black uppercase tracking-widest backdrop-blur-sm hover:bg-white/20 transition-all active:scale-95">
                <span>查看詳情</span>
              </button>
            </div>
          </div>
        </div>

        {/* Highlight Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-8">
          {[
            { label: '總爬升高度', value: '1,250 M', footer: 'HC Category' },
            { label: '路段距離', value: '15.2 KM', footer: 'Taipei, Taiwan' },
            { label: '參賽人數', value: '2,480+', footer: 'Growing Fast' },
            { label: '活動期限', value: '12 DAYS', footer: 'Ends Soon' }
          ].map((stat, i) => (
            <div key={i} className="flex flex-col gap-1 rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-tsu-blue/30 transition-colors">
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
              <p className="text-slate-900 dark:text-white text-3xl font-black italic">{stat.value}</p>
              <p className="text-tsu-blue text-xs font-bold uppercase mt-2">{stat.footer}</p>
            </div>
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
          <div className="lg:col-span-2 space-y-8">
            {/* Map Section */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <h2 className="text-slate-900 dark:text-white text-lg font-black uppercase tracking-tight italic">挑戰路段地圖</h2>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Segment #123456</span>
              </div>
              <div className="p-6">
                <div className="w-full bg-slate-200 dark:bg-background-dark aspect-video rounded-xl overflow-hidden relative shadow-inner group">
                  <img 
                    src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=2070" 
                    className="w-full h-full object-cover grayscale transition-transform duration-700 group-hover:scale-110" 
                    alt="Map"
                  />
                  <div className="absolute inset-0 bg-black/30 hover:bg-black/10 transition-colors cursor-pointer flex items-center justify-center">
                    <div className="bg-white dark:bg-slate-900 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
                      <span className="material-symbols-outlined text-tsu-blue">map</span>
                      <span className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">查看路線圖</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <button className="flex items-center gap-2 px-4 py-2 bg-tsu-blue text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:brightness-110 transition-all active:scale-95">
                    <span className="material-symbols-outlined text-sm">filter_list</span>
                    篩選條件
                  </button>
                  <div className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-all">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Powered by</span>
                    <span className="text-strava-orange font-black italic text-lg">STRAVA</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Leaderboard Preview */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <h2 className="text-slate-900 dark:text-white text-lg font-black uppercase tracking-tight italic">目前排行榜</h2>
                <button className="text-tsu-blue text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1">
                  查看完整榜單
                </button>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {MOCK_LEADERBOARD.map((rider) => (
                  <div key={rider.id} className="flex items-center gap-4 p-5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                    <span className={`w-8 text-center font-black text-2xl italic ${rider.rank === 1 ? 'text-tsu-blue' : 'text-slate-400'}`}>
                      {rider.rank.toString().padStart(2, '0')}
                    </span>
                    <div className="size-10 rounded-full overflow-hidden border-2 border-transparent group-hover:border-tsu-blue transition-all">
                      <img alt={rider.name} className="w-full h-full object-cover" src={rider.avatar} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-tight">{rider.name}</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">{rider.bike}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-lg italic text-slate-900 dark:text-white">{rider.time}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{rider.speed}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <section className="bg-white dark:bg-slate-900 rounded-2xl p-8 border-t-4 border-tsu-blue shadow-lg relative overflow-hidden">
              <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4 uppercase italic">開始挑戰</h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-8 leading-relaxed font-medium">
                為了自動計算您的成績，請先連結您的 Strava 帳號。我們將僅讀取此活動期間的公開活動紀錄。
              </p>
              <div className="space-y-4">
                <button className="w-full flex items-center justify-center gap-3 bg-strava-orange text-white py-4 px-6 rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all">
                  <span className="material-symbols-outlined">sync</span>
                  <span className="text-sm font-black uppercase tracking-wider">Connect with Strava</span>
                </button>
                <div className="flex justify-center py-2">
                  <div className="flex items-center gap-2 opacity-60">
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">Powered by</span>
                    <span className="text-strava-orange font-black italic text-sm">STRAVA</span>
                  </div>
                </div>
                <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 font-bold">
                  點擊即代表您同意本平台的 <a className="underline hover:text-tsu-blue transition-colors" href="#">服務條款</a>
                </p>
              </div>
            </section>

            <section className="bg-slate-100 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 uppercase italic">活動詳情</h3>
              <ul className="space-y-3">
                {[
                  { label: 'Entry Fee', value: 'FREE', color: 'text-tsu-blue' },
                  { label: 'Type', value: 'Cycling Segment', color: 'text-slate-900 dark:text-slate-200' },
                  { label: 'Organizer', value: 'TSU', color: 'text-slate-900 dark:text-slate-200' }
                ].map((item, i) => (
                  <li key={i} className="flex justify-between items-center text-[11px] font-bold">
                    <span className="text-slate-500 dark:text-slate-400 uppercase tracking-widest">{item.label}</span>
                    <span className={`${item.color} uppercase`}>{item.value}</span>
                  </li>
                ))}
              </ul>
            </section>

            <div className="rounded-2xl overflow-hidden aspect-[4/3] relative group border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer">
              <img className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" src="https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=2070" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex items-end p-6">
                <div>
                  <h4 className="text-white font-black text-sm uppercase italic">完賽專屬禮遇</h4>
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-tight">Win professional gear and more</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
