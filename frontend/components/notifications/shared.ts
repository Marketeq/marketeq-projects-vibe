import {
  BellRinging03,
  Briefcase,
  FileSearch02,
  Mail01,
  MessageChatSquare,
  MessageTextSquare01,
  Star,
} from "@blend-metrics/icons"
import type {
  ChannelKey,
  ScopedChannelState,
} from "@/service/http/notifications"

export const channelOrder: ChannelKey[] = ["inApp", "email", "sms"]

export const SMS_ENABLED = false

export const channelLabels: Record<ChannelKey, string> = {
  inApp: "In App",
  email: "Email",
  sms: "Text",
}

export const channelIcons: Record<
  ChannelKey,
  React.ComponentType<{ className?: string }>
> = {
  inApp: BellRinging03,
  email: Mail01,
  sms: MessageTextSquare01,
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  briefcase: Briefcase,
  "message-chat-square": MessageChatSquare,
  "file-search-02": FileSearch02,
  star: Star,
}

export const resolveIcon = (
  key: string,
): React.ComponentType<{ className?: string }> => iconMap[key] ?? Briefcase

export const EMPTY_CHANNELS: ScopedChannelState = {
  inApp: false,
  email: false,
  sms: false,
}

export function summarizeChannels(channels: ScopedChannelState): string {
  const active = channelOrder
    .filter((k) => (SMS_ENABLED || k !== "sms") && channels[k])
    .map((k) => channelLabels[k])
  if (active.length === 0) return "Off"
  if (active.length === 1) return `${active[0]} only`
  return active.join(", ")
}

export type BrowserPermissionResult = "granted" | "denied" | "default"

export async function requestBrowserNotificationPermission(): Promise<BrowserPermissionResult> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied"
  }
  if (Notification.permission === "granted") return "granted"
  if (Notification.permission === "denied") return "denied"
  const result = await Notification.requestPermission()
  return result as BrowserPermissionResult
}
