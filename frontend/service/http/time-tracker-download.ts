import AxiosRequest from ".."

/**
 * G8: asks the backend whether this user may download the Time Tracker. Resolves
 * only when the identity gate is open; a closed gate (403 VERIFICATION_REQUIRED)
 * or an unanswered one (503 IDENTITY_VERIFICATION_UNAVAILABLE) rejects.
 */
export const checkTimeTrackerDownload = async (): Promise<void> => {
  await AxiosRequest.get("/time-tracking/downloads/time-tracker/check")
}
