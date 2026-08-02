import AxiosRequest from ".."

export type CheckoutPaymentMethod = "card" | "ach" | "wire"

export const CheckoutAPI = {
  CreateSession: (data: {
    projectId: string
    contractId?: string
    paymentMethod: CheckoutPaymentMethod
    installmentPlanOption?:
      | "full"
      | "weekly"
      | "biweekly"
      | "monthly"
      | "quarterly"
      | "yearly"
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
}
