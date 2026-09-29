import AxiosRequest from ".."

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
}

export const IdentityVerificationAPI = {
  getMyStatus: () =>
    AxiosRequest.get("/v1/identity-verification/me") as Promise<{
      data: IdentityVerificationProfileStatus
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
