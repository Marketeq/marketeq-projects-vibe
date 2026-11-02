// frontend/src/lib/api/location-consent.ts
//
// One pending "approximate location" consent question at a time. It is asked only
// when the browser could not provide a position (permission denied, prompt
// dismissed, timeout, unsupported, or coordinates unavailable) and answers a single
// question: may Marketeq estimate the location from the network connection (the
// existing server-side IP lookup)?
//
// This is NOT the browser's geolocation permission and never touches it. The answer
// applies to the detection attempt that asked and is never stored.
//
//   request()  opens the question; while one is pending, every caller shares it, so
//              a second prompt can never open.
//   decide()   the user's answer; only the first answer counts, so a double click or
//              a click racing a dismissal cannot answer twice.
//   cancel()   the attempt no longer exists (navigation, logout, account switch,
//              unmount): the pending question resolves "cancelled", which callers
//              treat as "show and fetch nothing".

export type LocationConsentAnswer = "allow" | "deny"
export type LocationConsentDecision = LocationConsentAnswer | "cancelled"

export interface LocationConsentGate {
  request(): Promise<LocationConsentDecision>
  decide(answer: LocationConsentAnswer): void
  cancel(): void
  readonly pending: boolean
}

export function createLocationConsentGate(
  onPendingChange?: (pending: boolean) => void
): LocationConsentGate {
  let pending: {
    promise: Promise<LocationConsentDecision>
    settle: (decision: LocationConsentDecision) => void
  } | null = null

  const settle = (decision: LocationConsentDecision) => {
    if (!pending) return
    const current = pending
    pending = null
    current.settle(decision)
    onPendingChange?.(false)
  }

  return {
    request() {
      if (pending) return pending.promise
      let resolve!: (decision: LocationConsentDecision) => void
      const promise = new Promise<LocationConsentDecision>((r) => {
        resolve = r
      })
      pending = { promise, settle: resolve }
      onPendingChange?.(true)
      return promise
    },
    decide(answer) {
      settle(answer)
    },
    cancel() {
      settle("cancelled")
    },
    get pending() {
      return pending !== null
    },
  }
}
