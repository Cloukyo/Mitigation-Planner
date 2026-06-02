import type { Config } from "tailwindcss";

const themedScale = (name: string) =>
  Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((step) => [step, `rgb(var(--color-${name}-${step}) / <alpha-value>)`]));

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        black: "rgb(var(--color-black) / <alpha-value>)",
        white: "rgb(var(--color-white) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        panel: "rgb(var(--color-panel) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
        soft: "rgb(var(--color-soft) / <alpha-value>)",
        slate: themedScale("slate"),
        teal: themedScale("teal"),
        amber: themedScale("amber"),
        red: themedScale("red"),
        emerald: themedScale("emerald"),
        sky: themedScale("sky"),
        cyan: themedScale("cyan"),
        blue: themedScale("blue"),
        violet: themedScale("violet"),
        danger: "rgb(var(--color-danger) / <alpha-value>)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
