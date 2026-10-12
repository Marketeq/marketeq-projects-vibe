// frontend/src/lib/api/supported-document-countries.ts
//
// Real backend integration: identity-verification-service's
// GET /v1/identity-verification/supported-document-countries — the issuing
// countries that have at least one accepted document type, straight from the
// same versioned coverage catalog that answers accepted-documents. Nothing
// here is a hard-coded country list.
//
// Two distinct outcomes, never collapsed (same discipline as
// accepted-documents.ts): a real list, or unavailable: true when the lookup
// itself failed or the body is structurally wrong. A failure is never
// papered over with an invented list.
import { IdentityVerificationAPI } from "@/service/http/identity-verification"

export interface SupportedDocumentCountry {
  alpha2: string
  alpha3: string
  name: string
}

export interface SupportedDocumentCountriesResult {
  countries: SupportedDocumentCountry[]
  unavailable: boolean
}

const UNAVAILABLE_RESULT: SupportedDocumentCountriesResult = {
  countries: [],
  unavailable: true,
}

function isValidCountry(value: unknown): value is SupportedDocumentCountry {
  if (!value || typeof value !== "object") return false
  const country = value as Record<string, unknown>
  return (
    typeof country.alpha2 === "string" &&
    /^[A-Z]{2}$/.test(country.alpha2) &&
    typeof country.alpha3 === "string" &&
    /^[A-Z]{3}$/.test(country.alpha3) &&
    typeof country.name === "string" &&
    country.name.length > 0
  )
}

export async function getSupportedDocumentCountries(): Promise<SupportedDocumentCountriesResult> {
  let response: { data: unknown }
  try {
    response = await IdentityVerificationAPI.getSupportedDocumentCountries()
  } catch {
    return UNAVAILABLE_RESULT
  }

  const body = response.data as { countries?: unknown } | null
  if (!body || !Array.isArray(body.countries) || !body.countries.every(isValidCountry)) {
    return UNAVAILABLE_RESULT
  }

  return { countries: body.countries as SupportedDocumentCountry[], unavailable: false }
}
