import React, { Suspense, lazy, useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { ThemeProvider } from './hooks/useTheme';
import { FontSizeProvider } from './hooks/useFontSize';
import { AuthProvider } from './contexts/AuthContext';
import './lib/i18n';
import './index.css';
import '../src2/index.css'; // 確保 V2 的樣式也被載入

// 載入指示器元件
const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      <p className="text-muted-foreground text-sm">載入中...</p>
    </div>
  </div>
);

// 動態載入 V1 和 V2 應用程式
const V1App = lazy(() => import('./App'));
const V2App = lazy(() => import('../src2/App'));

// 裝置檢測閾值（寬度小於此值視為行動裝置）
const MOBILE_BREAKPOINT = 768;

/**
 * 響應式 App 載入器
 * 根據螢幕寬度自動選擇 V1 (桌面) 或 V2 (行動) 介面
 */
function ResponsiveAppLoader() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [userOverride, setUserOverride] = useState<'v1' | 'v2' | null>(null);

  useEffect(() => {
    // 檢查使用者偏好設定
    const savedPreference = localStorage.getItem('tcu-version-preference') as 'v1' | 'v2' | null;
    if (savedPreference) {
      setUserOverride(savedPreference);
    }

    // 初始裝置檢測
    const checkDevice = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    checkDevice();

    // 監聽視窗大小變化
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // 等待裝置檢測完成
  if (isMobile === null) {
    return <LoadingScreen />;
  }

  // 根據使用者偏好或裝置類型決定顯示版本
  const showV2 = userOverride === 'v2' || (userOverride === null && isMobile);

  if (showV2) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <V2App />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <V1App />
    </Suspense>
  );
}

// 主程式進入點
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <FontSizeProvider>
          <ErrorBoundary>
            <ResponsiveAppLoader />
          </ErrorBoundary>
        </FontSizeProvider>
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>
);
