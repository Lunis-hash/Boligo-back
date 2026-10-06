import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      colors: {
        // Identité BOLIGO (mêmes valeurs que mobile-steve/constants/brand.ts).
        framboise: "#C62A6E",
        lavande: "#7C5CDB",
        nuit: "#33287A",
        rose: "#FDE6EF",
        lilas: "#EEE8FF",
        ciel: "#E3ECFF",
        fond: "#FFF8FA",
        encre: "#2A1B3D",
        // Gris remplacés par des tons prune : tout l'écran prend la couleur de la marque.
        neutral: {
          50: "#FBF6F9",
          100: "#F5EDF2",
          200: "#ECE1EA",
          300: "#DACBD9",
          400: "#9A8BA8",
          500: "#76668A",
          600: "#5E4F6E",
          700: "#4A3C5A",
          800: "#382A49",
          900: "#2A1B3D",
          950: "#1C1029",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
