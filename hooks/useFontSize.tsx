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
    }, [fontSize]);

    function getFontSizeValue(size: FontSize): string {
        switch (size) {
            case 'xs': return '12px';
            case 'sm': return '16px';
            case 'base': return '20px';
            case 'lg': return '26px';
            case 'xl': return '34px';
            default: return '20px';
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
