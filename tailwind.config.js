/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        indigo: {
          900: '#1e1b4b',
          800: '#312e81',
          50: '#f5f7ff',
        },
      },
    },
  },
  plugins: [],
}