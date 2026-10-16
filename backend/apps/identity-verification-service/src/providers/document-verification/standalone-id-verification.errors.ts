// Error types for DiditStandaloneIdVerificationProvider only. Deliberately
// plain Error subclasses, not NestJS HttpException/DomainException: this
// adapter is not wired into any controller yet (see the provider file's own
// header), so there is no HTTP boundary translating these today. Wiring it
// in later is exactly where the HTTP-status mapping decision belongs.

export abstract class StandaloneIdVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

// Didit returned 400 because the image itself is unusable: either
// COULD_NOT_RECOGNIZE_DOCUMENT (no document detected at all) or a field-level
// validation failure (unsupported extension, >10MB, corrupted/encrypted PDF).
// Distinct from MalformedVendorResponseError: here Didit answered clearly
// and rejected the input; that error is for when Didit's answer itself
// can't be trusted.
export class UnreadableDocumentImageError extends StandaloneIdVerificationError {
  constructor(
    public readonly reason: string,
    public readonly vendorBody?: unknown,
  ) {
    super(`Didit could not process the submitted image: ${reason}`);
  }
}

// Didit returned 403. Covers both causes the real API collapses into the
// same status code (never 401, confirmed against the live spec): a missing/
// invalid/revoked x-api-key, or the organization's credit balance being too
// low to cover the call. `reason` distinguishes them for logging/alerting —
// one is a config problem, the other is a billing problem — without ever
// logging the key itself.
export class VendorAuthOrCreditError extends StandaloneIdVerificationError {
  constructor(
    public readonly reason: 'invalid_api_key' | 'insufficient_credits',
    public readonly vendorBody?: unknown,
  ) {
    super(`Didit rejected the request: ${reason}`);
  }
}

// Didit returned 429 (shared 300 req/min write budget across all
// POST/PATCH/DELETE endpoints, confirmed against the live spec).
export class VendorRateLimitedError extends StandaloneIdVerificationError {
  constructor(public readonly retryAfterSeconds?: number) {
    super('Didit rate limit exceeded');
  }
}

// An HTTP response WAS received, but with a status this adapter doesn't
// otherwise recognize (not 400/403/429/2xx). Didit's edge did answer, so
// whatever happened server-side is presumed not to have produced a usable
// result — same treatment as a definite rejection, safe to retry.
export class VendorTransportError extends StandaloneIdVerificationError {
  constructor(public readonly cause?: unknown) {
    super('Could not reach Didit');
  }
}

// No HTTP response was ever received at all — the fetch() call itself
// rejected (network failure, DNS error, connection reset, or this
// adapter's own request timeout aborting it). Distinct from
// VendorTransportError on purpose: here we have NO evidence either way
// about whether Didit's server actually received and processed the
// request before the connection dropped — a real document-check call
// (save_api_request=true) could have completed and been persisted
// vendor-side even though this process never saw the response. Callers
// must NOT treat this the same as a confirmed-safe-to-retry failure —
// see TwoStageVerificationService.checkDocumentWithVendor's handling of
// this error for why it does not release the attempt reservation.
export class AmbiguousVendorOutcomeError extends StandaloneIdVerificationError {
  constructor(public readonly cause?: unknown) {
    super('Did not receive a response from Didit — outcome unknown');
  }
}

// Didit answered 200 (or an otherwise-recognized status) but the body
// didn't have the shape this adapter requires to trust it — e.g. missing
// request_id/id_verification, or an id_verification.status value outside
// {Approved, Declined}. Never silently coerced into a result.
export class MalformedVendorResponseError extends StandaloneIdVerificationError {
  constructor(public readonly reason: string) {
    super(`Didit returned an unexpected response shape: ${reason}`);
  }
}
