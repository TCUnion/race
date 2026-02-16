import React, { useState, useEffect } from 'react';
import { Link2Off } from 'lucide-react';
import RegistrationForm from './RegistrationForm';
import { supabase } from '../../lib/supabase';
import { useSegmentData } from '../../hooks/useSegmentData';
import { ViewType } from '../../types';

interface RegisterPageProps {
  onNavigate: (view: ViewType) => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate }) => {
  const { segments } = useSegmentData();
  const [athlete, setAthlete] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 過濾已過期路段：end_date 已過的挑戰不出現在報名表中
  const formSegments = React.useMemo(() => {
    const now = new Date();
    return segments
      .filter(s => {
        // 沒有 end_date 的路段視為永久有效
        if (!s.end_date) return true;
        // end_date 當天仍有效（比較到日期結束）
        const endDate = new Date(s.end_date);
        endDate.setHours(23, 59, 59, 999);
        return endDate >= now;
      })
      .map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        strava_id: s.strava_id,
        team: s.team,
        start_date: s.start_date,
        end_date: s.end_date
      }));
  }, [segments]);

  const initialSegmentId = React.useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('segment_id');
    return id ? parseInt(id, 10) : undefined;
  }, []);

  useEffect(() => {
    const loadAthlete = () => {
      const savedData = localStorage.getItem('strava_athlete_data');
      if (savedData) {
        try {
          const athleteData = JSON.parse(savedData);
          setAthlete(athleteData);
        } catch (e) {
          console.error('RegisterPage: parse error', e);
          setAthlete(null);
        }
      } else {
        setAthlete(null);
      }
      setIsLoading(false);
    };

    loadAthlete();

    window.addEventListener('strava-auth-changed', loadAthlete);
    window.addEventListener('storage', loadAthlete);

    return () => {
      window.removeEventListener('strava-auth-changed', loadAthlete);
      window.removeEventListener('storage', loadAthlete);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tcu-blue"></div>
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-10 text-center">
        <div className="bg-slate-900 p-10 rounded-3xl border border-slate-800 shadow-xl max-w-md">
          <Link2Off className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h2 className="text-xl font-black uppercase italic mb-2 text-white">尚未連結 Strava</h2>
          <p className="text-slate-400 text-sm mb-6">請先返回首頁連結您的 Strava 帳號。</p>
          <button
            onClick={() => onNavigate(ViewType.LANDING)}
            className="bg-tcu-blue text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-tcu-blue-light transition-all"
          >
            返回首頁
          </button>
        </div>
      </div>
    );
  }





  return (
    <div className="min-h-screen bg-slate-950 py-20 px-4">
      <RegistrationForm
        athlete={athlete}
        segments={formSegments}
        onSuccess={() => onNavigate(ViewType.DASHBOARD)}
        initialSegmentId={initialSegmentId}
      />
    </div>
  );
};

export default RegisterPage;
