# **Client-Exposed Secret Guard — Implementation Notes**

**As of:** 2026-10-08
**Audience:** engineers opening PRs against this repository, and whoever maintains `sop-check.yml`.
**Status:** implemented on branch `security/gateway-rate-limiting`, **uncommitted and unpushed.** The check has never run in CI.
**Why it exists:** Security Tasklist item #2, "Remove client-side exposure of cryptographic seed material (`NEXT_PUBLIC_SYSTEM_SECRET`)." This is Phase 0 of `docs/md/CyberSecurity/Client-Side Seed Material — Plan.md`, which holds the security rationale and Phases 1–4. This document is the implementation and operating reference.

---

### **What it is, in one line**

A PR check that refuses to let a `NEXT_PUBLIC_*` or `VITE_*` variable whose name says its value is relied on to be secret enter the repository without a dated, justified exception.

---

## **1. Why a name-based check, and why now**

`NEXT_PUBLIC_`-prefixed variables are inlined by Next.js into the JavaScript bundle at build time and served to every visitor. `VITE_` does the same in Vite. A value with either prefix is **published, not configured**. That is correct for an API base URL or a Stripe publishable key, and fatal for anything a cryptographic operation depends on being unguessable.

Item #2 is one instance of that mistake: `deriveKEK()` in `frontend/src/crypto/backup.ts` derives the key protecting every user's RSA private key from `userId` + `NEXT_PUBLIC_SYSTEM_SECRET` + a constant salt. The user id is not secret and the system secret is in the bundle, so the derived key is public.

The reason this became a CI check rather than only a code fix is what the audit turned up: the flow is **wired**, not scaffolding, and it is inert only because the variable is unset — while the variable is simultaneously an **active entry in all three frontend env templates**, including production, under a comment instructing the operator to keep the value consistent across environments. So the defence was "nobody fills in the blank that the template tells them to fill in."

A defence of that shape does not survive a new starter, a sprint deadline, or the next person who decides to fix multi-device support. Writing it down mechanically is the only version that lasts.

## **2. What was added**

| File | Purpose |
|---|---|
| `.github/scripts/check-client-secrets.py` | The check. Scans the tracked tree, validates the allowlist, exits non-zero on problems. Standard library only. |
| `.github/client-exposed-secrets-allowlist.json` | The dated, justified exceptions. Four entries today. |
| `.github/workflows/sop-check.yml` — Section 11 | 14 lines calling the script and reporting through the existing `add()` violation mechanism. |

No new workflow, no new job, no new dependency. It runs inside the `Code Review SOP Check` that already runs on every PR, so it adds one subprocess rather than a second checkout.

**Standard library only is deliberate.** `check-sca-ignores.py` does `pip install pyyaml`, which is fine in the weekly SCA job and wrong here — this runs on every PR, and a package install on the critical path of every PR is a network dependency and a few seconds each time. The allowlist is JSON for that reason.

## **3. How it decides**

**Scanned:** every file in `git ls-files`.

**Pattern:** `(NEXT_PUBLIC_|VITE_)[A-Z0-9_]*(SECRET|PRIVATE|PRIVKEY|SEED|PASSPHRASE|SIGNING|CREDENTIAL)[A-Z0-9_]*`

**Excluded, and why:**

| Excluded | Reason |
|---|---|
| `docs/` | Prose *about* the problem is the opposite of the problem. This document names the variable repeatedly. |
| `.github/scripts/`, the allowlist itself | The check's own machinery necessarily spells out the pattern. |
| `*.md`, `*.mdx` | A markdown file cannot set an environment variable. |
| `node_modules/`, `.next/`, `dist/`, `build/`, `coverage/` | Not ours, and not tracked anyway. |
| `*.lock`, images, fonts | No env vars, and binary reads waste time. |
| **Comment lines** — outside `.env*` files | A comment cannot read an environment variable, so a match inside one is never a real exposure; it is almost always prose explaining this very problem. Added 2026-10-09 after the guard failed on the Phase 1 code's own explanatory comments. Lines starting with `//`, `#`, `*`, `/*`, `--`, `<!--` or `;` are skipped. |

