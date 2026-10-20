import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#F7E9F4",
          soft: "#CDB0D8",
          mute: "#8F6F9E",
        },
        sand: {
          DEFAULT: "#2A1638",
          deep: "#1E1028",
          card: "#341C44",
        },
        clay: {
          DEFAULT: "#FF6EC7",
          soft: "#FF9ADB",
        },
        hush: {
          bg: "#160C1F",
          panel: "#241430",
          pink: "#FF6EC7",
          glow: "#FFB3E4",
          plum: "#4B2A62",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Songti SC", "serif"],
        sans: ["var(--font-sans)", "PingFang SC", "Microsoft YaHei", "sans-serif"],
      },
      boxShadow: {
        hush: "0 0 24px rgba(255, 110, 199, 0.22)",
      },
    },
  },
  plugins: [],
};

export default config;
