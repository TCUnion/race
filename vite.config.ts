import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
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
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      }
    }
  };
});
