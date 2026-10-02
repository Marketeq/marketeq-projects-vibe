import AxiosRequest from ".."

// Stable, append-only backend contract (see backend verification-summary.ts). The
// frontend maps these in src/lib/api/identity-verification-state.ts and never
// re-derives them from statuses, attempts, cooldowns or confirmation age.
export type IdentityVerificationNextAction =
  | "confirm_location"
  | "start_identity"
  | "continue_identity"
  | "await_review"
  | "retry_identity"
  | "wait_for_retry"
  | "reverify_identity"
  | "complete"

export type KycReconcileOutcome = "no_active_session" | "unchanged" | "updated"

export interface IdentityVerificationProfileStatus {
  verifiedHomeCountry: string | null
  detectedCountry: string | null
  detectedRegionState: string | null
  detectedCity: string | null
  timeZone: string | null
  travelClassification: string | null
  declaredDuration: string | null
  travelModeActive: boolean
  identityVerificationStatus: string
  identityRejectionReason: string | null
  locationVerificationStatus: string
  reconfirmationRequired: boolean
  // Append-only summary fields. Optional because only GET /me carries all of them
  // (other endpoints returning this shape omit the ones that need session data,
  // and an older server omits them all). Parsed defensively; never trusted blindly.
  fullyVerified?: boolean
  attemptsUsed?: number
  attemptsRemaining?: number
  maxAttempts?: number
  canRetry?: boolean
  retryAvailableAt?: string | null
  hasActiveSession?: boolean
  nextAction?: IdentityVerificationNextAction
}

