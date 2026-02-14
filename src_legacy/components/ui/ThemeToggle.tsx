import React from 'react';
import { useTheme } from '../../hooks/useTheme';
import { Sun, Moon } from 'lucide-react';

/**
 * 主題切換按鈕組件
 * 顯示太陽/月亮圖示，點擊切換深色/淺色模式
 */
const ThemeToggle: React.FC = () => {
    const { theme, toggleTheme } = useTheme();

    // 根據主題直接使用條件樣式，避免依賴 Tailwind dark: 前綴
    const isDark = theme === 'dark';

    return (
        <button
            onClick={toggleTheme}
            className={`
                relative flex items-center justify-center w-10 h-10 rounded-full 
                transition-all duration-300 
                focus:outline-none focus:ring-2 
                shadow-md hover:shadow-lg hover:scale-105 active:scale-95
                ${isDark
                    ? 'bg-slate-700 hover:bg-slate-600 border-2 border-slate-500 focus:ring-blue-500/50'
                    : 'bg-amber-100 hover:bg-amber-200 border-2 border-amber-300 focus:ring-amber-500/50'
                }
            `}
            aria-label={isDark ? '切換至淺色模式' : '切換至深色模式'}
            title={isDark ? '切換至淺色模式' : '切換至深色模式'}
        >
            {/* 太陽圖示 - 淺色模式時顯示 */}
            <Sun
                className={`absolute w-5 h-5 transition-all duration-500 ${!isDark
                        ? 'opacity-100 rotate-0 scale-100 text-amber-600'
                        : 'opacity-0 rotate-180 scale-0 text-amber-600'
                    }`}
                strokeWidth={2.5}
            />

            {/* 月亮圖示 - 深色模式時顯示 */}
            <Moon
                className={`absolute w-5 h-5 transition-all duration-500 ${isDark
                        ? 'opacity-100 rotate-0 scale-100 text-yellow-300'
                        : 'opacity-0 -rotate-180 scale-0 text-yellow-300'
                    }`}
                fill="currentColor"
                strokeWidth={0}
            />
        </button>
    );
};

export default ThemeToggle;
