import React from 'react';
import { trackShare } from '../../utils/analytics';

interface ShareButtonsProps {
    /** 分享標題 */
    title: string;
    /** 分享描述文字 */
    description?: string;
    /** 分享網址，預設為當前頁面 */
    url?: string;
    /** 按鈕大小 */
    size?: 'sm' | 'md' | 'lg';
    /** 是否顯示標籤文字 */
    showLabels?: boolean;
    /** 額外的 CSS 類別 */
    className?: string;
}

/**
 * 社群分享按鈕組件
 * 支援 Facebook、Twitter/X、LINE 和複製連結功能
 */
const ShareButtons: React.FC<ShareButtonsProps> = ({
    title,
    description = '',
    url,
    size = 'md',
    showLabels = false,
    className = '',
}) => {
    const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(title);
    const encodedDescription = encodeURIComponent(description);

    // 按鈕尺寸對應
    const sizeClasses = {
        sm: 'w-8 h-8 text-sm',
        md: 'w-10 h-10 text-base',
        lg: 'w-12 h-12 text-lg',
    };

    const iconSizes = {
        sm: 16,
        md: 20,
        lg: 24,
    };

    const iconSize = iconSizes[size];

    // NOTE: 組合分享文字，包含標題與描述內容
    const shareText = description
        ? `${title}\n\n${description}`
        : title;
    const encodedShareText = encodeURIComponent(shareText);

    // 複製連結 - 包含標題、挑戰描述與 URL

    // 複製連結 - 包含標題、挑戰描述與 URL
    const copyLink = async () => {
        // NOTE: 組合格式化文字，讓貼上時包含完整挑戰資訊
        const copyText = description
            ? `${title}\n\n${description}\n\n🔗 ${shareUrl}`
            : `${title}\n\n🔗 ${shareUrl}`;

        try {
            await navigator.clipboard.writeText(copyText);
            trackShare('link', 'segment_challenge');
            alert('連結已複製到剪貼簿！');
        } catch {
            // Fallback 方法
            const textArea = document.createElement('textarea');
            textArea.value = copyText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('連結已複製到剪貼簿！');
        }
    };

    const buttonBaseClass = `
        flex items-center justify-center rounded-full 
        transition-all duration-200 
        hover:scale-110 active:scale-95
        focus:outline-none focus:ring-2 focus:ring-offset-2
        ${sizeClasses[size]}
    `;

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            {/* 複製連結 */}
            <button
                onClick={copyLink}
                className={`${buttonBaseClass} bg-slate-600 hover:bg-slate-500 text-white focus:ring-slate-500/50 w-full`} //Added w-full to make it look better if it's the only one, or maybe just keep it as is? user didn't specify w-full. The image shows it's part of a row. The user circled the button.
                // Let's stick to the original style but just remove others.
                // Actually, if it's the only button, "flex items-center gap-3" on the container might be weird if we don't adjust.
                // But let's just remove the others first.
                aria-label="複製連結"
                title="複製連結"
            >
                <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                {showLabels && <span className="ml-2">複製</span>}
            </button>

            {/* 複製連結 */}
            <button
                onClick={copyLink}
                className={`${buttonBaseClass} bg-slate-600 hover:bg-slate-500 text-white focus:ring-slate-500/50`}
                aria-label="複製連結"
                title="複製連結"
            >
                <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                {showLabels && <span className="ml-2">複製</span>}
            </button>
        </div>
    );
};

export default ShareButtons;
