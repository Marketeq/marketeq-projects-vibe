# **Software Composition Analysis — Phase 2 (Triage)**

**As of:** 2026-10-06
**Covers:** the first real dependency baseline, what it says, and what to do about it.
**Source:** `npm audit --package-lock-only` run locally against `backend` and `frontend`, each twice — with and without dev dependencies. **Not** from the CI workflow, which is written but has never run.
**Status:** baseline captured and triaged. The fixes are **not applied.** No `package.json`, `package-lock.json` or application code was changed. The phase 1 workflow is uncommitted and unpushed, which is why this baseline came from a local `npm audit` rather than from CI.
**Preceded by:** `Software Composition Analysis — Phase 1 (Baseline).md`
**Followed by:** `Software Composition Analysis — Phase 3 (The Gate).md` — the check that stops a pull request adding to this backlog. It compares against the base branch, so none of the 73 findings below can fail anyone's build.

### **The short version**

**163 findings. 73 of them reach production. 4 are critical.**

Three things stand out, in order.

**Next.js carries 26 advisories including three unauthenticated remote code executions** and several middleware/proxy bypasses. The middleware bypasses matter beyond their own severity: they undermine checks performed in middleware, which is where a good deal of the sprint's auth work lives.

**Three of the nine existing `overrides` are pinning packages to versions that are themselves vulnerable.** `tar` is pinned at 7.5.13 against an advisory covering everything up to 7.5.20 — a critical, still open, inside a pin somebody added to fix exactly this kind of problem. Past remediation has quietly gone stale.

**`npm audit fix --force` would be a disaster here** and the tooling recommends it. It would install `@nestjs/core@12`, `@nestjs/platform-express@12` and `@nestjs/swagger@12` — major framework upgrades across thirty-five services. §5 sets out what is safe instead.

---

## **1. The baseline**

| Root | All dependencies | **Runtime only** | Dev-only |
|---|---|---|---|
| **backend** | 109 (4 critical, 68 high, 32 moderate, 5 low) | **54** (3 critical, 23 high, 27 moderate, 1 low) | 55 |
| **frontend** | 54 (2 critical, 37 high, 8 moderate, 7 low) | **19** (1 critical, 14 high, 4 moderate) | 35 |
| **Total** | **163** | **73** | **90** |

**55% of all findings are dev-only** — test runners, build tooling, type definitions. They never ship and an attacker on the internet cannot reach them. Running the scan twice is what separates them, and it is the difference between a list of 163 problems and a list of 73.

Not covered: `backend/apps/cms-service` has its own lockfile and was not audited. It should be.

---

## **2. The critical findings**

| Package | Root | Advisories | What it is | Fix |
|---|---|---|---|---|
| **`next`** | frontend | **26** | Three unauthenticated RCEs (Windows-hosted servers, the AVIF image path, `next/og`), multiple middleware/proxy bypasses, cache poisoning, SSRF, XSS | Non-breaking per npm |
| **`protobufjs`** | backend | 12 | Includes overlong UTF-8 decoding | Non-breaking |
| **`tar`** | backend | 6 | **Currently pinned to a vulnerable version by an override** — see §3 | Non-breaking |
| **`proxy-addr`** | backend | 1 | Parses `X-Forwarded-For` | Non-breaking |

`proxy-addr` deserves a note it would not otherwise get: the rate limiter built earlier this sprint derives the client IP from the forwarded chain. A flaw in the library that parses that header is directly load-bearing for a control we just added.

### **The largest single finding**

**`axios` — 34 advisories, high severity, present in both roots, non-breaking fix.** SSRF via `NO_PROXY` bypass, authentication bypass via prototype pollution, `Proxy-Authorization` credential leaks across redirects, cloud metadata exfiltration via header injection.

One upgrade clears 34 advisories in two places. It is the highest-value single action on this list.

---

## **3. The existing overrides have gone stale**

Phase 2 was meant to document why the nine `overrides` exist. The baseline answered a sharper question: **whether they still work.**

| Pin | Pinned at | Advisory covers | Verdict |
|---|---|---|---|
| **`tar: ^7.5.13`** | 7.5.13 | **`<=7.5.20`** | **STILL VULNERABLE — critical** |
| **`multer: ^2.1.1`** | 2.1.1 | **`<=2.2.0`** | **STILL VULNERABLE — high** |
| **`fast-xml-parser: ^5.5.7`** | 5.5.10 | **`<5.7.0`** | **STILL VULNERABLE — moderate** |
| `minimatch: ^9.0.7` | 9.0.9 | — | Clean |
| `picomatch: ^4.0.4` | 4.0.4 | — | Clean |
| `glob: ^10.5.0` | 10.5.0 | — | Clean |
| `lodash: ^4.18.1` | 4.18.1 | — | Clean |
| `flatted: ^3.4.2` | 3.4.2 | — | Clean |
| `handlebars: ^4.7.9` | 4.7.9 | — | Clean |

**This is the structural lesson, not an accident.** A pin is a snapshot of one afternoon's advisory database. It fixes the problem that existed then and silently stops being true. Nobody was going to notice, because the whole point of a pin is that you stop thinking about the package.

**The fix is easier than it looks.** All three carets already permit the fixed version — `^7.5.13` allows 7.5.21. The lockfile is simply stale. `npm update tar multer fast-xml-parser` resolves all three without editing `package.json`.

**One trap:** npm reports multer's fix as requiring `--force` and a breaking `@nestjs/platform-express@12` upgrade. It does not. multer's version here is controlled by the override, so raising that pin fixes it directly and leaves the framework alone. Let the tool's recommendation mislead you here and a one-line change becomes a framework migration.

