import React from "react"
import { Text, TextProps, StyleSheet } from "react-native"
import { colors } from "../../tokens/colors"
import { fontSize, lineHeight, fontWeight } from "../../tokens/typography"

interface LabelProps extends TextProps {
  size?: "sm" | "md"
  required?: boolean
  children: React.ReactNode
}

export function Label({ size = "sm", required, children, style, ...rest }: LabelProps) {
  return (
    <Text
      style={[
        styles.base,
        size === "md" && styles.md,
        style,
      ]}
      {...rest}
    >
      {children}
      {required && <Text style={styles.asterisk}> *</Text>}
    </Text>
  )
}

const styles = StyleSheet.create({
  base: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[700],
  },
  md: {
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
  },
  asterisk: {
    color: colors.error[500],
  },
})
