import React from 'react';
import { useTheme } from '../hooks/useTheme';

/**
 * 主題切換按鈕組件
 * 顯示太陽/月亮圖示，點擊切換深色/淺色模式
 */
const ThemeToggle: React.FC = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="relative p-2 rounded-lg transition-all duration-300 
                 hover:bg-white/10 dark:hover:bg-white/10 
                 light:hover:bg-black/10
                 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            aria-label={theme === 'dark' ? '切換至淺色模式' : '切換至深色模式'}
            title={theme === 'dark' ? '切換至淺色模式' : '切換至深色模式'}
        >
            <div className="relative w-5 h-5">
                {/* 太陽圖示 - 淺色模式時顯示 */}
                <svg
                    className={`absolute inset-0 w-5 h-5 text-amber-500 transition-all duration-300 ${theme === 'light'
                            ? 'opacity-100 rotate-0 scale-100'
                            : 'opacity-0 rotate-90 scale-50'
                        }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                </svg>

                {/* 月亮圖示 - 深色模式時顯示 */}
                <svg
                    className={`absolute inset-0 w-5 h-5 text-blue-300 transition-all duration-300 ${theme === 'dark'
                            ? 'opacity-100 rotate-0 scale-100'
                            : 'opacity-0 -rotate-90 scale-50'
                        }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                </svg>
            </div>
        </button>
    );
};

export default ThemeToggle;