export const IdentityVerificationAPI = {
  getMyStatus: () =>
    AxiosRequest.get("/v1/identity-verification/me") as Promise<{
      data: IdentityVerificationProfileStatus
    }>,

  // Display-only location for the verification dialog, resolved server-side
  // with the same effective client IP as confirmHomeCountry below. Returns no
  // IP address. The browser never supplies or influences the IP.
  getDetectedLocation: () =>
    AxiosRequest.get("/v1/identity-verification/detected-location") as Promise<{
      data: {
        countryCode: string | null
        countryName: string | null
        city: string | null
        regionCode: string | null
        regionName: string | null
        latitude: number | null
        longitude: number | null
      }
    }>,

  // Browser geolocation display. Sends ONLY the two coordinates (the server
  // rejects any other field), reverse-geocodes server-side, and compares the
  // place's country with the server-derived IP country. Never returns an IP.
  resolveGpsLocation: (latitude: number, longitude: number) =>
    AxiosRequest.post("/v1/identity-verification/detected-location/coordinates", {
      latitude,
      longitude,
    }) as Promise<{
      data: {
        status: "resolved" | "country_mismatch" | "unavailable"
        countryCode: string | null
        countryName: string | null
        city: string | null
        regionCode: string | null
        regionName: string | null
        latitude: number | null
        longitude: number | null
      }
    }>,

  confirmHomeCountry: () =>
    AxiosRequest.post("/v1/identity-verification/home-country/confirm", null),

  // Real backend VPN/proxy connection check (proxycheck.io-backed,
  // server-side only — see identity-verification-service's
  // VpnProxyCheckGuard). Resolves { data: { ok: true } } on a clean
  // result; a masked or failed check rejects with the matching status
  // code (403 VPN_PROXY_DETECTED / 503 CONNECTION_CHECK_UNAVAILABLE) and
  // error body, handled by the caller — never coerced into a clean pass.
  checkConnection: () =>
    AxiosRequest.get("/v1/identity-verification/connection-check") as Promise<{
      data: { ok: true }
    }>,

  // Backend-owned list of issuing countries that have at least one accepted
  // document type, from the same versioned coverage catalog as
  // accepted-documents below. See src/lib/api/supported-document-countries.ts
  // for response validation.
  getSupportedDocumentCountries: () =>
    AxiosRequest.get("/v1/identity-verification/supported-document-countries") as Promise<{
      data: {
        catalogVersion: string
        countries: { alpha2: string; alpha3: string; name: string }[]
      }
    }>,

  // Backend-owned lookup of which canonical document types are accepted
  // for a given 2-letter issuing country code. See
  // src/lib/api/accepted-documents.ts for response validation and the
  // honest "unavailable" outcome — this client never fabricates a list on
  // failure, it just forwards whatever the backend returns or throws.
  getAcceptedDocuments: (issuingCountry: string) =>
    AxiosRequest.get(
      `/v1/identity-verification/accepted-documents?issuingCountry=${encodeURIComponent(issuingCountry)}`
    ) as Promise<{
      data: { issuingCountry: string; acceptedDocumentTypes: string[] }
    }>,

  // Free KYC: starts (or resumes) the Didit-hosted verification session.
  // Server-side it requires a fresh home-country confirmation and runs the
  // VPN/proxy guard first. Returns only a Didit https URL to redirect to —
  // see src/lib/api/free-kyc.ts, which validates it again before redirecting.
  startFreeKyc: () =>
    AxiosRequest.post("/v1/identity-verification/kyc-sessions", {}) as Promise<{
      data: { url: string }
    }>,

  // Fallback for a lost or delayed Didit webhook: asks the backend to check the
  // CALLER'S OWN stored session with Didit. POST because it may update state; no
  // body and no session id — the server resolves the session itself. Returns only a
  // fixed outcome; re-read the real state from getMyStatus afterwards.
  reconcileKycSession: () =>
    AxiosRequest.post("/v1/identity-verification/kyc-sessions/reconcile", null) as Promise<{
      data: { outcome: KycReconcileOutcome }
    }>,

  // Travel branch — persists what the existing (unchanged) travel UI already
  // shows. Classification must be recorded before duration.
  recordTravelClassification: (
    classification: "temporarily_traveling" | "permanently_relocated"
  ) =>
    AxiosRequest.post("/v1/identity-verification/travel-classification", {
      classification,
    }),

  recordTravelDuration: (
    duration: "a_few_days" | "one_to_two_weeks" | "more_than_two_weeks" | "not_sure"
  ) =>
    AxiosRequest.post("/v1/identity-verification/travel-duration", { duration }),

  // Real R2 presigned-upload-URL request. The actual file bytes are then
  // PUT directly to `uploadUrl` by the caller — never routed through our
  // own backend.
  createDocumentUploadUrl: (fileExtension: string) =>
    AxiosRequest.post("/v1/identity-verification/documents/upload-url", {
      fileExtension,
    }) as Promise<{
      data: { uploadUrl: string; documentImageReference: string; expiresAt: string }
    }>,

  // Stage 1 of the two-stage Didit integration: submits the already-stored
  // image reference(s) to the standalone document-check API and records
  // the result. NOTE: not yet called anywhere in this file — see
  // submit-identity-document.ts's header comment for the exact reason
  // (documentNumber/expirationDate are required by the backend but are
  // not collected by any screen in the current approved UI).
  checkDocumentWithVendor: (documentId: string) =>
    AxiosRequest.post(`/v1/identity-verification/documents/${documentId}/document-check`, null) as Promise<{
      data: { documentId: string; documentCheckStatus: string | null; warnings: unknown[]; checkedAt: string | null }
    }>,

  // Stage 2 — creates/resumes the Didit-hosted biometric session. Backend
  // route is real and tested; no UI calls this yet (the Figma handoff
  // screens for this step haven't been supplied — see the flow component's
  // header note).
  beginBiometricVerification: (documentId: string) =>
    AxiosRequest.post(`/v1/identity-verification/documents/${documentId}/begin-biometric-verification`, null) as Promise<{
      data: { sessionId: string; url: string; resumed: boolean }
    }>,

  getTwoStageStatus: (documentId: string) =>
    AxiosRequest.get(`/v1/identity-verification/documents/${documentId}/two-stage-status`) as Promise<{
      data: {
        documentCheckStatus: string | null
        biometricSessionStatus: string | null
        biometricSessionUrl: string | null
        overallStatus: string
      }
    }>,
}
