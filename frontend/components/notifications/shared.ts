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
  const active = channelOrder.filter((k) => channels[k]).map((k) => channelLabels[k])
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
 * The region assumed for a stored number that carries no country code.
 *
 * libphonenumber cannot parse "7045550127" without being told where it is
 * from — it throws — which is why such values used to fall through and render
 * as raw digits.
 */
const DEFAULT_PHONE_REGION = "US"

/** "(704) 555-0127" from ten digits, the shape the design shows. */
function formatNorthAmericanDigits(digits: string): string | null {
  const national =
    digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits
  if (national.length !== 10) return null
  return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`
}

/**
 * Renders a stored number the way the design shows it — "(704) 555-0127"
 * rather than "+17045550127" or a bare "7045550127".
 *
 * Three passes, widening as they go, because the column was showing raw digits
 * for two separate reasons:
 *
 * 1. E.164 as stored. This always worked.
 * 2. A number with no country code. `parseAndKeepRawInput` **throws** without a
 *    region, so every value saved in national form fell straight to the raw
 *    fallback. Parsed against DEFAULT_PHONE_REGION instead.
 * 3. A number libphonenumber rejects as not a real allocation — "0000000000",
 *    or an area code starting with 1. `isValidNumber` says no, but the column
 *    should still show a phone number rather than a digit run, so ten digits
 *    are formatted positionally as a last resort.
 *
 * Anything genuinely unreadable still returns unchanged: a value from a country
 * the library does not recognise should display, not disappear.
 */
export function formatPhoneForDisplay(phone: string): string {
  const trimmed = phone?.trim()
  if (!trimmed) return phone

  for (const region of [null, DEFAULT_PHONE_REGION]) {
    try {
      const parsed = region
        ? phoneUtil.parse(trimmed, region)
        : phoneUtil.parseAndKeepRawInput(trimmed)
      if (phoneUtil.isValidNumber(parsed)) {
        return phoneUtil.format(parsed, PhoneNumberFormat.NATIONAL)
      }
    } catch {
      // Try the next pass rather than giving up on the number.
    }
  }

  // Only for numbers that are, or could be, North American: a "+" followed by
  // some other country's dial code must not be reshaped into a US layout.
  const digits = trimmed.replace(/\D/g, "")
  if (!trimmed.startsWith("+") || digits.startsWith("1")) {
    const positional = formatNorthAmericanDigits(digits)
    if (positional) return positional
  }

  return phone
}
