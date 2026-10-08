import { CheckoutAPI } from "@/service/http/checkout"

export type CheckoutDraftTask = {
  id: string
  title: string
  description: string | null
  roleName: string | null
  location: string[] | null
  experienceLevel: string | null
  estimatedHours: number | null
}

export type CheckoutDraftPhase = {
  id: string
  phaseName: string
  order: number
  tasks: CheckoutDraftTask[]
}

export type CheckoutScopeSummary = {
  draftId: string
  phases: CheckoutDraftPhase[]
  projectCost: number | null
}

// Reads from the checkout draft (seeded once from the listing's scope via
// the api-gateway, see checkout-draft.service.ts on the gateway). Read-only
// for now — nothing writes back to the draft yet.
export const getCheckoutScopeSummary = async (
  listingId: string
): Promise<CheckoutScopeSummary | null> => {
  try {
    const response = await CheckoutAPI.GetListingSummary(listingId)
    const draft = response.data?.draft
    if (!draft) return null

    return {
      draftId: draft.id,
      phases: Array.isArray(draft.phases) ? draft.phases : [],
      projectCost: typeof draft.projectCost === "number" ? draft.projectCost : null,
    }
  } catch {
    return null
  }
}
