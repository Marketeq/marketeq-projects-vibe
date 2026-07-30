-- US-72: custom deposit schedules can be given an optional start date and
-- end date, so a contractor can e.g. pause scheduled payouts during a
-- planned absence without disabling the schedule entirely.
ALTER TABLE payout_schedules
  ADD COLUMN start_date timestamptz NULL,
  ADD COLUMN end_date timestamptz NULL;