**Comments are *not* skipped in `.env*` files.** A commented-out `NEXT_PUBLIC_SYSTEM_SECRET=` is still a prompt telling an operator to fill it in, which is the whole reason the three template entries matter. A comment in code is documentation; a comment in an env template is a suggestion.

**`TOKEN` and `KEY` are deliberately absent from the word list.** `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and a public map token are both legitimate and common. A check that fails on those gets muted within a month, and then the month it finally catches something real it is muted too — the same alert-fatigue reasoning as SCA Phase 4. A word gets added here the first time one actually matters, not in anticipation.

## **4. The allowlist contract**

Four rules, all enforced:

1. **Every entry needs `path` and `variable`.** The exception is scoped to one occurrence, not to a variable name everywhere.
2. **Every entry needs a `reason` of at least 40 characters.** Long enough that "temporary" and "false positive" do not pass.
3. **Every entry needs an `expires` date, no more than 90 days out.** Nothing is accepted for longer than that at a time.
4. **An entry that matches nothing is itself a failure.**

Rule 4 is the one that matters. An allowlist entry is a **tombstone, not a permission slip**: when the line it covers is finally removed, the check fails until the entry goes too. An exception cannot quietly become permanent, and the allowlist cannot drift into a list of things that used to be true. This is the rule that makes the other three worth having.

## **5. What is currently allowlisted**

All four are Security Tasklist item #2.

| Path | Expires | What closes it |
|---|---|---|
| `frontend/src/crypto/backup.ts` | 2027-01-06 | Phase 1 — move KEK derivation server-side onto the `E2EE_SERVER_SECRET` that `user-keys.service.ts` already holds, and delete the `process.env` read. |
| `frontend/.env.local.example` | 2026-11-07 | Delete the entry and its comment block. PR must target `dev-main`. |
| `frontend/.env.staging.example` | 2026-11-07 | Delete the entry and its comment block. PR must target `staging`. |
| `frontend/.env.production.example` | 2026-11-07 | Delete the entry and its comment block. PR must target `live-mvp`. |

The three template entries expire sooner because deleting a line from a template is a same-week change that depends on nothing; the code entry waits on a design decision. The three branch targets are not a preference — `sop-check.yml` Section 8 requires each env template to be changed on its own branch, so this is three separate PRs.

**When each lands, delete the matching allowlist entry in the same PR.** Rule 4 will otherwise fail the next PR, which is the intended behaviour and not a bug to work around.

## **6. What to do when it fails**

The violation names the file, line and variable. Three realistic situations:

**You added a `NEXT_PUBLIC_*` variable and it was flagged.** Almost always the right fix is to stop sending the value to the browser: read it server-side and expose only the result the client needs, through an API route or a server component. If you believe the value is genuinely safe to publish — a publishable key, a public endpoint — the name is the problem, so rename it. Reach for the allowlist last; an entry there is a commitment to come back inside 90 days.

**An entry has expired.** Either finish the removal, or renew it with a *fresh* justification that says what changed and why it still cannot be done. Renewing with the same sentence is how an allowlist becomes furniture.

**An entry no longer matches anything.** Good — the work is done. Delete the entry.

## **7. What this check does not do**

Stating the limits plainly, because a check whose blind spots are undocumented gets trusted for things it does not cover.

- **It cannot see Vercel.** This is the important one. The guard reads the repository. Someone can set `NEXT_PUBLIC_SYSTEM_SECRET` directly in the Vercel dashboard and the check will never know — and that is the exact path by which this becomes a live incident, since the templates are only a prompt to do so. **The guard reduces the chance of the mistake being made; it does not detect the mistake having been made.** Confirming the variable is unset in preview, staging and production is a manual step, and it stays manual until someone wires an environment-variable audit against the Vercel API.
- **It judges names, not values.** A secret smuggled into `NEXT_PUBLIC_API_URL` is invisible to it. `gitleaks.yml` is the check that looks at values; the two are complementary.
- **It only sees tracked files.** An untracked local `.env` is out of scope, correctly — that file is not shared.
- **It reports; it does not block.** The free GitHub org plan cannot block merges on failing checks, as `post-merge-audit.yml` states in its own header. A violation turns the check red and `post-merge-audit` opens an issue if the PR was merged anyway. Treat red as a stop under SOP §6, not as a technical barrier.
- **It is not diff-based, and that is on purpose.** It scans the whole tree every run, so something that slipped in before the check existed is caught rather than grandfathered — the opposite of the blind spot in Section 4b, where a pre-existing `synchronize: true` would never be flagged. The cost is that every occurrence must be either removed or allowlisted before the check can go green at all, which is why the four known ones are listed in §5.

## **8. Test record**

Run 2026-10-08 against the live tree and against a synthetic git repository with the same layout.

| Scenario | Expected | Result |
|---|---|---|
| Live tree, four occurrences allowlisted | pass | ✅ pass, 5 occurrences across 4 entries |
| `NEXT_PUBLIC_SYSTEM_SECRET` added to a source file | flag | ✅ |
| `VITE_SIGNING_SEED` added | flag | ✅ names the `VITE_*` prefix |
| `NEXT_PUBLIC_JWT_PRIVATE_KEY`, `NEXT_PUBLIC_DB_CREDENTIAL` in a `.env.example` | flag both | ✅ |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_MAPBOX_TOKEN` | ignore | ✅ |
| Server-side `GOOGLE_CLIENT_SECRET`, `JWT_SECRET`, `AUTH_JWT_PRIVATE_KEY` | ignore | ✅ |
| The variable named in `docs/*.md` and in any `*.md` | ignore | ✅ |
| Valid allowlist entry covering the occurrence | pass | ✅ |
| Entry with reason "temporary" | flag entry **and** leave the occurrence uncovered | ✅ both |
| Entry expired two days ago | flag | ✅ |
| Entry expiring 200 days out | flag | ✅ |
| Entry pointing at a path that no longer contains it | flag as stale | ✅ |
| Malformed allowlist JSON | exit 2 | ✅ |
| The variable named in a `//`, `/*`, ` * ` or `#` comment in code or YAML | ignore | ✅ (added 2026-10-09) |
| A real `process.env` read on line 2 with an explanatory comment on line 1 | flag line 2 only | ✅ |
| A **commented-out** entry in a `.env*` file | flag — it is still a prompt | ✅ |
| Section 11 bash block, live tree | 0 violations | ✅ |
| Section 11 bash block, failing tree | 1 violation rendered as one markdown bullet | ✅ |

