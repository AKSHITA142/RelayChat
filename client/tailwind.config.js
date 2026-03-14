/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        whatsapp: {
          green: '#25D366',
          'dark-green': '#128C7E',
          teal: '#075E54',
          'bg-dark': '#0b141a',
          'sidebar-dark': '#111b21',
          'bubble-out': '#005c4b',
          'bubble-in': '#202c33',
        },
      },
    },
  },
  plugins: [],
}
