import { CheckoutAPI } from "@/service/http/checkout"

export type CheckoutDraftTeamRow = {
  userId: string | null
  roleKey: string | null
  name: string
  username: string | null
  avatarUrl: string | null
  role: string | null
  phase: string
  experience: string | null
  location: string | null
  rate: number | null
  status: "Confirmed" | "Pending Invite" | "Unassigned"
}

export const getCheckoutDraftTeam = async (
  draftId: string
): Promise<CheckoutDraftTeamRow[] | null> => {
  try {
    const response = await CheckoutAPI.GetDraftTeam(draftId)
    const members = response.data?.members
    return Array.isArray(members) ? members : null
  } catch {
    return null
  }
}
