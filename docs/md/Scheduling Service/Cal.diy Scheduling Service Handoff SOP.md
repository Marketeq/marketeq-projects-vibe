# Cal.diy Scheduling Service Handoff SOP

## Purpose

This document is a developer handoff for the self-hosted scheduling proof of concept built with `Cal.diy`.

The goal of this work was:

- keep homepage scheduling available through a scheduler pattern similar to Cal.com
- explore a self-hosted scheduler for marketplace-style user-to-user booking
- avoid paying hosted per-user/per-seat scheduling costs for every talent user
- load the scheduler inside the existing Marketeq thank-you page modal

This is a proof of concept, not a finished production integration.

## What Was Added

### New backend service

A new backend service was added at:

- [backend/apps/scheduling-service](/Users/christorres/vibecoding/marketeq-projects-vibe/backend/apps/scheduling-service)

This service vendors the open-source `Cal.diy` app into the repo:

- [backend/apps/scheduling-service/app](/Users/christorres/vibecoding/marketeq-projects-vibe/backend/apps/scheduling-service/app)

Wrapper scripts were added in:

- [backend/apps/scheduling-service/package.json](/Users/christorres/vibecoding/marketeq-projects-vibe/backend/apps/scheduling-service/package.json)

Compatibility patch:

- [backend/apps/scheduling-service/scripts/patch-install-compat.mjs](/Users/christorres/vibecoding/marketeq-projects-vibe/backend/apps/scheduling-service/scripts/patch-install-compat.mjs)

Local service README:

- [backend/apps/scheduling-service/README.md](/Users/christorres/vibecoding/marketeq-projects-vibe/backend/apps/scheduling-service/README.md)

### Frontend scheduler integration

The thank-you page `Schedule Call` flow is wired through:

- [frontend/components/cal-booking-button.tsx](/Users/christorres/vibecoding/marketeq-projects-vibe/frontend/components/cal-booking-button.tsx)
- [frontend/app/checkout/[slug]/thank-you/page.tsx](/Users/christorres/vibecoding/marketeq-projects-vibe/frontend/app/checkout/[slug]/thank-you/page.tsx)

There is also a frontend health-check route that was created during the self-hosted modal work:

- [frontend/app/api/scheduling-service/health/route.ts](/Users/christorres/vibecoding/marketeq-projects-vibe/frontend/app/api/scheduling-service/health/route.ts)

## Current State

### What works

- `Cal.diy` is vendored into the repo as a standalone scheduling service.
- The wrapper service can be started locally on port `3024`.
- A local dedicated scheduler user was created for temp preview work:
  - username: `hannah.copy`
  - event slug: `30min`
- The local scheduler routes resolve:
  - `http://localhost:3024/hannah.copy/30min`
  - `http://localhost:3024/hannah.copy/30min/embed?embedType=modal&embed=&overlayCalendar=true`
- Frame-blocking headers were patched so the auth/setup routes can load inside the frontend modal during local development.
- The thank-you page CTA UI is talent-specific and currently says “Set up your introductory call with Hannah”.

### What is not done

- This is not wired to Marketeq users.
- This is not wired to marketplace talent accounts.
- This is not wired to existing product auth.
- This is not productionized.
- The thank-you page scheduler flow is currently broken.
- The current `Schedule Call` button opens a hosted Cal modal that shows an endless loading spinner instead of a usable scheduler.
- The page copy is Hannah-specific, but the current embed target is still Marketeq-owned:
  - `marketeq/deep-dive-discovery-call`
- So the UI and the booking ownership model are currently mismatched.

## Important Files

### Service wrapper and startup

- [backend/apps/scheduling-service/package.json](/Users/christorres/vibecoding/marketeq-projects-vibe/backend/apps/scheduling-service/package.json)
- [backend/apps/scheduling-service/README.md](/Users/christorres/vibecoding/marketeq-projects-vibe/backend/apps/scheduling-service/README.md)

### Upstream app configuration

- [backend/apps/scheduling-service/app/.env](/Users/christorres/vibecoding/marketeq-projects-vibe/backend/apps/scheduling-service/app/.env)
- [backend/apps/scheduling-service/app/.env.example](/Users/christorres/vibecoding/marketeq-projects-vibe/backend/apps/scheduling-service/app/.env.example)
- [backend/apps/scheduling-service/app/apps/web/next.config.ts](/Users/christorres/vibecoding/marketeq-projects-vibe/backend/apps/scheduling-service/app/apps/web/next.config.ts)

### Frontend integration