The three remaining major-version jumps flagged earlier — `glob` 7→10, `minimatch` 3→9, `picomatch` 2→4 forced onto dependents that declared incompatible ranges — are all clean against the database and are presumably doing their job. The compatibility exposure stands as a cost, now a justified one.

---

## **4. Triage**

Applying the §6 decision rule to the 73 runtime findings.

| Class | Count | Action |
|---|---|---|
| **Fix now — critical** | 4 | `next`, `protobufjs`, `tar`, `proxy-addr`. All non-breaking |
| **Fix now — stale pins** | 3 | `tar`, `multer`, `fast-xml-parser` via lockfile refresh (overlaps the above) |
| **Upgrade — non-breaking** | ~50 | Plain `npm audit fix` handles these. `axios` first |
| **Needs a decision** | 6 | Fixes that npm marks breaking: `nodemailer`, `js-yaml`, `sharp`, `@nestjs/core`, `body-parser`, `sprintf-js` |
| **Accept** | 1 | `uuid <11.1.1`, moderate — **no fix published.** The only genuine ignore-file candidate in the whole baseline |
| **Record only** | 90 | Dev-only. Never blocks a merge |

**One finding out of 163 warrants an ignore entry.** That is worth noticing: the ignore file is not where this backlog goes. Almost everything here is an upgrade somebody has not done yet.

I have not written the `uuid` entry. Accepting a risk is a decision with a name attached, and it should be yours.

---

## **5. What to run, and what not to**

**Do not run `npm audit fix --force`.** npm recommends it and it would install `@nestjs/core@12`, `@nestjs/platform-express@12`, `@nestjs/swagger@12`, `pm2@7` and `sharp@0.35.5` — major framework upgrades across thirty-five services, in a repository that already installs with `--legacy-peer-deps` because peer conflicts exist. That is a migration project wearing the costume of a security fix.

A safer order, each step verifiable on its own:

1. **Refresh the three stale pins.** `npm update tar multer fast-xml-parser` in `backend`. Clears one critical and two others, touches no `package.json`.
2. **`npm audit fix`** (no `--force`) in each root. Semver-compatible only. Clears most of the list including `axios`.
3. **Upgrade Next.js on its own.** 26 advisories including three RCEs. npm marks it non-breaking, but it deserves its own change and its own testing rather than riding along with fifty others.
4. **Re-run the audit** and compare. What remains is the real decision list.
5. **Take the six breaking fixes one at a time**, on their own branches.
6. **Audit `backend/apps/cms-service`**, which has not been scanned at all.

Steps 1 and 2 are low risk and clear most of the backlog. Steps 3 and 5 are real work.

---

## **6. The decision rule**

Four outcomes, asked in this order because the cheap answers come first.

```
Is it reachable from production?
  NO  → dev-only. Record it. Never blocks a merge.
  YES ↓
Is there a published fix?
  YES → upgrade. Not a triage decision, a chore.
  NO  ↓
Can the version be forced with an override?
  YES → pin it, register the pin, AND set a date to re-check it (§3)
  NO  → accept it, with a reason and an expiry (§7)
```

Reachability comes first because it removes 55% of the volume. "There is a fix" is not a triage outcome — 50 of these are simply upgrades nobody has run.

### **Response times**

| | Runtime | Dev-only |
|---|---|---|
| **Critical** | 7 days | Record; review at the next scan |
| **High** | 30 days | Record; review at the next scan |
| **Medium** | 90 days | Record |
| **Low** | Next time the package is touched | Record |

---

## **7. The acceptance mechanism**

`.trivyignore.yaml` — **currently empty.** One finding (`uuid`) qualifies; it has not been added, because that is your call.

```yaml
vulnerabilities:
  - id: GHSA-xxxx-xxxx-xxxx
    statement: >-
      No fix published upstream as of 2026-10-06. Moderate severity,
      reachable only via <path>. Accepted by: <name>. Revisit: <issue>.
    expired_at: 2027-01-04
```

`.github/scripts/check-sca-ignores.py` runs in CI and enforces:

| Rule | Why |
|---|---|
| A `statement` of at least 30 characters | A reason somebody else can evaluate |
| Rejects "not exploitable", "false positive", "wontfix", "low risk" | Verdicts, not reasons |
| Mandatory `expired_at` | No permanent exceptions |
| 90 days maximum; an expired entry fails the build | §3 is what happens without this |

**This is the one part of SCA allowed to fail a build.** It does not judge third-party code — it checks our own record of what we chose to tolerate. §3 is the argument for it: three pins went stale precisely because nothing made anyone look again.

Tested against five inputs: a valid entry, a lazy reason, an expired entry, a three-year window, and a missing expiry. Passes the first, rejects the rest.

---

## **8. Caveats**

- These are **`npm audit`** results, from the GitHub Advisory Database. The CI workflow uses Trivy, which draws on overlapping but not identical sources; expect the numbers to shift somewhat on the first CI run.
- The counts are advisory counts, not package counts. One package can carry many — `axios` alone accounts for 34.
- A finding means a package version has a known flaw. It does not mean the flaw is reachable in how this code uses it.
- `backend/apps/cms-service` was not audited.
- **Nothing was fixed.** This is a decision document.

---

## **9. Change log**

- **2026-10-06** — First real baseline captured and triaged: 163 findings, 73 runtime, 4 critical. Found three of the nine existing overrides pinning to versions that are themselves vulnerable, one of them a critical. Acceptance mechanism (`.trivyignore.yaml` and its CI hygiene check) built and tested.
