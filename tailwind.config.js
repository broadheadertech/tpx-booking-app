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
          orange: '#D9641E',
          'orange-light': '#ED7D27',
          'orange-dark': '#C55A1A',
          black: '#141414',
          'black-light': '#41423A',
        },
        gray: {
          light: '#F7F7F7',
          medium: '#ECE2D2',
          dark: '#8B8B8B',
          darker: '#5A5A5A',
        },
        accent: {
          cream: '#ECE2D2',
          'cream-light': '#F5F1EA',
          coral: '#ED7D27',
          neutral: '#41423A',
        }
      },
      animation: {
        'gradient': 'gradient 3s ease infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': {
            'background-position': '0% 50%',
          },
          '50%': {
            'background-position': '100% 50%',
          },
        },
      },
    },
  },
  plugins: [],
}