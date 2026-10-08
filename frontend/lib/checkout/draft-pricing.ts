import { CheckoutAPI } from "@/service/http/checkout"
import type {
  CheckoutDraftGiftCard,
  CheckoutDraftPromoCode,
} from "@/lib/checkout/draft-summary"

export type CheckoutPricingLine = {
  key: string
  label: string
  amount: number
  count?: number
  details?: Array<{ code: string; amount: number }>
}

export type CheckoutDraftPricing = {
  projectCost: number
  lines: CheckoutPricingLine[]
  discountTotal: number
  giftCardAppliedTotal: number
  total: number
  giftCards: CheckoutDraftGiftCard[]
  promoCode: CheckoutDraftPromoCode | null
}

export const getCheckoutDraftPricing = async (
  draftId: string
): Promise<CheckoutDraftPricing | null> => {
  try {
    const response = await CheckoutAPI.GetDraftPricing(draftId)
    const data = response.data
    if (
      !data ||
      typeof data.projectCost !== "number" ||
      typeof data.total !== "number" ||
      !Array.isArray(data.lines)
    ) {
      return null
    }
    return {
      projectCost: data.projectCost,
      lines: data.lines,
      discountTotal: Number(data.discountTotal) || 0,
      giftCardAppliedTotal: Number(data.giftCardAppliedTotal) || 0,
      total: data.total,
      giftCards: Array.isArray(data.giftCards) ? data.giftCards : [],
      promoCode: data.promoCode ?? null,
    }
  } catch {
    return null
  }
}
