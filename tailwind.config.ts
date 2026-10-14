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
          DEFAULT: "#3A3732",
          soft: "#5C574F",
          mute: "#8A847A",
        },
        sand: {
          DEFAULT: "#F3EEE6",
          deep: "#E7E0D4",
          card: "#FAF7F2",
        },
        clay: {
          DEFAULT: "#A89880",
          soft: "#C4B6A0",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Songti SC", "serif"],
        sans: ["var(--font-sans)", "PingFang SC", "Microsoft YaHei", "sans-serif"],
      },
      boxShadow: {
        soft: "0 8px 30px rgba(58, 55, 50, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
