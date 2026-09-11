import React from "react"
import { View, Text, StyleSheet, ViewStyle } from "react-native"
import { colors } from "../../tokens/colors"
import { fontSize, lineHeight, fontWeight } from "../../tokens/typography"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  style?: ViewStyle
}

export function EmptyState({ icon, title, description, action, style }: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {action && <View style={styles.actionContainer}>{action}</View>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    textAlign: "center",
  },
  description: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    color: colors.gray[500],
    textAlign: "center",
    marginTop: 4,
  },
  actionContainer: {
    marginTop: 20,
  },
})
