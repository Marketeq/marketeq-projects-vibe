# Consuming GET /v1/internal/identity-verification/status/:userId

## Confirmed request

```
GET /v1/internal/identity-verification/status/:userId
Authorization: <see "Auth" below — not resolved today>
```

No request body. `userId` is a path parameter, not a query string field (Doc 04 Step 8b).

## Confirmed response — 200

```json
{
  "identityVerificationStatus": "<IdentityVerificationStatus>",
  "locationVerificationStatus": "<LocationVerificationStatus>"
}
```

(InternalStatusResponseDto, Doc 04 Step 5e. The enum value sets themselves are Doc 03's confirmed schema.)

## Confirmed error shape

Every error uses the shared `{ code, message, details? }` envelope (AllExceptionsFilter, Doc 04 Step 6b). Two documented cases:

- **401 REQUEST_FAILED** (AllExceptionsFilter's fallback branch — Doc 04 Section 7 names "an unhandled guard rejection" as exactly this case; message text is the guard's placeholder rejection string, not a real auth failure) — **today this is the ONLY outcome any caller will ever see** (see "Auth" below).

- **404 PROFILE_NOT_FOUND** — Doc 04/05: `getStatusForInternalCaller` throws ProfileNotFoundException rather than lazily creating a profile the way the user-facing path does (a deliberate, confirmed difference for the internal-caller path).

## Auth — NOT resolved, do not guess further than this

InternalServiceGuard (Doc 04 Step 6) unconditionally rejects every request with 401 today. It is not production-safe and is unchanged through Doc 06.

**What IS confirmed:** auth-service "issues JWTs for internal services" (Architecture Overview) and reusable guards belong under /shared (Architecture Overview Section 7.2).

**What is NOT confirmed** by any source available to this project: the JWT's claim shape, its signing-key distribution, or the exact header/scheme a caller should use.

**Do not build a real integration** against this endpoint until that is confirmed and InternalServiceGuard is replaced.
