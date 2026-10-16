import AxiosRequest from ".."

export interface TimePreferencesDTO {
  timezone: string
  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY"
  startOfWeek: "Sunday" | "Monday"
  timeFormat: "12h" | "24h"
  defaultScreenshotView: "hour" | "day"
  showTooltips: boolean
  captureMode: "active" | "all"
  notifyManualTime: boolean
  notifyReassignment: boolean
  notifyWeeklyReport: boolean
  notifyScreenshotComments: boolean
}

/** Per-contract screenshot rules. Either side reads them; only the client changes them. */
export interface ScreenshotRulesDTO {
  allowDelete: boolean
  allowBlur: boolean
  autoApproveBlur: boolean
  allowReassign: boolean
  deletedNonBillable: boolean
  blurredBillable: boolean
  requireDeleteApproval: boolean
  manualTimeEnabled: boolean
  manualTimeRequireApproval: boolean
  manualTimeRequireReason: boolean
}

// Through the gateway, which forwards /time-tracking/settings/* to
// time-tracking-service's /settings/*.
export const getTimePreferences = async (): Promise<TimePreferencesDTO> => {
  const res = await AxiosRequest.get("/time-tracking/settings/preferences")
  return res.data
}

export const updateTimePreferences = async (
  data: Partial<TimePreferencesDTO>
): Promise<TimePreferencesDTO> => {
  const res = await AxiosRequest.put("/time-tracking/settings/preferences", data)
  return res.data
}

export const getScreenshotRules = async (contractId: string): Promise<ScreenshotRulesDTO> => {
  const res = await AxiosRequest.get(`/time-tracking/settings/admin/${contractId}`)
  return res.data
}

export const updateScreenshotRules = async (
  contractId: string,
  data: Partial<ScreenshotRulesDTO>
): Promise<ScreenshotRulesDTO> => {
  const res = await AxiosRequest.put(`/time-tracking/settings/admin/${contractId}`, data)
  return res.data
}
