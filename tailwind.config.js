/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#e11d48',
        'primary-hover': '#be123c',
        background: '#fdfaf7',
      },
      minHeight: {
        '14': '56px',
      }
    },
  },
  plugins: [],
}
