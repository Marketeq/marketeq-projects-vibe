import React, { forwardRef } from "react"
import { TextInput, TextInputProps, StyleSheet, ViewStyle } from "react-native"
import { colors } from "../../tokens/colors"
import { radii } from "../../tokens/radii"
import { shadows } from "../../tokens/shadows"
import { fontSize, fontFamily } from "../../tokens/typography"

interface TextareaProps extends Omit<TextInputProps, "style"> {
  isInvalid?: boolean
  style?: ViewStyle
}

export const Textarea = forwardRef<TextInput, TextareaProps>(
  ({ isInvalid = false, editable = true, style, ...rest }, ref) => {
    const [focused, setFocused] = React.useState(false)

    const borderColor = isInvalid
      ? colors.error[300]
      : focused
        ? colors.primary[500]
        : colors.gray[300]

    return (
      <TextInput
        ref={ref}
        multiline
        textAlignVertical="top"
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
          styles.base,
          { borderColor },
          !editable && styles.disabled,
          style,
        ]}
      />
    )
  }
)

Textarea.displayName = "Textarea"

const styles = StyleSheet.create({
  base: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: radii.sm,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: fontSize.base,
    fontFamily: fontFamily.sans,
    color: colors.gray.black,
    ...shadows.xs,
  },
  disabled: {
    opacity: 0.5,
  },
})
