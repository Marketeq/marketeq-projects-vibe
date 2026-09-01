# tax-service

**Status: NOT BUILT.** This directory is a placeholder. There is no `src/`, no
`main.ts`, and the service is deliberately **not** registered in
`backend/nest-cli.json`, so nothing here is compiled, started by PM2, or
deployed. It exists to hold the design work so it is not lost.

Read [`docs/TS-01 — Tax Filing Service Overview.md`](./docs/TS-01%20%E2%80%94%20Tax%20Filing%20Service%20Overview.md)
before writing any code here.

## Why this is a separate service

Taxpayer identity and year-end information reporting are their own bounded
context. They need append-only retention, encrypted identifiers, and an
aggregation over settled payments that crosses several other services. Today a
first cut lives inside `user-service` under `src/tax-info/`, which is the wrong
home for it long term.

## What already works today, in user-service

Working, verified code lives at `backend/apps/user-service/src/tax-info/`:

- W-9 collection, certification and submission, with the TIN encrypted at rest
- Generation of the **real IRS Form W-9** and **Form 1099-K, Copy B**, filled
  from the contractor's own data using the official government PDFs
- Guards that refuse to produce any form that cannot be filled completely

That code is a working starting point to migrate, not something to rewrite. The
field maps in the overview doc were derived by rendering the official forms and
reading the output, so they are verified rather than guessed.
