import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'child_process';

// 取得最新 Git Commit SHA
const getGitVersion = () => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch (e) {
    return 'unknown';
  }
};

const gitVersion = getGitVersion();

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/',
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'https://service.criterium.tw',
          changeOrigin: true,
        }
      }
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'apple-touch-icon.png', 'icon-192x192.png', 'icon-512x512.png'],
        manifest: {
          id: 'tw.criterium.tcu',
          name: 'TCU 小幫手',
          short_name: 'TCU小幫手',
          description: '連結 Strava，挑戰台中經典 136 路段',
          theme_color: '#f97316',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/',
          icons: [
            { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
            { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
          ],
          shortcuts: [
            { name: '保養紀錄', short_name: '保養', url: '/?view=maintenance', icons: [{ src: '/icon-192x192.png', sizes: '192x192' }] },
            { name: '排行榜', short_name: '排行', url: '/?view=leaderboard', icons: [{ src: '/icon-192x192.png', sizes: '192x192' }] }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              // API 請求：網路優先，失敗時使用快取
              urlPattern: /^https:\/\/(api\.|service\.criterium\.tw)/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }, // 1 天
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              // Strava API：網路優先
              urlPattern: /^https:\/\/www\.strava\.com\/api/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'strava-api-cache',
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 30 }, // 30 分鐘
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              // 圖片：快取優先
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'image-cache',
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 } // 30 天
              }
            },
            {
              // Google Fonts：快取優先
              urlPattern: /^https:\/\/fonts\.googleapis\.com/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } // 1 年
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 } // 1 年
              }
            }
          ]
        }
      }),
    ],
    define: {
      // 移除 VITE_SUPABASE_URL 與 VITE_SUPABASE_ANON_KEY 的手動 define，
      // Vite 會自動讀取 VITE_ 開頭的環境變數並注入 import.meta.env。
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      '__APP_VERSION__': JSON.stringify(gitVersion)
    },

    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          manager: path.resolve(__dirname, 'manager.html'),
          admin: path.resolve(__dirname, 'admin.html'),
          v2: path.resolve(__dirname, 'v2.html'),
        },
        output: {
          // 手動分割 Chunk 策略 - 優化 Bundle Size
          manualChunks: {
            // 核心 React 庫
            'vendor-react': ['react', 'react-dom'],
            // UI 相關庫
            'vendor-ui': ['framer-motion', 'lucide-react'],
            // 圖表庫
            'vendor-charts': ['recharts'],
            // 地圖庫
            'vendor-map': ['leaflet', 'react-leaflet'],
            // 後端服務
            'vendor-supabase': ['@supabase/supabase-js'],
            // 國際化套件
            'vendor-i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector', 'i18next-http-backend'],
          }
        }
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      }
    }
  };
});
