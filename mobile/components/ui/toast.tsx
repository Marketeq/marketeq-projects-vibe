import React, { useEffect, useRef } from "react"
import { Animated, Text, StyleSheet, ViewStyle } from "react-native"
import { colors } from "../../tokens/colors"
import { radii } from "../../tokens/radii"
import { shadows } from "../../tokens/shadows"
import { fontSize, lineHeight, fontWeight } from "../../tokens/typography"

type Variant = "success" | "error" | "warning" | "info"

interface ToastProps {
  message: string
  variant?: Variant
  visible: boolean
  duration?: number
  onDismiss: () => void
  style?: ViewStyle
}

const variantColors: Record<Variant, { bg: string; text: string }> = {
  success: { bg: colors.success[50], text: colors.success[700] },
  error: { bg: colors.error[50], text: colors.error[700] },
  warning: { bg: colors.warning[50], text: colors.warning[700] },
  info: { bg: colors.primary[50], text: colors.primary[700] },
}

export function Toast({
  message,
  variant = "info",
  visible,
  duration = 3000,
  onDismiss,
  style,
}: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(-20)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start()

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
        ]).start(() => onDismiss())
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [visible])

  if (!visible) return null

  const colorSet = variantColors[variant]

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colorSet.bg,
          opacity,
          transform: [{ translateY }],
        },
        style,
      ]}
    >
      <Text style={[styles.text, { color: colorSet.text }]}>{message}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radii.lg,
    zIndex: 9999,
    ...shadows.md,
  },
  text: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    fontWeight: fontWeight.medium,
  },
})
