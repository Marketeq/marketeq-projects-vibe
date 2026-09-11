/**
 * Shadow tokens — matches web design system.
 * Source: frontend/tailwind.config.ts
 *
 * React Native shadows use a different API than CSS box-shadow.
 * These are pre-mapped for both iOS (shadow*) and Android (elevation).
 */

import { Platform, ViewStyle } from "react-native"

type ShadowDef = Pick<
  ViewStyle,
  "shadowColor" | "shadowOffset" | "shadowOpacity" | "shadowRadius" | "elevation"
>

export const shadows: Record<string, ShadowDef> = {
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  // shadow-xs: 0px 1px 4px 0px rgba(0,0,0,0.03)
  xs: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },

  // shadow-sm: 0px 1px 2px 0px rgba(0,0,0,0.05)
  sm: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },

  // shadow-md: 0px 4px 6px -1px rgba(0,0,0,0.1)
  md: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },

  // shadow-lg: 0px 10px 15px -3px rgba(0,0,0,0.1)
  lg: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
} as const
