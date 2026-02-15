import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useApiStatus } from '../../hooks/useApiStatus';

/**
 * API 伺服器中斷連線的警露元件
 */
export function ApiStatusWarning() {
    const status = useApiStatus();

    if (status !== 'down') return null;

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-md animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-red-500/10 backdrop-blur-md border border-red-500/50 rounded-2xl p-4 shadow-2xl shadow-red-500/20 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                    <AlertCircle className="text-red-500" size={24} />
                </div>

                <div className="flex-1">
                    <h3 className="text-white text-sm font-bold">伺服器連線中斷</h3>
                    <p className="text-white/60 text-xs">目前無法連線至 API 伺服器，部分功能可能受限。</p>
                </div>

                <button
                    onClick={() => window.location.reload()}
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-white/50 hover:text-white"
                    title="重新整理"
                >
                    <RefreshCw size={18} />
                </button>
            </div>
        </div>
    );
}
