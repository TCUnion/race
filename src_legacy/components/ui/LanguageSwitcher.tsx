import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';

const LanguageSwitcher: React.FC = () => {
    const { i18n } = useTranslation();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const toggleLanguage = () => {
        // 如果當前是英文 (en, en-US)，切換到中文；否則切換到英文
        const newLang = i18n.language.startsWith('en') ? 'zh' : 'en';
        i18n.changeLanguage(newLang);
    };

    const isEn = i18n.language.startsWith('en');

    return (
        <button
            onClick={toggleLanguage}
            className={`
                relative flex items-center justify-center w-10 h-10 rounded-full 
                transition-all duration-300 
                focus:outline-none focus:ring-2 
                shadow-md hover:shadow-lg hover:scale-105 active:scale-95
                font-bold text-sm tracking-wide
                ${isDark
                    ? 'bg-slate-700 hover:bg-slate-600 border-2 border-slate-500 text-slate-200 focus:ring-blue-500/50'
                    : 'bg-white hover:bg-gray-50 border-2 border-slate-200 text-slate-700 focus:ring-slate-400/50'
                }
            `}
            aria-label={isEn ? '切換至繁體中文' : 'Switch to English'}
            title={isEn ? '切換至繁體中文' : 'Switch to English'}
        >
            {isEn ? 'EN' : '中'}
        </button>
    );
};

export default LanguageSwitcher;
