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
