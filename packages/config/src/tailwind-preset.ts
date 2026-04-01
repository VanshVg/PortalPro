import type { Config } from "tailwindcss";

/**
 * PortalPro shared Tailwind CSS preset.
 * Contains the design system tokens: colors, typography, spacing, shadows.
 * Used by both agency and portal apps for visual consistency.
 */
const portalProPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1B4D6E",
          light: "#2E86AB",
          dark: "#0F3049",
          50: "#EEF5F9",
          100: "#D5E7F0",
          200: "#ABCFE1",
          300: "#81B7D2",
          400: "#4E97BC",
          500: "#2E86AB",
          600: "#1B4D6E",
          700: "#153D58",
          800: "#0F3049",
          900: "#0A2033",
          950: "#05101A",
        },
        accent: {
          DEFAULT: "#E8B931",
          light: "#F5DFA0",
          50: "#FEFAEC",
          100: "#FBF0C8",
          200: "#F5DFA0",
          300: "#EFCE78",
          400: "#E8B931",
          500: "#D4A41E",
          600: "#A87E17",
          700: "#7C5D12",
          800: "#503D0C",
          900: "#2A2007",
        },
        success: {
          DEFAULT: "#16A34A",
          light: "#DCFCE7",
          dark: "#15803D",
        },
        warning: {
          DEFAULT: "#EAB308",
          light: "#FEF9C3",
          dark: "#CA8A04",
        },
        error: {
          DEFAULT: "#DC2626",
          light: "#FEE2E2",
          dark: "#B91C1C",
        },
        info: {
          DEFAULT: "#2563EB",
          light: "#DBEAFE",
          dark: "#1D4ED8",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "Consolas", "monospace"],
        arabic: ["Noto Sans Arabic", "Tahoma", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
      },
      boxShadow: {
        "card": "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        "card-hover": "0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.08)",
        "modal": "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
      },
      animation: {
        "shimmer": "shimmer 2s infinite linear",
        "slide-in-right": "slideInRight 200ms ease-out",
        "slide-up": "slideUp 200ms ease-out",
        "fade-in": "fadeIn 150ms ease-out",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        slideInRight: {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
};

export default portalProPreset;
