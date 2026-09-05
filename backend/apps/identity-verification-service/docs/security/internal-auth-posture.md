# Internal Service Auth — Posture — identity-verification-service

This file restates Doc 04's already-built guards and their unresolved dependency for replacement. It does not change either guard file.

## Today, both guards unconditionally reject

- **BearerAuthGuard:** checks only that an Authorization header exists and starts with "Bearer " (UnauthorizedException('Missing bearer token') if not), then unconditionally throws "BearerAuthGuard is a placeholder — replace with the shared auth-service JWT guard before use."

- **InternalServiceGuard:** unconditionally throws "InternalServiceGuard is a placeholder — replace with the platform's real internal-service auth before use," regardless of any header.

Neither guard has ever accepted a request. This is by design and verified live in Doc 08 and Doc 09.

## Confirmed dependency for the eventual replacement

- **auth-service** is the platform's unified auth service and already issues JWTs for internal services as well as end users (Architecture Overview §6).

- **Reusable guards** belong under /shared, not duplicated per service (Architecture Overview §7.2).

## Not confirmed by any source available to this project

- The JWT's claim shape (what fields it carries).
- The signing-key distribution mechanism (a JWKS endpoint, a shared secret, something else).
- The exact header/scheme name a real guard should expect.
- Whether a shared verification guard already exists under /shared today.

## Engineering recommendation for the eventual replacement

- Verify the token's signature, expiry, and issuer against auth-service's real, confirmed verification mechanism.
- Derive the caller's identity only from verified claims, never from a raw header.
- On rejection, return a generic, caller-safe message — not the guard's own class name or implementation work description.
- Implement the verification logic once, under /shared, so both guards can call into it.
- Keep BearerAuthGuard and InternalServiceGuard as two separate guard classes.
