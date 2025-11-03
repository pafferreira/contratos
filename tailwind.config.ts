import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/features/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#e8f2ff",
          100: "#c6ddff",
          200: "#9fbeff",
          300: "#759eff",
          400: "#4b7df6",
          500: "#1f6feb",
          600: "#1458c4",
          700: "#0b419b",
          800: "#052c73",
          900: "#021a4d"
        },
        neutral: {
          25: "#f6f8fa",
          50: "#f0f2f6",
          100: "#eaecef",
          200: "#d0d7de",
          300: "#afb8c1",
          400: "#8c959f",
          500: "#6e7781",
          600: "#57606a",
          700: "#424a53",
          800: "#2f353d",
          900: "#1a1f24"
        },
        success: "#0e8a16",
        danger: "#d1242f",
        warning: "#e3a008",
        info: "#0ea5e9"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"]
      },
      spacing: {
        1: "4px",
        1.5: "6px",
        2: "8px",
        3: "12px",
        4: "16px",
        6: "24px",
        8: "32px"
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        lg: "8px",
        xl: "12px"
      },
      boxShadow: {
        card: "0px 1px 3px rgba(15, 23, 42, 0.12), 0px 1px 2px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: [
    plugin(({ addVariant }) => {
      addVariant("hocus", ["&:hover", "&:focus-visible"]);
    })
  ]
};

export default config;
