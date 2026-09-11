# Error Messaging Conventions — identity-verification-service

Architecture Overview §7.3's full guidance: "Standard error JSON: { code, message, details? }. Avoid leaking internals in messages."

This document classifies every catalogued code against that one clause. Every classification below is this document's own judgment call, not a confirmed platform rule.

## The general pattern, already correct

Every DomainException subclass already writes its own message as a plain, complete sentence aimed at whoever calls that route — "This document has already expired.", "A document with this number is already on file under a different account.", "No verification attempt matches this vendor session."

None of them reference a class name, a file path, a stack frame, an environment variable, or a raw vendor/database error. None of their details fields carry a credential, another account's identifier, or an unredacted vendor payload.

Any future DomainException subclass should keep matching this existing pattern.

## The one real gap: REQUEST_FAILED's two current call sites

REQUEST_FAILED is a fallback whose message is always whatever the underlying HttpException carries — it has no fixed text of its own. Today, in this service, there are exactly two real call sites, and both fail the "avoid leaking internals" test:

- **BearerAuthGuard:** "BearerAuthGuard is a placeholder — replace with the shared auth-service JWT guard before use."
- **InternalServiceGuard:** "InternalServiceGuard is a placeholder — replace with the platform's real internal-service auth before use."

Both name the exact guard class and describe exactly what implementation work remains — genuinely useful information for the developer building this service, but exactly the kind of internal detail Architecture Overview §7.3 says to avoid showing a caller.

## Classification

- **Safe to display verbatim to the audience named in the catalog:** VALIDATION_ERROR, DOCUMENT_EXPIRED, NO_DETECTED_LOCATION, CLASSIFICATION_REQUIRED, DUPLICATE_DOCUMENT, RETRY_LIMIT_EXCEEDED, VPN_PROXY_DETECTED, VENDOR_UNAVAILABLE, PROFILE_NOT_FOUND, DOCUMENT_NOT_FOUND, INVALID_SIGNATURE, UNKNOWN_VENDOR_SESSION, INTERNAL_ERROR (13 of 14 codes).

- **NOT safe to display verbatim today:** REQUEST_FAILED, specifically its two current guard-placeholder call sites. A frontend or gateway that shows this service's error.message directly to an end user should special-case this one code today — for example, substituting a generic "You're not authorized to do that." until the real guards replace the placeholders — rather than showing the placeholder text verbatim.
