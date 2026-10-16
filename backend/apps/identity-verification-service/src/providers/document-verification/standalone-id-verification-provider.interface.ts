// Types for the Didit STANDALONE ID-verification API
// (POST /v3/id-verification/ on https://verification.didit.me), verified
// directly against Didit's live OpenAPI spec (docs.didit.me/openapi-25.json,
// fetched and parsed 2026-09-24 — not assumed, not carried over from an
// earlier paraphrase) plus docs.didit.me/integration/webhooks for the
// adjacent webhook contract (not used by this file, noted for context only).
//
// This is a SEPARATE contract from DocumentVerificationProvider in
// document-verification-provider.interface.ts, which models Didit's hosted
// Sessions API (POST /v1/sessions, returns a redirect vendorSessionUrl).
// That interface and its existing callers (identity-verification.service.ts,
// its spec, app.module.ts's DI binding) are UNCHANGED by this file — this is
// an additive, disconnected adapter, not a replacement. See the provider
// implementation file's header for why the two contracts can't share one
// interface: one is a redirect handshake, the other is a synchronous
// decision with an entirely different request/response shape.

export interface DocumentImageInput {
  /** Raw image/PDF bytes. Caller-supplied — this adapter does not fetch
   * bytes from storage itself (orchestration decides how images get here). */
  bytes: Buffer;
  /** MIME type of `bytes`. Must map to one of Didit's allowed extensions
   * (tiff/jpg/jpeg/png/webp/pdf) — see CONTENT_TYPE_EXTENSION in the
   * provider file. Anything else is rejected locally, before any network
   * call, as UnreadableDocumentImageError. */
  contentType: string;
  /** Required only when `bytes` is an encrypted PDF — maps to Didit's
   * `front_image_password`/`back_image_password`. */
  password?: string;
}

export type DiditActionDecision = 'NO_ACTION' | 'DECLINE';

export interface StandaloneIdVerificationCheckInput {
  /** Required — Didit's `front_image`. */
  frontImage: DocumentImageInput;
  /** Optional — Didit's `back_image`. Many document types carry no back
   * side; omitting this simply leaves back-side fields `null` in the
   * result, per Didit's own documented behavior (no warning is raised). */
  backImage?: DocumentImageInput;
  /**
   * Required, no default. Didit's own default is `true`, but this adapter
   * does not silently inherit that — the caller (orchestration) must decide
   * whether this call gets persisted to Didit's Business Console and
   * triggers a `status.updated` webhook (`true`), or is fully transient
   * with images returned inline as base64 instead of media URLs (`false`).
   */
  saveApiRequest: boolean;
  /** Opaque correlation id (e.g. our own documentId) — never send PII here.
   * Echoed back on the result, stored on the Didit session when
   * `saveApiRequest` is true. */
  vendorData?: string;
  /** Arbitrary JSON stored alongside the session when `saveApiRequest` is
   * true and echoed back on the result. */
  metadata?: Record<string, unknown>;
  /** Didit default `true` when omitted — screens for screen-replay,
   * printed-copy, and portrait-manipulation fraud. */
  performDocumentLiveness?: boolean;
  /** Didit default `DECLINE` when omitted. */
  invalidMrzAction?: DiditActionDecision;
  /** Didit default `DECLINE` when omitted. */
  inconsistentDataAction?: DiditActionDecision;
  /** Didit default `NO_ACTION` when omitted (many documents print no
   * expiry date at all). */
  expirationDateNotDetectedAction?: DiditActionDecision;
  /** Didit default `DECLINE` when omitted. */
  criticalFieldOcclusionAction?: DiditActionDecision;
  /** Didit default `NO_ACTION` when omitted. */
  documentOrPersonalNumberFormatMismatchAction?: DiditActionDecision;
  /** Didit default `'latin'` when omitted. */
  preferredCharacters?: 'latin' | 'non_latin';
}

export interface DocumentImageQualityScore {
  focusScore: number;
  brightnessScore: number;
  brightnessIssue: string;
  isDocumentFullyVisible: boolean;
  resolutionScore: number;
  overallScore: number;
}

// Matches the real `warnings[]` item shape exactly (verified against the
// spec's schema, not just its examples) — an array of structured objects,
// not an array of strings.
export interface DocumentCheckWarning {
  /** Machine-readable risk code, e.g. `DOCUMENT_EXPIRED`,
   * `MRZ_VALIDATION_FAILED`, `POSSIBLE_DUPLICATED_USER`. */
  risk: string;
  /** Always `'ID_VERIFICATION'` on this endpoint. */
  feature: 'ID_VERIFICATION';
  /** `'error'` warnings drive `status` to `Declined`; `'information'`
   * entries are advisory only. (`'warning'` is not produced by this
   * endpoint.) */
  logType: 'error' | 'warning' | 'information';
  shortDescription: string;
  longDescription: string;
  additionalData: Record<string, unknown> | null;
}

export interface DocumentMrzData {
  documentNumber: string | null;
  documentType: string | null;
  country: string | null;
  nationality: string | null;
  birthDate: string | null;
  expiryDate: string | null;
  sex: string | null;
  mrzType: string | null;
  mrzString: string | null;
  warnings: string[];
  errors: string[];
}

// A subset of Didit's real `id_verification` response fields — the ones
// this adapter's known/likely callers need. Everything else Didit returns
// is preserved unmapped on `raw` rather than silently dropped.
export interface DocumentCheckResult {
  /** Persisted session id when `saveApiRequest` was true (usable with
   * `GET /v3/session/{sessionId}/decision/`); a transient correlation UUID
   * otherwise. */
  requestId: string;
  /** `'Approved'` unless at least one warning resolves to a decline. This
   * is a DOCUMENT-CHECK result only — see this file's header note on scope:
   * it is not the same thing as overall identity-verification status. */
  status: 'Approved' | 'Declined';
  documentType: string | null;
  documentSubtype: string | null;
  documentNumber: string | null;
  personalNumber: string | null;
  /** Media URL (saveApiRequest=true) or inline base64 JPEG
   * (saveApiRequest=false). Never logged — see the provider file. */
  portraitImage: string | null;
  frontImage: string | null;
  backImage: string | null;
  frontImageQualityScore: DocumentImageQualityScore | null;
  backImageQualityScore: DocumentImageQualityScore | null;
  dateOfBirth: string | null;
  age: number | null;
  expirationDate: string | null;
  dateOfIssue: string | null;
  issuingState: string | null;
  issuingStateName: string | null;
  fullName: string | null;
  nationality: string | null;
  mrz: DocumentMrzData | null;
  warnings: DocumentCheckWarning[];
  vendorData: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  /** The full, unmodified parsed JSON body, for anything not mapped above
   * and for audit purposes. Never log this wholesale — it can contain
   * extracted document fields. */
  raw: Record<string, unknown>;
}

export interface StandaloneIdVerificationProvider {
  checkDocument(input: StandaloneIdVerificationCheckInput): Promise<DocumentCheckResult>;
}

export const STANDALONE_ID_VERIFICATION_PROVIDER = Symbol('STANDALONE_ID_VERIFICATION_PROVIDER');
