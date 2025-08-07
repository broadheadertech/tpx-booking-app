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
          orange: '#FF8C42',
          black: '#1A1A1A',
        },
        gray: {
          light: '#F5F5F5',
          dark: '#6B6B6B',
        }
      }
    },
  },
  plugins: [],
}