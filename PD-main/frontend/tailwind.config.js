/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkbg: '#0B0F19',
        cardbg: '#111827',
        bordercolor: '#1F2937',
        accentcyan: '#06B6D4',
        accentindigo: '#6366F1',
        accentemerald: '#10B981',
        accentrose: '#F43F5E'
      }
    },
  },
  plugins: [],
}
