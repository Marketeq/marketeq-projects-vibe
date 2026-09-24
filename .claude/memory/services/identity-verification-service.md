# identity-verification-service Memory (+ location-service integration, + gateway)

## Status
In Progress — VPN/proxy backend real, tested. Location-service migration real, tested (direct-service tier). Current-location display (text + map) now unified to one live resolve-ip lookup, tested. Full browser→gateway path still blocked on `proxy.service.ts`'s missing `serviceMap` entries. Nothing pushed.

## Gateway — `proxy.controller.ts` frozen-file status, corrected (2026-09-23, third pass)

A second-session pass here previously mischaracterized commit `d2bbdfa6`'s `proxy.controller.ts` change as an undisclosed violation of an "isolated branch only" promise. **That characterization was wrong and has been corrected; do not repeat it.** The actual, verified rule (`docs/CODE_REVIEW_SOP.md` §1.4, "Login files are PERMANENTLY LOCKED — CTO ONLY"): the explicit, permanently-locked file list names `backend/apps/api-gateway/src/proxy/proxy.service.ts` specifically. It does **not** name `proxy.controller.ts` anywhere in that list, and a repo-wide search turns up no other rule that locks it either. So:

- `proxy.service.ts` — genuinely CTO-only, genuinely frozen, and genuinely **still unmodified** on this branch (its `serviceMap` has no `identityVerification`/`location` key, so `forward()` still throws `BadGatewayException({message: 'Unknown service: ...'})` for both). This is the file, and the only file, actually gating the end-to-end gateway path.
- `proxy.controller.ts`'s `d2bbdfa6` change (`SERVICE_PREFIX_MAP` entries for `identity-verification`/`location`, plus the `segments[1] === 'identity-verification'` prefix branch) is a legitimate, already-documented routing addition — not a frozen-file violation, and not something requiring reversion or extra CTO sign-off beyond normal review. It is currently inert (no matching `proxy.service.ts` serviceMap entry yet), which is why the gateway path still 502s end-to-end regardless.

A prior session's own memory note ("No frozen-file edits. proxy.service.ts/proxy.controller.ts changes stay on the isolated branch only") over-scoped the restriction to a file that was never actually locked, which is what produced the mistaken finding. Corrected here; the restriction below is narrowed to match the real rule.

## Handoff snapshot (2026-09-23, end of session)

**Branch:** `identity-verification/integration`
**Latest commits (HEAD → back):**
```
d2bbdfa6 feat(identity-verification): location API wiring, scanner UI, and account-verification gate
dc070641 merge: bring LocationProvider integration into identity-verification/integration
5886ec61 feat(identity-verification): integrate real location detection via LocationProvider
0f029255 Merge branch 'fix/identity-verification-backend-followup' into identity-verification/integration
8030667d feat(talent-dashboard): add identity verification document flow
```
`d2bbdfa6` is a checkpoint commit, not pushed.

**Uncommitted, modified:**
```
backend/apps/identity-verification-service/src/app.module.ts
backend/apps/identity-verification-service/src/common/errors/domain-exceptions.ts
backend/apps/identity-verification-service/src/common/errors/error-code-catalog.ts
backend/apps/identity-verification-service/src/controllers/identity-verification.controller.ts
backend/apps/identity-verification-service/src/services/identity-verification.service.ts
frontend/app/(group)/talent-dashboard/page.tsx
frontend/components/account-verification-gate.tsx
frontend/service/http/identity-verification.ts
frontend/src/lib/api/identity-verification-status.ts
frontend/src/lib/api/vpn-proxy-detection.ts
```

