import React from "react"
import {
  Pressable,
  View,
  Animated,
  StyleSheet,
  ViewStyle,
} from "react-native"
import { colors } from "../../tokens/colors"

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  style?: ViewStyle
}

const TRACK_WIDTH = 44
const TRACK_HEIGHT = 24
const THUMB_SIZE = 20
const THUMB_OFFSET = 2

export function Switch({ checked, onChange, disabled = false, style }: SwitchProps) {
  const translateX = React.useRef(
    new Animated.Value(checked ? TRACK_WIDTH - THUMB_SIZE - THUMB_OFFSET * 2 : 0)
  ).current

  React.useEffect(() => {
    Animated.spring(translateX, {
      toValue: checked ? TRACK_WIDTH - THUMB_SIZE - THUMB_OFFSET * 2 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 60,
    }).start()
  }, [checked])

  return (
    <Pressable
      onPress={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={[disabled && styles.disabled, style]}
    >
      <View
        style={[
          styles.track,
          { backgroundColor: checked ? colors.primary[500] : colors.gray[200] },
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            { transform: [{ translateX }] },
          ]}
        />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    padding: THUMB_OFFSET,
    justifyContent: "center",
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  disabled: {
    opacity: 0.5,
  },
})
