import { CheckoutAPI } from "@/service/http/checkout"

export type CheckoutSession = {
  sessionId: string
  status: string
  listingId: string
  slug: string | null
  contractId: string | null
  totalAmount: number
  appliedGiftCards: { code: string; amountUsed: number }[]
  appliedPromoCode: string | null
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
