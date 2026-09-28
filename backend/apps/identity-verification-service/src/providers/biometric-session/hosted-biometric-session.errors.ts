import {
  AmbiguousVendorOutcomeError,
  MalformedVendorResponseError,
  VendorAuthOrCreditError,
  VendorRateLimitedError,
  VendorTransportError,
} from '../document-verification/standalone-id-verification.errors';

// Re-exported deliberately — same generic vendor-transport failure shape
// as the standalone adapters, verified independently against this
// endpoint's own spec conventions.
export {
  AmbiguousVendorOutcomeError,
  MalformedVendorResponseError,
  VendorAuthOrCreditError,
  VendorRateLimitedError,
  VendorTransportError,
};

export abstract class HostedBiometricSessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

// Session creation returned 400 — malformed workflow_id, oversized
// portrait_image, or another field-level validation failure. Never
// carries the portrait bytes.
export class InvalidSessionCreationRequestError extends HostedBiometricSessionError {
  constructor(public readonly vendorBody?: unknown) {
    super('Didit rejected the hosted-session creation request');
  }
}
