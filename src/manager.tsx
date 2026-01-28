import React from 'react';
import ReactDOM from 'react-dom/client';
import ManagerDashboard from './features/manager/ManagerDashboard';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { ThemeProvider } from './hooks/useTheme';
import { FontSizeProvider } from './hooks/useFontSize';
import './lib/i18n';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}

// Global Callback Interceptor for Strava Auth
(function handleStravaCallback() {
    const params = new URLSearchParams(window.location.search);
    const athleteParam = params.get('athlete');

    // Only intercept if we have the specific parameter 'athlete' which indicates a Strava callback
    if (athleteParam) {
        // DEBUG: Alert user to confirm script is running
        // alert('Debug: Manager Entry intercepted Strava callback. Processing...');

        try {
            // Verify it's valid JSON
            JSON.parse(athleteParam);

            // Save to LocalStorage for the main window to pick up
            localStorage.setItem('strava_athlete_data_temp', athleteParam);
            console.log('Manager Entry: Strava data trapped and saved.');

            // Force notify storage event (for same window or other tabs)
            window.localStorage.setItem('strava_callback_timestamp', Date.now().toString());

            // Success UI
            document.body.innerHTML = `
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#0f172a;color:white;font-family:sans-serif;">
                    <div style="font-size:50px;margin-bottom:20px;color:#22c55e;">✓</div>
                    <h2 style="font-size:24px;font-weight:bold;margin-bottom:10px;">連結成功</h2>
                    <p style="color:#94a3b8;margin-bottom:30px;text-align:center;line-height:1.5;">
                        Strava 帳號已成功連結。<br/>
                        系統已自動傳送資料，您現在可以關閉此視窗。
                    </p>
                    <button onclick="window.close()" style="padding:12px 30px;background:#3b82f6;color:white;border:none;border-radius:12px;font-weight:bold;font-size:16px;cursor:pointer;box-shadow:0 4px 6px rgba(59, 130, 246, 0.3);">
                        關閉視窗
                    </button>
                    <script>
                        // Auto-close attempt
                        if(window.opener) {
                            setTimeout(() => window.close(), 800);
                        }
                    </script>
                </div>
            `;

            // Stop React Mounting
            throw new Error('Strava Callback Handled');
        } catch (e) {
            console.error('Invalid Callback Data', e);
            if (e.message === 'Strava Callback Handled') throw e;
        }
    }
})();

const root = ReactDOM.createRoot(rootElement);
root.render(
    <React.StrictMode>
        <ThemeProvider>
            <FontSizeProvider>
                <ErrorBoundary>
                    <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
                        <ManagerDashboard />
                    </React.Suspense>
                </ErrorBoundary>
            </FontSizeProvider>
        </ThemeProvider>
    </React.StrictMode>
);
