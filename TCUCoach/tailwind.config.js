/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#09090b", // zinc-950
        surface: "#18181b", // zinc-900
        primary: "#10b981", // emerald-500
        secondary: "#06b6d4", // cyan-500
        accent: "#8b5cf6", // violet-500
        "dr-text": "#e4e4e7", // zinc-200
        "dr-muted": "#a1a1aa", // zinc-400
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Chakra Petch', 'sans-serif'], // Mechanical/Sci-fi feel
        mono: ['Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
