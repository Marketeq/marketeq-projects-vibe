# **Software Composition Analysis — Phase 1 (Baseline)**

**As of:** 2026-10-05
**Covers:** dependency vulnerability scanning in CI/CD — phase 1 only, which is report-only by design.
**Origin:** security review item — add Software Composition Analysis to CI/CD.
**Status:** `.github/workflows/sca.yml` added on branch `security/gateway-rate-limiting`, **uncommitted and unpushed.** GitHub Actions only runs workflows that exist on GitHub, so it has never run.
**Deliberate limitation:** the **phase 1 scan** cannot fail a build, and that is still true. Two later jobs can: the ignore-file hygiene check (phase 2) and the gate (phase 3). Neither changes the phase 1 scan described here. See `Software Composition Analysis — Phase 3 (The Gate).md`.

### **The short version**

The platform installs 3,363 packages across two lockfiles. 199 were asked for; the rest arrived as dependencies of dependencies. None of it has ever been scanned against a vulnerability database.

Phase 1 answers one question — *what is already there* — and answers it on a schedule as well as on every pull request. It blocks nothing. The output is a table in the run summary, a JSON artifact kept for 90 days, and a SARIF upload to code scanning where that is available.

Nobody can decide what to enforce before seeing the backlog, which is the whole reason this phase exists separately.

---

## **1. What the repository actually looks like**

Established before writing anything, because it determined most of the configuration.

| | Found |
|---|---|
| **CI already present** | 11 workflows, all policy and review gates — SOP compliance, branch freshness, secret scanning, an AI code review. `gitleaks.yml` is the only existing security scanner and is the pattern this one follows |
| **No workflow installs dependencies or runs tests** | Nothing calls `setup-node`. This is the first workflow that has to read a lockfile |
| **Install roots** | Three: `backend` (79 direct, 1,514 resolved), `frontend` (120 direct, 1,849 resolved), `backend/apps/cms-service` |
| **Decoy manifests** | 30 further `package.json` files under `backend/apps/` with **no lockfiles** — they declare ranges but are never separately installed |
| **Dev-only share** | 601 of 1,514 backend, 1,080 of 1,849 frontend — roughly 40% and 58% |
| **Existing remediation** | Both roots already carry `overrides` pinning transitive packages: `multer`, `tar`, `glob`, `handlebars`, `minimatch`, `fast-xml-parser`, `lodash`, `flatted`, `picomatch` |
| **Build** | `npm ci --legacy-peer-deps` on `node:20-alpine` |

Two of these changed the design.

**The 30 lockfile-less manifests.** A scanner pointed at the repository root walks all 33 manifests and reports unresolved duplicates for the 30 that are never installed. That is the fastest way to make the output unreadable, so each real lockfile is named explicitly.

**The existing `overrides`.** Someone has already been fixing findings by hand, one at a time, with no record of which advisory each pin answers or when it can be removed. Giving those nine pins a written justification is phase 2 work and is overdue on its own.

---

## **2. What was added**

One file: `.github/workflows/sca.yml`.

| | |
|---|---|
| **Tool** | Trivy — scans lockfiles *and* container images with one tool, emits SARIF, needs no account, token or signup |
| **Runs on** | Every pull request; pushes to `dev-main`, `staging`, `live`, `live-mvp`; **Mondays at 06:17 UTC**; and on demand |
| **Scans** | The three lockfiles, each in isolation, plus the `node:20-alpine` base image |
| **Fails the build** | **Never.** Every step carries `continue-on-error` and the final job always exits 0 |

### **Why the weekly run matters more than the pull request run**

A pull request scan only sees dependencies you are changing. It can never tell you that a CVE was published last Tuesday against a package installed a year ago and untouched since — because no pull request happened, so nothing fired.

**Your risk changes while your code sits still.** The scheduled run is the only part of this that notices.

### **Two passes per lockfile**

Trivy excludes dev dependencies by default. The workflow runs both ways and reports them on separate rows:

- **Runtime** — ships to production, reachable by an attacker. This is the number that will eventually gate a merge.
- **Including dev** — test runners, type definitions, bundlers. Real findings, unreachable from the internet.

Collapsing those into one number is how a scanner earns a reputation for crying wolf, and with 40–58% of the tree being dev-only, the gap will be large.

### **Three scoping decisions worth knowing**

