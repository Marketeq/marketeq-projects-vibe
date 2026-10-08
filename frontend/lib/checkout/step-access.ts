const UNUSABLE_FOR_PAYMENT = [
  "success",
  "failed",
  "cancelled",
  "expired",
  "refunded",
]
const UNUSABLE_AFTER_PAYMENT = [
  "pending",
  "failed",
  "cancelled",
  "expired",
  "refunded",
]

const BLOCKED_STATUSES: Array<{ prefix: string; statuses: string[] }> = [
  { prefix: "/checkout/payment", statuses: UNUSABLE_FOR_PAYMENT },
  { prefix: "/checkout/review", statuses: UNUSABLE_FOR_PAYMENT },
  { prefix: "/checkout/confirmation", statuses: UNUSABLE_AFTER_PAYMENT },
  { prefix: "/checkout/success", statuses: UNUSABLE_AFTER_PAYMENT },
  { prefix: "/checkout/next-steps", statuses: UNUSABLE_AFTER_PAYMENT },
]

export const isCheckoutSessionAllowed = (
  pathname: string,
  status: string
): boolean => {
  const rule = BLOCKED_STATUSES.find(({ prefix }) =>
    pathname.startsWith(prefix)
  )
  return !rule || !rule.statuses.includes(status)
}
