import { useState, useEffect } from 'react';

/**
 * 偵測是否為行動裝置 (螢幕寬度 < 768px)
 * @returns boolean
 */
export function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        // 初始檢查
        checkIsMobile();

        // 監聽視窗大小變化
        window.addEventListener('resize', checkIsMobile);

        return () => {
            window.removeEventListener('resize', checkIsMobile);
        };
    }, []);

    return isMobile;
}
