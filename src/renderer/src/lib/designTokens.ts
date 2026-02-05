/**
 * Design System Tokens for Cronus Time Tracker
 *
 * This file defines all design tokens as TypeScript constants.
 * These tokens provide a single source of truth for design decisions
 * and ensure consistency across the application.
 *
 * Token Hierarchy:
 * 1. Primitive Tokens - Raw values (colors, sizes)
 * 2. Semantic Tokens - Purpose-based references (productive, destructive)
 * 3. Component Tokens - Component-specific values (built from semantic tokens)
 *
 * @see /src/renderer/src/styles/tokens.css for CSS custom property equivalents
 */

// =============================================================================
// PRIMITIVE TOKENS
// =============================================================================

/**
 * Base color palette - raw color values
 * These should not be used directly in components; use semantic tokens instead
 */
export const primitiveColors = {
  // Emerald scale (used for productive states)
  emerald: {
    50: "#ecfdf5",
    100: "#d1fae5",
    200: "#a7f3d0",
    300: "#6ee7b7",
    400: "#34d399",
    500: "#10b981",
    600: "#059669",
    700: "#047857",
    800: "#065f46",
    900: "#064e3b",
    950: "#022c22",
  },
  // Rose scale (used for unproductive states)
  rose: {
    50: "#fff1f2",
    100: "#ffe4e6",
    200: "#fecdd3",
    300: "#fda4af",
    400: "#fb7185",
    500: "#f43f5e",
    600: "#e11d48",
    700: "#be123c",
    800: "#9f1239",
    900: "#881337",
    950: "#4c0519",
  },
  // Amber scale (used for neutral/maybe states)
  amber: {
    50: "#fffbeb",
    100: "#fef3c7",
    200: "#fde68a",
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    800: "#92400e",
    900: "#78350f",
    950: "#451a03",
  },
  // Slate scale (used for neutral/uncategorized states and UI)
  slate: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
    950: "#020617",
  },
  // Blue scale (used for primary/accent states)
  blue: {
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
    950: "#172554",
  },
  // Base colors
  white: "#ffffff",
  black: "#000000",
  transparent: "transparent",
} as const;

// =============================================================================
// SEMANTIC COLOR TOKENS
// =============================================================================

/**
 * Semantic colors for productivity states
 * These are the primary semantic tokens used throughout the app
 */
export const productivityColors = {
  /** Color for productive activities - emerald-500 */
  productive: {
    DEFAULT: primitiveColors.emerald[500],
    light: primitiveColors.emerald[400],
    dark: primitiveColors.emerald[600],
    subtle: primitiveColors.emerald[100],
    subtleDark: primitiveColors.emerald[900],
    foreground: primitiveColors.white,
  },
  /** Color for unproductive activities - rose-500 */
  unproductive: {
    DEFAULT: primitiveColors.rose[500],
    light: primitiveColors.rose[400],
    dark: primitiveColors.rose[600],
    subtle: primitiveColors.rose[100],
    subtleDark: primitiveColors.rose[900],
    foreground: primitiveColors.white,
  },
  /** Color for neutral/maybe activities - amber-500 */
  neutral: {
    DEFAULT: primitiveColors.amber[500],
    light: primitiveColors.amber[400],
    dark: primitiveColors.amber[600],
    subtle: primitiveColors.amber[100],
    subtleDark: primitiveColors.amber[900],
    foreground: primitiveColors.white,
  },
  /** Color for uncategorized activities - slate-400 */
  uncategorized: {
    DEFAULT: primitiveColors.slate[400],
    light: primitiveColors.slate[300],
    dark: primitiveColors.slate[500],
    subtle: primitiveColors.slate[100],
    subtleDark: primitiveColors.slate[800],
    foreground: primitiveColors.white,
  },
} as const;

/**
 * Feedback/status colors for UI states
 */
export const feedbackColors = {
  success: {
    DEFAULT: primitiveColors.emerald[500],
    light: primitiveColors.emerald[400],
    dark: primitiveColors.emerald[600],
    subtle: primitiveColors.emerald[100],
    subtleDark: primitiveColors.emerald[900],
    foreground: primitiveColors.white,
  },
  warning: {
    DEFAULT: primitiveColors.amber[500],
    light: primitiveColors.amber[400],
    dark: primitiveColors.amber[600],
    subtle: primitiveColors.amber[100],
    subtleDark: primitiveColors.amber[900],
    foreground: primitiveColors.white,
  },
  error: {
    DEFAULT: primitiveColors.rose[500],
    light: primitiveColors.rose[400],
    dark: primitiveColors.rose[600],
    subtle: primitiveColors.rose[100],
    subtleDark: primitiveColors.rose[900],
    foreground: primitiveColors.white,
  },
  info: {
    DEFAULT: primitiveColors.blue[500],
    light: primitiveColors.blue[400],
    dark: primitiveColors.blue[600],
    subtle: primitiveColors.blue[100],
    subtleDark: primitiveColors.blue[900],
    foreground: primitiveColors.white,
  },
} as const;

