import { Injectable } from '@nestjs/common';
import {
  CreateHostedBiometricSessionInput,
  CreateKycSessionInput,
  HostedSessionDecisionSummary,
  CreateHostedBiometricSessionResult,
  HostedBiometricSessionProvider,
} from './hosted-biometric-session-provider.interface';
import {
  AmbiguousVendorOutcomeError,
  HostedSessionNotFoundError,
  InvalidSessionCreationRequestError,
  MalformedVendorResponseError,
  VendorAuthOrCreditError,
  VendorRateLimitedError,
  VendorTransportError,
} from './hosted-biometric-session.errors';

// Not vendor-documented — see DiditStandaloneIdVerificationProvider's own
// FETCH_TIMEOUT_MS comment for the same reasoning. This class has no
// attempt reservation of its own to protect (beginBiometricVerification
// does not spend a new account-wide attempt — see
// TwoStageVerificationService.checkDocumentWithVendor's header comment on
// where that ceiling is gated), so this bound exists for the same
// "ambiguous vs. definite failure" honesty, not to protect a reservation.
const FETCH_TIMEOUT_MS = 30 * 1000;
// Short, for the read-only reconciliation lookup that runs inside a user's
// start request (a hung lookup must fail closed quickly, not hold the lock).
const DECISION_TIMEOUT_MS = 5 * 1000;

// Adapter for Didit's hosted session creation (POST /v3/session/) and
// decision lookup (GET /v3/session/{id}/decision/), verified against
// Didit's live OpenAPI spec and directly exercised against the sandbox
// application this engagement (real session created, real decision
// fetched, real simulate-completion call — see
// .claude/pending-review or conversation history for that evidence; NOT
// re-run here).
//
// `sandbox_scenario` is intentionally never sent by this class — that
// field is sandbox-only and is rejected on live applications per the
// spec; there is no code path here that could accidentally include it.
@Injectable()
export class DiditHostedBiometricSessionProvider implements HostedBiometricSessionProvider {
  private readonly baseUrl = process.env.DIDIT_API_BASE_URL || 'https://verification.didit.me';
  private readonly apiKey = process.env.DIDIT_API_KEY;

  async createSession(
    input: CreateHostedBiometricSessionInput,
  ): Promise<CreateHostedBiometricSessionResult> {
    return this.postCreateSession({
      workflow_id: input.workflowId,
      portrait_image: input.portraitImageBase64,
      vendor_data: input.vendorData,
    });
  }

  // Free KYC: a hosted workflow session where Didit runs document selection,
  // capture, liveness and face match itself. `callback` is where Didit
  // redirects the browser afterwards (it appends verificationSessionId and
  // status — never trusted by this service). Per Didit's documented
  // behavior, calling this again with the same vendor_data while an
  // unfinished session exists returns that existing session (still 201)
  // instead of creating a duplicate; terminal sessions are never reused.
  async createKycSession(input: CreateKycSessionInput): Promise<CreateHostedBiometricSessionResult> {
    return this.postCreateSession({
      workflow_id: input.workflowId,
      vendor_data: input.vendorData,
      callback: input.callbackUrl,
      // Didit's documented default is "initiator" (only the device that started the flow
      // is redirected) and its own guidance for a callback that does not trigger reliably
      // is "both". The redirect stays a UI hint: the outcome is only ever taken from the
      // signed webhook or the server-side decision lookup.
      callback_method: 'both',
    });
  }

