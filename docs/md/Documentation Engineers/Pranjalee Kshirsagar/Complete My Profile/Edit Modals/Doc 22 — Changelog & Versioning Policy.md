# **Changelog & Versioning Policy**

**Project:** Complete My Profile --- **Edit Modals** (Backend)\
**Service:** apps/user-service (expand existing user service)\
**Scope:** How we **version**, **tag**, and **record changes** for this
feature set. Aligns with existing standards: stable API prefix /v1,
additive migrations, JSON-only, no external integrations.

## **1) Versioning Model**

- **Semantic Versioning (SemVer)** for the **service**:
  MAJOR.MINOR.PATCH

  - **MAJOR**: Backward-incompatible API changes (avoid; prefer new
    endpoints/fields).

  - **MINOR**: Backward-compatible features (new fields, new endpoints,
    new query params with safe defaults).

  - **PATCH**: Backward-compatible fixes (bugfixes, perf, docs,
    observability).

- **API Path Version**: /v1/...

  - /v1 remains stable even as service SemVer advances. Breaking REST
    changes require a **new path** (e.g., /v2), not a silent /v1
    mutation.

- **Database Migrations**: strictly **additive** in this sprint. A
  migration does **not** force a MAJOR bump by itself; only a **breaking
  API** does.

## **2) What Counts as "Breaking"**

- **Breaking (requires /v2 or MAJOR):\**

  - Remove or rename an endpoint.

  - Change request **required fields** or response **field types**.

  - Tighten validation in a way that invalidates previously valid
    requests (without feature flag / transition period).

- **Non-breaking (MINOR/PATCH):\**

  - Add **optional** request fields with defaults.

  - Add response fields (clients should ignore unknown fields).

  - Add **new** endpoints under /v1.

  - Extend pagination or filtering with optional params.

  - Performance/observability changes.

## **3) Service Version Source of Truth**

