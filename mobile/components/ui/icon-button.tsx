import React from "react"
import {
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  PressableProps,
} from "react-native"
import { colors } from "../../tokens/colors"
import { radii } from "../../tokens/radii"
import { shadows } from "../../tokens/shadows"

type Visual = "primary" | "error" | "gray"
type Variant = "filled" | "light" | "outlined" | "ghost"
type Size = "sm" | "md" | "lg" | "xl" | "2xl"

interface IconButtonProps extends Omit<PressableProps, "style"> {
  visual?: Visual
  variant?: Variant
  size?: Size
  icon: React.ReactNode
  rounded?: boolean
  loading?: boolean
  style?: ViewStyle
}

const sizeDimensions: Record<Size, number> = {
  sm: 36,
  md: 40,
  lg: 44,
  xl: 48,
  "2xl": 60,
}

const bgColors: Record<Visual, Record<Variant, { bg: string; pressed: string; border?: string }>> = {
  primary: {
    filled: { bg: colors.primary[500], pressed: colors.primary[600] },
    light: { bg: colors.primary[50], pressed: colors.primary[100] },
    outlined: { bg: colors.white, pressed: colors.gray[50], border: colors.gray[300] },
    ghost: { bg: colors.transparent, pressed: colors.primary[50] },
  },
  error: {
    filled: { bg: colors.error[500], pressed: colors.error[600] },
    light: { bg: colors.error[50], pressed: colors.error[100] },
    outlined: { bg: colors.white, pressed: colors.error[25], border: colors.error[300] },
    ghost: { bg: colors.transparent, pressed: colors.error[50] },
  },
  gray: {
    filled: { bg: colors.gray[800], pressed: colors.gray[900] },
    light: { bg: colors.gray[100], pressed: colors.gray[200] },
    outlined: { bg: colors.white, pressed: colors.gray[50], border: colors.gray[300] },
    ghost: { bg: colors.transparent, pressed: colors.gray[100] },
  },
}

const hasShadow = (variant: Variant) => variant === "filled" || variant === "outlined"

const iconColor: Record<Visual, Record<Variant, string>> = {
  primary: {
    filled: colors.white,
    light: colors.primary[500],
    outlined: colors.gray[800],
    ghost: colors.primary[500],
  },
  error: {
    filled: colors.white,
    light: colors.error[500],
    outlined: colors.error[500],
    ghost: colors.error[500],
  },
  gray: {
    filled: colors.white,
    light: colors.gray[800],
    outlined: colors.gray[800],
    ghost: colors.gray[800],
  },
}

export function IconButton({
  visual = "primary",
  variant = "filled",
  size = "sm",
  icon,
  rounded = false,
  loading = false,
  disabled = false,
  style,
  ...rest
}: IconButtonProps) {
  const dim = sizeDimensions[size]
  const colorSet = bgColors[visual][variant]

  return (
    <Pressable
      disabled={disabled || loading}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        {
          width: dim,
          height: dim,
          borderRadius: rounded ? radii.full : radii.sm,
          backgroundColor: pressed ? colorSet.pressed : colorSet.bg,
        },
        colorSet.border && { borderWidth: 1, borderColor: colorSet.border },
        hasShadow(variant) && shadows.xs,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor[visual][variant]} />
      ) : (
        icon
      )}
    </Pressable>
  )
}

/** Helper to get the correct icon color for a given visual+variant combo */
IconButton.iconColor = iconColor

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  disabled: {
    opacity: 0.5,
  },
})
