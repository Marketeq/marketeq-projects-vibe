import React from "react"
import { View, Text, Pressable, StyleSheet, ViewStyle } from "react-native"
import { colors } from "../../tokens/colors"
import { radii } from "../../tokens/radii"
import { fontSize, lineHeight, fontWeight } from "../../tokens/typography"

interface TabItem {
  value: string
  label: string
}

interface TabsProps {
  items: TabItem[]
  value: string
  onChange: (value: string) => void
  style?: ViewStyle
}

export function Tabs({ items, value, onChange, style }: TabsProps) {
  return (
    <View style={[styles.container, style]}>
      {items.map((item) => {
        const active = item.value === value
        return (
          <Pressable
            key={item.value}
            onPress={() => onChange(item.value)}
            style={[styles.tab, active && styles.tabActive]}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.gray[100],
    borderRadius: radii.lg,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[500],
  },
  tabTextActive: {
    color: colors.gray[900],
    fontWeight: fontWeight.semibold,
  },
})
