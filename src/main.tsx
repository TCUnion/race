import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import './index.css'
import { onLCP, onCLS, onINP, onFCP } from 'web-vitals';

// 效能監測：在開發環境將指標輸出到控制台
// LCP: 載入速度, CLS: 視覺穩定度, INP: 互動反應, FCP: 首次繪製
if (import.meta.env.DEV) {
    onLCP(console.log);
    onFCP(console.log);
    onCLS(console.log);
    onINP(console.log);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <AuthProvider>
            <App />
        </AuthProvider>
    </React.StrictMode>,
)
