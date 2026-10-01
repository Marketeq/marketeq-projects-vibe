import AxiosRequest from ".."

export type CheckoutPaymentMethod = "card" | "ach" | "wire"
export type CheckoutInstallmentPlan =
  | "full"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly"

export type CheckoutRateSelection = {
  roleKey: string
  experience?: string
  location?: string
  roleTitle?: string
}

export type CheckoutRateEstimate = {
  listingId: string
  rates: Array<{
    roleKey: string
    hourlyRateUsdCents: number | null
    noData: boolean
    isStale: boolean
  }>
}

export const CheckoutAPI = {
  CreateSession: (data: {
    projectId: string
    contractId?: string
    paymentMethod: CheckoutPaymentMethod
    installmentPlanOption?: CheckoutInstallmentPlan
    splitPaymentEnabled?: boolean
    initialPaymentAmount?: number
    giftCardCode?: string
    walletBalanceUsed?: number
    clientId: string
    amount: number
    successUrl?: string
    cancelUrl?: string
  }) => AxiosRequest.post("/v1/checkout/session", data),

  Confirm: (data: { sessionId: string }) =>
    AxiosRequest.post("/v1/checkout/confirm", data),

  Cancel: (data: { sessionId: string }) =>
    AxiosRequest.post("/v1/checkout/cancel", data),

  GetStatus: (sessionId: string) =>
    AxiosRequest.get(`/v1/checkout/status/${sessionId}`),

  ApplyGiftCard: (data: { code: string }) =>
    AxiosRequest.post("/v1/checkout/apply-giftcard", data),

  CheckCooldown: () => AxiosRequest.get("/v1/checkout/cooldown"),

  GetWalletBalance: () => AxiosRequest.get("/v1/checkout/wallet/balance"),

  GetListingDraft: (listingId: string) =>
    AxiosRequest.get(`/v1/checkout/listings/${listingId}/draft`),

  CreateListingDraft: (listingId: string) =>
    AxiosRequest.post(`/v1/checkout/listings/${listingId}/draft`, {}),

  GetDraftScope: (draftId: string) =>
    AxiosRequest.get(`/v1/checkout/drafts/${draftId}/scope`),

  GetDraftTeam: (draftId: string) =>
    AxiosRequest.get(`/v1/checkout/drafts/${draftId}/team`),

  GetListingSummary: (listingId: string) =>
    AxiosRequest.get(`/v1/checkout/listings/${listingId}/summary`),

  GetRateEstimate: (listingId: string, selections: CheckoutRateSelection[]) =>
    AxiosRequest.post<{ selections: CheckoutRateSelection[] }>(
      `/v1/checkout/listings/${listingId}/rate-estimate`,
      { selections }
    ),
}
