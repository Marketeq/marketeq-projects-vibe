# **Cross-Schema Read Grants — Register**

The record of every cross-schema read grant in the Marketeq database: what is
exposed, to whom, who approved it, and when. Required by the
[Microservice Data Ownership & Database Access Policy](./Microservice%20Data%20Ownership%20&%20Database%20Access%20Policy.md)
("all new cross-schema access must be reviewed; all schema contracts must be
documented") and by AC-3.3.2.

Keeping it in the repository rather than a wiki is deliberate: engineers already
work here, and git supplies the date and the author of every row for free, which
no hand-maintained page does reliably.

---

## **Active grants**

| View (the read contract) | Owning service | Granted to | Approved by | Date | PR |
|---|---|---|---|---|---|
| _none_ | | | | | |

**The table is empty because no cross-schema grants exist yet, not because
nobody has filled it in.** There are currently no per-service database roles —
services connect as `postgres`. Until the roles mandated by the policy exist,
there is nothing to grant between. The first row goes in with the first role.

## **Revoked grants**

Revoked rows move here rather than being deleted. A grant that once existed is
part of the history of who depended on what.

| View | Granted to | Approved by | Granted | Revoked | Why |
|---|---|---|---|---|---|
| _none_ | | | | | |

---

## **Adding a grant**

A cross-schema read is a change to the owning service's public surface, so it
goes through that service's owners, not around them.

1. **Open a PR** containing both halves together — the migration that creates or
   amends the view and applies the `GRANT`, and the new row in the table above.
   One without the other is incomplete.
2. **Request review from the owning service's team.** The grant is theirs to
   approve; the consumer cannot approve its own access.
3. **Apply the grant only after that approval**, and record the approver and the
   PR number in the row.

Fill in the row as:

| Field | What goes in it |
|---|---|
| View | Fully qualified, e.g. `billing.invoice_read_v1`. The contract, never a base table. |
| Owning service | The service whose schema is being read. |
| Granted to | The database role, e.g. `orders_rw`. Never a person. |
| Approved by | The GitHub handle of whoever approved, on behalf of the owning service. |
| Date | When the grant was applied, `YYYY-MM-DD`. |
| PR | Link to the PR that applied it. |

## **Revoking a grant**

Revoke with `REVOKE`. Do not use row-level security, and do not filter rows out
of the view.

Both look like "the consumer can no longer read this", but only `REVOKE` tells
them so. RLS returns `(0 rows)` and exit code 0 — the consumer sees an empty
result and cannot distinguish lost access from genuinely having no data. That
silent failure is what AC-3.3.3 exists to prevent, and it was reproduced on
PostgreSQL 16 while testing this (see
`docs/md/CyberSecurity/fixtures/README.md`).

```sql
REVOKE SELECT ON billing.invoice_read_v1 FROM orders_rw;
```

Then move the row to **Revoked grants** with the date and the reason, and give
the consuming team notice before it lands — a revocation they learn about from a
production error is a revocation done badly.

## **Reviewing**

Walk the table whenever the access review runs. For each row ask whether the
consumer still needs it, whether the view still exposes the minimum, and whether
the read pattern has become expensive enough to warrant a design review. The
policy allows revoking on cost grounds, which only works if someone looks.
