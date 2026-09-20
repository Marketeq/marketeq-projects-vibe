import React from "react"
import { View, ViewStyle } from "react-native"
import { colors } from "../../tokens/colors"

interface DividerProps {
  color?: string
  thickness?: number
  vertical?: boolean
  style?: ViewStyle
}

export function Divider({
  color = colors.gray[200],
  thickness = 1,
  vertical = false,
  style,
}: DividerProps) {
  return (
    <View
      style={[
        vertical
          ? { width: thickness, alignSelf: "stretch", backgroundColor: color }
          : { height: thickness, width: "100%", backgroundColor: color },
        style,
      ]}
    />
  )
}
