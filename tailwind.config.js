/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/renderer/**/*.{js,jsx,ts,tsx}", "./src/renderer/index.html"],
  theme: {
    extend: {
      // 4px base unit spacing system
      // space-1: 4px, space-2: 8px, space-3: 12px, space-4: 16px, space-6: 24px, space-8: 32px, space-12: 48px
      spacing: {
        "0.5": "2px", // 0.5 * 4px
        "1": "4px", // 1 * 4px
        "1.5": "6px", // 1.5 * 4px
        "2": "8px", // 2 * 4px
        "2.5": "10px", // 2.5 * 4px
        "3": "12px", // 3 * 4px
        "3.5": "14px", // 3.5 * 4px
        "4": "16px", // 4 * 4px
        "5": "20px", // 5 * 4px
        "6": "24px", // 6 * 4px
        "7": "28px", // 7 * 4px
        "8": "32px", // 8 * 4px
        "9": "36px", // 9 * 4px
        "10": "40px", // 10 * 4px
        "11": "44px", // 11 * 4px
        "12": "48px", // 12 * 4px
        "14": "56px", // 14 * 4px
        "16": "64px", // 16 * 4px
        "20": "80px", // 20 * 4px
        "24": "96px", // 24 * 4px
        "28": "112px", // 28 * 4px
        "32": "128px", // 32 * 4px
        "36": "144px", // 36 * 4px
        "40": "160px", // 40 * 4px
        "44": "176px", // 44 * 4px
        "48": "192px", // 48 * 4px
        "52": "208px", // 52 * 4px
        "56": "224px", // 56 * 4px
        "60": "240px", // 60 * 4px
        "64": "256px", // 64 * 4px
        "72": "288px", // 72 * 4px
        "80": "320px", // 80 * 4px
        "96": "384px", // 96 * 4px
      },
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
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        "chart-accent": "hsl(var(--chart-accent))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
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
      keyframes: {
        "pulse-border": {
          "0%, 100%": {
            borderColor: "rgba(245, 158, 11, 0.8)",
            boxShadow: "0 0 8px rgba(245, 158, 11, 0.4)",
          },
          "50%": {
            borderColor: "rgba(245, 158, 11, 0.4)",
            boxShadow: "0 0 4px rgba(245, 158, 11, 0.2)",
          },
        },
      },
      animation: {
        "pulse-border": "pulse-border 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
