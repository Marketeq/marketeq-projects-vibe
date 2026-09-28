import { Injectable } from '@nestjs/common';
import {
  FaceDetectionResult,
  FaceImageInput,
  PassiveLivenessCheckInput,
  PassiveLivenessResult,
  PassiveLivenessWarning,
  StandalonePassiveLivenessProvider,
} from './standalone-passive-liveness-provider.interface';
import {
  MalformedVendorResponseError,
  UnusableLivenessImageError,
  VendorAuthOrCreditError,
  VendorRateLimitedError,
  VendorTransportError,
} from './standalone-passive-liveness.errors';

// Adapter for Didit's STANDALONE Passive Liveness API
// (POST https://verification.didit.me/v3/passive-liveness/), verified
// directly against Didit's live OpenAPI spec (fetched and parsed
// 2026-09-24, re-confirmed byte-identical against a fresh fetch
// immediately before writing this file).
//
// NOT WIRED IN. Nothing references this class or
// STANDALONE_PASSIVE_LIVENESS_PROVIDER outside its own spec file — no
// app.module.ts registration, no controller, no service orchestration.
// Per this project's standing rule: this adapter's result is a LIVENESS
// verdict only and must never, by itself, finalize
// IdentityVerificationProfile.identityVerificationStatus.
//
// Security note: no logging in this file, by design — never log the api
// key, raw image bytes, or the face-detection bounding-box/age/gender
// fields.
@Injectable()
export class DiditStandalonePassiveLivenessProvider implements StandalonePassiveLivenessProvider {
  private readonly baseUrl = process.env.DIDIT_API_BASE_URL || 'https://verification.didit.me';
  private readonly apiKey = process.env.DIDIT_API_KEY;

  private static readonly CONTENT_TYPE_EXTENSION: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/tiff': 'tiff',
  };

  private static readonly MAX_IMAGE_BYTES = 5 * 1024 * 1024;

  async checkLiveness(input: PassiveLivenessCheckInput): Promise<PassiveLivenessResult> {
    this.validateImage(input.userImage);

    const form = this.buildForm(input);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/v3/passive-liveness/`, {
        method: 'POST',
        headers: { 'x-api-key': this.apiKey as string },
        body: form,
      });
    } catch (cause) {
      throw new VendorTransportError(cause);
    }

    if (response.status === 400) {
      const body = await this.safeJson(response);
      const reason = this.isRecord(body) && 'error' in body ? 'could_not_process_image' : 'validation_failed';
      throw new UnusableLivenessImageError(reason, body);
    }

    if (response.status === 403) {
      const body = await this.safeJson(response);
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

  private validateImage(image: FaceImageInput): void {
    if (!image.bytes || image.bytes.length === 0) {
      throw new UnusableLivenessImageError('user_image_empty');
    }
    if (image.bytes.length > DiditStandalonePassiveLivenessProvider.MAX_IMAGE_BYTES) {
      throw new UnusableLivenessImageError('user_image_too_large');
    }
    if (!DiditStandalonePassiveLivenessProvider.CONTENT_TYPE_EXTENSION[image.contentType]) {
      throw new UnusableLivenessImageError('user_image_unsupported_content_type');
    }
  }

  private extensionFor(image: FaceImageInput): string {
    return DiditStandalonePassiveLivenessProvider.CONTENT_TYPE_EXTENSION[image.contentType];
  }

  private buildForm(input: PassiveLivenessCheckInput): FormData {
    const form = new FormData();
    form.append(
      'user_image',
      new Blob([new Uint8Array(input.userImage.bytes)], { type: input.userImage.contentType }),
      `user_image.${this.extensionFor(input.userImage)}`,
    );

    // Required, explicit — never defaulted by this adapter. Note this
    // field also controls face-search enrollment on this endpoint, not
    // just session persistence (see the interface file's header note).
    form.append('save_api_request', String(input.saveApiRequest));

    if (input.faceLivenessScoreDeclineThreshold !== undefined) {
      form.append(
        'face_liveness_score_decline_threshold',
        String(input.faceLivenessScoreDeclineThreshold),
      );
    }
    if (input.rotateImage !== undefined) form.append('rotate_image', String(input.rotateImage));
    if (input.vendorData) form.append('vendor_data', input.vendorData);
    if (input.metadata) form.append('metadata', JSON.stringify(input.metadata));

    return form;
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

  private mapResponse(body: unknown): PassiveLivenessResult {
    if (!this.isRecord(body)) {
      throw new MalformedVendorResponseError('body_not_an_object');
    }
    const requestId = body.request_id;
    const liveness = body.liveness;
    if (typeof requestId !== 'string' || !this.isRecord(liveness)) {
      throw new MalformedVendorResponseError('missing_request_id_or_liveness');
    }
    const status = liveness.status;
    if (status !== 'Approved' && status !== 'Declined') {
      throw new MalformedVendorResponseError('unrecognized_status');
    }

    return {
      requestId,
      status,
      method: 'PASSIVE',
      score: typeof liveness.score === 'number' ? liveness.score : null,
      faceQuality: typeof liveness.face_quality === 'number' ? liveness.face_quality : null,
      faceLuminance: typeof liveness.face_luminance === 'number' ? liveness.face_luminance : null,
      userImageDetection: this.mapDetection(liveness.user_image),
      warnings: this.mapWarnings(liveness.warnings),
      vendorData: typeof body.vendor_data === 'string' ? body.vendor_data : null,
      metadata: this.isRecord(body.metadata) ? body.metadata : null,
      createdAt: typeof body.created_at === 'string' ? body.created_at : '',
      raw: body,
    };
  }

  private mapDetection(value: unknown): FaceDetectionResult | null {
    if (!this.isRecord(value)) return null;
    const entities = Array.isArray(value.entities)
      ? value.entities
          .filter((e): e is Record<string, unknown> => this.isRecord(e))
          .map((e) => ({
            bbox: Array.isArray(e.bbox) && e.bbox.length === 4
              ? (e.bbox as [number, number, number, number])
              : ([0, 0, 0, 0] as [number, number, number, number]),
            confidence: typeof e.confidence === 'number' ? e.confidence : 0,
            age: typeof e.age === 'number' ? e.age : null,
            gender: typeof e.gender === 'string' ? e.gender : null,
          }))
      : [];
    return {
      entities,
      bestAngle: typeof value.best_angle === 'number' ? value.best_angle : null,
    };
  }

  private mapWarnings(value: unknown): PassiveLivenessWarning[] {
    if (!Array.isArray(value)) return [];
    return value
      .filter((item): item is Record<string, unknown> => this.isRecord(item))
      .map((item) => ({
        risk: typeof item.risk === 'string' ? item.risk : 'UNKNOWN',
        feature: 'LIVENESS' as const,
        logType: this.mapLogType(item.log_type),
        shortDescription: typeof item.short_description === 'string' ? item.short_description : '',
        longDescription: typeof item.long_description === 'string' ? item.long_description : '',
        additionalData: this.isRecord(item.additional_data) ? item.additional_data : null,
      }));
  }

  private mapLogType(value: unknown): 'error' | 'warning' | 'information' {
    return value === 'error' || value === 'warning' || value === 'information' ? value : 'information';
  }
}
