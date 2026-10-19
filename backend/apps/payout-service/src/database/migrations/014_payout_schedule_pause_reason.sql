-- G9: a scheduled payout is PAUSED, never cancelled or deleted, when the
-- contractor's verification gate closes. The existing payout_schedules.paused_at
-- column already makes the execution cron skip a schedule; this adds the reason it
-- was paused so that, when identity-verification-service later reports the gate
-- open again, ONLY schedules paused for verification are resumed automatically
-- (a schedule paused or disabled for any other reason stays exactly as it is).
--
-- Nullable and defaulting to NULL: every existing row (including any already
-- paused for another reason) keeps pause_reason = NULL and is therefore never
-- resumed by the verification path. The schedule's configuration (frequency,
-- method, split, threshold, reserve, cadence) is not touched by pausing.
--
-- Run with:
--   docker exec -i marketeq-db psql -U postgres -d payout_db < migrations/014_payout_schedule_pause_reason.sql

ALTER TABLE payout_schedules
  ADD COLUMN IF NOT EXISTS pause_reason VARCHAR(64) NULL;

-- The resume path looks up one contractor's verification-paused schedule.
CREATE INDEX IF NOT EXISTS idx_payout_schedules_verification_paused
  ON payout_schedules (contractor_id)
  WHERE pause_reason = 'verification_required';