- **Package manifest** inside service:

  -----------------------------------------------------------------------
  // language: json\
  // apps/user-service/package.json (excerpt)\
  {\
  \"name\": \"@marketeq/user-service\",\
  \"version\": \"1.0.0\",\
  \"private\": true\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

- **Git tag** on release:

  -----------------------------------------------------------------------
  \# language: bash\
  git tag user-service-v1.0.0\
  git push origin user-service-v1.0.0
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

*(Monorepo may have multiple tags; prefix with service name to avoid
collisions.)*

## **4) Changelog Location & Format**

- One **human-readable** changelog per service:

apps/user-service/CHANGELOG.md

- **Keep a Changelog** style, chronologically newest → oldest, grouped
  by **Added / Changed / Fixed / Deprecated / Removed / Security**.

  -----------------------------------------------------------------------
  \<!\-- language: markdown \--\>\
  \# Changelog \-- \@marketeq/user-service\
  \
  \## \[1.0.0\] \-- 2025-10-28\
  \### Added\
  - About, Skills, Experience, Education, Rates, Portfolio endpoints
  under *\`/v1/users/:userId/profile/\*\`*.\
  - Progress endpoint (server-source-of-truth; FE does not compute
  locally).\
  - Audit logging (minimal, no sensitive bodies).\
  - Health, readiness, and basic metrics.\
  \
  \### Security\
  - JSON-only enforcement; reject *\`multipart/form-data\`*.\
  - HTML sanitization for About/Experience/Education.\
  \
  \## \[0.1.1\] \-- 2025-10-21\
  \### Fixed\
  - Error envelope mapping for *\`UnsupportedMediaTypeException\`* →
  *\`VALIDATION_ERROR\`*.\
  \
  \## \[0.1.0\] \-- 2025-10-20\
  \### Added\
  - Project scaffolding, migrations (additive), observability skeleton.
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **5) Release Steps (summary)**

1.  Merge to main with passing CI (tests, migrations build).

2.  Update package.json **version** (SemVer) + **CHANGELOG.md**.

3.  Tag: user-service-vX.Y.Z.

4.  Build & deploy image for environment(s).

5.  Verify observability (Doc 12) and smoke tests (Doc 09).

## **6) Deprecation Policy (for /v1)**

- Prefer **add** over **change**. When a change is needed:

  - Introduce **new fields** while keeping old ones.

  - Mark old fields **Deprecated** in the changelog and API docs.

  - Maintain both for a **grace period** (policy default: **90 days**)
    before removal or move to /v2.

- If a removal is unavoidable, publish:

  - **MINOR** release announcing deprecation.

  - Final removal in the **next MAJOR** or /v2 path with date in the
    changelog.

## **7) Backward Compatibility Rules (quick reference)**

- **Never** change the meaning or type of existing response fields.

- **Never** make an optional request field required without a
  transition.

- **Never** change error code identifiers already published (e.g.,
  CONFLICT_DUPLICATE).

- **OK** to add fields the client can ignore.

- **OK** to add endpoints, query params, or pagination metadata.

## **8) Migration & Data Notes in Releases**

If a version includes schema changes, summarize briefly and link to the
migration ID:

  -----------------------------------------------------------------------
  \<!\-- language: markdown \--\>\
  \## \[1.1.0\] \-- 2025-11-05\
  \### Added\
  - Portfolio search *\`q\`* param (non-breaking).\
  \### Changed\
  - Migration *\`1710000000009\`* adds functional index on
  *\`url_normalized\`* (additive).\
  \### Ops\
  - Run migration before rollout; no downtime expected.
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **9) Commit Message Convention (lightweight)**

Use **Conventional Commits** for clarity (no extra tooling required):

- feat(user-service): add /progress endpoint

- fix(rates): map duplicate title to CONFLICT_DUPLICATE

- docs(changelog): 1.0.0 release notes

- refactor(skills): collapse whitespace before norm

- perf(education): index start_date

- revert: feat(portfolio): experimental drafts

This helps auto-generate draft release notes if needed later.

## **10) Release PR Template**

  -----------------------------------------------------------------------
  \<!\-- language: markdown \--\>\
  \## Release: \@marketeq/user-service vX.Y.Z\
  \
  \### Summary\
  - Short description of what\'s in this release.\
  \
  \### Changes\
  - Added:\
  - \...\
  - Changed:\
  - \...\
  - Fixed:\
  - \...\
  - Security:\
  - \...\
  \
  \### Migrations\
  - IDs: 1710000000008-backfill-and-constraints (additive)\
  - Order: run before app rollout\
  - Rollback: DROP *\*indices only\** if needed; keep tables (see Doc
  14)\
  \
  \### Verification\
  - Health/ready OK\
  - Smoke tests (Doc 09) green\
  - Metrics emitting\
  \
  \### Risk\
  - Low / Medium / High \-- rationale
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **11) Example: Today's Initial GA**

- **Service SemVer:** 1.0.0

- **API Path:** /v1 (stable)

- **Changelog entry:** as shown in §4

- **Tag:** user-service-v1.0.0

- **Notes:** All changes are **additive**; no client breakage.

## **12) FAQs**

- **Q:** Do new response fields force MINOR or PATCH?\
  **A:** **MINOR** (they\'re features), but **PATCH** is acceptable if
  purely informational/observability.

- **Q:** When do we move to /v2?\
  **A:** Only when we must remove/rename existing contracts or make
  previously-valid requests invalid.

- **Q:** Do DB-only performance indexes require a version bump?\
  **A:** Yes---**PATCH** (it's a visible artifact in release), but no
  API bump.

## **13) Files to Touch per Release**

  -----------------------------------------------------------------------
  apps/user-service/package.json \# bump \"version\"\
  apps/user-service/CHANGELOG.md \# add entry\
  apps/user-service/src/database/migrations/\* \# if any\
  .git tags: user-service-vX.Y.Z
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **14) Non-Goals**

- No per-endpoint microversioning headers.

- No automatic changelog generators mandated; manual, concise entries
  preferred.

- No changes to the global API gateway versioning rules.
