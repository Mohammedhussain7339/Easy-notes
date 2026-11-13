import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core surfaces — values come from CSS custom properties set per
        // `data-theme` in app/globals.css, so every theme flows through
        // these same class names.
        canvas: "var(--color-canvas)",
        surface: "var(--color-surface)",
        "surface-solid": "var(--color-surface-solid)",
        ink: "var(--color-ink)",
        "ink-soft": "var(--color-ink-soft)",
        "ink-faint": "var(--color-ink-faint)",
        border: "var(--color-border)",
        accent: "var(--color-accent)",
        "accent-hover": "var(--color-accent-hover)",
        "on-accent": "var(--color-on-accent)",
        "accent-soft": "var(--color-accent-soft)",
        // Category accents, themed per palette.
        "cat-personal": "var(--cat-personal)",
        "cat-work": "var(--cat-work)",
        "cat-ideas": "var(--cat-ideas)",
        "cat-journal": "var(--cat-journal)",
        "cat-todo": "var(--cat-todo)",
        "cat-other": "var(--cat-other)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "var(--radius-card)",
        control: "var(--radius-control)",
      },
      borderWidth: {
        theme: "var(--border-width)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        fab: "var(--shadow-fab)",
        pressed: "var(--shadow-pressed)",
      },
      backdropBlur: {
        theme: "var(--surface-blur)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.35s ease-out both",
        "pop-in": "pop-in 0.2s ease-out both",
        "slide-up": "slide-up 0.3s ease-out both",
      },
    },
  },
  plugins: [],
};
export default config;
