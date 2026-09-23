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
}
