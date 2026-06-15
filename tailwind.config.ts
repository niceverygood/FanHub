import type { Config } from "tailwindcss";

/**
 * FanHub design system — dark luxury / exchange aesthetic.
 * Single accent: Hermès orange #F3701F. Do NOT add other accent colors.
 * Numbers / prices / tickers must always render in the mono font.
 * All values are registered as tokens here — never hardcode hex in components.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B0B0B",
        surface: {
          DEFAULT: "#131313",
          elevated: "#1A1A1A",
        },
        border: {
          DEFAULT: "#242424",
        },
        accent: {
          DEFAULT: "#F3701F",
          // tonal steps derived from the single accent, for hover/active only
          hover: "#FF8133",
          muted: "#7A3A10",
        },
        text: {
          DEFAULT: "#F4F2EF",
          muted: "#8B8B8B",
        },
        // semantic, derived from accent + neutrals only (no new hues)
        up: "#F3701F",
        down: "#8B8B8B",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderColor: {
        DEFAULT: "#242424",
      },
      borderRadius: {
        card: "16px",
      },
      boxShadow: {
        soft: "0 14px 44px -16px rgba(0,0,0,0.7)",
        glow: "0 0 28px -6px rgba(243,112,31,0.45)",
        "glow-strong": "0 0 0 1px rgba(243,112,31,0.45), 0 12px 36px -10px rgba(243,112,31,0.4)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
