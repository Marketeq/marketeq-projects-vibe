import React from "react"
import { View, Text, StyleSheet, ViewStyle } from "react-native"
import { colors } from "../../tokens/colors"
import { fontSize, lineHeight, fontWeight } from "../../tokens/typography"
import { radii } from "../../tokens/radii"

type Visual =
  | "gray"
  | "purple"
  | "error"
  | "warning"
  | "success"
  | "sky"
  | "primary"
  | "indigo"
  | "pink"
  | "rose"
  | "orange"

type Size = "sm" | "md" | "lg"
type Shape = "rounded" | "circular"

interface BadgeProps {
  visual?: Visual
  size?: Size
  shape?: Shape
  children: React.ReactNode
  style?: ViewStyle
}

const visualColors: Record<Visual, { bg: string; text: string }> = {
  gray: { bg: colors.gray[100], text: colors.gray[700] },
  purple: { bg: colors.purple[100], text: colors.purple[700] },
  error: { bg: colors.error[100], text: colors.error[700] },
  warning: { bg: colors.warning[100], text: colors.warning[700] },
  success: { bg: colors.success[100], text: colors.success[700] },
  sky: { bg: colors.sky[100], text: colors.sky[700] },
  primary: { bg: colors.primary[50], text: colors.primary[500] },
  indigo: { bg: colors.indigo[100], text: colors.indigo[700] },
  pink: { bg: colors.pink[100], text: colors.pink[700] },
  rose: { bg: colors.rose[100], text: colors.rose[700] },
  orange: { bg: colors.orange[100], text: colors.orange[700] },
}

const sizeStyles: Record<Size, Record<Shape, { height: number; padding: ViewStyle; text: number; line: number }>> = {
  sm: {
    rounded: { height: 22, padding: { paddingVertical: 2, paddingHorizontal: 8 }, text: fontSize.xs, line: lineHeight.xs },
    circular: { height: 22, padding: { padding: 4 }, text: fontSize.xs, line: lineHeight.xs },
  },
  md: {
    rounded: { height: 24, padding: { paddingVertical: 2, paddingHorizontal: 10 }, text: fontSize.sm, line: lineHeight.sm },
    circular: { height: 24, padding: { padding: 6 }, text: fontSize.sm, line: lineHeight.sm },
  },
  lg: {
    rounded: { height: 28, padding: { paddingVertical: 4, paddingHorizontal: 12 }, text: fontSize.sm, line: lineHeight.sm },
    circular: { height: 28, padding: { padding: 8 }, text: fontSize.sm, line: lineHeight.sm },
  },
}

export function Badge({
  visual = "gray",
  size = "sm",
  shape = "rounded",
  children,
  style,
}: BadgeProps) {
  const colorSet = visualColors[visual]
  const sizeSet = sizeStyles[size][shape]

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: colorSet.bg,
          minHeight: sizeSet.height,
          borderRadius: radii.full,
        },
        sizeSet.padding,
        style,
      ]}
    >
      {typeof children === "string" ? (
        <Text
          style={{
            color: colorSet.text,
            fontSize: sizeSet.text,
            lineHeight: sizeSet.line,
            fontWeight: fontWeight.medium,
          }}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    gap: 4,
    flexShrink: 0,
  },
})
