# content-moderation-service Memory

## Status
Scaffolded

## Docs Location
/docs/Technical Documentation/Content Moderation Service/
- Document 1-22 covering: overview, API endpoints, filter logic, content types, workflow,
  autocomplete integration, media moderation, filters, approval flow, edge cases,
  API integration, testing, manual review, banned keywords, media (3rd party),
  logs, access control, UI integration, reporting, appeals, listing integration,
  monitoring, maintenance.

## What This Service Does
Moderates content submitted to the platform (projects, listings, profiles).
Auto-approves/rejects based on filters, flags for manual review, integrates with listings-service.

## Key Events
- Listens: listing.submitted
- Emits: listing.approved, listing.rejected, listing.flagged

## Agent Log
