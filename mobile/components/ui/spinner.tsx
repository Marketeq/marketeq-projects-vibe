import React from "react"
import { ActivityIndicator, ViewStyle } from "react-native"
import { colors } from "../../tokens/colors"

type Size = "sm" | "md" | "lg"

interface SpinnerProps {
  size?: Size
  color?: string
  style?: ViewStyle
}

const sizeMap: Record<Size, "small" | "large"> = {
  sm: "small",
  md: "small",
  lg: "large",
}

export function Spinner({
  size = "md",
  color = colors.primary[500],
  style,
}: SpinnerProps) {
  return <ActivityIndicator size={sizeMap[size]} color={color} style={style} />
}
