/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc5fb',
          400: '#36a5f7',
          500: '#0c87eb',
          600: '#006bc9',
          700: '#0055a4',
          800: '#054887',
          900: '#0a3c70',
          950: '#07264a', // Dark Navy Blue corporate identity
        },
        navy: {
          800: '#0f1e36',
          900: '#0a1426',
          950: '#060d1a',
        },
        emerald: {
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        gold: {
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
        }
      },
    },
  },
  plugins: [],
}

