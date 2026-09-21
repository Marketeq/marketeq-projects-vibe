import React from "react"
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  ModalProps,
} from "react-native"
import { colors } from "../../tokens/colors"
import { radii } from "../../tokens/radii"
import { shadows } from "../../tokens/shadows"
import { fontSize, lineHeight, fontWeight } from "../../tokens/typography"

interface DialogProps {
  visible: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  contentStyle?: ViewStyle
}

export function Dialog({
  visible,
  onClose,
  title,
  description,
  children,
  contentStyle,
}: DialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.content, contentStyle]}
          onPress={(e) => e.stopPropagation()}
        >
          {title && <Text style={styles.title}>{title}</Text>}
          {description && <Text style={styles.description}>{description}</Text>}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

/** Pre-built footer for action buttons */
Dialog.Footer = function DialogFooter({
  children,
  style,
}: {
  children: React.ReactNode
  style?: ViewStyle
}) {
  return <View style={[styles.footer, style]}>{children}</View>
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    ...shadows.lg,
  },
  title: {
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
    fontWeight: fontWeight.semibold,
    color: colors.gray[900],
    marginBottom: 4,
  },
  description: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    color: colors.gray[500],
    marginBottom: 20,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 24,
  },
})
