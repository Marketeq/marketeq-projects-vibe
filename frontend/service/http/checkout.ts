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

export type DraftTaskInput = {
  version: number
  title: string
  roleName: string
  durationHours: number
  workSchedule?: "full_time" | "part_time" | "custom"
  customHoursPerWeek?: number | null
  experienceLevel: string
  location?: string[]
  assigneeUserId?: string | null
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

export type CheckoutPaymentMethodId =
  | "card"
  | "ach"
  | "wire"
  | "google_pay"
  | "apple_pay"
  | "klarna"

export type CheckoutPaymentMethodOption = {
  id: CheckoutPaymentMethodId
  available: boolean
  reason: string | null
  feeLabel: string
  processingTime: string | null
  browserCheck: "google_pay" | "apple_pay" | null
}

export type CheckoutPaymentMethods = {
  sessionId: string
  amountDue: number
  noPaymentNeeded: boolean
  methods: CheckoutPaymentMethodOption[]
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

  GetDraftPricing: (draftId: string) =>
    AxiosRequest.get(`/v1/checkout/drafts/${draftId}/pricing`),

  GetSession: (sessionId: string) =>
    AxiosRequest.get(`/v1/checkout/session/${sessionId}`, { timeout: 10000 }),

  SetSessionPaymentSelection: (
    sessionId: string,
    data: { method: CheckoutPaymentMethod; id: string }
  ) =>
    AxiosRequest.put(`/v1/checkout/session/${sessionId}/payment/selection`, data, {
      timeout: 4000,
    }),

  SetSessionBalance: (sessionId: string, amount: number) =>
    AxiosRequest.put(
      `/v1/checkout/session/${sessionId}/balance`,
      { amount },
      { timeout: 4000 }
    ),

  SubmitSessionPayment: (sessionId: string) =>
    AxiosRequest.post(
      `/v1/checkout/session/${sessionId}/payment/submit`,
      undefined,
      { timeout: 10000 }
    ),

  ClearSessionPaymentSelection: (sessionId: string) =>
    AxiosRequest.del(`/v1/checkout/session/${sessionId}/payment/selection`, {
      timeout: 4000,
    }),

  GetPaymentMethods: (sessionId: string, balanceApplied = 0) =>
    AxiosRequest.get(`/v1/checkout/session/${sessionId}/payment-methods`, {
      timeout: 4000,
      params: balanceApplied > 0 ? { balanceApplied } : undefined,
    }),

  CreateDraftSession: (
    draftId: string,
    data: { version: number; expectedTotal: number }
  ) => AxiosRequest.post(`/v1/checkout/drafts/${draftId}/create-session`, data),

  AddDraftPhase: (
    draftId: string,
    data: { version: number; title: string; order?: number }
  ) => AxiosRequest.post(`/v1/checkout/drafts/${draftId}/phases`, data),

  ReplaceDraftMember: (
    draftId: string,
    data: {
      version: number
      toUserId: string
      fromUserId?: string
      roleKey?: string
    }
  ) =>
    AxiosRequest.post(
      `/v1/checkout/drafts/${draftId}/team/replace-member`,
      data
    ),

  UpdateDraftRole: (
    draftId: string,
    data: {
      version: number
      roleKey: string
      experienceLevel?: string
      location?: string
    }
  ) =>
    AxiosRequest.post(`/v1/checkout/drafts/${draftId}/team/update-role`, data),

  RemoveDraftMember: (draftId: string, userId: string, version: number) =>
    AxiosRequest.del(`/v1/checkout/drafts/${draftId}/team/${userId}`, {
      params: { version },
    }),

  RemoveDraftMemberAndTasks: (
    draftId: string,
    data: { version: number; fromUserId?: string; roleKey?: string }
  ) =>
    AxiosRequest.post(
      `/v1/checkout/drafts/${draftId}/team/remove-member`,
      data
    ),

  DuplicateDraftPhase: (draftId: string, phaseId: string, version: number) =>
    AxiosRequest.post(
      `/v1/checkout/drafts/${draftId}/phases/${phaseId}/duplicate`,
      { version }
    ),

  UpdateDraftPhase: (
    draftId: string,
    phaseId: string,
    data: { version: number; title?: string; order?: number }
  ) =>
    AxiosRequest.patch(
      `/v1/checkout/drafts/${draftId}/phases/${phaseId}`,
      data
    ),

  DeleteDraftPhase: (draftId: string, phaseId: string, version: number) =>
    AxiosRequest.del(`/v1/checkout/drafts/${draftId}/phases/${phaseId}`, {
      params: { version },
    }),

  AddDraftTask: (draftId: string, phaseId: string, data: DraftTaskInput) =>
    AxiosRequest.post(
      `/v1/checkout/drafts/${draftId}/phases/${phaseId}/tasks`,
      data
    ),

  UpdateDraftTask: (
    draftId: string,
    taskId: string,
    data: Pick<DraftTaskInput, "version"> &
      Partial<Omit<DraftTaskInput, "version">> & { order?: number }
  ) =>
    AxiosRequest.patch(`/v1/checkout/drafts/${draftId}/tasks/${taskId}`, data),

  DeleteDraftTask: (draftId: string, taskId: string, version: number) =>
    AxiosRequest.del(`/v1/checkout/drafts/${draftId}/tasks/${taskId}`, {
      params: { version },
    }),

  ApplyDraftCode: (
    draftId: string,
    data: { type: "gift_card" | "promo"; code: string }
  ) => AxiosRequest.post(`/v1/checkout/drafts/${draftId}/apply-code`, data),

  RemoveDraftCode: (draftId: string, code: string) =>
    AxiosRequest.del(
      `/v1/checkout/drafts/${draftId}/apply-code/${encodeURIComponent(code)}`
    ),

  ApplySessionCode: (
    sessionId: string,
    data: { type: "gift_card" | "promo"; code: string }
  ) => AxiosRequest.post(`/v1/checkout/session/${sessionId}/apply-code`, data),

  RemoveSessionCode: (sessionId: string, code: string) =>
    AxiosRequest.del(
      `/v1/checkout/session/${sessionId}/apply-code/${encodeURIComponent(code)}`
    ),

  CreateCardSetupIntent: () =>
    AxiosRequest.post("/v1/checkout/cards/setup-intent", {}),

  SaveCard: (data: {
    paymentMethodId: string
    billingAddressId?: string
    setAsDefault?: boolean
  }) => AxiosRequest.post("/v1/checkout/cards", data),

  ListSavedCards: () => AxiosRequest.get("/v1/checkout/cards"),

  GetSavedCard: (cardId: string) =>
    AxiosRequest.get(`/v1/checkout/cards/${cardId}`),

  UpdateSavedCard: (cardId: string, data: Record<string, unknown>) =>
    AxiosRequest.patch(`/v1/checkout/cards/${cardId}`, data),

  DeleteSavedCard: (cardId: string) =>
    AxiosRequest.del(`/v1/checkout/cards/${cardId}`),

  GetListingSummary: (listingId: string) =>
    AxiosRequest.get(`/v1/checkout/listings/${listingId}/summary`),

  GetRateEstimate: (listingId: string, selections: CheckoutRateSelection[]) =>
    AxiosRequest.post<{ selections: CheckoutRateSelection[] }>(
      `/v1/checkout/listings/${listingId}/rate-estimate`,
      { selections }
    ),
}
