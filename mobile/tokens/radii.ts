/**
 * Border radius tokens — matches web design system.
 * Source: frontend/COMPONENTS.md
 *
 * rounded-[5px]  = buttons, inputs
 * rounded-[6px]  = media wells inside cards
 * rounded-lg     = 8px, all cards/panels/widgets
 * rounded-full   = avatars, pills, icon buttons
 */

export const radii = {
  none: 0,
  xs: 4,
  sm: 5,
  md: 6,
  lg: 8,
  xl: 12,
  "2xl": 16,
  full: 9999,
} as const

export type RadiiToken = keyof typeof radii
