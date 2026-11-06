# Read-Access Governance — test fixture

Setup for test cases **8 (US-3.1)**, **9 (US-3.2)** and **10 (US-3.3)**. Three
cases were blocked on the same unbuilt setup, so it is one task, not three.

Run against `supabase-dev` as a superuser. Never against `supabase-live`.

```sh
psql "$DATABASE_URL" -f svc-read-access-fixture.sql
```

| File | What it does | Used by |
|---|---|---|
| `svc-read-access-fixture.sql` | Two schemas (`svc_a`, `svc_b`), two schema-scoped roles (`svc_a_rw`, `svc_b_rw`), a table in each, and the versioned read contract `svc_b.orders_v1`. **No cross-schema grant.** | 8, 9, 10 |
| `svc-read-access-grant.sql` | Applies the approved cross-schema grant: `SELECT` on `svc_b.orders_v1` to `svc_a_rw`. | 9, 10 |
| `svc-read-access-revoke.sql` | Revokes it. | 10 |

**Why the grant is a separate file.** Case 8 requires cross-schema access to be
denied, and case 10 requires the grant to be absent until it has been approved.
If the fixture applied the grant, neither could be tested. Run the fixture, test
the denial, then apply the grant only when the case calls for it.

The fixture is idempotent — running it twice is a no-op.

## Expected results

Verified on PostgreSQL 16 before these files were committed:

| Action | Expected |
|---|---|
| `svc_a_rw` reads `svc_b.orders_v1` before the grant | `ERROR: permission denied for schema svc_b` |
| after `svc-read-access-grant.sql` | returns exactly `id, customer_id, total_cents, status, created_at` — `internal_notes` is withheld |
| `svc_a_rw` reads the base table `svc_b.orders` | `ERROR: permission denied for table orders` |
| after `svc-read-access-revoke.sql` | `ERROR: permission denied for view orders_v1`, exit code 1 |

## One warning, for AC-3.3.3

AC-3.3.3 requires that a revoked consumer gets a clear permissions error, **not a
silent empty result**. `GRANT` / `REVOKE` satisfies that, as above.

Row-level security does not. The same read contract, gated with RLS instead of a
grant, returns `(0 rows)` and **exit code 0** when access is withdrawn — which is
exactly the silent empty result the criterion forbids. Both are plausible
readings of "revoke access to a view"; only one passes.

Access to read contracts should therefore be withdrawn with `REVOKE`. The Data
Ownership & Database Access Policy does not currently say so, and should.
