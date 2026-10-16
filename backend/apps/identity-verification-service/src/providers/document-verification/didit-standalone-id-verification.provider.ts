import { Injectable } from '@nestjs/common';
import {
  DocumentCheckResult,
  DocumentCheckWarning,
  DocumentImageInput,
  DocumentImageQualityScore,
  DocumentMrzData,
  StandaloneIdVerificationCheckInput,
  StandaloneIdVerificationProvider,
} from './standalone-id-verification-provider.interface';
import {
  AmbiguousVendorOutcomeError,
  MalformedVendorResponseError,
  UnreadableDocumentImageError,
  VendorAuthOrCreditError,
  VendorRateLimitedError,
  VendorTransportError,
} from './standalone-id-verification.errors';

// Adapter for Didit's STANDALONE ID-verification API
// (POST https://verification.didit.me/v3/id-verification/), verified
// directly against Didit's live OpenAPI spec (fetched and parsed
// 2026-09-24 — request/response shape, error shapes, headers, and limits
// below are all read from that spec, not assumed).
//
// NOT WIRED IN. Nothing in app.module.ts, identity-verification.service.ts,
// or any controller references this class or STANDALONE_ID_VERIFICATION_PROVIDER
// yet — it exists as a separate, independently testable unit. The existing
// DocumentVerificationProvider / DiditDocumentVerificationProvider (hosted
// Sessions API, /v1/sessions) remain the live, DI-bound implementation,
// completely untouched by this file. Wiring this in — deciding how its
// synchronous result becomes a persisted attempt/status, and retiring the
// old hosted-session code path — is a deliberately separate follow-up task.
//
// Scope note: this adapter reports a DOCUMENT-CHECK result only (Didit's
// per-image Approved/Declined + warnings). It does not update
// IdentityVerificationProfile.identityVerificationStatus, does not touch
// VerificationAttempt/pending-session rows, and does not consume one of the
// three user-facing retry attempts — all of that is an orchestration
// decision for whatever eventually calls this adapter, not this adapter's
// job.
//
// Security note: never log `apiKey`, `bytes` (raw image data), or any
// extracted personal field (name, DOB, document number, address, MRZ,
// portrait image). This file contains no logging calls at all, by design —
// the safest way to guarantee that invariant is to not have a logger to
// misuse. Callers that do log should log only `requestId`/`status`/`risk`
// codes, never `raw` or the extracted-field properties.
@Injectable()
export class DiditStandaloneIdVerificationProvider implements StandaloneIdVerificationProvider {
  private readonly baseUrl = process.env.DIDIT_API_BASE_URL || 'https://verification.didit.me';
  private readonly apiKey = process.env.DIDIT_API_KEY;

