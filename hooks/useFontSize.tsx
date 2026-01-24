import React, { createContext, useContext, useState, useEffect } from 'react';

export type FontSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl';

const STORAGE_KEY = 'tcu_font_size';

interface FontSizeContextType {
    fontSize: FontSize;
    setFontSize: (size: FontSize) => void;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

export const FontSizeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [fontSize, setFontSize] = useState<FontSize>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return (saved as FontSize) || 'base';
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, fontSize);
        // 也更新 HTML 根元素的 CSS 變數，方便全域使用
        document.documentElement.style.setProperty('--tcu-active-font-size', getFontSizeValue(fontSize));
    }, [fontSize]);

    function getFontSizeValue(size: FontSize): string {
        switch (size) {
            case 'xs': return '0.75rem';
            case 'sm': return '0.875rem';
            case 'base': return '1rem';
            case 'lg': return '1.125rem';
            case 'xl': return '1.25rem';
            default: return '1rem';
        }
    }

    return (
        <FontSizeContext.Provider value={{ fontSize, setFontSize }}>
            {children}
        </FontSizeContext.Provider>
    );
};

export const useFontSize = () => {
    const context = useContext(FontSizeContext);
    if (context === undefined) {
        throw new Error('useFontSize must be used within a FontSizeProvider');
    }
    return context;
};
