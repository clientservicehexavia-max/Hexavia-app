/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        secondary: "#F59E0B",
        background: "#F3F4F6",
        surface: "#F5F7FB",
        text: "#111827",

        blue: {
          50:  "#edeff7",
          100: "#c8cde5",
          200: "#adb5d8",
          300: "#8794c7",
          400: "#707fbc",
          500: "#4c5fab",
          600: "#45569c",
          700: "#364379",
          800: "#2a345e",
          900: "#202848",
        },

        primary: {
          DEFAULT: "#4c5fab",
          50:  "#edeff7",
          100: "#c8cde5",
          200: "#adb5d8",
          300: "#8794c7",
          400: "#707fbc",
          500: "#4c5fab",
          600: "#45569c",
          700: "#364379",
          800: "#2a345e",
          900: "#202848",
        },
      },
      fontFamily: {
        kumbh: ["KumbhSans-Regular"],
        kumbhLight: ["KumbhSans-Light"],
        kumbhBold: ["KumbhSans-Bold"],
        sans: ["KumbhSans-Regular", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