**Uncommitted, untracked (new files):**
```
backend/apps/identity-verification-service/src/common/guards/vpn-proxy-check.guard.ts
backend/apps/identity-verification-service/src/providers/location/location-service-http.provider.ts
backend/apps/identity-verification-service/src/providers/location/location-service-http.provider.spec.ts
backend/apps/identity-verification-service/src/providers/vpn-proxy/proxycheck-vpn-proxy-detection.provider.ts
backend/apps/identity-verification-service/src/providers/vpn-proxy/proxycheck-vpn-proxy-detection.provider.spec.ts
backend/jest.config.js
```
Nothing here has been committed, pushed, or discarded — leave all of it as-is unless the user directs otherwise.

## What's implemented and tested

- **VPN/proxy (proxycheck.io), real, tested.** `ProxyCheckVpnProxyDetectionProvider`, `VpnProxyCheckGuard`, `ConnectionCheckUnavailableException`, `GET /v1/identity-verification/connection-check`. Guards `getMyStatus`, `confirmHomeCountry`, `recordTravelClassification`, `createDocumentUploadUrl`, `submitDocument`, `startVerificationSession`. Fixed a real IPv6-loopback (`::1`) false-clean-pass bug via `isUsablePublicIp()`. `PROXYCHECK_API_KEY` lives in the real, gitignored `backend/.env` (not a template — never printed, never re-added elsewhere).
- **Location-service migration, real, tested.** `LocationServiceHttpProvider` (new) replaces `GeoIpLiteLocationProvider` as the `LOCATION_PROVIDER` DI binding in `app.module.ts`. Calls location-service's real `GET /location/resolve-ip?ip=<real client IP>` (HTTP, per Christopher's LS-00 doc — location-service is HTTP-only, no RabbitMQ transport exists on it). Returns `null` for a genuine no-result, throws `LocationLookupUnavailableException` (503, new) for a transport failure — never conflated. `getOrCreateProfile`/`confirmHomeCountry` needed no changes; the exception propagates naturally.
- **Frontend real wiring:** `checkVpnProxy()` and `checkIdentityVerificationStatus()` both call real endpoints now (no more permanent mocks) and both have a distinct, honest `"unavailable"` outcome — never coerced into a clean/unstarted result. `AccountVerificationGate` now opens automatically on load based on real status (`reason: "unstarted" | "status_unavailable"`), and shows a connection-check error+Retry **inside the same dialog** (no separate popup) when the VPN/proxy check itself fails on "Verify My Account". Dev-only mock overrides (`__mock_vpn_proxy_result`, `__mock_identity_verification_status`, both NODE_ENV-gated) still exist for QA and are unrelated to the (now fully removed) dev-preview banner from earlier in this session.
- **Test evidence, three tiers, keep them distinct in any future report:**
  1. Mocked/simulated: `npx jest --testPathPattern=apps/identity-verification-service` → **85/85 pass** (needs `backend/jest.config.js`, untracked above — without it, `npx jest` fails repo-wide with "Cannot use import statement outside a module").
  2. Real, non-mocked, direct-service: ran the actual compiled `LocationServiceHttpProvider` against the real running `location-service` (port 3030) — `8.8.8.8` → `{"countryCode":"US","regionState":null,"city":null}`; `203.0.113.5` → `null`. Both correct.
  3. Full gateway/browser path: still `502 {"code":"BAD_GATEWAY","message":"Unknown service: identityVerification"}` — blocked, see below. Do not call tier 2 "gateway tested" — they're different claims.

## Current-location text and map data — DONE, then corrected (2026-09-23, second + third session)

Fixed the two-vintage bug described in the original handoff: text and marker are now provably the same current lookup, not two independently-timed sources.

**Second-session first attempt (reverted this pass):** chained `resolve-ip` into a `resolve-coordinates` reverse-geocode call on the same coordinates to fill city/region. **Wrong, per explicit correction**: LS-00 reserves `resolve-coordinates` for GPS-based profile display — a genuinely precise input. Feeding it IP-derived approximate coordinates would produce city/region text that *reads* as precise (a real municipality name) but isn't backed by a precise input, which is itself a form of misleading display this flow must not produce. Removed.

