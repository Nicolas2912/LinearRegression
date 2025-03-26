// client/tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {},
  },
  // Add DaisyUI directly
  plugins: [
    require("daisyui")
  ],

  // DaisyUI configuration (optional - themes are defined here)
  daisyui: {
    themes: ["light", "dark", "cupcake", "synthwave"],
    // other daisyui config options...
  },
}