**Each manifest pair is copied into an empty directory before scanning.** Scanning `backend/` in place would walk `apps/`; scanning a bare file path is not supported consistently across Trivy versions. An isolated directory is exact and version-proof.

**The base image is scanned by name, not built.** `Dockerfile.all` takes about 13 minutes. Scanning `node:20-alpine` directly answers what the production base carries in seconds. These are OS packages — fixed by rebuilding on a newer base, not by touching a lockfile.

**The Trivy version is pinned, with a fallback.** A stale pin should degrade to a scan on the latest version with a loud warning, not to no scan at all. Once a version is seen working, keep it pinned — unpinned security tooling changes findings underneath you and makes "is this new?" unanswerable.

---

## **3. How to read the first run**

1. Open the workflow run → **Summary**. A table per lockfile plus one for the base image, with the top runtime findings expandable.
2. **Download the artifacts.** `sca-backend`, `sca-frontend`, `sca-cms-service`, `sca-base-image`, kept 90 days. These are the baseline; phase 3 diffs against them.
3. **Read the Runtime row first.** The dev row is context, not a to-do list.
4. Expect a backlog. The repository has never been scanned. A large first number is the finding, not a failure.

**If the SARIF upload step shows a warning**, code scanning is not enabled for this repository — on a private repository that needs GitHub Advanced Security. The step is allowed to fail and everything else still works. The summary table and the artifacts do not depend on it.

---

## **4. What this does not do**

Stated plainly so phase 1 is not mistaken for finished:

- **The phase 1 scan blocks nothing.** Blocking arrived in phase 3, as a separate job that compares against the base branch. The reporting described in this document is unchanged by it.
- **It has never run**, so there are no results and no baseline yet.
- **It does not say whether you are exploitable.** It says a package version has a known flaw. The flaw may be in a function never called.
- **No Dependabot.** Update pull requests were deliberately left off — see §6.
- **It does not scan the built image**, only the base it is built from. Anything introduced by the build is not covered.
- **Nothing is pushed.** The workflow cannot run until the branch reaches GitHub, and the weekly schedule and manual trigger only activate once it is on the default branch (`dev-main`).

---

## **5. Phases 2 to 4**

| Phase | What happens | Needs |
|---|---|---|
| **2 — Triage** | Split the baseline into fix now / pin via override / accept with a reason and an expiry. Document the nine existing `overrides` while in there | The first run |
| **3 — Gate** | **Done** — fails a pull request on **new** high or critical findings in **runtime** dependencies, measured against the base branch, never on the backlog. See its own record | — |
| **4 — Sustain** | The weekly run is already in place; what it still needs is somebody reading it and a route for acting on what it finds | An owner |

**Phase 3 is where the design decision lives.** Failing on new findings only is what makes the gate survivable. A gate that fails on the whole backlog goes red on every pull request from day one and gets disabled within a week — and then there is no scanning at all, which is worse than where you started.

---

## **6. Decisions still open**

**Dependabot update pull requests — on or off?** Alerts are free and cost no CI time, and are worth switching on in repository settings regardless. The automatic pull requests are the question, because this repository has a hard rule that a branch cannot merge if it is even one commit behind base. Bot pull requests would go stale constantly and need rebasing every time anything else merges. If you want them, they need grouping into one pull request per ecosystem on a weekly cadence rather than the default of one per package.

**Which production branch?** The workflows disagree — `gitleaks.yml` says `live-mvp`, `branch-freshness.yml` and `post-merge-audit.yml` say `live`. This workflow lists both, which is harmless, but the inconsistency is worth fixing on its own.

**Who reads the weekly run?** A scheduled scan nobody opens is theatre. This matters more than any configuration choice in this document.

---

## **7. Verification**

- The workflow YAML parses, and every `run` block passes `bash -n`.
- All three lockfile targets and their adjacent `package.json` files were confirmed to exist at the configured paths.
- **Not verified:** the scan itself. The network allowlist in this environment blocks `registry.npmjs.org`, GitHub release downloads and `api.osv.dev`, so no baseline could be produced here and the Trivy invocations have not been executed. The first CI run is the test.
- No `frontend/` source files changed. No application code changed.

---

## **8. Change log**

- **2026-10-05** — Phase 1 added: `.github/workflows/sca.yml`, report-only, scanning three lockfiles and the base image on pull requests, pushes, a weekly schedule and on demand.