Also verified: `sop-check.yml`'s CRLF line endings survived the edit (0 bare LF in 456 lines), the YAML still parses, and the only real content change under `.github/` is the 14 added lines.

## **9. Operating notes**

- **Exit codes:** 0 clean, 1 problems found, 2 could not read the allowlist. A crash is reported as a violation rather than swallowed — fail closed.
- **Runtime:** a single pass over tracked text files — about 5 seconds of CPU. Measured at 97 seconds wall-clock when run against the repository through the Windows-mount bridge, which is I/O wait on that mount, not the check: `user` time was 5.6s of the 97s. On a GitHub runner with a local checkout expect the CPU figure. If it ever does become slow in CI, the fix is an extension allowlist rather than the current exclusion list.
- **Trigger:** `pull_request` only, as part of `Code Review SOP Check`. It does not run on push, and like `sca.yml` it will not run at all until the branch is pushed and a PR opened.
- **Ownership:** `.github/` is owned by `@CTorres9800` and `@Marketeq/code-review` per CODEOWNERS, so adding an allowlist entry needs the same review as any other CI change. That is intended — the review is the control, and the 90-day expiry is the backstop.
- **Running it locally:** `python3 .github/scripts/check-client-secrets.py` from the repository root. No arguments, no setup.

## **10. Change Log**

- **2026-10-09** — Comment lines outside `.env*` files are now skipped. The guard had started failing on the Phase 1 backend's own comments, which explain the variable rather than read it — a false positive that would have failed every PR, and one that would have pushed people towards documenting the problem less clearly. Three cases added to §8.
- **2026-10-08** — Check, allowlist and `sop-check.yml` Section 11 added on branch `security/gateway-rate-limiting` (Security Tasklist item #2, Phase 0). Not committed, not pushed, never run in CI. Its first run found `NEXT_PUBLIC_SYSTEM_SECRET` active in all three frontend env templates — an exposure path the plan document had recorded as absent, which is corrected there.
