/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta corporativa Lime AI Studio, extraída del logo (lima +
        // cerebro-circuito verde→azul, texto marino oscuro).
        lime: {
          50: '#f2fbe8',
          100: '#e2f6c8',
          200: '#c8ec98',
          300: '#a6dc66',
          400: '#8ccf49',
          500: '#6fbe44',
          600: '#559a34',
          700: '#427729',
          800: '#345d22',
          900: '#2b4c1e',
        },
        teal: {
          50: '#e7fafb',
          100: '#c7f1f4',
          200: '#94e2e8',
          300: '#5cccd7',
          400: '#2bb0bf',
          500: '#0e9db0',
          600: '#0b8a9c',
          700: '#0c6f7d',
          800: '#0f5967',
          900: '#114957',
        },
        navy: {
          50: '#eef1f3',
          100: '#d6dce1',
          200: '#aab6c0',
          300: '#7c8d9c',
          400: '#526475',
          500: '#37475a',
          600: '#263646',
          700: '#1b2836',
          800: '#141f2a',
          900: '#11212c',
          950: '#0b151d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
