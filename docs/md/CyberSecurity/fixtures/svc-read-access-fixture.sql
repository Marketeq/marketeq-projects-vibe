-- =============================================================================
-- Read-Access Governance -- test fixture (US-3.1 / US-3.2 / US-3.3)
-- Test cases 8, 9 and 10.
--
-- Idempotent: safe to run repeatedly against supabase-dev. Never run against
-- supabase-live.
--
-- Creates two mock services with schema-scoped roles, and the versioned read
-- contract the policy requires (docs/md/Database Architecture/Microservice
-- Data Ownership & Database Access Policy.md).
--
-- Deliberately does NOT grant svc_a_rw anything on svc_b. That is the point:
--   - case 8 requires cross-schema access to be denied
--   - case 10 requires the grant to be absent until approved
-- Apply the grant separately with svc-read-access-grant.sql, revoke with
-- svc-read-access-revoke.sql.
--
-- Run as a superuser:  psql "$DATABASE_URL" -f svc-read-access-fixture.sql
-- =============================================================================

-- Roles. Give them passwords out of band; never put one in this file.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'svc_a_rw') THEN
        CREATE ROLE svc_a_rw LOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'svc_b_rw') THEN
        CREATE ROLE svc_b_rw LOGIN;
    END IF;
END
$$;

CREATE SCHEMA IF NOT EXISTS svc_a AUTHORIZATION svc_a_rw;
CREATE SCHEMA IF NOT EXISTS svc_b AUTHORIZATION svc_b_rw;

CREATE TABLE IF NOT EXISTS svc_a.widgets (
    id          bigserial PRIMARY KEY,
    name        text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- svc_b.orders carries a column the read contract must NOT expose, so case 9
-- step 1 can assert "exactly the view's columns".
CREATE TABLE IF NOT EXISTS svc_b.orders (
    id              bigserial PRIMARY KEY,
    customer_id     bigint NOT NULL,
    total_cents     bigint NOT NULL,
    status          text NOT NULL,
    internal_notes  text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- The read contract: a versioned view, per the policy ("Views (preferred)",
-- "Versioned views (for breaking changes)"). internal_notes is withheld.
CREATE OR REPLACE VIEW svc_b.orders_v1 AS
    SELECT id, customer_id, total_cents, status, created_at
    FROM svc_b.orders;

ALTER VIEW svc_b.orders_v1 OWNER TO svc_b_rw;

-- Each role owns its own schema and nothing else.
GRANT USAGE ON SCHEMA svc_a TO svc_a_rw;
GRANT ALL ON ALL TABLES IN SCHEMA svc_a TO svc_a_rw;
GRANT ALL ON ALL SEQUENCES IN SCHEMA svc_a TO svc_a_rw;

GRANT USAGE ON SCHEMA svc_b TO svc_b_rw;
GRANT ALL ON ALL TABLES IN SCHEMA svc_b TO svc_b_rw;
GRANT ALL ON ALL SEQUENCES IN SCHEMA svc_b TO svc_b_rw;

-- No standing access from the default roles (US-3.4).
REVOKE ALL ON SCHEMA svc_a, svc_b FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA svc_a FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA svc_b FROM PUBLIC;

-- A little data, so a successful read is distinguishable from an empty one.
INSERT INTO svc_a.widgets (name)
SELECT 'widget-' || g FROM generate_series(1, 3) g
WHERE NOT EXISTS (SELECT 1 FROM svc_a.widgets);

INSERT INTO svc_b.orders (customer_id, total_cents, status, internal_notes)
SELECT g, g * 1000, 'paid', 'internal only'
FROM generate_series(1, 3) g
WHERE NOT EXISTS (SELECT 1 FROM svc_b.orders);