**Current, corrected implementation:**
- `frontend/src/lib/api/detected-location.ts` reads only `LocationAPI.resolveIp()` — one live call, no chained second call. Country + coordinates both come from that single response; text and marker are the same lookup by construction, not by coincidence.
- City/region are populated only if resolve-ip's own response genuinely supplies them. It doesn't today — location-service's `IpResolution` is `{ip, country, currency, timezone, coordinates}` only (confirmed by reading `location.service.ts`) — so they're left honestly empty (`""`), same honest-omission convention already used for the persisted `detectedRegionState`/`detectedCity` fields (`regionState: null, city: null`) in the backend provider below. Not derived by reverse-geocoding the approximate coordinates.
- `frontend/service/http/location.ts` is back to its original single-method (`resolveIp` only) shape — the `resolveCoordinates` client method and `CoordinateLocationResolution` type added in the first attempt were removed as unused/wrong-approach dead code, not left behind.
- identity-verification-service's persisted `detectedCountry`/`verifiedHomeCountry`/`locationVerificationStatus` are completely untouched by this path (confirmed by reading `identity-verification.service.ts` — nothing here touches `getOrCreateProfile`/`confirmHomeCountry`). Approximate detected-location display stays genuinely separate from confirmed residence and verification status.
- `frontend/components/identity-verification-flow.tsx`'s `detectedLocationLabel` (the only place `DetectedLocation.city/region` is rendered) — **kept** — filters out empty segments with `.filter(Boolean).join(', ')` instead of always interpolating three comma-joined slots, so an honestly-empty city/region (now the normal case, not just an edge case) renders as just the country name, never stray leading commas.
- `backend/apps/identity-verification-service/src/providers/location/location-service-http.provider.ts` — **kept, unaffected by the revert** — real response-content validation (`isValidIpResolutionShape`), not just JSON-parse success: checks `country` is a well-formed 2-letter code (or null/undefined) and `coordinates` is a finite, in-range `[lat, lon]` pair (or null/undefined) before trusting either. A structurally-wrong-but-valid-JSON body now throws `LocationLookupUnavailableException({reason: 'invalid_response_shape'})` instead of being silently trusted into `detectedCountry` — the field `confirmHomeCountry` eligibility depends on. 7 new tests in the provider's spec (85 → 92 total for the service).
- Frontend `detected-location.ts` also validates the shape of the resolve-ip response before trusting it (`isValidIpLocationResolution`) — not just that axios/JSON parsed successfully. (The `isValidCoordinateResolution` guard from the first attempt was removed along with the reverse-geocode call it validated.)
- **Two security gaps found and explicitly flagged in code comments + this file, deliberately NOT fixed** (per instruction: keep unresolved until verified):
  1. **Client-IP trust is unverified.** `api-gateway/proxy.service.ts` forwards whatever `x-forwarded-for` chain arrived on the inbound request and only *appends* its own view of the client afterward — it never strips a client-supplied prefix. `X-Forwarded-For` is not a forbidden header in the Fetch spec, so a browser or any direct caller can set an arbitrary value and have every `extractClientIp()` in this repo (including location-service's) accept it as the real client IP. No trusted-edge/hop-limiting fix exists anywhere in this chain today.
  2. **location-service access protection is unverified.** `GET /location/resolve-ip` has no auth at all (confirmed by reading `location.controller.ts`) — matches prior status quo, not introduced or resolved this session.
- Tests: `npx jest --testPathPattern=apps/identity-verification-service` → **92/92 pass** (unaffected by the revert — all new tests are backend-provider tests, not frontend). `npm run types:check` (frontend) → no new errors in any touched file (pre-existing unrelated errors elsewhere in the repo, confirmed unrelated by grep).
- **Still not tested end-to-end (blocked, not attempted):** the full browser → gateway → location-service round trip — gateway still 502s, see "Gateway" section above. Direct-service tier 2 test (real, non-mocked): `curl localhost:3030/location/resolve-ip?ip=8.8.8.8` → real result, unaffected by this pass's changes.

## Gateway — review branch and deployment/port issues

- **Isolated branch:** `fix/gateway-identity-verification-location-routing` (worktree `/Users/dheeraj/Desktop/gateway-routing-fix`), commit `c2580804`, based on `origin/dev-main`. Currently **1 commit behind** `origin/dev-main` — needs a fetch/rebase check before it's ever pushed. **Not pushed. No PR opened.**
- **Exact diff, and which half is actually CTO-gated:**
  ```
  proxy.controller.ts: + 'identity-verification': 'identityVerification', + location: 'location'
                       + else-if branch: segments[1] === 'identity-verification' → prefix = 'identity-verification'
                       (NOT a locked file per SOP §1.4 — see "Gateway — proxy.controller.ts frozen-file
                       status, corrected" above. This half already landed on the integration branch
                       itself via d2bbdfa6, independent of this isolated branch.)
  proxy.service.ts:    + identityVerification: config.get('IDENTITY_VERIFICATION_SERVICE_URL') || 'http://localhost:3019'
                       + location: config.get('LOCATION_SERVICE_URL') || 'http://localhost:3030'
                       (THIS is the SOP §1.4 permanently-locked, CTO-only file. This half is the only
                       piece still needed, still unapplied anywhere, and still the actual reason the
                       gateway path 502s end-to-end.)
  ```
- **Local ports (verified live this session):** api-gateway 4000, identity-verification-service 3019, location-service 3030 — all match `ecosystem.config.js`.
- **Deployment gap, not fixed:** `location-service` is absent from `boot-all.js`/`Dockerfile.all` (shared Render backend) — confirmed by grep. Adding it needs a port that doesn't collide with `wallet-service`, which already occupies 3030 in `boot-all.js`. A free port was identified and live-verified for **local ad-hoc testing only** (3036 — not reserved anywhere in `ecosystem.config.js`/`boot-all.js`/CLAUDE.md's own port table, confirmed via `lsof`) — this was proposed **as a suggestion for Chris/CTO, not an approved production/staging assignment**, and nothing in `boot-all.js` or `Dockerfile.all` has been edited.
- location-service's own `GET /location/resolve-ip` route has **no auth at all** today (confirmed by reading the controller) — the new provider calls it unauthenticated, server-to-server, matching the existing status quo. Flagged, not fixed (would be a change to another service's contract).

