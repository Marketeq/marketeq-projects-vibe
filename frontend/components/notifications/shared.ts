import type {
  ChannelKey,
  ScopedChannelState,
} from "@/service/http/notifications"
import { phoneUtil } from "@/components/phone-number-input"
import { PhoneNumberFormat } from "google-libphonenumber"
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

// Text is marked COMING SOON in the design: the channel row is dimmed with its
// toggle off, and collapsed category rows read "In App only". Keeping this
// false leaves SMS out of every channel summary and out of the per-category
// toggles, which is what the design shows.
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

/**
 * Renders a stored E.164 number the way the design shows it — "(704) 555-0127"
 * rather than "+17045550127".
 *
 * Falls back to the raw string whenever the number cannot be parsed, so a value
 * saved before this formatter existed, or one from a country the library does
 * not recognise, still displays instead of disappearing.
 */
export function formatPhoneForDisplay(phone: string): string {
  try {
    const parsed = phoneUtil.parseAndKeepRawInput(phone)
    if (!phoneUtil.isValidNumber(parsed)) return phone
    return phoneUtil.format(parsed, PhoneNumberFormat.NATIONAL)
  } catch {
    return phone
  }
}
