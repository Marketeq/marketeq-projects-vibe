# notification-service Memory

## Status
Implemented. PMCM-651 (persistent status alerts) is complete on the backend and the dashboard (branch PMCM-651-identity-verification-persistent-status-alerts).

## What This Service Does
Stores and delivers user notifications. PMCM-651 adds a separate persistent status-alert stream whose dismissal is independent of bell-notification read/archive state and notification preferences.

## Entities / Database Tables
- `persistent_status_alerts`: one row per user, alert type, and occurrence key (unique); `dismissedAt` persists dismissal across sessions. `createdAt`/`updatedAt`/`dismissedAt` are `timestamptz` (a zone-less timestamp was read back in the server's local zone, hours off on a non-UTC host).

## API Endpoints
- `GET /v1/notifications/status-alerts`: active alerts for the signed-in user, newest first, at most 20.
- `POST /v1/notifications/status-alerts/:id/dismiss`: idempotently dismisses an alert owned by the signed-in user.

## RabbitMQ Events
- Listens to `notification.status_alert.upsert` (published by identity-verification-service's `StatusAlertPublisher` on `notification_service_queue`) with the same bounded retry and dead-letter behavior as `notification.send`. A malformed payload (including a bad `supersedes` list) is dead-lettered at once, not retried.

## Key Decisions
- Retrying the same occurrence never duplicates or resurrects a dismissed alert.
- Alert persistence is independent of user notification-channel preferences.
- Producers use one of `travel_mode`, `submitted_for_review`, `verified`, or `home_country_updated` plus a stable occurrence key (hosted session id, or the Travel Mode activation time).
- `supersedes` (optional list): when a NEW occurrence is stored, the listed active alerts of the same user are dismissed in the same transaction. An entry is a bare type (account-wide: used for Travel Mode, which an approved home-country change ends for the whole account) or `{type, occurrenceKey}` (exactly that occurrence: Verified and Home Country Updated name the Submitted alert of THEIR OWN verification session, so a delayed approval never dismisses a newer, unrelated Submitted alert). A redelivered occurrence returns before superseding. The bare-type form from the first version is still accepted (account-wide); nothing is stored differently, so no migration.

## Gotchas / Notes
- Migration `1799900000000-CreatePersistentStatusAlerts` (auto-run: `migrationsRun: true`) must be applied before producers are enabled: deploy notification-service BEFORE identity-verification-service (an unknown pattern is acknowledged and dropped by `AckingServerRMQ`, so events published earlier would be lost).

## Agent Log
- 2026-10-22: PMCM-651 Phase 1 added persistence, authenticated list/dismiss APIs, idempotent upsert handling, and reliable RabbitMQ delivery.
- 2026-10-26: PMCM-651 complete: publishers in identity-verification-service, `supersedes`, timestamptz columns, and the dashboard stack (see identity-verification-service.md).
