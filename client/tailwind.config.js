import tailwindcssAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
        xl: "calc(var(--radius) + 0.25rem)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        glow: "0 0 0 1px hsl(var(--border) / 0.45), 0 30px 80px -34px rgba(2, 8, 23, 0.85)",
        panel: "0 32px 80px -38px rgba(2, 8, 23, 0.92), 0 16px 36px -24px hsl(var(--primary) / 0.32)",
        lifted: "0 22px 50px -28px rgba(2, 8, 23, 0.82), 0 12px 26px -18px rgba(15, 23, 42, 0.55)",
        button: "0 18px 40px -18px hsl(var(--primary) / 0.55), inset 0 1px 0 rgba(255,255,255,0.18)",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        inter: ["Inter", "sans-serif"],
        space: ['"Space Grotesk"', "sans-serif"],
        headline: ['"Space Grotesk"', "sans-serif"],
      },
      backgroundImage: {
        "hero-fade":
          "radial-gradient(circle at 12% 16%, hsl(var(--primary) / 0.28), transparent 34%), radial-gradient(circle at 85% 14%, hsl(var(--secondary) / 0.18), transparent 30%), radial-gradient(circle at 52% 115%, hsl(var(--accent) / 0.2), transparent 34%)",
        aurora:
          "linear-gradient(120deg, hsl(var(--primary) / 0.22), transparent 34%), linear-gradient(220deg, hsl(var(--secondary) / 0.16), transparent 36%), radial-gradient(circle at center, hsl(var(--accent) / 0.12), transparent 42%)",
        "grid-fade":
          "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