## Restrictions in force — do not relax any of these without the user explicitly saying so this session

- **No edits to `proxy.service.ts`** — the actual SOP §1.4 permanently-locked, CTO-only file; its still-unapplied `serviceMap` entries stay on the isolated branch until explicit CTO approval. (`proxy.controller.ts` is not on that locked list — see the corrected gateway section above; ordinary review norms apply to it, not a standing "isolated branch only" rule.)
- **No environment-file edits** — not `.env`, not any `.env.*.example` template. Where a config value was needed (e.g. `LOCATION_SERVICE_URL`), code reads `process.env.X || 'http://localhost:PORT'` with a hardcoded local-dev fallback, same convention as every other entry in `proxy.service.ts` — this avoids needing any env edit at all for local testing.
- **Gateway PR stays on hold** — not pushed, no PR opened, no merge, until explicit authorization.
- **Scanner work stays paused** — no edits to the document-detection scanner code this entire engagement.
- **Vendor decision: Didit only.** Do not add BlinkID or any other document-verification vendor — this was an explicit, final decision after real research; do not revisit.
- **Never print/log/commit the real proxycheck.io or LocationIQ key values.** Both were sourced from the user or from Christopher's LS-00 doc; both must stay out of chat output, files, and logs going forward.

## Confirmed VPN/proxy failure policy (do not re-litigate — settled, exhaustive)

