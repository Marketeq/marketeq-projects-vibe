import { getPublicApiUrl } from "@/lib/runtime-urls"
import AxiosRequest from ".."

const API_BASE = getPublicApiUrl()

export interface SupportMessageParams {
  firstName: string
  lastName: string
  email: string
  subject: string
  message: string
}

export interface ScheduleCallParams {
  name: string
  email: string
  phone: string
  date: string
  time: string
}

/**
 * Contact Support, reached from account recovery.
 *
 * Both endpoints are public — the caller is locked out by definition, so no
 * token is attached or expected. They are rate limited per IP server-side.
 */
export const SupportAPI = {
  SendMessage: (data: SupportMessageParams) =>
    AxiosRequest.post(`${API_BASE}/support/messages`, data),

  RequestCall: (data: ScheduleCallParams) =>
    AxiosRequest.post(`${API_BASE}/support/call-requests`, data),
}
