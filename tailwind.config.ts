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
        card: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
