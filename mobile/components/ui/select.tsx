import React, { useState } from "react"
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  StyleSheet,
  ViewStyle,
} from "react-native"
import { colors } from "../../tokens/colors"
import { radii } from "../../tokens/radii"
import { shadows } from "../../tokens/shadows"
import { fontSize, lineHeight, fontWeight } from "../../tokens/typography"

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  options: SelectOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  isInvalid?: boolean
  disabled?: boolean
  style?: ViewStyle
}

export function Select({
  options,
  value,
  onChange,
  placeholder = "Select...",
  isInvalid = false,
  disabled = false,
  style,
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)

  return (
    <>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        style={[
          styles.trigger,
          isInvalid && styles.triggerError,
          disabled && styles.disabled,
          style,
        ]}
      >
        <Text
          style={[
            styles.triggerText,
            !selected && styles.placeholderText,
          ]}
          numberOfLines={1}
        >
          {selected?.label ?? placeholder}
        </Text>
        <Text style={styles.chevron}>&#x25BE;</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onChange(item.value)
                    setOpen(false)
                  }}
                  style={[
                    styles.option,
                    item.value === value && styles.optionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      item.value === value && styles.optionTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 44,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: radii.sm,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    ...shadows.xs,
  },
  triggerError: {
    borderColor: colors.error[300],
  },
  triggerText: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.gray.black,
  },
  placeholderText: {
    color: colors.gray[500],
  },
  chevron: {
    fontSize: 14,
    color: colors.gray[400],
    marginLeft: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii["2xl"],
    borderTopRightRadius: radii["2xl"],
    maxHeight: "60%",
    paddingBottom: 34,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray[300],
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  optionSelected: {
    backgroundColor: colors.primary[50],
  },
  optionText: {
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
    color: colors.gray[800],
  },
  optionTextSelected: {
    color: colors.primary[500],
    fontWeight: fontWeight.semibold,
  },
})
