import React from "react"
import { View, StyleSheet, ViewStyle, ViewProps } from "react-native"
import { colors } from "../../tokens/colors"
import { radii } from "../../tokens/radii"
import { shadows } from "../../tokens/shadows"

interface CardProps extends ViewProps {
  padding?: number
  style?: ViewStyle
  children: React.ReactNode
}

export function Card({ padding = 16, children, style, ...rest }: CardProps) {
  return (
    <View style={[styles.base, { padding }, style]} {...rest}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    ...shadows.xs,
  },
})
