import React from "react"
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  PressableProps,
  View,
} from "react-native"
import { colors } from "../../tokens/colors"
import { radii } from "../../tokens/radii"
import { shadows } from "../../tokens/shadows"
import { fontSize, lineHeight, fontWeight } from "../../tokens/typography"

type Visual = "primary" | "error" | "gray"
type Variant = "filled" | "light" | "outlined" | "ghost" | "link"
type Size = "sm" | "md" | "lg" | "xl" | "2xl"

interface ButtonProps extends Omit<PressableProps, "style"> {
  visual?: Visual
  variant?: Variant
  size?: Size
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  loading?: boolean
  children: React.ReactNode
  style?: ViewStyle
}

const sizeStyles: Record<Size, { container: ViewStyle; text: TextStyle; gap: number }> = {
  sm: {
    container: { height: 36, paddingVertical: 8, paddingHorizontal: 14 },
    text: { fontSize: fontSize.sm, lineHeight: lineHeight.sm },
    gap: 8,
  },
  md: {
    container: { height: 40, paddingVertical: 10, paddingHorizontal: 16 },
    text: { fontSize: fontSize.sm, lineHeight: lineHeight.sm },
    gap: 8,
  },
  lg: {
    container: { height: 44, paddingVertical: 10, paddingHorizontal: 18 },
    text: { fontSize: fontSize.base, lineHeight: lineHeight.base },
    gap: 8,
  },
  xl: {
    container: { height: 48, paddingVertical: 12, paddingHorizontal: 20 },
    text: { fontSize: fontSize.base, lineHeight: lineHeight.base },
    gap: 8,
  },
  "2xl": {
    container: { height: 60, paddingVertical: 16, paddingHorizontal: 28 },
    text: { fontSize: fontSize.lg, lineHeight: lineHeight.lg },
    gap: 12,
  },
}

type StyleSet = {
  bg: string
  text: string
  border?: string
  pressedBg?: string
}

const visualVariantStyles: Record<Visual, Record<Variant, StyleSet>> = {
  primary: {
    filled: {
      bg: colors.primary[500],
      text: colors.white,
      pressedBg: colors.primary[600],
    },
    light: {
      bg: colors.primary[50],
      text: colors.primary[500],
      pressedBg: colors.primary[100],
    },
    outlined: {
      bg: colors.white,
      text: colors.gray[800],
      border: colors.gray[300],
      pressedBg: colors.gray[50],
    },
    ghost: {
      bg: colors.transparent,
      text: colors.primary[500],
      pressedBg: colors.primary[50],
    },
    link: {
      bg: colors.transparent,
      text: colors.primary[500],
      pressedBg: colors.transparent,
    },
  },
  error: {
    filled: {
      bg: colors.error[500],
      text: colors.white,
      pressedBg: colors.error[600],
    },
    light: {
      bg: colors.error[50],
      text: colors.error[500],
      pressedBg: colors.error[100],
    },
    outlined: {
      bg: colors.white,
      text: colors.error[500],
      border: colors.error[300],
      pressedBg: colors.error[25],
    },
    ghost: {
      bg: colors.transparent,
      text: colors.error[500],
      pressedBg: colors.error[50],
    },
    link: {
      bg: colors.transparent,
      text: colors.error[500],
      pressedBg: colors.transparent,
    },
  },
  gray: {
    filled: {
      bg: colors.gray[800],
      text: colors.white,
      pressedBg: colors.gray[900],
    },
    light: {
      bg: colors.gray[100],
      text: colors.gray[800],
      pressedBg: colors.gray[200],
    },
    outlined: {
      bg: colors.white,
      text: colors.gray[800],
      border: colors.gray[300],
      pressedBg: colors.gray[50],
    },
    ghost: {
      bg: colors.transparent,
      text: colors.gray[800],
      pressedBg: colors.gray[100],
    },
    link: {
      bg: colors.transparent,
      text: colors.gray[500],
      pressedBg: colors.transparent,
    },
  },
}

const hasShadow = (variant: Variant) => variant === "filled" || variant === "outlined"

export function Button({
  visual = "primary",
  variant = "filled",
  size = "sm",
  leftIcon,
  rightIcon,
  loading = false,
  disabled = false,
  children,
  style,
  ...rest
}: ButtonProps) {
  const sizeStyle = sizeStyles[size]
  const colorStyle = visualVariantStyles[visual][variant]
  const isLink = variant === "link"

  return (
    <Pressable
      disabled={disabled || loading}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        !isLink && sizeStyle.container,
        {
          backgroundColor: pressed ? colorStyle.pressedBg : colorStyle.bg,
          borderRadius: radii.sm,
          gap: sizeStyle.gap,
        },
        colorStyle.border && { borderWidth: 1, borderColor: colorStyle.border },
        hasShadow(variant) && shadows.xs,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colorStyle.text} />
      ) : (
        <>
          {leftIcon}
          <Text
            style={[
              sizeStyle.text,
              { color: colorStyle.text, fontWeight: fontWeight.semibold },
            ]}
          >
            {children}
          </Text>
          {rightIcon}
        </>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  disabled: {
    opacity: 0.5,
  },
})
