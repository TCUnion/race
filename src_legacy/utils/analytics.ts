/**
 * Google Analytics 4 事件追蹤工具
 * 提供統一的 GA4 事件追蹤介面
 */

// GA4 Measurement ID
const GA_MEASUREMENT_ID = 'G-PNRPE4WRRH';

// 宣告 gtag 函式的型別
declare global {
    interface Window {
        gtag?: (...args: unknown[]) => void;
        dataLayer?: unknown[];
    }
}

/**
 * 發送自訂事件到 GA4
 * @param eventName 事件名稱
 * @param eventParams 事件參數
 */
export const trackEvent = (
    eventName: string,
    eventParams?: Record<string, string | number | boolean>
): void => {
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', eventName, eventParams);
    }
};

/**
 * 追蹤頁面瀏覽
 * @param pagePath 頁面路徑
 * @param pageTitle 頁面標題
 */
export const trackPageView = (pagePath: string, pageTitle?: string): void => {
    if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('config', GA_MEASUREMENT_ID, {
            page_path: pagePath,
            page_title: pageTitle,
        });
    }
};

// ========== 預定義事件 ==========

/**
 * 追蹤 Strava 連線事件
 */
export const trackStravaConnect = (athleteId: number): void => {
    trackEvent('strava_connect', {
        athlete_id: athleteId,
        method: 'oauth',
    });
};

/**
 * 追蹤 Strava 登出事件
 */
export const trackStravaDisconnect = (): void => {
    trackEvent('strava_disconnect');
};

/**
 * 追蹤賽事報名事件
 * @param segmentId 路段 ID
 * @param segmentName 路段名稱
 */
export const trackRegistration = (segmentId: number, segmentName: string): void => {
    trackEvent('registration_submit', {
        segment_id: segmentId,
        segment_name: segmentName,
    });
};

/**
 * 追蹤報名成功事件
 * @param segmentId 路段 ID
 */
export const trackRegistrationSuccess = (segmentId: number): void => {
    trackEvent('registration_success', {
        segment_id: segmentId,
    });
};

/**
 * 追蹤排行榜查看事件
 * @param segmentId 路段 ID
 * @param segmentName 路段名稱
 */
export const trackLeaderboardView = (segmentId: number, segmentName: string): void => {
    trackEvent('leaderboard_view', {
        segment_id: segmentId,
        segment_name: segmentName,
    });
};

/**
 * 追蹤排行榜同步事件
 * @param segmentId 路段 ID
 */
export const trackLeaderboardSync = (segmentId: number): void => {
    trackEvent('leaderboard_sync', {
        segment_id: segmentId,
    });
};

/**
 * 追蹤社群分享事件
 * @param platform 分享平台 (facebook, twitter, line, link)
 * @param contentType 分享內容類型
 */
export const trackShare = (
    platform: 'facebook' | 'twitter' | 'line' | 'link',
    contentType: string
): void => {
    trackEvent('share', {
        method: platform,
        content_type: contentType,
    });
};

/**
 * 追蹤主題切換事件
 * @param theme 新主題 ('dark' | 'light')
 */
export const trackThemeChange = (theme: 'dark' | 'light'): void => {
    trackEvent('theme_change', {
        theme: theme,
    });
};

/**
 * 追蹤會員綁定事件
 * @param success 是否成功
 */
export const trackMemberBinding = (success: boolean): void => {
    trackEvent('member_binding', {
        success: success,
    });
};

/**
 * 追蹤錯誤事件
 * @param errorType 錯誤類型
 * @param errorMessage 錯誤訊息
 */
export const trackError = (errorType: string, errorMessage: string): void => {
    trackEvent('error', {
        error_type: errorType,
        error_message: errorMessage.substring(0, 100), // 限制長度
    });
};

/**
 * 追蹤外部連結點擊
 * @param url 連結網址
 * @param linkText 連結文字
 */
export const trackOutboundLink = (url: string, linkText: string): void => {
    trackEvent('click', {
        link_url: url,
        link_text: linkText,
        outbound: true,
    });
};

/**
 * 追蹤 CTA 按鈕點擊
 * @param buttonName 按鈕名稱
 * @param location 按鈕位置
 */
export const trackCTAClick = (buttonName: string, location: string): void => {
    trackEvent('cta_click', {
        button_name: buttonName,
        location: location,
    });
};

export default {
    trackEvent,
    trackPageView,
    trackStravaConnect,
    trackStravaDisconnect,
    trackRegistration,
    trackRegistrationSuccess,
    trackLeaderboardView,
    trackLeaderboardSync,
    trackShare,
    trackThemeChange,
    trackMemberBinding,
    trackError,
    trackOutboundLink,
    trackCTAClick,
};
