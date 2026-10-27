// frontend/src/lib/api/start-verification-handoff.ts
//
// One-shot hand-off from the Job Apply blocked modal ("Start Verification") to the
// talent dashboard. The Identity Verification flow lives only on the dashboard, so the
// modal navigates here and the dashboard runs its own "Verify My Account" action once,
// as if the talent had clicked it. Pure: no UI, no network, no storage.
export const START_VERIFICATION_PARAM = "startVerification"
export const START_VERIFICATION_HREF = `/talent-dashboard?${START_VERIFICATION_PARAM}=1`

/** True only for the exact marker this module's href writes. */
export function isStartVerificationRequested(search: string): boolean {
  return new URLSearchParams(search).get(START_VERIFICATION_PARAM) === "1"
}
