# Pending CTO review — api-gateway routing for identity-verification-service and location-service

**Status:** NOT applied. `backend/apps/api-gateway/src/proxy/proxy.service.ts` is unchanged on disk (frozen file, §1.4 of `docs/CODE_REVIEW_SOP.md` — CTO-only). This note and the accompanying patch are prepared for review only; nothing has been submitted or sent.

**Patch file:** `proxy.service.cto-review.patch` (same directory).

## What the change does

Adds two entries to `ProxyService`'s `serviceMap` (the gateway's prefix → base-URL lookup table), following the exact existing pattern every other service in that map already uses:

```ts
identityVerification:
  config.get('IDENTITY_VERIFICATION_SERVICE_URL') || 'http://localhost:3019',
location: config.get('LOCATION_SERVICE_URL') || 'http://localhost:3030',
```

Both ports match `backend/ecosystem.config.js`'s existing PM2 assignments (`identity-verification-service` on 3019, `location-service` on 3030) — no new service, no new port, no new infrastructure.

## Why it's needed

`proxy.controller.ts` (not frozen, already has the routing logic in place) resolves each request's target service name from the URL prefix, then looks up that name in `proxy.service.ts`'s `serviceMap` to get a base URL. Without the two entries above, the lookup returns `undefined` and `ProxyService.forward()` throws `BadGatewayException({ code: 'BAD_GATEWAY', message: 'Unknown service: <name>' })` — verified live, not just reasoned about (see below).

## Affected endpoints (currently 502ing without this change)

- `GET /v1/identity-verification/me` (via api-gateway → identity-verification-service) — returns the account's country-level detected location (`detectedCountry`/`detectedRegionState`/`detectedCity`), per Technical Architecture §11's confirmed scope for that service.
- `GET /location/resolve-ip` (via api-gateway → location-service) — returns approximate coordinates for the map marker. Per Technical Architecture §3, coordinate-based location display is explicitly *not* identity-verification-service's responsibility, hence the separate service/route.

Both are read-only GETs. Neither touches auth, cookies, CORS, JWT, or any of the values `docs/DEVOPS_SOP.md`'s bidirectional login invariant governs.

## Verified 502 responses (current state, with the frozen file unchanged)

Captured via an authenticated `fetch(..., { credentials: 'include' })` against the running local gateway:

```json
// GET /v1/identity-verification/me
{"statusCode":502,"code":"BAD_GATEWAY","message":"Unknown service: identityVerification"}

// GET /location/resolve-ip
{"statusCode":502,"code":"BAD_GATEWAY","message":"Unknown service: location"}
```

Confirmed this fails cleanly (handled exception, not a crash) and that the frontend degrades to an honest "location service unavailable" state rather than crashing or silently misrouting to the wrong backend service.

## Scope check

- No other lines in `proxy.service.ts` are touched — diff is two new map entries only, inserted after the existing `legal` entry.
- `proxy.controller.ts`'s existing (non-frozen) routing entries for these same two prefixes are left in place, inert, pending this approval — not moved or duplicated elsewhere to route around the freeze.
