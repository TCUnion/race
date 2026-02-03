
import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./manager.html",
        "./admin.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./src2/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                border: "var(--color-border)",
                input: "var(--color-input)",
                ring: "var(--color-ring)",
                background: "var(--color-background)",
                foreground: "var(--color-foreground)",
                primary: {
                    DEFAULT: "var(--color-primary)",
                    foreground: "var(--color-primary-foreground)",
                },
                secondary: {
                    DEFAULT: "var(--color-secondary)",
                    foreground: "var(--color-secondary-foreground)",
                },
                destructive: {
                    DEFAULT: "var(--color-destructive)",
                    foreground: "var(--color-destructive-foreground)",
                },
                muted: {
                    DEFAULT: "var(--color-muted)",
                    foreground: "var(--color-muted-foreground)",
                },
                accent: {
                    DEFAULT: "var(--color-accent)",
                    foreground: "var(--color-accent-foreground)",
                },
                popover: {
                    DEFAULT: "var(--color-popover)",
                    foreground: "var(--color-popover-foreground)",
                },
                card: {
                    DEFAULT: "var(--color-card)",
                    foreground: "var(--color-card-foreground)",
                },

                // Legacy Colors (Mapped to new variables where possible or kept for compat)
                "tcu-blue": "#0056A4",
                "tcu-blue-light": "#007bff",
                "strava-orange": "#FC6100",
                "strava-grey-dark": "#242428",
                "strava-grey-light": "#A1A1A1",
                "background-dark": "#0f172a",
                "background-black": "#121212",

                // [Deep Space Blue equivalent]
                brand: {
                    dark: '#0B1121',
                    primary: '#38BDF8',
                    secondary: '#F472B6',
                    accent: '#F97316',
                },
                // [NEW] Music App UI Colors (Mapped to Semantic Vars where appropriate)
                bg: "var(--color-background)",
                'bg-dark': "var(--color-bg-dark, hsl(240 10% 3.9%))",
                'bg-darker': "var(--color-bg-darker, hsl(240 10% 2%))",
                'bg-glass': 'var(--color-bg-glass, rgba(9, 9, 11, 0.7))',
                'bg-elevated': 'var(--color-bg-elevated, #27272a)',
                'bg-card': "var(--color-card)",
                'bg-alt': "var(--color-bg-alt, hsl(217.2 32.6% 17.5%))",
                text: "var(--color-foreground)",
                'text-secondary': "var(--color-muted-foreground)",
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
            boxShadow: {
                'glow-primary': '0 0 20px -5px rgba(56, 189, 248, 0.5)',
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
            },
            backgroundImage: {
                'hero-glow': 'conic-gradient(from 180deg at 50% 50%, #2a8af6 0deg, #a853ba 180deg, #e92a67 360deg)',
            }
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
