import type {
  ChannelKey,
  ScopedChannelState,
} from "@/service/http/notifications"
import {
  BellRinging03,
  Briefcase,
  FileSearch02,
  LayoutAlt01,
  Mail01,
  Mail02,
  MessageChatSquare,
  MessageTextSquare01,
  PackageSearch,
  PresentationChart01,
  Star,
  UserSquare,
} from "@blend-metrics/icons"

export const channelOrder: ChannelKey[] = ["inApp", "email", "sms"]

// The design treats Text as a live channel: the channels card carries a Text
// row with a number and an active toggle, and every category summary reads
// "In App, Text". With this false, `summarizeChannels` filtered SMS out and
// those rows read "In App only".
export const SMS_ENABLED = true

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
  // The five categories the design specifies.
  "layout-alt-01": LayoutAlt01,
  "mail-02": Mail02,
  "presentation-chart-01": PresentationChart01,
  "package-search": PackageSearch,
  "user-square": UserSquare,
  // Kept so a preference stored against a retired category still resolves an
  // icon rather than falling through to the default.
  briefcase: Briefcase,
  "message-chat-square": MessageChatSquare,
  "file-search-02": FileSearch02,
  star: Star,
}

export const resolveIcon = (
  key: string
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
