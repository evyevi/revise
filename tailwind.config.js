/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFF5F7',
          100: '#FFE3E8',
          200: '#FFC0CB',
          300: '#FF9DB8',
          400: '#FF69B4',
          500: '#FF1493',
          600: '#E01070',
        },
        accent: {
          50: '#F5EBFF',
          100: '#E8D4FF',
          200: '#DDA0DD',
          300: '#D896D8',
        },
        cream: '#FFF8F0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
