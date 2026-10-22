export const CHECKOUT_VALIDATION_MESSAGES: Record<string, string> = {
  SCOPE_EMPTY: "Please add at least one phase to your project scope",
  PHASE_EMPTY: "Please add a task to every phase or remove the empty phase",
  TEAM_EMPTY: "Please assign at least one team member to a task",
  PRICE_ZERO:
    "Please add hours to your scope so the project cost is above $0",
  PRICE_CHANGED:
    "Please review your updated total and try again, the price has changed",
  PRICING_UNAVAILABLE:
    "Please try again, pricing is temporarily unavailable",
  SESSION_ALREADY_PAID:
    "Please check your payments, this checkout has already been paid",
  CUSTOMER_UNAVAILABLE:
    "Please try again, we could not set up your payment account",
  DRAFT_STALE:
    "Please review your scope, it was updated elsewhere and the latest version has been loaded",
}

export const CHECKOUT_VALIDATION_FALLBACK_MESSAGE =
  "Please try again, we could not validate your checkout"

export const getCheckoutValidationMessage = (code: string) =>
  CHECKOUT_VALIDATION_MESSAGES[code] ?? CHECKOUT_VALIDATION_FALLBACK_MESSAGE

export const GIFT_CARD_ERROR_MESSAGES: Record<string, string> = {
  GIFT_CARD_NOT_FOUND:
    "This gift card code is not valid. Please check the code and try again",
  GIFT_CARD_EXPIRED: "This code has expired and can no longer be applied.",
  GIFT_CARD_USED_UP:
    "This code has already been redeemed and cannot be applied again.",
  GIFT_CARD_LIMIT: "You can apply up to 5 gift cards",
  GIFT_CARD_UNAVAILABLE:
    "We were unable to apply your gift card at this time. Please try again",
  SESSION_ALREADY_PAID: CHECKOUT_VALIDATION_MESSAGES.SESSION_ALREADY_PAID,
}

export const GIFT_CARD_ERROR_FALLBACK_MESSAGE =
  GIFT_CARD_ERROR_MESSAGES.GIFT_CARD_UNAVAILABLE

export const GIFT_CARD_LOCKED_MESSAGE =
  "Too many invalid gift card attempts. Please try again in 1 hour."

export const getGiftCardErrorMessage = (code?: string) =>
  (code && GIFT_CARD_ERROR_MESSAGES[code]) || GIFT_CARD_ERROR_FALLBACK_MESSAGE

export const getGiftCardErrorCode = (error: unknown): string | undefined => {
  const data = (
    error as {
      response?: {
        data?: { code?: string; message?: { code?: string } | string }
      }
    } | null
  )?.response?.data
  const nested = typeof data?.message === "object" ? data.message : null
  return data?.code ?? nested?.code
}
