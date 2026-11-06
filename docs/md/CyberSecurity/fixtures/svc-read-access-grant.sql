-- Apply the APPROVED cross-schema read grant (US-3.3 step 3).
-- Run only after the owning service has approved, and after the grant has been
-- recorded (view definition, granted role, approver, date) -- AC-3.3.2.
GRANT USAGE ON SCHEMA svc_b TO svc_a_rw;
GRANT SELECT ON svc_b.orders_v1 TO svc_a_rw;
