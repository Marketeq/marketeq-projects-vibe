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
}
