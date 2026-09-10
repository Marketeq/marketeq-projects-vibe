import React from "react"
import { Pressable, View, Text, StyleSheet, ViewStyle } from "react-native"
import { colors } from "../../tokens/colors"
import { radii } from "../../tokens/radii"
import { fontSize, lineHeight, fontWeight } from "../../tokens/typography"

interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  style?: ViewStyle
}

export function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
  style,
}: CheckboxProps) {
  return (
    <Pressable
      onPress={() => !disabled && onChange(!checked)}
      style={[styles.container, style]}
      disabled={disabled}
    >
      <View
        style={[
          styles.box,
          checked && styles.boxChecked,
          disabled && styles.disabled,
        ]}
      >
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      {label && (
        <Text style={[styles.label, disabled && styles.disabled]}>{label}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.gray[300],
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  boxChecked: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  checkmark: {
    color: colors.white,
    fontSize: 13,
    fontWeight: fontWeight.bold,
  },
  label: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    color: colors.gray[700],
  },
  disabled: {
    opacity: 0.5,
  },
})
