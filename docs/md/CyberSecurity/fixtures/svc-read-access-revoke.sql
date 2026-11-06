-- Revoke the cross-schema read grant (US-3.3, AC-3.3.3).
--
-- Use REVOKE, not row-level security. RLS withdraws access silently: the
-- consumer gets (0 rows) and exit code 0, which AC-3.3.3 explicitly forbids.
-- REVOKE produces "permission denied for view orders_v1" and exit code 1.
REVOKE SELECT ON svc_b.orders_v1 FROM svc_a_rw;
REVOKE USAGE ON SCHEMA svc_b FROM svc_a_rw;
