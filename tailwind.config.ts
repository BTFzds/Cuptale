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
          DEFAULT: "#1a1a1a",
          soft: "#666666",
          mute: "#999999",
        },
        sand: {
          DEFAULT: "#f7f5f2",
          deep: "#ebe7e1",
          card: "#ffffff",
        },
        clay: {
          DEFAULT: "#a89880",
          soft: "#c4b6a0",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Songti SC", "serif"],
        sans: ["var(--font-sans)", "PingFang SC", "Microsoft YaHei", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
