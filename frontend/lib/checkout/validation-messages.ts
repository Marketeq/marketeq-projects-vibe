export const CHECKOUT_VALIDATION_MESSAGES: Record<string, string> = {
  SCOPE_EMPTY: "Please add at least one phase to your project scope.",
  PHASE_EMPTY: "Please add a task to every phase or remove the empty phase.",
  TASK_MISSING_ROLE: "Please add a role to every task.",
  TEAM_EMPTY: "Please assign at least one team member to a task.",
  LISTING_UNAVAILABLE:
    "Please choose another project, this one is no longer available.",
  LISTING_CHANGED:
    "Please go back to the listing and start again, this project has changed since you began checkout.",
  PRICE_ZERO:
    "Please add hours to your scope so the project cost is above $0.",
  PRICE_CHANGED:
    "Please review your updated total and try again, the price has changed.",
  PRICING_UNAVAILABLE:
    "Please try again, pricing is temporarily unavailable.",
  LISTING_CHECK_UNAVAILABLE:
    "Please try again, we could not check this project right now.",
  SESSION_ALREADY_PAID:
    "Please check your payments, this checkout has already been paid.",
  DRAFT_STALE:
    "Please review your scope, it was updated elsewhere and the latest version has been loaded.",
}

export const CHECKOUT_VALIDATION_FALLBACK_MESSAGE =
  "Please try again, we could not validate your checkout."

export const getCheckoutValidationMessage = (code: string) =>
  CHECKOUT_VALIDATION_MESSAGES[code] ?? CHECKOUT_VALIDATION_FALLBACK_MESSAGE
