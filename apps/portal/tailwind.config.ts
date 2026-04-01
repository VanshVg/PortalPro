import portalProPreset from "@portalpro/config/tailwind";
import type { Config } from "tailwindcss";

const config: Config = {
  presets: [portalProPreset as Config],
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
