/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./public/index.html", "./src/**/*.js"],
  theme: {
    extend: {
      colors: {
        primary: "#ffffff",
        "primary-dark": "#e4e4e7",
        "accent-green": "#10b981",
        "glass-border": "rgba(255, 255, 255, 0.08)",
        "glass-bg": "rgba(24, 24, 27, 0.4)",
        "glass-bg-hover": "rgba(39, 39, 42, 0.5)",
      },
      fontFamily: {
        display: ["Poppins", "sans-serif"],
        body: ["Poppins", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.75rem",
      },
    },
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography")],
};

