/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          navy: "#0a2540",
          navyDark: "#061b2e",
          navyLight: "#163a5f",
          saffron: "#e67300",
          saffronLight: "#ff9933",
          green: "#0b7336",
          greenLight: "#138808",
          cardBg: "#ffffff",
          border: "#d1d5db",
          muted: "#4b5563",
          surface: "#f8fafc",
          surfaceDark: "#f1f5f9"
        }
      },
      boxShadow: {
        'gov-card': '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.08)',
        'gov-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.08)',
      }
    },
  },
  plugins: [],
};