  // Didit's documented allowed extensions for front_image/back_image.
  // Anything else is rejected locally as UnreadableDocumentImageError,
  // before any network call — this mirrors Didit's own documented
  // constraint, it does not invent a new one.
  private static readonly CONTENT_TYPE_EXTENSION: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/tiff': 'tiff',
    'application/pdf': 'pdf',
  };

  // Didit's documented per-image size limit (10 MB); checked locally so an
  // oversized image never wastes a network call or a billed credit.
  private static readonly MAX_IMAGE_BYTES = 10 * 1024 * 1024;

  // Bounds how long a "slow" call can stay pending before this adapter
  // forcibly aborts it. Not vendor-documented — Didit's standalone
  // document-check is described as synchronous, so 30s is a generous
  // margin, not a measured SLA. Load-bearing for
  // TwoStageVerificationService's attempt-reservation TTL: that TTL
  // (RESERVATION_TTL_MS, currently 2 minutes) is only a valid signal of
  // "this reservation's operation must have already settled or the
  // process crashed" if the operation itself cannot stay pending longer
  // than this timeout without either succeeding, receiving an error
  // response, or being aborted into an AmbiguousVendorOutcomeError below.
  // If this value ever changes, RESERVATION_TTL_MS must stay comfortably
  // larger than it.
  private static readonly FETCH_TIMEOUT_MS = 30 * 1000;

  async checkDocument(input: StandaloneIdVerificationCheckInput): Promise<DocumentCheckResult> {
    this.validateImage(input.frontImage, 'front_image');
    if (input.backImage) this.validateImage(input.backImage, 'back_image');

    const form = this.buildForm(input);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/v3/id-verification/`, {
        method: 'POST',
        headers: { 'x-api-key': this.apiKey as string },
        body: form,
        signal: AbortSignal.timeout(DiditStandaloneIdVerificationProvider.FETCH_TIMEOUT_MS),
      });
    } catch (cause) {
      // No response was ever received — either a genuine network failure
      // or our own timeout above aborting a stuck connection. Either way,
      // we have no evidence Didit did NOT receive and process the
      // request (save_api_request=true would persist it vendor-side even
      // if we never saw the reply) — never conflate this with a
      // confirmed, safe-to-retry-freely failure.
      throw new AmbiguousVendorOutcomeError(cause);
    }

    if (response.status === 400) {
      const body = await this.safeJson(response);
      throw new UnreadableDocumentImageError(this.describeValidationFailure(body), body);
    }

    if (response.status === 403) {
      const body = await this.safeJson(response);
      // Verified against the live spec: credit shortfalls use an `error`
      // key, auth failures use a `detail` key — this is the only signal
      // that distinguishes them, both return the same HTTP status.
      const reason: 'invalid_api_key' | 'insufficient_credits' =
        this.isRecord(body) && 'error' in body ? 'insufficient_credits' : 'invalid_api_key';
      throw new VendorAuthOrCreditError(reason, body);
    }

    if (response.status === 429) {
      const retryAfterHeader = response.headers.get('retry-after');
      const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : undefined;
      throw new VendorRateLimitedError(
        Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined,
      );
    }

    if (!response.ok) {
      throw new VendorTransportError(new Error(`Unexpected Didit status ${response.status}`));
    }

    const body = await this.safeJson(response);
    return this.mapResponse(body);
  }

  private validateImage(image: DocumentImageInput, field: 'front_image' | 'back_image'): void {
    if (!image.bytes || image.bytes.length === 0) {
      throw new UnreadableDocumentImageError(`${field}_empty`);
    }
    if (image.bytes.length > DiditStandaloneIdVerificationProvider.MAX_IMAGE_BYTES) {
      throw new UnreadableDocumentImageError(`${field}_too_large`);
    }
    if (!DiditStandaloneIdVerificationProvider.CONTENT_TYPE_EXTENSION[image.contentType]) {
      throw new UnreadableDocumentImageError(`${field}_unsupported_content_type`);
    }
  }

  private extensionFor(image: DocumentImageInput): string {
    return DiditStandaloneIdVerificationProvider.CONTENT_TYPE_EXTENSION[image.contentType];
  }

  private buildForm(input: StandaloneIdVerificationCheckInput): FormData {
    const form = new FormData();
    form.append(
      'front_image',
      new Blob([new Uint8Array(input.frontImage.bytes)], { type: input.frontImage.contentType }),
      `front_image.${this.extensionFor(input.frontImage)}`,
    );
    if (input.frontImage.password) {
      form.append('front_image_password', input.frontImage.password);
    }
    if (input.backImage) {
      form.append(
        'back_image',
        new Blob([new Uint8Array(input.backImage.bytes)], { type: input.backImage.contentType }),
        `back_image.${this.extensionFor(input.backImage)}`,
      );
      if (input.backImage.password) {
        form.append('back_image_password', input.backImage.password);
      }
    }

    // Required, explicit — never defaulted by this adapter (see the
    // interface file's doc comment on this field).
    form.append('save_api_request', String(input.saveApiRequest));

    if (input.vendorData) form.append('vendor_data', input.vendorData);
    if (input.metadata) form.append('metadata', JSON.stringify(input.metadata));
    if (input.performDocumentLiveness !== undefined) {
      form.append('perform_document_liveness', String(input.performDocumentLiveness));
    }
    if (input.invalidMrzAction) form.append('invalid_mrz_action', input.invalidMrzAction);
    if (input.inconsistentDataAction) {
      form.append('inconsistent_data_action', input.inconsistentDataAction);
    }
    if (input.expirationDateNotDetectedAction) {
      form.append('expiration_date_not_detected_action', input.expirationDateNotDetectedAction);
    }
    if (input.criticalFieldOcclusionAction) {
      form.append('critical_field_occlusion_action', input.criticalFieldOcclusionAction);
    }
    if (input.documentOrPersonalNumberFormatMismatchAction) {
      form.append(
        'document_or_personal_number_format_mismatch_action',
        input.documentOrPersonalNumberFormatMismatchAction,
      );
    }
    if (input.preferredCharacters) form.append('preferred_characters', input.preferredCharacters);

    return form;
  }

  private describeValidationFailure(body: unknown): string {
    if (this.isRecord(body) && body.error === 'COULD_NOT_RECOGNIZE_DOCUMENT') {
      return 'could_not_recognize_document';
    }
    return 'validation_failed';
  }

  private async safeJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      throw new MalformedVendorResponseError('non_json_body');
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private mapResponse(body: unknown): DocumentCheckResult {
    if (!this.isRecord(body)) {
      throw new MalformedVendorResponseError('body_not_an_object');
    }
    const requestId = body.request_id;
    const verification = body.id_verification;
    if (typeof requestId !== 'string' || !this.isRecord(verification)) {
      throw new MalformedVendorResponseError('missing_request_id_or_id_verification');
    }
    const status = verification.status;
    if (status !== 'Approved' && status !== 'Declined') {
      throw new MalformedVendorResponseError('unrecognized_status');
    }

    return {
      requestId,
      status,
      documentType: this.nullableString(verification.document_type),
      documentSubtype: this.nullableString(verification.document_subtype),
      documentNumber: this.nullableString(verification.document_number),
      personalNumber: this.nullableString(verification.personal_number),
      portraitImage: this.nullableString(verification.portrait_image),
      frontImage: this.nullableString(verification.front_image),
      backImage: this.nullableString(verification.back_image),
      frontImageQualityScore: this.mapQualityScore(verification.front_image_quality_score),
      backImageQualityScore: this.mapQualityScore(verification.back_image_quality_score),
      dateOfBirth: this.nullableString(verification.date_of_birth),
      age: this.nullableNumber(verification.age),
      expirationDate: this.nullableString(verification.expiration_date),
      dateOfIssue: this.nullableString(verification.date_of_issue),
      issuingState: this.nullableString(verification.issuing_state),
      issuingStateName: this.nullableString(verification.issuing_state_name),
      fullName: this.nullableString(verification.full_name),
      nationality: this.nullableString(verification.nationality),
      mrz: this.mapMrz(verification.mrz),
      warnings: this.mapWarnings(verification.warnings),
      vendorData: this.nullableString(body.vendor_data),
      metadata: this.isRecord(body.metadata) ? body.metadata : null,
      createdAt: typeof body.created_at === 'string' ? body.created_at : '',
      raw: body,
    };
  }

  private nullableString(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }

  private nullableNumber(value: unknown): number | null {
    return typeof value === 'number' ? value : null;
  }

  private mapQualityScore(value: unknown): DocumentImageQualityScore | null {
    if (!this.isRecord(value)) return null;
    return {
      focusScore: this.nullableNumber(value.focus_score) ?? 0,
      brightnessScore: this.nullableNumber(value.brightness_score) ?? 0,
      brightnessIssue: this.nullableString(value.brightness_issue) ?? '',
      isDocumentFullyVisible: value.is_document_fully_visible === true,
      resolutionScore: this.nullableNumber(value.resolution_score) ?? 0,
      overallScore: this.nullableNumber(value.overall_score) ?? 0,
    };
  }

  private mapMrz(value: unknown): DocumentMrzData | null {
    if (!this.isRecord(value)) return null;
    return {
      documentNumber: this.nullableString(value.document_number),
      documentType: this.nullableString(value.document_type),
      country: this.nullableString(value.country),
      nationality: this.nullableString(value.nationality),
      birthDate: this.nullableString(value.birth_date),
      expiryDate: this.nullableString(value.expiry_date),
      sex: this.nullableString(value.sex),
      mrzType: this.nullableString(value.mrz_type),
      mrzString: this.nullableString(value.mrz_string),
      warnings: Array.isArray(value.warnings) ? value.warnings.filter((w): w is string => typeof w === 'string') : [],
      errors: Array.isArray(value.errors) ? value.errors.filter((e): e is string => typeof e === 'string') : [],
    };
  }

  private mapWarnings(value: unknown): DocumentCheckWarning[] {
    if (!Array.isArray(value)) return [];
    return value
      .filter((item): item is Record<string, unknown> => this.isRecord(item))
      .map((item) => ({
        risk: typeof item.risk === 'string' ? item.risk : 'UNKNOWN',
        feature: 'ID_VERIFICATION' as const,
        logType: this.mapLogType(item.log_type),
        shortDescription: this.nullableString(item.short_description) ?? '',
        longDescription: this.nullableString(item.long_description) ?? '',
        additionalData: this.isRecord(item.additional_data) ? item.additional_data : null,
      }));
  }

  private mapLogType(value: unknown): 'error' | 'warning' | 'information' {
    return value === 'error' || value === 'warning' || value === 'information' ? value : 'information';
  }
}
