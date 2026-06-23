/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        slate: { 850: "#1e293b", 900: "#0f172a", 950: "#020617" },
        gold: { 400: "#facc15", 500: "#eab308", 600: "#ca8a04" },
        emerald: { 450: "#10b981" }
      }
    }
  },
  plugins: []
};
