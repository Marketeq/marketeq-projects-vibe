# CS-08 Audit Gap Analysis

Date: 2026-04-17 (updated)
Scope: CS-08 - Updating CMS Content in Payload
Audit basis: current repository implementation in cms-service, listings-service, and frontend

## Executive Summary

The CS-08 target architecture is implemented and verified.

Implemented and aligned:

- Payload is used as the editing/admin layer for project content.
- Project updates flow from cms-service to listings-service via sync hooks.
- Public website reads from listings-service endpoints, not from Payload runtime APIs.
- Frontend revalidation webhook path exists so editors can see updates quickly after publish.
- No project_editorial table pattern is present.
- Sync payload now uses an explicit projection allowlist in cms-service (no broad spread of Payload doc).
- Unknown sync fields are now rejected at runtime on `POST /internal/project-sync`.
- Contract tests cover valid payload acceptance, unknown-field rejection, and invalid token rejection.

Remaining optimization area:

- Projection boundary and redundancy gaps are now closed for the current CS-08 scope.
- Any further narrowing is optional, product-level optimization rather than architecture debt.

## Requirement-by-Requirement Audit

### R1. Frontend should not read from Payload at runtime

Status: PASS
Evidence:

- frontend project details fetches from /v1/projects/slug/:slug
  - frontend/app/(group)/(group)/project-details/[slug]/page.tsx
- listings-service exposes public read endpoints under /v1/projects
  - backend/apps/listings-service/src/cms-projects/cms-projects.controller.ts

### R2. Payload should remain editing/admin layer

Status: PASS
Evidence:

- Projects collection is configured in cms-service and uses authoring hooks
  - backend/apps/cms-service/src/collections/Projects.ts

### R3. Save flow should compute, sync, then revalidate

Status: PASS
Evidence:

- beforeChange compute hook configured
  - backend/apps/cms-service/src/collections/Projects.ts
  - backend/apps/cms-service/src/hooks/beforeChange/computeProjectFields.ts
- afterChange sync hook configured
  - backend/apps/cms-service/src/collections/Projects.ts
  - backend/apps/cms-service/src/hooks/afterChange/syncProjects.ts
- frontend ISR revalidate endpoint exists and is called by sync hook
  - frontend/app/api/revalidate/route.ts
  - backend/apps/cms-service/src/hooks/afterChange/syncProjects.ts

### R4. Do not add project_editorial table right now

Status: PASS
Evidence:

- No project_editorial implementation found in backend app source paths.

### R5. Avoid redundant duplicate full-record storage

Status: PASS
Evidence:

- Sync path now maps only explicit allowlisted fields (projection contract) before sending to listings-service:
  - backend/apps/cms-service/src/hooks/afterChange/syncProjects.ts
- listings-service rejects non-allowlisted keys at runtime on sync endpoint:
  - backend/apps/listings-service/src/project-sync/project-sync.contract.middleware.ts
  - backend/apps/listings-service/src/project-sync/project-sync.module.ts
- Raw Payload media refs and non-serving metadata are no longer part of sync contract (serving URLs only):
  - backend/apps/listings-service/src/project-sync/dto/project-sync.dto.ts
  - backend/apps/listings-service/src/project-sync/project-sync.service.ts
- public.projects remains the runtime read model for frontend:
  - backend/apps/listings-service/src/cms-projects/cms-projects.controller.ts

Interpretation:

- Current architecture keeps editing and serving paths separate and now enforces a hard sync boundary.
- Sync payload is serving-focused and excludes redundant raw media/editorial fields.

## Gap Register

### G1. Duplicate full-record representation remains broad

Status: CLOSED
Severity: Resolved
Resolution:

- Removed redundant raw media refs from sync contract (`thumbnail`, `gallery`, `videoWalkthrough`).
- Removed non-serving sync metadata (`projectDurationTotal`, `createdAt`, `updatedAt`) from contract.
- Listings-service now consumes serving URLs only (`thumbnailUrl`, `galleryUrls`, `videoUrl`) with no raw-ref fallbacks.
- Runtime middleware blocks removed/editorial keys.

Evidence:

- backend/apps/cms-service/src/hooks/afterChange/syncProjects.ts
- backend/apps/listings-service/src/project-sync/dto/project-sync.dto.ts
- backend/apps/listings-service/src/project-sync/project-sync.contract.middleware.ts
- backend/apps/listings-service/src/project-sync/project-sync.service.ts

### G2. No explicit projection-boundary contract for minimal serving model

Status: CLOSED
Severity: Resolved
Resolution:

- Added explicit projection object in cms-service sync hook (removed broad `...doc` behavior).
- Added strict unknown-key rejection middleware on `POST /internal/project-sync`.
- Added controller contract tests for valid payload, unknown-field rejection, and invalid token rejection.

Evidence:

- backend/apps/cms-service/src/hooks/afterChange/syncProjects.ts
- backend/apps/listings-service/src/project-sync/project-sync.contract.middleware.ts
- backend/apps/listings-service/src/project-sync/project-sync.module.ts
- backend/apps/listings-service/src/project-sync/project-sync.controller.spec.ts

## Recommended Remediation Plan

### Priority 1 (short term)

1. Keep projection allowlist as the source-of-truth contract

- Any new sync field must be intentionally added to the projection allowlist and contract middleware.
- Reject unknown fields by default.

2. Keep sync contract tests mandatory in CI

- Verify valid payload path.
- Verify unknown-field rejection path.
- Verify auth rejection path.

### Priority 2 (medium term)

3. Narrow the projection further (optional optimization)

- Classify each field as serving-critical/supporting vs editorial-only.
- Remove non-serving fields in controlled slices with frontend/API regression checks.

4. Add field-level ownership documentation

- For every project field, state source-of-truth owner and serving owner.
- Store in docs/md/CMS Service/projects as a canonical field matrix.

## Verification Checklist for Closure

- Frontend project pages still read only from /v1/projects endpoints.
- Project publish from Payload still appears on frontend after revalidation.
- Sync payload is explicitly projected in cms-service (no broad document spread).
- Unknown sync fields are rejected at runtime.
- No project_editorial table introduced.

## Verification Evidence (This Update)

- Unit test pass:
  - `npm run test -w apps/listings-service -- project-sync.controller.spec.ts --runInBand`
  - Result: 3/3 tests passed.
- Runtime endpoint verification:
  - Valid payload -> `201 Created`
  - Invalid payload with `adminNotes` -> `422 Unprocessable Entity` and `property adminNotes should not exist`
  - Invalid payload with removed field `createdAt` -> `422 Unprocessable Entity` and `property createdAt should not exist`

## Final Audit Verdict

Overall result: PASS

Operational CS-08 behavior is implemented and verified in both tests and runtime.
All identified sync-boundary and duplication-scope gaps for CS-08 are closed.
