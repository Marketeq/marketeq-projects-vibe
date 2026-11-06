# PMCM-216: Restore the checkout work dropped when the branch was brought up to date

- Date: 2026-10-26
- Branch / PR: fix/PMCM-216 (#818)
- Services / areas: listings-service, search-service, checkout project-details page, scope-builder, group layout

## What changed
- Restored the checkout work dropped in an earlier update of the branch (checkout/project-details page, ScopeBuilder, project-details/[slug], group-layout-inner, search-service db-fallback).
- listings-service: connects the checkout RPC consumer (`listings_service_queue`) and the identity gate-change consumer only when `RABBITMQ_URI` / `RABBITMQ_URL` exists. Without a URL it logs a warning and the HTTP API still starts.
- Roster code (projects.service.ts, projects.module.ts and the two roster specs) is identical to dev-main.
- PMCM-402 routing comment restored in checkout/project-details/page.tsx.
- Branch brought up to date by merging origin/dev-main (no conflicts).

## Findings (not changed)
- Blocker 1 (#777 billing period line): still open, waiting on the PMCM-259 owner.
- Blocker 2 (frozen active-project/[id] ScopeBuilder behaviour): needs @CTorres9800 sign-off.

## Verification
- `git diff origin/dev-main` for the roster files is empty.

## Follow-ups
- Resolve blockers 1 and 2, then re-request review from MytreshR.
