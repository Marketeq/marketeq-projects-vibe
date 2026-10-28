// frontend/src/lib/api/kyc-return-origin.ts
//
// The body of the two Didit session-start requests (kyc-sessions and
// kyc-sessions/home-country-change). It carries one thing: this browser's own origin,
// so the backend can send Didit's callback back to the frontend the user is actually on.
// The shared backend serves several frontends (live, staging, dev) from one FRONTEND_URL
// list; the backend accepts this value only if it exactly matches one of them, and never
// uses it as a URL. Nothing about the user, country or session is sent.
export function kycReturnOriginBody(
  win: { location: { origin: string } } | undefined = typeof window ===
  "undefined"
    ? undefined
    : window
): { returnOrigin?: string } {
  const origin = win?.location?.origin
  return typeof origin === "string" && origin !== "" && origin !== "null"
    ? { returnOrigin: origin }
    : {}
}
