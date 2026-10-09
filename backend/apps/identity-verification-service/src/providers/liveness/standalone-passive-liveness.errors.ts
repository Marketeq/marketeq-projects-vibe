import {
  MalformedVendorResponseError,
  VendorAuthOrCreditError,
  VendorRateLimitedError,
  VendorTransportError,
} from '../document-verification/standalone-id-verification.errors';

// Re-exported deliberately — see the equivalent note in
// providers/face-match/standalone-face-match.errors.ts. Same generic
// vendor-transport failure shape, verified independently against this
// endpoint's own spec; no check-result type is shared.
export {
  MalformedVendorResponseError,
  VendorAuthOrCreditError,
  VendorRateLimitedError,
  VendorTransportError,
};

export abstract class StandalonePassiveLivenessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

// Didit returned 400: user_image missing, >5MB, unsupported extension, or
// failed server-side image decoding. Distinct from a genuine liveness
// decline (NO_FACE_DETECTED / LOW_LIVENESS_SCORE / LIVENESS_FACE_ATTACK /
// a blocklist hit) — those are all still 200 responses with
// status: 'Declined'.
export class UnusableLivenessImageError extends StandalonePassiveLivenessError {
  constructor(
    public readonly reason: string,
    public readonly vendorBody?: unknown,
  ) {
    super(`Didit could not process the submitted liveness image: ${reason}`);
  }
}
