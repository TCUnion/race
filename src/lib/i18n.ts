import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
    // 載入翻譯檔案 (預設從 /public/locales 載入)
    .use(Backend)
    // 偵測使用者語言
    .use(LanguageDetector)
    // 注入 react-i18next
    .use(initReactI18next)
    .init({
        fallbackLng: 'zh',
        debug: false, // 關閉除錯模式，減少 Console 雜訊

        interpolation: {
            escapeValue: false, // React 已經預設防止 XSS
        },

        backend: {
            loadPath: '/locales/{{lng}}/{{ns}}.json',
        },

        detection: {
            order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
            caches: ['localStorage', 'cookie'],
        }
    });

export default i18n;
