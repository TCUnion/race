
import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./App.tsx",
        "./index.tsx",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./hooks/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                "tcu-blue": "#0056A4",
                "tcu-blue-light": "#007bff",
                "strava-orange": "#FC6100",
                "strava-grey-dark": "#242428",
                "strava-grey-light": "#A1A1A1",
                "background-dark": "#0f172a",
                "background-black": "#121212",
            },
            fontFamily: {
                sans: ['Chakra Petch', 'Noto Sans TC', 'sans-serif'],
                display: ['Russo One', 'Noto Sans TC', 'sans-serif'],
                body: ['Chakra Petch', 'Noto Sans TC', 'sans-serif'],
            },
            animation: {
                'fade-in': 'fade-in 0.5s ease-out',
                'slide-up': 'slide-up 0.5s ease-out',
                'glow-blue': 'glow-pulse-blue 2s infinite ease-in-out',
            },
            keyframes: {
                'fade-in': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                'slide-up': {
                    '0%': { transform: 'translateY(10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                'glow-pulse-blue': {
                    '0%': { 'box-shadow': '0 0 0px rgba(0, 86, 164, 0)', 'text-shadow': '0 0 0px rgba(0, 86, 164, 0)' },
                    '50%': { 'box-shadow': '0 0 15px rgba(0, 86, 164, 0.5)', 'text-shadow': '0 0 10px rgba(0, 86, 164, 0.4)' },
                    '100%': { 'box-shadow': '0 0 0px rgba(0, 86, 164, 0)', 'text-shadow': '0 0 0px rgba(0, 86, 164, 0)' },
                },
            },
        }
    },
    safelist: [
        'animate-glow-blue',
        'ring-2',
        'ring-tcu-blue'
    ],
    plugins: [
        forms,
        containerQueries,
    ],
}
