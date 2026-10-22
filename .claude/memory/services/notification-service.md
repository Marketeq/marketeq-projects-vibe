# notification-service Memory

## Status
Implemented; PMCM-651 producer and frontend wiring remain pending.

## What This Service Does
Stores and delivers user notifications. PMCM-651 adds a separate persistent status-alert stream whose dismissal is independent of bell-notification read/archive state and notification preferences.

## Entities / Database Tables
- `persistent_status_alerts`: one row per user, alert type, and occurrence key; `dismissedAt` persists dismissal across sessions.

## API Endpoints
- `GET /v1/notifications/status-alerts`: active alerts for the signed-in user, newest first.
- `POST /v1/notifications/status-alerts/:id/dismiss`: idempotently dismisses an alert owned by the signed-in user.

## RabbitMQ Events
- Listens to `notification.status_alert.upsert` with the same bounded retry and dead-letter behavior as `notification.send`.

## Key Decisions
- Retrying the same occurrence never duplicates or resurrects a dismissed alert.
- Alert persistence is independent of user notification-channel preferences.
- Producers use one of `travel_mode`, `submitted_for_review`, `verified`, or `home_country_updated` plus a stable occurrence key.

## Gotchas / Notes
- Migration `1799900000000-CreatePersistentStatusAlerts` must be applied before producers are enabled.
- Phase 1 does not publish events and does not render alerts; those changes follow after PMCM-641 and PMCM-653 are merged.

## Agent Log
- 2026-10-22: PMCM-651 Phase 1 added persistence, authenticated list/dismiss APIs, idempotent upsert handling, and reliable RabbitMQ delivery.
