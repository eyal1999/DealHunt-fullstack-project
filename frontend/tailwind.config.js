/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1565a0",
        secondary: "#f5a623",
      },
    },
  },
  plugins: [],
};