- [frontend/components/cal-booking-button.tsx](/Users/christorres/vibecoding/marketeq-projects-vibe/frontend/components/cal-booking-button.tsx)
- [frontend/app/checkout/[slug]/thank-you/page.tsx](/Users/christorres/vibecoding/marketeq-projects-vibe/frontend/app/checkout/[slug]/thank-you/page.tsx)
- [frontend/app/api/scheduling-service/health/route.ts](/Users/christorres/vibecoding/marketeq-projects-vibe/frontend/app/api/scheduling-service/health/route.ts)

## Local Setup

### 1. Install service dependencies

```bash
cd /Users/christorres/vibecoding/marketeq-projects-vibe/backend/apps/scheduling-service
npm run install:app
```

Notes:

- The wrapper uses `npx corepack yarn@4.12.0`.
- After install, the compatibility patch runs automatically.

### 2. Configure env

Primary env file:

- [backend/apps/scheduling-service/app/.env](/Users/christorres/vibecoding/marketeq-projects-vibe/backend/apps/scheduling-service/app/.env)

Important values used in the local proof of concept:

- `NEXT_PUBLIC_WEBAPP_URL='http://localhost:3024'`
- `NEXT_PUBLIC_WEBSITE_URL='http://localhost:3024'`
- `NEXT_PUBLIC_EMBED_LIB_URL='http://localhost:3024/embed/embed.js'`
- `NEXTAUTH_URL='http://localhost:3024'`
- `ALLOWED_HOSTNAMES='"localhost:3024","localhost:3000"'`
- `ALLOW_EMBEDDING=1`

### 3. Start the scheduler service

```bash
cd /Users/christorres/vibecoding/marketeq-projects-vibe/backend/apps/scheduling-service
npm run start:dev
```

Expected local URL:

- `http://localhost:3024`

### 4. Start the frontend app

Run the frontend normally on `http://localhost:3000`.

Then visit the thank-you page and click `Schedule Call`.

Important:

- the current thank-you-page button is no longer pointing at the local `3024` iframe proof of concept
- it is currently experimenting with the hosted Cal embed runtime instead
- so starting `3024` does not, by itself, fix the current endless-spinner issue on the thank-you page

## Database Notes

### Current local database shape

The local proof of concept used a dedicated Postgres schema for this service:

- `scheduling_service`

Important detail:

- the original request was to keep the DB schema named after the service
- the service name is `scheduling-service`
- Prisma did not behave well with a hyphenated schema name in this setup
- so the DB-safe schema used was `scheduling_service`

That is the simplest practical compromise and matches the service name closely without turning schema handling into a quoting problem.

### Recommendation

Keep using:

- service name: `scheduling-service`
- DB schema: `scheduling_service`

Do not overcomplicate this unless there is a hard requirement for exact hyphenated schema naming.

## Frame / Embed Fix

By default, Cal.diy auth routes were sending `X-Frame-Options: DENY`, which broke the modal iframe.

This was patched in:

- [backend/apps/scheduling-service/app/apps/web/next.config.ts](/Users/christorres/vibecoding/marketeq-projects-vibe/backend/apps/scheduling-service/app/apps/web/next.config.ts)

Current local-development behavior:

- if `ALLOW_EMBEDDING=1`, `/auth/:path*` and `/signup` use a local CSP `frame-ancestors` header
- otherwise, they keep the stricter upstream `DENY` behavior

This is meant for local development and proof-of-concept embedding only. A production rollout should review the final allowed origins carefully.

## Frontend Behavior

Current modal file:

- [frontend/components/cal-booking-button.tsx](/Users/christorres/vibecoding/marketeq-projects-vibe/frontend/components/cal-booking-button.tsx)

Current behavior:

- the thank-you page button currently uses Cal’s hosted embed runtime, not the earlier custom iframe modal
- the current hardcoded embed target is:
  - `marketeq/deep-dive-discovery-call`
- the page it is rendered on is talent-specific and currently uses Hannah in the copy and avatar area
- clicking the button opens the Cal modal shell, but the embedded scheduler remains stuck loading

Current important mismatch:

- page copy / visual context:
  - Hannah
  - talent profile
- actual booking target in code:
  - Marketeq-owned hosted event
  - `marketeq/deep-dive-discovery-call`

So the current button is neither:

- a working Hannah-owned event flow
- nor a working local `Cal.diy` flow

It is currently an in-between broken state.

## Why The UI Looks Like Cal.com

That is expected.

`Cal.diy` is effectively the self-hosted open-source version of the Cal.com codebase lineage, so the UI looks very similar to Cal.com.

This also means some stock product copy still appears in the app, including upgrade or billing-style messaging in certain seeded routes.

## Why Some Routes Show Upgrade or Billing Copy

Example route:

- `http://localhost:3024/admin/30min?...`

That route is using the seeded default user and event type:

- user: `admin`
- event: `30min`

This is upstream default product data and UI. It does not mean the local open-source app itself requires a hosted payment plan.

Relevant local evidence:

