import React from 'react';
import { Share2, FileText, LifeBuoy, Bike, MessageCircle, Globe } from 'lucide-react';
import { ViewType } from '../types';
import { useSiteSettings } from '../hooks/useSiteSettings';  // [NEW] Import hook

interface FooterProps {
  onNavigate?: (view: ViewType) => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { getSetting } = useSiteSettings(); // [NEW] Use hook

  // Helper to get link or #
  const getLink = (key: string) => getSetting(key) || '#';

  // Helper to check if link exists to decide formatting (optional, here we just show placeholders if empty or make them clickable)
  // But per request to "add options", we render them. 
  // If we want to hide empty ones, we can check `getSetting(key)`. 
  // For now, let's render them all but they might be empty links if not set. 
  // User asked "how these work", implying they want them functional.

  return (
    <footer className="py-8 sm:py-12 border-t border-slate-800 bg-[#242424]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 md:px-10 lg:px-20">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-8 mb-8 sm:mb-10">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 text-tsu-blue">
              <Bike className="w-8 h-8" />
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Official Integration Partner</span>
            <div className="flex items-center gap-3 bg-slate-800 px-4 sm:px-6 py-2 sm:py-3 rounded-full border border-slate-700">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Powered by</span>
              <span className="text-[#fc4c02] font-black italic text-base sm:text-lg">STRAVA</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-4 sm:gap-8">

            <a className="text-slate-400 hover:text-tsu-blue transition-colors" href={getLink('footer_link_share') || '#'} target="_blank" rel="noopener noreferrer" title="分享"><Share2 className="w-5 h-5" /></a>
            <a className="text-slate-400 hover:text-tsu-blue transition-colors" href={getLink('footer_link_doc') || '#'} target="_blank" rel="noopener noreferrer" title="文件"><FileText className="w-5 h-5" /></a>
            <a className="text-slate-400 hover:text-tsu-blue transition-colors" href={getLink('footer_link_support') || '#'} target="_blank" rel="noopener noreferrer" title="客服"><LifeBuoy className="w-5 h-5" /></a>
            <a className="text-slate-400 hover:text-[#06c755] transition-colors" href={getLink('footer_link_line') || '#'} target="_blank" rel="noopener noreferrer" title="Line"><MessageCircle className="w-5 h-5" /></a>
            <a className="text-slate-400 hover:text-tsu-blue transition-colors" href={getLink('footer_link_web') || '#'} target="_blank" rel="noopener noreferrer" title="官網"><Globe className="w-5 h-5" /></a>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 sm:pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest text-center md:text-left leading-relaxed">
            2026 TCU Taiwan Cycling Union<br className="sm:hidden" /> 此網站由 Strava API 技術支持
          </p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            <a className="text-[10px] font-bold text-slate-500 hover:text-tsu-blue uppercase transition-colors" href="#">Privacy</a>
            <a className="text-[10px] font-bold text-slate-500 hover:text-tsu-blue uppercase transition-colors" href="#">Terms</a>
            <a className="text-[10px] font-bold text-slate-500 hover:text-tsu-blue uppercase transition-colors" href="/privacy-policy.html">Privacy Policy</a>
          </div>
        </div>
      </div>
    </footer >
  );
};

export default Footer;
