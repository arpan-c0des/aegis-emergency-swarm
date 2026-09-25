/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./styles/**/*.{css}",
  ],
  theme: {
    extend: {
      colors: {
        hud: {
          bg: "#040910",
          panel: "#070E1A",
          panelBorder: "#132742",
          cyan: "#38BDF8",
          amber: "#F59E0B",
          red: "#EF4444",
        }
      }
    },
  },
  plugins: [],
}