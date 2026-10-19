-- G9: records that the "scheduled payout paused" notification for the CURRENT verification
-- pause was handed to the broker. Written only after the broker accepted it; a pause that
-- still has NULL here is re-published (same idempotency key, deduplicated by
-- notification-service) so a broker outage at the moment of pausing cannot lose it.
-- Cleared on resume, so the next pause is a new notification.
--
-- Run with:
--   docker exec -i marketeq-db psql -U postgres -d payout_db < migrations/015_payout_schedule_pause_notified.sql

ALTER TABLE payout_schedules
  ADD COLUMN IF NOT EXISTS pause_notified_at TIMESTAMPTZ NULL;
