// frontend/src/lib/api/accepted-documents.ts
//
// Real backend integration: identity-verification-service's
// GET /v1/identity-verification/accepted-documents?issuingCountry=<code>
// tells us which of our canonical document types (passport, id_card,
// drivers_licence, residence_permit) Didit accepts for that country. See
// that endpoint's own DocumentCoverageProvider interface doc comment for
// why it currently always reports "unavailable": Didit publishes no
// confirmed, supported API for this, verified 2026-09-24 — this client is
// written against the real, shipped contract either way, so wiring in a
// real data source later needs no change here.
//
// Three distinct outcomes, never collapsed into one another (same
// discipline as detected-location.ts):
//   1. A real list — including a genuinely empty one, which means "Didit
//      accepts none of our document types for this country," not a
//      failure.
//   2. unavailable: true — the lookup itself failed (network error,
//      malformed response, backend 503) — never presented as if it were
//      case 1's empty list, and never papered over with an invented list
//      of "all 4 types" or any other guess.
import { IdentityVerificationAPI } from "@/service/http/identity-verification"

export type AcceptedDocumentTypeId =
  | "passport"
  | "id_card"
  | "drivers_licence"
  | "residence_permit"

export interface AcceptedDocumentsResult {
  acceptedDocumentTypes: AcceptedDocumentTypeId[]
  unavailable: boolean
}

const VALID_DOCUMENT_TYPE_IDS: readonly AcceptedDocumentTypeId[] = [
  "passport",
  "id_card",
  "drivers_licence",
  "residence_permit",
]

const UNAVAILABLE_RESULT: AcceptedDocumentsResult = {
  acceptedDocumentTypes: [],
  unavailable: true,
}

// Content validation, distinct from axios/JSON-parse succeeding — same
// discipline as detected-location.ts's isValidIpLocationResolution: a 200
// can still carry a structurally wrong body, and this list directly drives
// which document cards render, so shape is checked before anything here is
// trusted.
function isValidAcceptedDocumentsResponse(
  value: unknown
): value is { issuingCountry: string; acceptedDocumentTypes: string[] } {
  if (!value || typeof value !== "object") return false
  const body = value as Record<string, unknown>
  if (typeof body.issuingCountry !== "string") return false
  if (!Array.isArray(body.acceptedDocumentTypes)) return false
  return body.acceptedDocumentTypes.every(
    (entry) =>
      typeof entry === "string" &&
      (VALID_DOCUMENT_TYPE_IDS as readonly string[]).includes(entry)
  )
}

export async function getAcceptedDocuments(
  issuingCountryCode: string
): Promise<AcceptedDocumentsResult> {
  let response: { data: unknown }
  try {
    response = await IdentityVerificationAPI.getAcceptedDocuments(issuingCountryCode)
  } catch {
    return UNAVAILABLE_RESULT
  }

  if (!isValidAcceptedDocumentsResponse(response.data)) {
    return UNAVAILABLE_RESULT
  }

  return {
    acceptedDocumentTypes: response.data.acceptedDocumentTypes as AcceptedDocumentTypeId[],
    unavailable: false,
  }
}
