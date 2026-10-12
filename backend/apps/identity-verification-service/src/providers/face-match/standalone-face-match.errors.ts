import {
  MalformedVendorResponseError,
  VendorAuthOrCreditError,
  VendorRateLimitedError,
  VendorTransportError,
} from '../document-verification/standalone-id-verification.errors';

// Re-exported deliberately: these four describe generic Didit vendor-
// transport failure modes (bad/missing credentials or insufficient
// credits, rate limiting, unreachable, or an untrustworthy response body)
// that are identical in shape across every standalone Didit endpoint —
// verified independently against this endpoint's own spec (same 403/429
// envelope conventions as /v3/id-verification/). Reusing them here is not
// coupling face-match's semantics to document-checking's: no check-result
// type is shared, only these vendor/transport-layer error classes.
export {
  MalformedVendorResponseError,
  VendorAuthOrCreditError,
  VendorRateLimitedError,
  VendorTransportError,
};

export abstract class StandaloneFaceMatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

// Didit returned 400: user_image/ref_image missing, >5MB, or an
// unsupported extension. Distinct from a low similarity score (which is
// still a 200 with status: 'Declined') — this is Didit refusing to
// process the input at all.
export class UnusableFaceImageError extends StandaloneFaceMatchError {
  constructor(
    public readonly reason: string,
    public readonly vendorBody?: unknown,
  ) {
    super(`Didit could not process the submitted face image: ${reason}`);
  }
}
