import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
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
      keyframes: {
        "fade-in": { "0%": { opacity: "0", transform: "translateY(4px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "pop-in": { "0%": { opacity: "0", transform: "scale(0.97)" }, "100%": { opacity: "1", transform: "scale(1)" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
      animation: {
        "fade-in": "fade-in 0.35s ease-out",
        "pop-in": "pop-in 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        shimmer: "shimmer 2.5s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
