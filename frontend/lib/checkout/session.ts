import { CheckoutAPI } from "@/service/http/checkout"

export type CheckoutSession = {
  sessionId: string
  status: string
  listingId: string
  slug: string | null
  contractId: string | null
  orderId: string | null
  draftId: string | null
  projectCost: number
  title: string | null
  mediaUrl: string | null
  teamMemberCount: number | null
  durationDays: number | null
  appliedGiftCards: { code: string; amountUsed: number }[]
  appliedPromoCode: string | null
  promo: {
    code: string
    status: string
    discountType: "percent" | "fixed"
    discountValue: number
    amount: number
  } | null
  giftCardLockedUntil: string | null
  walletAmountUsed: number
  paymentSelection: {
    method: "card"
    id: string
    brand: string
    funding: string
    last4: string
    expMonth: number
    expYear: number
    billingAddressId: string | null
    isDefault: boolean
  } | null
}

export const getCheckoutSession = async (
  sessionId: string
): Promise<CheckoutSession | null> => {
  try {
    const response = await CheckoutAPI.GetSession(sessionId)
    return response.data as CheckoutSession
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response
      ?.status
    if (status === 400 || status === 404) return null
    throw error
  }
}
