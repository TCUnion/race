import React, { createContext, useContext, useState, useEffect } from 'react';

export type FontSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl';

const STORAGE_KEY = 'tcu_font_size';

interface FontSizeContextType {
    fontSize: FontSize;
    fontSizeValue: string;
    setFontSize: (size: FontSize) => void;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

export const FontSizeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [fontSize, setFontSize] = useState<FontSize>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return (saved as FontSize) || 'base';
    });

    const fontSizeValue = getFontSizeValue(fontSize);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, fontSize);
        // 全局核心：直接調整 HTML 根節點大小，這會帶動所有 rem 單位
        document.documentElement.style.fontSize = fontSizeValue;

        // 輔助標記：保留 body 屬性供 CSS 微調
        document.body.setAttribute('data-tcu-font-size', fontSize);

        // 排錯接口
        (window as any).debugTCUFontSize = {
            current: fontSize,
            value: fontSizeValue,
            lastUpdate: new Date().toLocaleTimeString()
        };
        console.log(`[FontSize] Global scale applied: ${fontSize} (${fontSizeValue})`);
    }, [fontSize, fontSizeValue]);

    function getFontSizeValue(size: FontSize): string {
        switch (size) {
            case 'xs': return '13px';   // 較小
            case 'sm': return '14px';   // 略小
            case 'base': return '16px'; // 標準 (1rem)
            case 'lg': return '20px';   // 較大
            case 'xl': return '24px';   // 特大
            default: return '16px';
        }
    }

    return (
        <FontSizeContext.Provider value={{ fontSize, fontSizeValue, setFontSize }}>
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
