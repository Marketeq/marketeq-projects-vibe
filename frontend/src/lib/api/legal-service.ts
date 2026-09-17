/**
 * Legal Service API client.
 *
 * Follows the same pattern as src/lib/api/contracts.ts:
 * - Reads access_token from cookie
 * - Uses NEXT_PUBLIC_LEGAL_SERVICE_URL env var (default: http://localhost:3015)
 * - Throws an Error with .status and .code properties on non-ok responses
 *   so callers can map HTTP status codes to UI error states
 */
import Cookies from "js-cookie"

const LEGAL_SERVICE_URL =
  process.env.NEXT_PUBLIC_LEGAL_SERVICE_URL ?? "http://localhost:3015"

/**
 * Dev seed user ID for local testing without a real login session.
 * The backend JwtAuthGuard accepts x-user-id as a trusted header when
 * set by the API gateway. In local dev, no gateway is running so we
 * send it directly. This is only used when no access_token cookie exists.
 *
 * clientA seed user owns the test NDA document (ec9586d9-...).
 * For signing tests, use talentA (11111111-...) as the signer.
 */
const DEV_SIGNER_USER_ID =
  process.env.NEXT_PUBLIC_DEV_NDA_USER_ID ??
  "11111111-1111-4111-a111-111111111111"

function authHeaders(): HeadersInit {
  const token = Cookies.get("access_token")
  const isDev = process.env.NODE_ENV !== "production"

  return {
    "Content-Type": "application/json",
    // Production: use JWT Bearer token from cookie
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    // Dev fallback: send x-user-id when no JWT exists so local testing
    // works without needing to go through the full auth flow.
    // The backend JwtAuthGuard accepts x-user-id from trusted callers.
    ...(!token && isDev ? { "x-user-id": DEV_SIGNER_USER_ID } : {}),
  }
}

// ─── Error shape ─────────────────────────────────────────────────────────────

export interface LegalServiceError extends Error {
  status: number
  code?: string
}

async function parseError(res: Response): Promise<LegalServiceError> {
  let body: Record<string, unknown> = {}
  try {
    body = await res.json()
  } catch {
    // ignore parse failure
  }
  const msg = (body.message as string | undefined) ?? `HTTP ${res.status}`
  const err = new Error(msg) as LegalServiceError
  err.status = res.status
  err.code =
    (body.code as string | undefined) ?? (body.error as string | undefined)
  return err
}

// ─── NDA Preview ─────────────────────────────────────────────────────────────

export interface NdaPreviewResponse {
  pdfUrl: string | null
}

/**
 * GET /v1/nda/:id/preview
 * Returns a 1-hour presigned R2 URL for the unsigned NDA PDF.
 * Never store pdfUrl in persistent storage — always call fresh.
 */
export async function fetchNdaPreview(
  documentId: string
): Promise<NdaPreviewResponse> {
  const res = await fetch(`${LEGAL_SERVICE_URL}/v1/nda/${documentId}/preview`, {
    headers: authHeaders(),
    credentials: "include",
  })
  if (!res.ok) throw await parseError(res)
  return res.json() as Promise<NdaPreviewResponse>
}

// ─── NDA Status ──────────────────────────────────────────────────────────────

export interface NdaStatusResponse {
  id: string
  status: "generated" | "signed" | "voided"
  pdfUrl: string | null
  signedPdfUrl: string | null // fresh presigned URL — generated on every request, never expires
  documentType: string
  jobListingId: string
  generatedAt: string
  voidedAt: string | null
}

/**
 * GET /v1/nda/:id
 * Returns the full NDA document record including current status.
 * Used on page load to determine whether to show unsigned/signed/voided state.
 */
export async function fetchNdaStatus(
  documentId: string
): Promise<NdaStatusResponse> {
  const res = await fetch(`${LEGAL_SERVICE_URL}/v1/nda/${documentId}`, {
    headers: authHeaders(),
    credentials: "include",
  })
  if (!res.ok) throw await parseError(res)
  return res.json() as Promise<NdaStatusResponse>
}

// ─── NDA Sign ────────────────────────────────────────────────────────────────

export interface SignNdaPayload {
  typedName: string
  signingMethod: "typed" | "drawn" | "uploaded_signature"
  consentCheckboxChecked: true
  jobListingId: string
  initials?: string
}

export interface SignNdaResponse {
  eventId: string
  signedPdfUrl: string | null
}

/**
 * POST /v1/nda/:id/sign
 * Submits the signing payload. On success returns the signed PDF presigned URL.
 *
 * Error codes from backend:
 *   422 + LS_NAME_NO_MATCH   — typed name doesn't match registered name
 *   423 + LS_SIGNING_LOCKED  — too many failed name attempts (6th+)
 *   429 + LS_RATE_LIMIT_EXCEEDED — rate limit (5/user/min)
 *   409                       — already signed
 *   410                       — NDA voided
 *   401                       — auth expired
 *   403                       — forbidden
 */
export async function submitNdaSign(
  documentId: string,
  payload: SignNdaPayload
): Promise<SignNdaResponse> {
  const res = await fetch(`${LEGAL_SERVICE_URL}/v1/nda/${documentId}/sign`, {
    method: "POST",
    headers: authHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw await parseError(res)
  return res.json() as Promise<SignNdaResponse>
}

// ─── NDA Audit Trail ─────────────────────────────────────────────────────────

export interface NdaSigningEventSummary {
  id: string
  signerUserId: string
  signerTypedName: string
  signerUsername: string
  nameMatchStatus: string
  signingMethod: string
  signedAtUtc: string
  signedPdfR2Key: string | null
}

export interface NdaAuditResponse {
  id: string
  status: string
  signingEvents: NdaSigningEventSummary[]
}

/**
 * GET /v1/nda/:id/audit
 * Returns the audit trail including all signing events with signer names.
 * Used on page load (after refresh) to restore the signed name in the overlay
 * when React state has been reset.
 */
export async function fetchNdaAudit(
  documentId: string
): Promise<NdaAuditResponse> {
  const res = await fetch(`${LEGAL_SERVICE_URL}/v1/nda/${documentId}/audit`, {
    headers: authHeaders(),
    credentials: "include",
  })
  if (!res.ok) throw await parseError(res)
  return res.json() as Promise<NdaAuditResponse>
}
