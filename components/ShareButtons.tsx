import React from 'react';
import { trackShare } from '../utils/analytics';

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

    // 分享到 Facebook
    const shareToFacebook = () => {
        trackShare('facebook', 'segment_challenge');
        window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`,
            'facebook-share',
            'width=580,height=400'
        );
    };

    // 分享到 Twitter/X
    const shareToTwitter = () => {
        trackShare('twitter', 'segment_challenge');
        window.open(
            `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
            'twitter-share',
            'width=580,height=400'
        );
    };

    // 分享到 LINE
    const shareToLine = () => {
        trackShare('line', 'segment_challenge');
        window.open(
            `https://social-plugins.line.me/lineit/share?url=${encodedUrl}&text=${encodedTitle}`,
            'line-share',
            'width=580,height=400'
        );
    };

    // 複製連結
    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            trackShare('link', 'segment_challenge');
            // 可以搭配 Toast 通知顯示複製成功
            alert('連結已複製到剪貼簿！');
        } catch {
            // Fallback 方法
            const textArea = document.createElement('textarea');
            textArea.value = shareUrl;
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
            {/* Facebook */}
            <button
                onClick={shareToFacebook}
                className={`${buttonBaseClass} bg-[#1877F2] hover:bg-[#166FE5] text-white focus:ring-[#1877F2]/50`}
                aria-label="分享到 Facebook"
                title="分享到 Facebook"
            >
                <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                {showLabels && <span className="ml-2">Facebook</span>}
            </button>

            {/* Twitter/X */}
            <button
                onClick={shareToTwitter}
                className={`${buttonBaseClass} bg-black hover:bg-gray-800 text-white focus:ring-gray-500/50`}
                aria-label="分享到 X (Twitter)"
                title="分享到 X (Twitter)"
            >
                <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                {showLabels && <span className="ml-2">X</span>}
            </button>

            {/* LINE */}
            <button
                onClick={shareToLine}
                className={`${buttonBaseClass} bg-[#00B900] hover:bg-[#00A000] text-white focus:ring-[#00B900]/50`}
                aria-label="分享到 LINE"
                title="分享到 LINE"
            >
                <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
                {showLabels && <span className="ml-2">LINE</span>}
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
