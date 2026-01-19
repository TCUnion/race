import React from 'react';
import { Share2, FileText, LifeBuoy, Bike } from 'lucide-react';
import { ViewType } from '../types';

interface FooterProps {
  onNavigate?: (view: ViewType) => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="py-12 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark/50">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-20">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-10">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 text-tsu-blue">
              <Bike className="w-8 h-8" />
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Official Integration Partner</span>
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 px-6 py-3 rounded-full border border-slate-100 dark:border-slate-700">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Powered by</span>
              <span className="text-strava-orange font-black italic text-lg">STRAVA</span>
            </div>
          </div>

          <div className="flex gap-8">
            <a className="text-slate-400 hover:text-tsu-blue transition-colors" href="#"><Share2 className="w-5 h-5" /></a>
            <a className="text-slate-400 hover:text-tsu-blue transition-colors" href="#"><FileText className="w-5 h-5" /></a>
            <a className="text-slate-400 hover:text-tsu-blue transition-colors" href="#"><LifeBuoy className="w-5 h-5" /></a>
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest text-center md:text-left">
            2026 TCU Taiwan Cycling Union 此網站由 Strava API 技術支持，與其官方無隸屬關係。
          </p>
          <div className="flex gap-6">
            <a className="text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:text-tsu-blue uppercase transition-colors" href="#">Privacy</a>
            <a className="text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:text-tsu-blue uppercase transition-colors" href="#">Terms</a>
            <a className="text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:text-tsu-blue uppercase transition-colors" href="/privacy-policy.html">Privacy</a>

          </div>
        </div>
      </div>
    </footer >
  );
};

export default Footer;
