// Types for Didit's STANDALONE Face Match API
// (POST /v3/face-match/ on https://verification.didit.me), verified
// directly against Didit's live OpenAPI spec (fetched and parsed
// 2026-09-24 — re-confirmed byte-identical against a fresh fetch before
// writing this file). This is a SEPARATE vendor call from ID verification
// (POST /v3/id-verification/) and from Passive Liveness
// (POST /v3/passive-liveness/) — see this repo's Decision Record §1.2:
// "Authenticated" verification depth requires document checks PLUS face
// match with liveness, as genuinely distinct checks, not one combined
// call. Nothing here shares a result type with either of those.
//
// Scope note: this reports a FACE-MATCH result only — whether two face
// images depict the same person. It says nothing about document
// authenticity or whether the submitted face is a live person (that is
// Passive Liveness's job). Per this project's standing rule, no single
// standalone check may finalize overall identity verification.

export interface FaceImageInput {
  /** Raw image bytes. Caller-supplied — this adapter does not fetch bytes
   * from storage itself. */
  bytes: Buffer;
  /** MIME type of `bytes`. Must map to one of Didit's allowed extensions
   * for this endpoint (tiff/jpg/jpeg/png/webp — no PDF, unlike
   * ID verification). Anything else is rejected locally, before any
   * network call, as UnusableFaceImageError. */
  contentType: string;
}

export interface FaceMatchCheckInput {
  /** Required — Didit's `user_image`. The live/candidate face (e.g. a
   * fresh selfie capture). */
  userImage: FaceImageInput;
  /** Required — Didit's `ref_image`. The reference face to compare
   * against (e.g. the `portraitImage` a prior ID-verification check
   * returned, or a previously enrolled photo). Linking these two calls
   * together is this service's own responsibility — Didit does not
   * associate standalone calls with each other. */
  refImage: FaceImageInput;
  /**
   * Required, no default. Didit's own default is `true`; this adapter
   * does not silently inherit that. `true` persists the call as a
   * session (Business Console, `status.updated` webhook, both images
   * stored); `false` is one-shot and unrecoverable if the response is
   * lost — see the standalone document-check adapter's equivalent note
   * for the same tradeoff.
   */
  saveApiRequest: boolean;
  /** Didit default `30` when omitted (0-100, permissive). A score
   * strictly above this returns Approved. */
  faceMatchScoreDeclineThreshold?: number;
  /** Didit default `false` when omitted. */
  rotateImage?: boolean;
  /** Opaque correlation id — never send PII here. */
  vendorData?: string;
  metadata?: Record<string, unknown>;
}

export interface FaceDetectionEntity {
  bbox: [number, number, number, number];
  confidence: number;
  age: number | null;
  gender: string | null;
}

export interface FaceDetectionResult {
  entities: FaceDetectionEntity[];
  bestAngle: number | null;
}

export interface FaceMatchWarning {
  /** Machine-readable risk code: `NO_REFERENCE_IMAGE` or
   * `LOW_FACE_MATCH_SIMILARITY` on this endpoint. */
  risk: string;
  /** Always `'FACEMATCH'` on this endpoint. */
  feature: 'FACEMATCH';
  logType: 'error' | 'warning' | 'information';
  shortDescription: string;
  longDescription: string;
  additionalData: Record<string, unknown> | null;
}

export interface FaceMatchResult {
  /** Persisted session id when `saveApiRequest` was true; a transient
   * correlation UUID otherwise. */
  requestId: string;
  /** `'Approved'` when the similarity score is strictly above the
   * decline threshold and a score could be computed. This is a
   * FACE-MATCH result only — see this file's header note on scope. */
  status: 'Approved' | 'Declined';
  /** 0-100 similarity score, or `null` when no face pair could be
   * scored at all (a `NO_REFERENCE_IMAGE` warning always accompanies a
   * `null` score). */
  score: number | null;
  userImageDetection: FaceDetectionResult | null;
  refImageDetection: FaceDetectionResult | null;
  warnings: FaceMatchWarning[];
  vendorData: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  /** Full, unmodified parsed JSON body. Never log this wholesale. */
  raw: Record<string, unknown>;
}

export interface StandaloneFaceMatchProvider {
  checkFaceMatch(input: FaceMatchCheckInput): Promise<FaceMatchResult>;
}

export const STANDALONE_FACE_MATCH_PROVIDER = Symbol('STANDALONE_FACE_MATCH_PROVIDER');