// =============================================================================
// SPACING TOKENS
// =============================================================================

/**
 * Spacing scale based on 4px base unit
 * Usage: spacing[1] = 4px, spacing[2] = 8px, etc.
 */
export const spacing = {
  /** 0px */
  0: "0px",
  /** 1px */
  px: "1px",
  /** 2px - 0.5 units */
  0.5: "2px",
  /** 4px - 1 unit (base) */
  1: "4px",
  /** 6px - 1.5 units */
  1.5: "6px",
  /** 8px - 2 units */
  2: "8px",
  /** 10px - 2.5 units */
  2.5: "10px",
  /** 12px - 3 units */
  3: "12px",
  /** 14px - 3.5 units */
  3.5: "14px",
  /** 16px - 4 units */
  4: "16px",
  /** 20px - 5 units */
  5: "20px",
  /** 24px - 6 units */
  6: "24px",
  /** 28px - 7 units */
  7: "28px",
  /** 32px - 8 units */
  8: "32px",
  /** 36px - 9 units */
  9: "36px",
  /** 40px - 10 units */
  10: "40px",
  /** 44px - 11 units */
  11: "44px",
  /** 48px - 12 units */
  12: "48px",
  /** 56px - 14 units */
  14: "56px",
  /** 64px - 16 units */
  16: "64px",
  /** 80px - 20 units */
  20: "80px",
  /** 96px - 24 units */
  24: "96px",
  /** 112px - 28 units */
  28: "112px",
  /** 128px - 32 units */
  32: "128px",
} as const;

/**
 * Common spacing aliases for semantic usage
 */
export const spacingAliases = {
  /** Extra small gap - 4px */
  xs: spacing[1],
  /** Small gap - 8px */
  sm: spacing[2],
  /** Medium gap - 16px */
  md: spacing[4],
  /** Large gap - 24px */
  lg: spacing[6],
  /** Extra large gap - 32px */
  xl: spacing[8],
  /** 2x extra large gap - 48px */
  "2xl": spacing[12],
} as const;

// =============================================================================
// TYPOGRAPHY TOKENS
// =============================================================================

/**
 * Font family stack
 */
export const fontFamily = {
  /** Primary font - Inter with system fallbacks */
  sans: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  /** Monospace font for code */
  mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
} as const;

/**
 * Font size scale
 * Each entry contains size and recommended line-height
 */
export const fontSize = {
  /** 12px / 16px line-height */
  xs: {
    size: "0.75rem",
    lineHeight: "1rem",
  },
  /** 14px / 20px line-height */
  sm: {
    size: "0.875rem",
    lineHeight: "1.25rem",
  },
  /** 16px / 24px line-height (base) */
  base: {
    size: "1rem",
    lineHeight: "1.5rem",
  },
  /** 18px / 28px line-height */
  lg: {
    size: "1.125rem",
    lineHeight: "1.75rem",
  },
  /** 20px / 28px line-height */
  xl: {
    size: "1.25rem",
    lineHeight: "1.75rem",
  },
  /** 24px / 32px line-height */
  "2xl": {
    size: "1.5rem",
    lineHeight: "2rem",
  },
  /** 30px / 36px line-height */
  "3xl": {
    size: "1.875rem",
    lineHeight: "2.25rem",
  },
  /** 36px / 40px line-height */
  "4xl": {
    size: "2.25rem",
    lineHeight: "2.5rem",
  },
} as const;

/**
 * Font weight scale
 */
export const fontWeight = {
  thin: "100",
  extralight: "200",
  light: "300",
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
  black: "900",
} as const;

/**
 * Letter spacing scale
 */
export const letterSpacing = {
  tighter: "-0.05em",
  tight: "-0.025em",
  normal: "0em",
  wide: "0.025em",
  wider: "0.05em",
  widest: "0.1em",
} as const;

// =============================================================================
// BORDER RADIUS TOKENS
// =============================================================================

/**
 * Border radius scale
 */
export const borderRadius = {
  /** No radius */
  none: "0px",
  /** 2px */
  sm: "4px",
  /** 4px - default */
  DEFAULT: "6px",
  /** 8px */
  md: "8px",
  /** 12px */
  lg: "12px",
  /** 16px */
  xl: "16px",
  /** 24px */
  "2xl": "24px",
  /** 9999px - fully rounded */
  full: "9999px",
} as const;

// =============================================================================
// SHADOW TOKENS
// =============================================================================

/**
 * Box shadow scale for elevation
 */