  // Fail-closed read of one session's current status. Only the fields named in
  // HostedSessionDecisionSummary are kept; the body (personal data) is never
  // returned, logged or put in an error. 404 -> HostedSessionNotFoundError;
  // timeout / network / 5xx / unexpected status -> VendorTransportError.
  async getSessionDecision(sessionId: string): Promise<HostedSessionDecisionSummary> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/v3/session/${encodeURIComponent(sessionId)}/decision/`, {
        headers: { 'x-api-key': this.apiKey as string },
        signal: AbortSignal.timeout(DECISION_TIMEOUT_MS),
      });
    } catch (cause) {
      // A read has no "did it happen?" ambiguity — a plain transport failure.
      throw new VendorTransportError(cause);
    }

    if (response.status === 404) throw new HostedSessionNotFoundError();
    if (response.status === 401 || response.status === 403) {
      throw new VendorAuthOrCreditError('invalid_api_key', undefined);
    }
    if (response.status === 429) {
      const retryAfterHeader = response.headers.get('retry-after');
      const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : undefined;
      throw new VendorRateLimitedError(Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined);
    }
    if (response.status !== 200) {
      throw new VendorTransportError(new Error(`Unexpected Didit status ${response.status}`));
    }

    const body = await this.safeJson(response);
    if (!this.isRecord(body)) throw new MalformedVendorResponseError('body_not_an_object');
    if (typeof body.session_id !== 'string' || typeof body.status !== 'string') {
      throw new MalformedVendorResponseError('missing_session_id_or_status');
    }
    const optionalString = (value: unknown): string | null => (typeof value === 'string' ? value : null);
    return {
      sessionId: body.session_id,
      status: body.status,
      vendorData: optionalString(body.vendor_data),
      workflowId: optionalString(body.workflow_id),
      environment: optionalString(body.environment),
      applicationId: optionalString(body.application_id),
    };
  }

  private async postCreateSession(
    requestBody: Record<string, unknown>,
  ): Promise<CreateHostedBiometricSessionResult> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/v3/session/`, {
        method: 'POST',
        headers: { 'x-api-key': this.apiKey as string, 'content-type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch (cause) {
      // No response received — network failure or our own timeout. We
      // cannot rule out Didit having created a session server-side
      // despite never seeing the reply.
      throw new AmbiguousVendorOutcomeError(cause);
    }

    if (response.status === 400) {
      throw new InvalidSessionCreationRequestError(await this.safeJson(response));
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
    if (response.status !== 201) {
      throw new VendorTransportError(new Error(`Unexpected Didit status ${response.status}`));
    }

    const body = await this.safeJson(response);
    if (!this.isRecord(body) || typeof body.session_id !== 'string' || typeof body.url !== 'string') {
      throw new MalformedVendorResponseError('missing_session_id_or_url');
    }
    return {
      sessionId: body.session_id,
      url: body.url,
      status: typeof body.status === 'string' ? body.status : 'Not Started',
    };
  }

  // Called exactly once per beginBiometricVerification invocation — a
  // single synchronous GET, never a retry loop or a scheduled poll. Its
  // ONLY job is to pull the portrait_image field back out of the
  // document-check session so it can be supplied to createSession above;
  // any status/decision fields in this response are read by nobody and
  // play no role in finalization. Verification finalization (writing
  // BiometricSession.status / IdentityVerificationProfile.identityVerificationStatus)
  // happens exclusively in TwoStageVerificationService.handleBiometricSessionWebhook,
  // driven only by a signature-and-timestamp-verified webhook delivery —
  // never by this call's response, however "decision"-sounding its name or
  // shape. A null/missing portrait here is surfaced by the caller as "not
  // yet eligible," which the human retries by clicking "Begin verifying"
  // again — not something this method retries on its own.
  async fetchPortraitFromDocumentCheckSession(requestId: string): Promise<string | null> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/v3/session/${requestId}/decision/`, {
        headers: { 'x-api-key': this.apiKey as string },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch (cause) {
      throw new AmbiguousVendorOutcomeError(cause);
    }

    if (response.status === 403) {
      const body = await this.safeJson(response);
      const reason: 'invalid_api_key' | 'insufficient_credits' =
        this.isRecord(body) && 'error' in body ? 'insufficient_credits' : 'invalid_api_key';
      throw new VendorAuthOrCreditError(reason, body);
    }
    if (response.status === 404) {
      // The document-check session doesn't exist under this API key —
      // never treated as "no portrait", which would imply the check ran
      // but produced nothing. This is a distinct, louder failure.
      throw new MalformedVendorResponseError('document_check_session_not_found');
    }
    if (!response.ok) {
      throw new VendorTransportError(new Error(`Unexpected Didit status ${response.status}`));
    }

    const body = await this.safeJson(response);
    if (!this.isRecord(body)) {
      throw new MalformedVendorResponseError('body_not_an_object');
    }

    // Confirmed live this engagement: the decision endpoint's top-level
    // shape includes an `id_verifications` ARRAY (plural) — distinct from
    // the standalone endpoint's own synchronous response, which has a
    // single `id_verification` object. The array items' own inner shape
    // (specifically that `portrait_image` lives on each item the same way
    // it does on the standalone response) was NOT directly confirmed this
    // engagement — only the array's existence was. Coded defensively:
    // absence of a usable portrait returns null rather than throwing,
    // but a structurally-wrong array (present but not array-shaped)
    // throws instead of guessing.
    const idVerifications = body.id_verifications;
    if (idVerifications === undefined || idVerifications === null) {
      return null;
    }
    if (!Array.isArray(idVerifications)) {
      throw new MalformedVendorResponseError('id_verifications_not_an_array');
    }
    if (idVerifications.length === 0) return null;

    const latest = idVerifications[idVerifications.length - 1];
    if (!this.isRecord(latest)) return null;
    const portrait = latest.portrait_image;
    return typeof portrait === 'string' && portrait.length > 0 ? portrait : null;
  }

  private async safeJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      throw new MalformedVendorResponseError('non_json_body');
    }
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
