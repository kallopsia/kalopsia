import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    spacing: {
      "0": "0px",
      "1": "4px",
      "2": "8px",
      "4": "16px",
      "6": "24px",
      "10": "40px",
      "16": "64px",
      "24": "96px",
      "32": "128px",
      // Pixel direct names matching spec scale
      "4px": "4px",
      "8px": "8px",
      "16px": "16px",
      "24px": "24px",
      "40px": "40px",
      "64px": "64px",
      "96px": "96px",
      "128px": "128px",
    },
    borderRadius: {
      none: "0px",
      DEFAULT: "0px",
      sm: "0px",
      md: "0px",
      lg: "0px",
      xl: "0px",
      "2xl": "0px",
      full: "0px",
    },
    boxShadow: {
      none: "none",
    },
    extend: {
      colors: {
        base: {
          light: "#F5F5F5",
          dark: "#0F0E12",
        },
        text: {
          light: "#0F0E12",
          dark: "#E5E5E5",
          muted: "#767676",
        },
        accent: {
          DEFAULT: "#0071BB",
          blue: "#0071BB",
        },
        hairline: {
          light: "#D6D6D6",
          lightAlt: "#CCCCCC",
          dark: "#333333",
        },
      },
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      fontSize: {
        "meta": ["11px", { lineHeight: "1.4", letterSpacing: "0.08em" }],
        "body": ["14px", { lineHeight: "1.6" }],
        "product": ["16px", { lineHeight: "1.5" }],
        "price": ["16px", { lineHeight: "1.5" }],
        "title-sm": ["32px", { lineHeight: "1.2" }],
        "title-lg": ["40px", { lineHeight: "1.15" }],
      },
      fontWeight: {
        light: "300",
        normal: "400",
      },
      maxWidth: {
        container: "1040px",
      },
    },
  },
  plugins: [],
};

export default config;
