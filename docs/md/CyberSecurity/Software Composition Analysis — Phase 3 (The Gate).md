# **Software Composition Analysis — Phase 3 (The Gate)**

**As of:** 2026-10-07
**Covers:** the check that stops a pull request introducing a vulnerable dependency.
**Status:** implemented on branch `security/gateway-rate-limiting`, **uncommitted and unpushed.** Like everything else in this workflow it has never run — GitHub Actions only executes what exists on GitHub.
**Preceded by:** `Software Composition Analysis — Phase 2 (Triage).md`
**Followed by:** `Software Composition Analysis — Phase 4 (Sustain).md` — the weekly report, which covers what a pull request gate structurally cannot.

### **The short version**

Phase 1 scans and reports. Phase 3 is the first part that can stop a merge.

**It compares the pull request against its base branch, not against zero.** That single decision is what makes it survivable. There are 73 runtime findings on the branch today; a gate that failed on those would go red on every pull request from the hour it was switched on, and somebody would disable it inside a week. Then there is no scanning at all, which is worse than where you started.

So the gate objects to one thing: **a finding that is not already on the base branch.** Something this change is adding.

---

## **1. What blocks**

A finding fails the build only when every one of these is true:

| Condition | Why |
|---|---|
| **Not present on the base branch** | The backlog is not this pull request's fault |
| **HIGH or CRITICAL** | Moderate and low are reported, never blocking |
| **In a runtime dependency** | 55% of findings are dev-only — test runners and bundlers an attacker cannot reach |
| **Not accepted in `.trivyignore.yaml`** | A documented, expiring acceptance is a decision already made |

Everything else is reported and allowed through.

### **The consequence worth understanding**

**A pull request that touches no lockfile cannot fail this gate.** Its dependency findings are identical to the base, so the comparison is empty.

That is deliberate, not a loophole. Catching a CVE published last Tuesday against a package nobody has touched is the **weekly scheduled scan's** job. A pull request gate answers a narrower question — *are you making this worse?* — and conflating the two is how you end up blocking unrelated work for a problem it did not cause.

---

## **2. How it decides**

For each of the three lockfiles:

1. **Compare bytes against the base commit.** If the lockfile is unchanged, no dependency changed, so no finding can have changed. Skip both scans entirely — most pull requests stop here, and it costs nothing.
2. Otherwise scan the **head** version and the **base** version, each in an isolated directory with only its own manifest pair.
3. Subtract: anything in head that is not in base is **new**.
4. Of the new findings, the high and critical ones in runtime dependencies fail the build. The rest are listed and allowed.

Both scans use the pull request's own `.trivyignore.yaml`, so adding an acceptance in the same change works as expected.

**If a lockfile has no version at the base** — a new service, a new install root — the findings are reported but not gated. Treating every dependency of a brand-new lockfile as "introduced" would block legitimate work on a judgement a person should make.

---

## **3. When it fails, it says what to do**

The run summary names each new finding with its installed and fixed versions, then gives the four routes:

- **A fix is published** → upgrade. That is the whole job.
- **The dependency is transitive** → raise it with an `overrides` entry, and record which version you pinned. Pins go stale: three of the existing nine already have, one of them a critical.
- **No fix exists** → accept it deliberately in `.trivyignore.yaml`, with a reason, a name and an expiry. The hygiene check rejects placeholder reasons.
- **Genuinely urgent and none of the above fits** → add the **`sca-override`** label to the pull request. The gate steps aside.

### **On the override**

A gate with no escape hatch gets removed the first time it blocks something urgent at a bad moment. A label is the right kind of escape: deliberate, visible on the pull request, and recorded in its history — so "we overrode the dependency gate" is a thing somebody can later find, rather than a quiet edit to a workflow file.

---

## **4. Rolling it back**

`SCA_GATE_MODE` in the workflow. `enforce` is the default; `monitor` reports without failing.

It defaults to enforce rather than easing in, which is a departure from the monitor-first pattern used everywhere else in this sprint — and the reason is specific. Monitor-first exists to find out who a new control would break before it breaks them. Here that question is already answered by the design: the comparison is against the base branch, so the gate **cannot** fire on existing traffic or the existing backlog. There is nothing to observe. Shipping it in monitor mode would just mean nobody notices the day it starts mattering.

---

## **5. Verification**

The comparison logic was tested against six scenarios:

| Scenario | Expected | Result |
|---|---|---|
| Lockfile unchanged, large backlog both sides | pass | pass |
| Pull request adds a new critical | **fail** | **fail** |
| Pull request adds only a moderate | pass, reported | pass |
| Pull request removes a critical | pass | pass |
| New lockfile with no base version | pass, warned | pass |
| New critical with `SCA_GATE_MODE=monitor` | pass, warned | pass |

The first row is the one that matters: a large pre-existing backlog on both sides does not fail anyone.

The workflow YAML parses and every shell block passes `bash -n`.

**Not verified:** the gate has never run in CI, and neither has any part of this workflow. The first pull request after merging is the real test.

---

## **6. What is left**

| | |
|---|---|
| **Run it once** | Commit, push, open a pull request. Nothing here has executed |
| **Create the `sca-override` label** | The gate's `if:` condition references it. An absent label is harmless — the condition simply never matches — but the escape hatch does not exist until the label does |
| **Make the check required** | Optional and currently impossible: branch protection is paywalled on your plan, so the gate reports a failure without technically preventing a merge, the same as every other check in this repository |
| **Phase 4** | **Done** — a weekly tracking issue that speaks only when something changes. The remaining half is naming who reads it |

That third row is worth sitting with. The gate will go red on a pull request that introduces a vulnerable dependency, and it will not physically stop anyone merging anyway. Like the CODEOWNER reviews, enforcement here is convention.

---

## **7. Change log**

- **2026-10-07** — Phase 3: the gate. Fails a pull request on new high or critical findings in runtime dependencies, measured against the base branch. `sca-override` label as the escape hatch, `SCA_GATE_MODE` as the rollback switch.
