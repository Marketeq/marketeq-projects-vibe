import AxiosRequest from "@/service"
import { getPublicUserUrl } from "@/lib/runtime-urls"

const USER_BASE = getPublicUserUrl()
const BASE = `${USER_BASE}/privacy`

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TalentPrivacyPrefs {
  showInSearch: boolean
  showInBrowse: boolean
  profileVisibility: "public" | "registered" | "hidden"
  hideRate: boolean
  whoCanMessage: "anyone" | "clients" | "past_clients"
  showOnlineStatus: boolean
  showLastActive: boolean
  showAvailability: boolean
  showCompletedProjects: boolean
  showReviews: boolean
  locationDisplay: "city_state" | "state" | "country" | "hidden"
}

export interface ClientPrivacyPrefs {
  showCompanyInSearch: boolean
  anonymousPostings: boolean
  profileVisibility: "public" | "registered"
  hideActivePostings: boolean
  showHireCount: boolean
  showResponseTime: boolean
  whoCanMessage: "anyone" | "hired" | "nobody"
  showOnlineStatus: boolean
  showLastActive: boolean
  hideTotalSpend: boolean
  hideAvgBudget: boolean
}

export interface PrivacySettingsResponse {
  id: string
  userId: string
  talent: TalentPrivacyPrefs | null
  client: ClientPrivacyPrefs | null
  createdAt: string
  updatedAt: string
}

export interface UpdatePrivacyPayload {
  talent?: Partial<TalentPrivacyPrefs>
  client?: Partial<ClientPrivacyPrefs>
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                           */
/* ------------------------------------------------------------------ */

export const DEFAULT_TALENT_PRIVACY: TalentPrivacyPrefs = {
  showInSearch: true,
  showInBrowse: true,
  profileVisibility: "public",
  hideRate: false,
  whoCanMessage: "anyone",
  showOnlineStatus: true,
  showLastActive: true,
  showAvailability: true,
  showCompletedProjects: true,
  showReviews: true,
  locationDisplay: "city_state",
}

export const DEFAULT_CLIENT_PRIVACY: ClientPrivacyPrefs = {
  showCompanyInSearch: true,
  anonymousPostings: false,
  profileVisibility: "public",
  hideActivePostings: false,
  showHireCount: true,
  showResponseTime: true,
  whoCanMessage: "anyone",
  showOnlineStatus: true,
  showLastActive: true,
  hideTotalSpend: false,
  hideAvgBudget: false,
}

/* ------------------------------------------------------------------ */
/*  API                                                                */
/* ------------------------------------------------------------------ */

export const PrivacyAPI = {
  get: () => AxiosRequest.get(BASE),
  update: (payload: UpdatePrivacyPayload) => AxiosRequest.patch(BASE, payload),
  reset: () => AxiosRequest.post(`${BASE}/reset`, {}),
}
