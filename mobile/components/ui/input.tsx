import React, { forwardRef } from "react"
import {
  TextInput,
  TextInputProps,
  View,
  StyleSheet,
  ViewStyle,
} from "react-native"
import { colors } from "../../tokens/colors"
import { radii } from "../../tokens/radii"
import { shadows } from "../../tokens/shadows"
import { fontSize, fontFamily } from "../../tokens/typography"

interface InputProps extends Omit<TextInputProps, "style"> {
  isInvalid?: boolean
  leftSlot?: React.ReactNode
  rightSlot?: React.ReactNode
  containerStyle?: ViewStyle
  inputStyle?: ViewStyle
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      isInvalid = false,
      leftSlot,
      rightSlot,
      containerStyle,
      inputStyle,
      editable = true,
      ...rest
    },
    ref
  ) => {
    const [focused, setFocused] = React.useState(false)

    const borderColor = isInvalid
      ? colors.error[300]
      : focused
        ? colors.primary[500]
        : colors.gray[300]

    return (
      <View
        style={[
          styles.container,
          {
            borderColor,
            ...(focused && !isInvalid
              ? { borderColor: colors.primary[500] }
              : {}),
          },
          ...Object.values(shadows.xs).length ? [shadows.xs] : [],
          !editable && styles.disabled,
          containerStyle,
        ]}
      >
        {leftSlot && <View style={styles.slot}>{leftSlot}</View>}
        <TextInput
          ref={ref}
          editable={editable}
          placeholderTextColor={colors.gray[500]}
          {...rest}
          onFocus={(e) => {
            setFocused(true)
            rest.onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            rest.onBlur?.(e)
          }}
          style={[
            styles.input,
            leftSlot ? { paddingLeft: 8 } : { paddingLeft: 14 },
            rightSlot ? { paddingRight: 8 } : { paddingRight: 14 },
            inputStyle,
          ]}
        />
        {rightSlot && <View style={styles.slot}>{rightSlot}</View>}
      </View>
    )
  }
)

Input.displayName = "Input"

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderWidth: 1,
    borderRadius: radii.sm,
    backgroundColor: colors.white,
    ...shadows.xs,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: fontSize.base,
    fontFamily: fontFamily.sans,
    color: colors.gray.black,
    paddingVertical: 10,
  },
  slot: {
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.5,
  },
})
