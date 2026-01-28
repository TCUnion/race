import React, { createContext, useContext, useEffect, useState } from 'react';
import { trackThemeChange } from '../utils/analytics';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'tcu-theme-preference';

/**
 * 取得使用者偏好的主題
 * 優先級：localStorage > 系統偏好 > 預設深色
 */
function getInitialTheme(): Theme {
    // 檢查 localStorage
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') {
            return stored;
        }

        // 檢查系統偏好
        if (window.matchMedia('(prefers-color-scheme: light)').matches) {
            return 'light';
        }
    }

    // 預設深色模式
    return 'dark';
}

/**
 * 套用主題到 HTML 元素
 */
function applyTheme(theme: Theme) {
    const root = document.documentElement;

    if (theme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
    } else {
        root.classList.add('light');
        root.classList.remove('dark');
    }

    // 更新 color-scheme
    root.style.colorScheme = theme;
}

interface ThemeProviderProps {
    children: React.ReactNode;
}

/**
 * Theme Provider 組件
 * 提供全域主題狀態管理
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>(getInitialTheme);

    // 初始化時套用主題
    useEffect(() => {
        applyTheme(theme);
    }, []);

    // 監聽系統主題變化
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e: MediaQueryListEvent) => {
            // 只有在沒有手動設定過時才跟隨系統
            const stored = localStorage.getItem(THEME_STORAGE_KEY);
            if (!stored) {
                const newTheme = e.matches ? 'dark' : 'light';
                setThemeState(newTheme);
                applyTheme(newTheme);
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        applyTheme(newTheme);
        localStorage.setItem(THEME_STORAGE_KEY, newTheme);
        // 追蹤主題變更事件
        trackThemeChange(newTheme);
    };

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }
        }>
            {children}
        </ThemeContext.Provider>
    );
};

/**
 * useTheme Hook
 * 取得目前主題狀態與切換方法
 */
export function useTheme(): ThemeContextType {
    const context = useContext(ThemeContext);

    if (context === undefined) {
        throw new Error('useTheme 必須在 ThemeProvider 內使用');
    }

    return context;
}

export default useTheme;
