import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "var(--surface-1)",
        surface2: "var(--surface-2)",
        border: "var(--border)",
        textprimary: "var(--text-primary)",
        textsecondary: "var(--text-secondary)",
        textmuted: "var(--text-muted)",
        series1: "var(--series-1)",
        series2: "var(--series-2)",
        good: "var(--status-good)",
        warning: "var(--status-warning)",
        serious: "var(--status-serious)",
        critical: "var(--status-critical)",
      },
    },
  },
  plugins: [],
};
export default config;
