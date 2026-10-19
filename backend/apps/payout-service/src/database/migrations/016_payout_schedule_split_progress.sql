-- Split scheduled payouts: remember which due occurrence the primary leg was created for and the
-- secondary amount fixed at that moment, so a retry (queue redelivery, process restart, a gate
-- outage between the two legs) resumes the unfinished leg instead of paying the primary again.
-- Written in the same transaction as the primary payout_requests row; cleared when the occurrence
-- finishes. Additive and nullable: no backfill, no data change, safe to run before or after deploy.
--
-- Run with:
--   docker exec -i marketeq-db psql -U postgres -d payout_db < migrations/016_payout_schedule_split_progress.sql

ALTER TABLE payout_schedules
  ADD COLUMN IF NOT EXISTS split_occurrence_at TIMESTAMPTZ NULL;

ALTER TABLE payout_schedules
  ADD COLUMN IF NOT EXISTS split_secondary_usd NUMERIC(18,8) NULL;