export const shadows = {
  /** No shadow */
  none: "none",
  /** Subtle shadow for slight elevation */
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  /** Default shadow for cards */
  DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  /** Medium shadow for dropdowns, popovers */
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  /** Large shadow for modals, dialogs */
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  /** Extra large shadow for high elevation */
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  /** 2x extra large shadow */
  "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
  /** Inner shadow */
  inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
} as const;

// =============================================================================
// ANIMATION TOKENS
// =============================================================================

/**
 * Animation duration scale
 */
export const duration = {
  /** Instant - 0ms */
  0: "0ms",
  /** Very fast - 75ms */
  75: "75ms",
  /** Fast - 100ms */
  100: "100ms",
  /** Quick - 150ms */
  150: "150ms",
  /** Normal - 200ms */
  200: "200ms",
  /** Moderate - 300ms */
  300: "300ms",
  /** Slow - 500ms */
  500: "500ms",
  /** Very slow - 700ms */
  700: "700ms",
  /** Slowest - 1000ms */
  1000: "1000ms",
} as const;

/**
 * Easing functions for animations
 */
export const easing = {
  /** Default ease - smooth acceleration and deceleration */
  DEFAULT: "cubic-bezier(0.4, 0, 0.2, 1)",
  /** Linear - constant speed */
  linear: "linear",
  /** Ease in - starts slow, ends fast */
  in: "cubic-bezier(0.4, 0, 1, 1)",
  /** Ease out - starts fast, ends slow */
  out: "cubic-bezier(0, 0, 0.2, 1)",
  /** Ease in-out - slow start and end */
  inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  /** Bounce effect */
  bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
} as const;

// =============================================================================
// BREAKPOINT TOKENS
// =============================================================================

/**
 * Responsive breakpoints
 */
export const breakpoints = {
  /** Small screens - 640px */
  sm: "640px",
  /** Medium screens - 768px */
  md: "768px",
  /** Large screens - 1024px */
  lg: "1024px",
  /** Extra large screens - 1280px */
  xl: "1280px",
  /** 2x extra large screens - 1536px */
  "2xl": "1536px",
} as const;

// =============================================================================
// Z-INDEX TOKENS
// =============================================================================

/**
 * Z-index scale for layering
 */
export const zIndex = {
  /** Behind everything */
  behind: "-1",
  /** Base layer */
  base: "0",
  /** Slightly elevated */
  docked: "10",
  /** Dropdowns, tooltips */
  dropdown: "20",
  /** Sticky elements */
  sticky: "30",
  /** Fixed elements */
  fixed: "40",
  /** Modal backdrops */
  modalBackdrop: "50",
  /** Modals, dialogs */
  modal: "60",
  /** Popovers */
  popover: "70",
  /** Tooltips */
  tooltip: "80",
  /** Toast notifications */
  toast: "90",
  /** Maximum z-index */
  max: "9999",
} as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type PrimitiveColor = keyof typeof primitiveColors;
export type ProductivityColorKey = keyof typeof productivityColors;
export type FeedbackColorKey = keyof typeof feedbackColors;
export type SpacingKey = keyof typeof spacing;
export type FontSizeKey = keyof typeof fontSize;
export type FontWeightKey = keyof typeof fontWeight;
export type BorderRadiusKey = keyof typeof borderRadius;
export type ShadowKey = keyof typeof shadows;
export type DurationKey = keyof typeof duration;
export type EasingKey = keyof typeof easing;
export type BreakpointKey = keyof typeof breakpoints;
export type ZIndexKey = keyof typeof zIndex;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Productivity color token structure
 */
export type ProductivityColorToken = {
  readonly DEFAULT: string;
  readonly light: string;
  readonly dark: string;
  readonly subtle: string;
  readonly subtleDark: string;
  readonly foreground: string;
};

/**
 * Get productivity color based on isProductive flag
 * @param isProductive - Whether the activity is productive
 * @returns The appropriate color token
 */
export function getProductivityColor(
  isProductive: boolean | null | undefined,
): ProductivityColorToken {
  if (isProductive === true) {
    return productivityColors.productive;
  }
  if (isProductive === false) {
    return productivityColors.unproductive;
  }
  return productivityColors.uncategorized;
}

/**
 * Get the hex value for a productivity state
 * @param isProductive - Whether the activity is productive
 * @returns The hex color string
 */
export function getProductivityHex(
  isProductive: boolean | null | undefined,
): string {
  return getProductivityColor(isProductive).DEFAULT;
}

/**
 * Design tokens as a single exportable object
 */
export const designTokens = {
  colors: {
    primitive: primitiveColors,
    productivity: productivityColors,
    feedback: feedbackColors,
  },
  spacing,
  spacingAliases,
  typography: {
    fontFamily,
    fontSize,
    fontWeight,
    letterSpacing,
  },
  borderRadius,
  shadows,
  animation: {
    duration,
    easing,
  },
  breakpoints,
  zIndex,
} as const;

export default designTokens;