> A successful provider check reporting no VPN or proxy is required before continuation past this connection check. Clean result → allow continuation. VPN, proxy, or both detected → block and show the matching warning. Timeout, outage, invalid credentials, exhausted quota, malformed response, or any other unsuccessful check → block and show: "We couldn't check your connection. Please try again later." Retry must perform a new provider check. Never offer Skip, Continue anyway, or another route that grants access without a successful clean result. Do not treat an error as "none" or claim VPN/proxy was detected when the check failed. Do not consume a verification attempt or change verification status. This policy blocks continuation of this flow. It does not authorize account suspension or revoking existing verified access elsewhere.

This is fully implemented and tested as described above (`ConnectionCheckUnavailableException`, guard behavior, frontend `"unavailable"` outcome, no attempt/status mutation).

## Gotchas / Notes

- `checkIdentityVerificationStatus()` and `checkVpnProxy()` are no longer permanent mocks — both call real endpoints, both fail honestly to `"unavailable"` rather than defaulting to a fake clean/unstarted value.
- `backend/jest.config.js` is new and required — without it `npx jest` fails repo-wide (confirmed on the unrelated `auth-service` too), not specific to this service.
- Local Docker (RabbitMQ/Redis/Postgres) can get **manually paused** by Docker Desktop's own pause feature — ports still show as LISTENING via `lsof` when paused (Docker's proxy holds them), causing `api-gateway` to hang mid-boot with no error, `/health` → `000`. Check `docker ps` / `docker desktop status` before assuming a code problem.
- `boot-all.js`'s port numbering is a **separate scheme** from local `ecosystem.config.js` — e.g. identity-verification-service is 3019 locally but 3035 in `boot-all.js`. Don't assume one matches the other.

## Agent Log
- 2026-09-23: VPN/proxy real backend built + tested (78 tests). Location-service migration built + tested (+7 tests, 85 total; real direct-service integration confirmed live). Gateway fix isolated on a separate branch, held. Frontend gate/flow wired to real endpoints, dev-preview banner added then fully removed per user direction. This handoff file written at end of session — no implementation changed while writing it.
- 2026-09-23 (second session): Unified current-location text + map to one chained live lookup (resolveIp → resolveCoordinates on the same coordinates), reusing location-service's existing resolve-coordinates endpoint. Added real response-content validation to the backend location provider (+7 tests, 92 total) and to the frontend's location API consumers. Found and flagged (not fixed) an unverified client-IP-trust gap in api-gateway's XFF handling. Incorrectly characterized `proxy.controller.ts`'s `d2bbdfa6` change as an undisclosed frozen-file violation, based on over-reading a prior memory note rather than verifying the actual SOP §1.4 locked-file list.
- 2026-09-23 (third session): User correction, both applied. (1) LS-00 reserves `resolve-coordinates` for GPS-based display — removed the second session's reverse-geocode chain entirely; `detected-location.ts` now reads only `resolveIp()`, city/region left honestly empty since that response never supplies them, `location.ts` reverted to its original single-method shape. Kept the label's `.filter(Boolean).join(', ')` fix and both response-validation additions (backend provider + frontend), neither depended on the reverted step. Re-ran `npx jest --testPathPattern=apps/identity-verification-service` → still 92/92 (all new tests are backend-only, unaffected). `npm run types:check` clean on touched files. (2) Verified `docs/CODE_REVIEW_SOP.md` §1.4 directly: only `proxy.service.ts` is on the permanently-locked list, `proxy.controller.ts` is not — corrected the second session's mistaken "unauthorized/undisclosed" framing throughout this file; `d2bbdfa6`'s `proxy.controller.ts` change stands as a legitimate, already-documented routing addition, not something needing reversion or escalation. No frozen files edited by this agent at any point; no env files edited; gateway PR still on hold, not pushed; scanner code untouched; Didit remains the only vendor. Nothing committed or pushed — all changes left as uncommitted working-tree modifications.
