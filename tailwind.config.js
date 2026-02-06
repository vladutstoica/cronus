/**
 * Tailwind CSS Configuration for Cronus Time Tracker
 *
 * This configuration extends Tailwind with the Cronus design system tokens.
 * Design tokens are defined in:
 * - TypeScript: /src/renderer/src/lib/designTokens.ts
 * - CSS Custom Properties: /src/renderer/src/styles/tokens.css
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  darkMode: "class",
  content: [
    "./src/renderer/**/*.{js,jsx,ts,tsx}",
    "./src/renderer/index.html",
    "./src/renderer/tray.html",
    "./src/renderer/floating.html",
  ],
  theme: {
    extend: {
      // =========================================================================
      // SPACING - 4px base unit system
      // =========================================================================
      // Matches --spacing-* tokens in tokens.css
      // Usage: p-1 = 4px, m-2 = 8px, gap-4 = 16px, etc.
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

      // =========================================================================
      // COLORS
      // =========================================================================
      colors: {
        // -----------------------------------------------------------------------
        // UI Component Colors (existing - from shadcn/ui)
        // -----------------------------------------------------------------------
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

        // -----------------------------------------------------------------------
        // Productivity Semantic Colors (Design System Tokens)
        // -----------------------------------------------------------------------
        // Usage: bg-productive, text-unproductive, border-neutral-activity
        productive: {
          DEFAULT: "var(--color-productive)",
          light: "var(--color-productive-light)",
          dark: "var(--color-productive-dark)",
          subtle: "var(--color-productive-subtle)",
          foreground: "var(--color-productive-foreground)",
        },
        unproductive: {
          DEFAULT: "var(--color-unproductive)",
          light: "var(--color-unproductive-light)",
          dark: "var(--color-unproductive-dark)",
          subtle: "var(--color-unproductive-subtle)",
          foreground: "var(--color-unproductive-foreground)",
        },
        "neutral-activity": {
          DEFAULT: "var(--color-neutral-activity)",
          light: "var(--color-neutral-activity-light)",
          dark: "var(--color-neutral-activity-dark)",
          subtle: "var(--color-neutral-activity-subtle)",
          foreground: "var(--color-neutral-activity-foreground)",
        },
        uncategorized: {
          DEFAULT: "var(--color-uncategorized)",
          light: "var(--color-uncategorized-light)",
          dark: "var(--color-uncategorized-dark)",
          subtle: "var(--color-uncategorized-subtle)",
          foreground: "var(--color-uncategorized-foreground)",
        },

        // -----------------------------------------------------------------------
        // Feedback/Status Colors (Design System Tokens)
        // -----------------------------------------------------------------------
        // These complement the existing success/destructive colors
        warning: {
          DEFAULT: "var(--color-warning)",
          light: "var(--color-warning-light)",
          dark: "var(--color-warning-dark)",
          subtle: "var(--color-warning-subtle)",
          foreground: "var(--color-warning-foreground)",
        },
        error: {
          DEFAULT: "var(--color-error)",
          light: "var(--color-error-light)",
          dark: "var(--color-error-dark)",
          subtle: "var(--color-error-subtle)",
          foreground: "var(--color-error-foreground)",
        },
        info: {
          DEFAULT: "var(--color-info)",
          light: "var(--color-info-light)",
          dark: "var(--color-info-dark)",
          subtle: "var(--color-info-subtle)",
          foreground: "var(--color-info-foreground)",
        },
      },

      // =========================================================================
      // TYPOGRAPHY
      // =========================================================================
      fontFamily: {
        sans: "var(--font-sans)",
        mono: "var(--font-mono)",
      },

      fontSize: {
        xs: ["var(--font-size-xs)", { lineHeight: "var(--line-height-xs)" }],
        sm: ["var(--font-size-sm)", { lineHeight: "var(--line-height-sm)" }],
        base: [
          "var(--font-size-base)",
          { lineHeight: "var(--line-height-base)" },
        ],
        lg: ["var(--font-size-lg)", { lineHeight: "var(--line-height-lg)" }],
        xl: ["var(--font-size-xl)", { lineHeight: "var(--line-height-xl)" }],
        "2xl": [
          "var(--font-size-2xl)",
          { lineHeight: "var(--line-height-2xl)" },
        ],
        "3xl": [
          "var(--font-size-3xl)",
          { lineHeight: "var(--line-height-3xl)" },
        ],
        "4xl": [
          "var(--font-size-4xl)",
          { lineHeight: "var(--line-height-4xl)" },
        ],
      },

      // =========================================================================
      // BORDER RADIUS
      // =========================================================================
      // Matches --radius-* tokens in tokens.css
      borderRadius: {
        none: "var(--radius-none)",
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-default)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        full: "var(--radius-full)",
      },

      // =========================================================================
      // SHADOWS
      // =========================================================================
      // Matches --shadow-* tokens in tokens.css
      boxShadow: {
        none: "var(--shadow-none)",
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-default)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        "2xl": "var(--shadow-2xl)",
        inner: "var(--shadow-inner)",
      },

      // =========================================================================
      // ANIMATIONS
      // =========================================================================
      transitionDuration: {
        0: "var(--duration-0)",
        75: "var(--duration-75)",
        100: "var(--duration-100)",
        150: "var(--duration-150)",
        200: "var(--duration-200)",
        300: "var(--duration-300)",
        500: "var(--duration-500)",
        700: "var(--duration-700)",
        1000: "var(--duration-1000)",
      },

      transitionTimingFunction: {
        DEFAULT: "var(--ease-default)",
        linear: "var(--ease-linear)",
        in: "var(--ease-in)",
        out: "var(--ease-out)",
        "in-out": "var(--ease-in-out)",
        bounce: "var(--ease-bounce)",
      },

      // =========================================================================
      // Z-INDEX
      // =========================================================================
      // Matches --z-* tokens in tokens.css
      zIndex: {
        behind: "var(--z-behind)",
        base: "var(--z-base)",
        docked: "var(--z-docked)",
        dropdown: "var(--z-dropdown)",
        sticky: "var(--z-sticky)",
        fixed: "var(--z-fixed)",
        "modal-backdrop": "var(--z-modal-backdrop)",
        modal: "var(--z-modal)",
        popover: "var(--z-popover)",
        tooltip: "var(--z-tooltip)",
        toast: "var(--z-toast)",
        max: "var(--z-max)",
      },

      // =========================================================================
      // KEYFRAMES & ANIMATIONS (Custom)
      // =========================================================================
      keyframes: {
        "pulse-border": {
          "0%, 100%": {
            borderColor: "var(--color-neutral-activity)",
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
