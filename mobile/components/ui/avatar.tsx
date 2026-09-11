import React from "react"
import { View, Text, Image, StyleSheet, ImageSourcePropType, ViewStyle } from "react-native"
import { colors } from "../../tokens/colors"
import { fontSize, fontWeight } from "../../tokens/typography"

type Size = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl"

interface AvatarProps {
  size?: Size
  src?: string | null
  name?: string | null
  isOnline?: boolean
  style?: ViewStyle
}

const dimensions: Record<Size, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 56,
  "2xl": 64,
  "3xl": 96,
}

const badgeSizes: Record<Size, number> = {
  xs: 9,
  sm: 11,
  md: 13,
  lg: 15,
  xl: 17,
  "2xl": 19,
  "3xl": 22,
}

const textSizes: Record<Size, number> = {
  xs: fontSize.xs,
  sm: fontSize.sm,
  md: fontSize.base,
  lg: fontSize.lg,
  xl: fontSize.xl,
  "2xl": fontSize["2xl"],
  "3xl": fontSize["3xl"],
}

function getInitials(name: string | null | undefined): string {
  if (!name) return ""
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? ""
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Avatar({ size = "md", src, name, isOnline, style }: AvatarProps) {
  const dim = dimensions[size]
  const hasSrc = !!src

  return (
    <View style={[{ width: dim, height: dim, borderRadius: dim / 2, overflow: "hidden" }, style]}>
      {hasSrc ? (
        <Image
          source={{ uri: src }}
          style={{ width: dim, height: dim, borderRadius: dim / 2 }}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.fallback, { width: dim, height: dim, borderRadius: dim / 2 }]}>
          <Text
            style={[
              styles.fallbackText,
              { fontSize: textSizes[size] },
            ]}
          >
            {getInitials(name) || "?"}
          </Text>
        </View>
      )}

      {isOnline && (
        <View
          style={[
            styles.badge,
            {
              width: badgeSizes[size],
              height: badgeSizes[size],
              borderRadius: badgeSizes[size] / 2,
            },
          ]}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary[25],
  },
  fallbackText: {
    color: colors.primary[500],
    fontWeight: fontWeight.medium,
  },
  badge: {
    position: "absolute",
    bottom: -1.5,
    right: -1.5,
    backgroundColor: colors.success[500],
    borderWidth: 1.5,
    borderColor: colors.white,
  },
})
