import { CheckoutAPI } from "@/service/http/checkout"
import { workingDaysToCalendarDays, workingDaysToWeeks } from "./working-days"

export type CheckoutDraftCodeStatus =
  | "valid"
  | "expired"
  | "used_up"
  | "not_found"
  | "unverified"

export type CheckoutDraftGiftCard = {
  code: string
  status: CheckoutDraftCodeStatus
  amount: number
}

export type CheckoutDraftPromoCode = {
  code: string
  status: CheckoutDraftCodeStatus
  amount: number
  discountType: "percent" | "fixed"
  discountValue: number
}

export type CheckoutDraftSummary = {
  draftId: string
  version: number
  title: string | null
  mediaUrl: string | null
  teamMemberCount: number | null
  durationDays: number | null
}

const monthYearFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

const getStatus = (error: unknown): number | undefined =>
  (error as { response?: { status?: number } })?.response?.status

const toDraftSummary = (data: any): CheckoutDraftSummary => ({
  draftId: data.draftId,
  version: data.version,
  title: data.title ?? null,
  mediaUrl: data.mediaUrl ?? null,
  teamMemberCount: data.teamMemberCount ?? null,
  durationDays: data.durationDays ?? null,
})

export const getCheckoutDraftSummary = async (
  listingId: string
): Promise<CheckoutDraftSummary> => {
  try {
    return toDraftSummary((await CheckoutAPI.GetListingDraft(listingId)).data)
  } catch (error) {
    if (getStatus(error) !== 404) throw error
  }

  try {
    await CheckoutAPI.CreateListingDraft(listingId)
  } catch (error) {
    if (getStatus(error) !== 409) throw error
  }

  return toDraftSummary((await CheckoutAPI.GetListingDraft(listingId)).data)
}

export const getDraftDurationLabel = (days: number | null): string | null => {
  if (!days || days <= 0) return null
  const weeks = workingDaysToWeeks(days)
  return `${weeks} Week${weeks !== 1 ? "s" : ""}`
}

export const getDraftDateRangeLabel = (days: number | null): string | null => {
  if (!days || days <= 0) return null
  const start = new Date()
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + workingDaysToCalendarDays(days))
  return `${monthYearFormatter.format(start)} - ${monthYearFormatter.format(end)}`
}
