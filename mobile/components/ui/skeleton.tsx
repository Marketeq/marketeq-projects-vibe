import React, { useEffect, useRef } from "react"
import { Animated, ViewStyle, StyleSheet } from "react-native"
import { colors } from "../../tokens/colors"
import { radii } from "../../tokens/radii"

interface SkeletonProps {
  width: number | string
  height: number
  borderRadius?: number
  style?: ViewStyle
}

export function Skeleton({
  width,
  height,
  borderRadius = radii.md,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [])

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.gray[200],
          opacity,
        },
        style,
      ]}
    />
  )
}
