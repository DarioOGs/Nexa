/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F7F5F0',
        surface: '#FFFFFF',
        border: '#E4E1D9',
        'text-primary': '#16231F',
        'text-secondary': '#6B7570',
        accent: {
          DEFAULT: '#0F6E5C',
          dark: '#0B5548',
        },
        alert: {
          bg: '#FCEEDD',
          text: '#92400E',
        },
        sidebar: '#122A24',
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        sans: ['Manrope', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
}
