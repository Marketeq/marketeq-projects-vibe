# **Software Composition Analysis — `cms-service` Baseline**

**As of:** 2026-11-04
**Covers:** `backend/apps/cms-service`, the third install root. Phase 2 noted it "has its own lockfile and was not audited. It should be." This is that audit.
**Source:** `npm audit --package-lock-only`, run twice — with and without dev dependencies — matching the method used for `backend` and `frontend`, so the numbers are comparable.
**Satisfies:** the AC-1.2 gap ("all three lockfiles are scanned"). Note AC-1.2 asks for them to be scanned *by the workflow*; the workflow still has never run, so this is a local audit standing in, exactly as Phase 2 was.

---

## **The short version**

**46 findings. 44 of them runtime. 3 critical.**

Three things stand out.

**This root is almost entirely runtime.** Backend was 50% runtime and frontend 35%. `cms-service` is **96%** — only two findings are dev-only. It carries almost no dev tooling of its own, so the usual "most of this never ships" consolation does not apply here.

**24 of the 44 runtime findings collapse into a single upgrade, and it is a large one.** Nearly every breaking fix points at `payload@3.92.1`. The installed version is `2.32.3`. Payload 3 is a rewrite, not a version bump, and `@payloadcms/db-postgres` would go `0.8.10 → 3.92.1` alongside it. This is a project, not an afternoon.

**20 findings have non-breaking fixes, including two of the three criticals.** Those are available now and independent of the Payload question.

---

## **The numbers**

| | All dependencies | **Runtime only** | Dev-only |
|---|---|---|---|
| **cms-service** | 46 (3 critical, 22 high, 19 moderate, 2 low) | **44** (3 critical, 22 high, 17 moderate, 2 low) | 2 |

Revised project totals, with Phase 2's backend and frontend figures:

| Root | All | **Runtime** |
|---|---|---|
| backend | 109 | 54 |
| frontend | 54 | 19 |
| **cms-service** | **46** | **44** |
| **Total** | **209** | **117** |

Phase 2 reported 163 total and 73 runtime. Adding the third root takes runtime findings from **73 to 117 — a 60% increase** — and criticals from 4 to 7.

---

## **The three criticals**

| Package | Advisories | Fix | Note |
|---|---|---|---|
| `payload` | **32** | `payload@3.92.1` | **Breaking.** The 2 → 3 rewrite |
| `proxy-addr` | 1 | Non-breaking | Also critical in `backend`. Parses `X-Forwarded-For` |
| `i18next-http-middleware` | 4 | Non-breaking | |

`proxy-addr` earns the same note Phase 2 gave it: the rate limiter built this sprint derives the client IP from the forwarded chain, so a flaw in the library parsing that header is load-bearing for a control we just added. It is now critical in two of the three roots.

## **Fixes available**

| | Count | Severities |
|---|---|---|
| Non-breaking | **20** | 2 critical, 14 high, 4 moderate |
| Breaking (semver-major) | 24 | 1 critical, 8 high, 13 moderate, 2 low |
| No fix published | **0** | — |

Nothing here is unfixable, which is worth saying — the `uuid` acceptance candidate from Phase 2 has no equivalent in this root.

The 24 breaking fixes are not 24 decisions. They resolve to one coordinated Payload upgrade: `payload`, `@payloadcms/bundler-webpack`, `@payloadcms/db-postgres`, `@payloadcms/richtext-lexical`, `@payloadcms/plugin-cloud-storage` and `@payloadcms/plugin-seo`, all to the 3.92.x line. Treat it as one piece of work with one decision attached.

The two dev-only findings are `rimraf` and `ts-node-dev`, both moderate.

---

## **The question that decides the deadlines**

**I could not find `cms-service` in any deployment path, and that needs confirming before AC-2.1's clock is applied.**

What was checked:

- `render.yaml` declares one backend service, `marketeq-backend`. No `cms-service` entry.
- `backend/Dockerfile.all`, which that service builds, contains no reference to it.
- `backend/boot-all.js` explicitly excludes it: *"cms-service is a standalone Next.js app, not a NestJS service — runs separately, not in boot-all."*
- The Vercel projects on recent PRs are `marketeq-projects-dev`, `-live`, `-live-mvp`, `-staging` and `storybook-static`. No CMS project among them.

So "runtime" here is npm's classification of the dependency tree — these packages are in the production dependency set, not behind `devDependencies`. Whether that tree is ever *deployed* is a different question, and the evidence says it may not be.

This matters directly. Under AC-2.1, a runtime critical must be fixed within 7 days. If `cms-service` does not run anywhere, none of these 44 reach production and the deadline should not apply — and conversely, if it is deployed by some route not in the repository, three criticals have been live and unscanned.

**Someone who knows the deployment needs to answer this.** Do not start the 7-day clock on the strength of this document alone.

---

## **Recommended order**

1. **Answer the deployment question above.** It determines everything below.
2. **Take the 20 non-breaking fixes**, which includes `proxy-addr` and `i18next-http-middleware`. Independent of Payload, available now.
3. **Treat Payload 2 → 3 as its own project**, scoped and scheduled separately. It clears 24 findings including the remaining critical, and it is a rewrite — `@payloadcms/db-postgres` alone moves from 0.8.x to 3.92.x.
4. **Re-run this audit after both**, and fold the result into the next scan.

Do not run `npm audit fix --force` here, for the same reason Phase 2 gives for the other roots: it would take the Payload major upgrade unattended.
