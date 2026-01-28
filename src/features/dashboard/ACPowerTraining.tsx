import React from 'react';
import AthletePowerTrainingReport from '../member/AthletePowerTrainingReport';
import { useAuth } from '../../hooks/useAuth';
import { ShieldAlert, Zap } from 'lucide-react';

const ACPowerTraining: React.FC = () => {
    const { isBound } = useAuth();

    // Safety check just in case routing bypasses the check (though Navbar hides it)
    if (!isBound) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-red-200 dark:border-red-900/30 shadow-2xl max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldAlert className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase italic">存取被拒絕</h2>
                    <p className="text-slate-500 font-medium mb-6">
                        此功能僅限已綁定的 TCU 會員使用。請先前往「TCU 綁定」頁面完成身份驗證。
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}


                {/* Main Content */}

                <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
                    <AthletePowerTrainingReport />
                </div>
            </div>
        </div>
    );
};

export default ACPowerTraining;
