/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0b1c2c',
          800: '#11293f',
          700: '#1a3a57',
        },
        gold: {
          500: '#c9a44c',
          400: '#d8b968',
        },
      },
    },
  },
  plugins: [],
};
