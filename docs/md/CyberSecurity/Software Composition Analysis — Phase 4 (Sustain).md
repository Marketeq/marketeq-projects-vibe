# **Software Composition Analysis — Phase 4 (Sustain)**

**As of:** 2026-10-07
**Covers:** the part that makes someone actually look — and the part no workflow can do for you.
**Status:** implemented on branch `security/gateway-rate-limiting`, **uncommitted and unpushed.** Nothing in this workflow has ever run.
**Preceded by:** `Software Composition Analysis — Phase 3 (The Gate).md`
**Completes:** the four-phase SCA rollout.

### **The short version**

Phases 1 to 3 made the scanning happen. **None of them make anyone look.**

A weekly job that writes a table into a run summary nobody opens produces the appearance of monitoring without the thing monitoring is for. That is the gap phase 4 closes, and it is the one most SCA rollouts never get to — the tooling is finished, the habit never forms, and eighteen months later the scan is still running green-ish into a void.

Half of this phase is code. The other half is a person, and no amount of YAML substitutes for it.

---

## **1. The design rule: silence when nothing changed**

The weekly scan now maintains **one tracking issue** — not a new issue each week — and **comments only when the finding set actually moves.**

That rule is the whole design. A notification that says the same thing every Monday is muted within a month, and then the Monday it finally says something different is muted too. Alert fatigue is not carelessness; it is the predictable result of a channel that is usually noise.

So:

- **The issue body** is rewritten every week and is always current. Open it any time to see where things stand.
- **A comment** — the thing that generates a notification — happens only on a real change.

No comment means nothing moved. It does not mean the scan failed to run; the body's timestamp shows that.

---

## **2. What the weekly report contains**

| | |
|---|---|
| **Current state** | Counts by severity, runtime dependencies only, then the high and critical findings per lockfile with their fixed versions |
| **What changed** | New findings since last week, with the severity breakdown; resolved findings counted |
| **Expiring acceptances** | Entries in `.trivyignore.yaml` lapsing within 14 days, and any already expired |

### **Why the expiry warning is there**

The hygiene check fails a build *after* an acceptance expires — and it fails whichever pull request happens to be open at the time, which is usually one that has nothing to do with it. Somebody's unrelated work goes red because a date passed.

Fourteen days of warning turns that from an ambush into a task.

### **Why new findings get a sentence of explanation**

The comment says plainly that these appeared against code that has not changed — a newly published advisory against a dependency already installed, which **no pull request gate would have caught.**

That sentence exists because the obvious reaction to a weekly finding is "why didn't CI catch this?" The answer is that CI did exactly what it should; this is the category of risk that only a clock can find.

---

## **3. Where the state lives**

In the issue body, in an HTML comment holding a JSON list of finding keys.

That is a deliberate choice over storing it in artifacts or a committed file. The issue is the thing people actually read, so making it the state store means there is one place to look and nothing to keep in sync. No archaeology across previous runs, no bot commits.

If somebody edits the issue and deletes the marker, the next run treats everything as new and posts one noisy comment. Recoverable, and preferable to a scheme that fails silently.

---

## **4. The half that is not code**

The mechanism puts a notification in front of a person. It cannot make that person act, and it is worth being blunt that this is where the whole exercise usually dies.

**Who owns it.** One named person who reads the comment when it arrives. Not "the team" — a rotation with no name attached is nobody.

**What "reading it" means.** New critical or high in a runtime dependency: decide this week. Everything else: it can wait for the next one. The response times are in phase 2 §6.

**What to do when it is noise.** If a finding is not worth acting on, it goes in `.trivyignore.yaml` with a reason and an expiry — *not* left to reappear every week. A recurring finding nobody intends to fix is how the report becomes background hum.

**When to review the shape of it.** If the weekly comment has been ignored three times running, the problem is not the person. Either the threshold is wrong or the channel is. Change one.

---

## **5. Limitations**

- **It needs `issues: write`.** The workflow's permissions were widened for this. If you would rather it not open issues, the script prints the report instead when no token is available, and the job can be removed without affecting phases 1 to 3.
- **It reports runtime findings only.** Dev-only findings are in the artifacts and the run summary, not in the issue. That is the same reachability judgement the rest of the series makes.
- **The scheduled run only works from the default branch.** Until this is merged to `dev-main`, there is no weekly run to report on.
- **It has never run.** Nothing in this workflow has.

---

## **6. Verification**

Tested offline against the rendering, diff and expiry logic:

| Check | Result |
|---|---|
| Severity counts and per-lockfile sections render correctly | pass |
| State survives rendering and reads back identically | pass |
| Nothing changed → no comment | pass |
| New finding against unchanged code → comment, with the explanation | pass |
| Finding resolved → comment noting it | pass |
| Expired acceptance flagged; one expiring in 8 days flagged; one in 74 days excluded | pass |
| Missing scan file → survives, exits 0 | pass |
| Issue body with the marker deleted → treated as empty rather than crashing | pass |

Workflow YAML parses; every shell block passes `bash -n`.

**Not verified:** the GitHub API calls. Creating and updating issues has not been exercised against a real repository.

---

## **7. The series, end to end**

| Phase | What it does | State |
|---|---|---|
| **1 — Baseline** | Scans three lockfiles and the base image, reports, never blocks | Built |
| **2 — Triage** | The decision rule, the expiring acceptance file, and the first real baseline: 163 findings, 73 runtime, 4 critical | Built; **fixes not applied** |
| **3 — Gate** | Fails a pull request on new high/critical runtime findings, measured against the base branch | Built |
| **4 — Sustain** | One tracking issue, updated weekly, that speaks only when something changes | Built |

**What is left is not more tooling.** It is: commit and push so any of it runs; apply the phase 2 fixes, starting with the three stale pins and `axios`; create the `sca-override` label; and name the person who reads the weekly report.

---

## **8. Change log**

- **2026-10-07** — Phase 4: weekly tracking issue, updated every run, commenting only on change. Expiry warnings 14 days ahead of the hygiene check failing. Completes the four-phase rollout.