- [backend/apps/scheduling-service/app/.env.example](/Users/christorres/vibecoding/marketeq-projects-vibe/backend/apps/scheduling-service/app/.env.example)

That file explicitly says:

- the project is MIT licensed
- no license key is required

There are still upstream license-consent and billing strings in the codebase, so some screens may look commercial or upsell-oriented until customized.

## Known Issues

### 1. Not a real marketplace integration yet

The current flow is only a local embedded proof of concept.

Missing:

- user sync between Marketeq and scheduling-service
- real talent profiles
- event ownership mapping
- product auth integration
- scheduler route selection for a real user-to-user booking flow

### 2. Thank-you-page embed currently stalls

The current `Schedule Call` button on the thank-you page opens a hosted Cal modal shell, but the scheduler inside it remains stuck loading.

Current likely root problem:

- the integration is mid-transition between:
  - local self-hosted `Cal.diy` proof of concept work
  - and hosted Cal embed code
- the current button is not aligned with the actual talent-owned scheduling model
- the embed runtime is opening, but the booker view is not reaching a usable loaded state

This needs runtime/browser debugging, not more blind patching.

### 3. Talent ownership is not wired correctly

The current page context is Hannah-specific, but the embed target is still Marketeq-owned.

That means:

- UI says “Set up your introductory call with Hannah”
- booking integration points to `marketeq/deep-dive-discovery-call`

This is incorrect for the intended marketplace-style flow.

### 4. Seeded local preview routes are only temp scaffolding

The temp local scheduler user/event setup for `hannah.copy/30min` is useful only as a proof-of-life route. It is not wired to real product auth or product ownership.

### 5. Prisma / schema edge cases

The scheduling-service local DB setup still needs careful review if the next developer wants full migration and seed confidence in a clean isolated schema.

### 6. Upstream app customization is still untouched

Branding, route design, and marketplace-specific workflow design are still mostly upstream defaults.

### 7. Existing unrelated frontend typecheck error

There is an unrelated existing TypeScript error in:

- [frontend/app/top-most-header.tsx](/Users/christorres/vibecoding/marketeq-projects-vibe/frontend/app/top-most-header.tsx)

This is not caused by the scheduling-service work.

## Recommended Next Steps For The Next Developer

### Phase 1: Stabilize and choose one integration path

1. Confirm the service boots consistently with the current wrapper scripts.
2. Confirm local DB migration strategy for the dedicated scheduler schema.
3. Decide whether the thank-you page should use:
   - hosted Cal embed
   - or local `Cal.diy`
4. Stop mixing the two on the same button flow.

### Phase 2: Fix ownership and routing

1. Stop pointing the Hannah thank-you-page CTA to the Marketeq-owned event if the goal is talent-specific scheduling.
2. Define the Marketeq-side scheduling entity model.
3. Decide how a Marketeq user maps to a scheduling-service user/profile/event.
4. If using local preview routes, make the thank-you page consistently target the created temp user route such as `hannah.copy/30min`.

### Phase 3: Design the real embedded experience

1. Decide whether the modal should open:
   - a hosted Cal embed
   - a local `Cal.diy` embed
   - or a custom embedded route built specifically for Marketeq
2. Remove upstream product chrome or upgrade/billing noise from user-facing embedded flows.
3. Verify the chosen path in a real browser runtime before additional UI tweaks.

### Phase 4: Production hardening

1. Lock down iframe origins.
2. Decide deployment model for the scheduling service.
3. Decide whether this stays as a separate service or becomes a more deeply integrated fork.

## Recommended Handoff Summary To Another Developer

If you need to brief another engineer quickly, use this:

> We vendored `Cal.diy` into `backend/apps/scheduling-service` as a standalone self-hosted scheduling service and proved local scheduler routes can run on `http://localhost:3024`, including a temp preview user `hannah.copy/30min`. We also patched Cal.diy auth/embed headers for local embedding. The thank-you page `Schedule Call` flow is currently in a broken transition state: the page is Hannah-specific, but the current button still targets the Marketeq-owned hosted Cal event `marketeq/deep-dive-discovery-call`. Clicking it opens a Cal modal shell, but the scheduler stays stuck loading. This is not yet a real marketplace integration. The next developer should first choose one path, hosted Cal or local Cal.diy, then align event ownership and verify the runtime behavior in a real browser before doing more styling work.

## Final Recommendation

Treat this as a service-level prototype, not as finished product code.

The right path for the next developer is:

- keep `scheduling-service` isolated
- keep the DB schema simple as `scheduling_service`
- stop mixing hosted Cal embed and local Cal.diy experiments on the same CTA
- align the thank-you page booking target with the actual owner of the event
- build a Marketeq-specific user/event mapping layer before going further on UX polish
