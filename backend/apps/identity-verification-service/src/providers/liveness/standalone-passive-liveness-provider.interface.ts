// Types for Didit's STANDALONE Passive Liveness API
// (POST /v3/passive-liveness/ on https://verification.didit.me), verified
// directly against Didit's live OpenAPI spec (fetched and parsed
// 2026-09-24 — re-confirmed byte-identical against a fresh fetch before
// writing this file). A SEPARATE vendor call from ID verification and
// from Face Match — see this repo's Decision Record §1.2: "Authenticated"
// depth requires face match WITH liveness as distinct signals. Nothing
// here shares a result type with either of the other two adapters.
//
// Scope note: this reports a LIVENESS result only — whether the submitted
// face image shows a live person rather than a spoof (printed photo,
// screen replay, mask, deepfake), plus incidental blocklist/duplicate
// screening. It says nothing about document authenticity or whether the
// face matches a reference image (that is Face Match's job). Per this
// project's standing rule, no single standalone check may finalize
// overall identity verification.
//
// Vendor-side data note (documented, not this file's decision): when
// `saveApiRequest` is true, Didit does more than persist a session — it
// ENROLLS the detected face into the calling application's face search
// index for future blocklist/duplicate matching. This is a materially
// bigger vendor-side data footprint than the other two standalone
// endpoints' `saveApiRequest=true`, and should be weighed accordingly
// wherever this adapter is eventually wired in.

export interface FaceImageInput {
  bytes: Buffer;
  /** Must map to one of Didit's allowed extensions for this endpoint
   * (tiff/jpg/jpeg/png/webp — no PDF). */
  contentType: string;
}

export interface PassiveLivenessCheckInput {
  /** Required — Didit's `user_image`. A single subject; if several faces
   * are present the largest is evaluated and a MULTIPLE_FACES_DETECTED
   * warning is added (does not itself decline). */
  userImage: FaceImageInput;
  /**
   * Required, no default — see this file's header note on why
   * `saveApiRequest=true` here is a bigger decision than for the other
   * two adapters (face enrollment, not just session persistence).
   */
  saveApiRequest: boolean;
  /** Didit default `30` when omitted (0-100). */
  faceLivenessScoreDeclineThreshold?: number;
  /** Didit default `false` when omitted. */
  rotateImage?: boolean;
  /** Opaque correlation id. Also affects vendor-side screening: prior
   * sessions with the same `vendorData` are excluded from the duplicate-
   * face check, so re-verifying the same user does not raise
   * `DUPLICATED_FACE` — a behavioral effect, not just a label. */
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

export interface PassiveLivenessWarning {
  /** Machine-readable risk code: `NO_FACE_DETECTED`, `LOW_LIVENESS_SCORE`,
   * `LIVENESS_FACE_ATTACK`, `MULTIPLE_FACES_DETECTED`,
   * `FACE_IN_BLOCKLIST`, `POSSIBLE_FACE_IN_BLOCKLIST`,
   * `DUPLICATED_FACE`, `POSSIBLE_DUPLICATED_FACE`. */
  risk: string;
  /** Always `'LIVENESS'` on this endpoint. */
  feature: 'LIVENESS';
  logType: 'error' | 'warning' | 'information';
  shortDescription: string;
  longDescription: string;
  /** Blocklist/duplicate hits carry
   * `{blocklisted_session_id|duplicated_session_id, ...}`; `null` for
   * most other warnings. */
  additionalData: Record<string, unknown> | null;
}

export interface PassiveLivenessResult {
  requestId: string;
  /** `'Declined'` when at least one `error`-severity warning fired (no
   * face, low score, presentation attack, or a blocklist hit).
   * This is a LIVENESS result only — see this file's header note on
   * scope. */
  status: 'Approved' | 'Declined';
  /** Always `'PASSIVE'` on this endpoint. */
  method: 'PASSIVE';
  score: number | null;
  faceQuality: number | null;
  faceLuminance: number | null;
  userImageDetection: FaceDetectionResult | null;
  warnings: PassiveLivenessWarning[];
  vendorData: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  /** Full, unmodified parsed JSON body. Never log this wholesale. */
  raw: Record<string, unknown>;
}

export interface StandalonePassiveLivenessProvider {
  checkLiveness(input: PassiveLivenessCheckInput): Promise<PassiveLivenessResult>;
}

export const STANDALONE_PASSIVE_LIVENESS_PROVIDER = Symbol('STANDALONE_PASSIVE_LIVENESS_PROVIDER');
