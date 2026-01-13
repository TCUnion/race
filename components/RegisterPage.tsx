import React, { useState, useEffect } from 'react';
import RegistrationForm from './RegistrationForm';
import { supabase } from '../lib/supabase';
import { useSegmentData } from '../hooks/useSegmentData';
import { ViewType } from '../types';

interface RegisterPageProps {
  onNavigate: (view: ViewType) => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate }) => {
  const { segments } = useSegmentData();
  const [athlete, setAthlete] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check Strava connection
    const savedData = localStorage.getItem('strava_athlete_meta');
    if (savedData) {
      const athleteData = JSON.parse(savedData);
      setAthlete(athleteData);
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tsu-blue"></div>
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-10 text-center">
        <div className="bg-slate-900 p-10 rounded-3xl border border-slate-800 shadow-xl max-w-md">
          <span className="material-symbols-outlined text-6xl text-slate-700 mb-4">link_off</span>
          <h2 className="text-xl font-black uppercase italic mb-2 text-white">尚未連結 Strava</h2>
          <p className="text-slate-400 text-sm mb-6">請先返回首頁連結您的 Strava 帳號。</p>
          <button
            onClick={() => onNavigate(ViewType.LANDING)}
            className="bg-tsu-blue text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-tsu-blue-light transition-all"
          >
            返回首頁
          </button>
        </div>
      </div>
    );
  }

  // 轉換 segments 格式以符合 RegistrationForm props
  const formSegments = segments.map(s => ({
    id: s.id,
    name: s.name,
    internal_id: s.internal_id
  }));

  return (
    <div className="min-h-screen bg-slate-950 py-20 px-4">
      <RegistrationForm
        athlete={athlete}
        segments={formSegments}
        onSuccess={() => onNavigate(ViewType.DASHBOARD)}
      />
    </div>
  );
};

export default RegisterPage;
