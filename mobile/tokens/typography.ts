/**
 * Typography tokens — matches web Inter font system.
 * Source: frontend/tailwind.config.ts + Tailwind defaults
 */

export const fontFamily = {
  sans: "Inter",
} as const

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
  "5xl": 48,
} as const

export const lineHeight = {
  xs: 18,
  sm: 20,
  base: 24,
  lg: 28,
  xl: 30,
  "2xl": 32,
  "3xl": 36,
  "4xl": 40,
  "5xl": 48,
} as const

export const fontWeight = {
  normal: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
}

export type FontSizeToken = keyof typeof fontSize
export type FontWeightToken = keyof typeof fontWeight
