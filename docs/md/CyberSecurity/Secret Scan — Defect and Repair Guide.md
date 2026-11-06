# **Secret Scan — Defect and Repair Guide**

**As of:** 2026-10-26
**Audience:** whoever applies this fix. You need Jenkins access and about fifteen minutes. You do not need to be the CTO, and you do not need to understand gitleaks.
**Status:** defect confirmed and reproduced. **Fix written, not applied.** The scan is non-functional until someone completes §4.
**Why it exists:** found while running QA test case 14 (`PMCM-750`). The repository's only working secret scanner has never examined a pull request. This document is the repair procedure; the test record lives on `PMCM-750`.

---

### **What is broken, in one line**

`Jenkins / Secret Scan` reports a green tick on every pull request without ever looking at the pull request.

---

## **1. Why this is urgent**

GitHub Actions has been out of free minutes since roughly 2026-07-08 — that is the documented reason Jenkins exists (`docs/JENKINS_GUIDE.md`). Jenkins is therefore the only CI that runs.

So this is not one of two overlapping safety nets failing. **It is the only one.** Until §4 is applied, a password, API key or private key can be committed to this repository through a pull request and nothing will flag it.

`docs/JENKINS_GUIDE.md` says of this job: *"If it finds anything, the PR is blocked."* It does not do that. This is a defect against our own documented behaviour, not a design decision anyone made.

## **2. How it was found, and how to reproduce it**

PR **#817** on branch `qa/secret-scan-pmcm-750` adds one file, `qa-secret-scan-fixture.ts`, containing a deliberately fake AWS access key ID. The value is invented, was never issued by AWS, and grants access to nothing.

`Jenkins / Secret Scan` reported **Passed**.

**Keep PR #817 open.** It is a known-positive — a case where the scanner is supposed to fail and demonstrably does not. It is how you will prove the fix works in §5. Closing it leaves you patching a detector with no way to test it.

If it has been closed, recreate it: branch off `dev-main`, add a file at the repository root containing an `AKIA` prefix followed by exactly 16 uppercase alphanumeric characters, and open a PR. The length matters — `AKIA` plus 15 characters is not detected at all, which is itself a trap for anyone repeating this test.

## **3. The two defects**

Both are in the same job. Either one alone makes the scan useless, so both must be fixed together.

### **3.1 It never fetches the pull request**

The Checkout stage runs:

```
git clone --depth=50 "https://x-access-token:${GH_TOKEN}@github.com/${REPO}.git" repo
```

That clones the **default branch**. There is no `git fetch origin pull/<n>/head` and no checkout of the pull request's head, so inside the working copy `HEAD` is `dev-main`'s tip and the pull request's commits are not present at all.

The scan then runs over `${BASE_SHA}..HEAD`. `BASE_SHA` is the pull request's base commit on `dev-main`, and `HEAD` is `dev-main`'s tip — a range containing only commits that were already merged. Often it is empty.

An empty range produces "no leaks found" and exit 0, which is indistinguishable from a clean scan. That is why this went unnoticed.

### **3.2 A detection would not fail the job**

The Scan stage declares `#!/bin/bash` and does not set `set -e`. The last line is:

```
echo "PASS: No secrets detected"
```

If gitleaks exits 1 because it found something, the script carries on to that `echo`. The stage's exit code is the `echo`'s, which is 0. Green status, secret merged.

So fixing 3.1 alone would make the scanner look at the right code and then still report success when it found something.

## **4. The repair**

### **4.1 Where the code actually lives**

> **The pipeline that runs is `jenkins_pipeline_gitleaks.groovy`, configured on the Jenkins server at `72.61.77.231:8080`.**
>
> The repository's `.jenkins/gitleaks.groovy` is a **reference copy** under a different name. Editing it, committing it and merging it changes nothing about what runs.

This is the single most common way this fix goes wrong. Patch the server-side job.

If you do not have Jenkins access, ask the DevOps owner for it. Do not go looking for credentials in the repository — some are checked in, that is a separate problem already raised, and using them is not a substitute for being granted access.

### **4.2 Apply the change**

1. Open the Jenkins UI and find the gitleaks job
2. **Configure** → the pipeline script
3. Copy the current script somewhere safe first. This is your rollback (§6)
4. Replace the `Checkout` and `Scan for Secrets` stages with §4.3. Leave every other stage alone — the status-reporting stages at the top and bottom are fine
5. Save

### **4.3 The two replacement stages**

```groovy
stage('Checkout') {
    steps {
        withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
            sh '''#!/bin/bash
                set -euo pipefail
                rm -rf repo

                # Full history, not --depth=50. A shallow clone can leave
                # BASE_SHA unreachable, which silently shrinks the scan range
                # to nothing instead of erroring. If clone time becomes a
                # problem use --filter=blob:none; do not reintroduce --depth.
                git clone "https://x-access-token:${GH_TOKEN}@github.com/${REPO}.git" repo
                cd repo

                # Without this the clone sits on the default branch and the
                # pull request's own commits were never present to scan.
                # This is defect 3.1.
                if [ "${SCAN_TYPE:-}" = "pr" ] && [ -n "${PR_NUMBER:-}" ]; then
                    git fetch origin "pull/${PR_NUMBER}/head:pr-${PR_NUMBER}"
                    git checkout "pr-${PR_NUMBER}"
                    echo "Scanning PR #${PR_NUMBER} at $(git rev-parse --short HEAD)"
                fi
            '''
        }
    }
}

stage('Scan for Secrets') {
    steps {
        sh '''#!/bin/bash
            # set -e is load-bearing. Without it a gitleaks exit code of 1
            # falls through to the echo below, the stage exits 0, and the
            # pull request gets a green "No secrets found" status with a
            # secret in it. This is defect 3.2.
            set -euo pipefail
            cd repo

            CONFIG_FLAG=""
            [ -f ".gitleaks.toml" ] && CONFIG_FLAG="--config=.gitleaks.toml"

            if [ "${SCAN_TYPE:-}" = "pr" ] && [ -n "${BASE_SHA:-}" ]; then
                git cat-file -e "${BASE_SHA}" 2>/dev/null \
                    || { echo "BASE_SHA ${BASE_SHA} not reachable - scan range would be empty"; exit 1; }
                gitleaks detect --source=. $CONFIG_FLAG --log-opts="${BASE_SHA}..HEAD" --verbose
            else
                gitleaks detect --source=. $CONFIG_FLAG --log-opts="HEAD~1..HEAD" --verbose
            fi

            echo "PASS: No secrets detected"
        '''
    }
}
```

Three changes, plus one guard:

| Change | Fixes |
|---|---|
| `git fetch` + `git checkout` of the PR ref | 3.1 — the job now scans the pull request |
| `--depth=50` removed | 3.1 — keeps `BASE_SHA` reachable so the range is real |
| `set -euo pipefail` | 3.2 — a detection now fails the job |
| `git cat-file -e "${BASE_SHA}"` guard | neither, directly — but it is the most important line here |

**On that last one.** It turns "the range was empty, so nothing was found" into a loud failure. That silence is what hid this bug for months. Without the guard, the next misconfiguration produces the same false green and nobody notices again. Keep it even if you disagree with the rest.

### **4.4 A note on `[ -f ".gitleaks.toml" ] && CONFIG_FLAG=...` under `set -e`**

This pattern looks like it should abort the script when the file is missing. It does not — bash exempts the left-hand side of a short-circuited `&&`. Verified, not assumed. Leave it as written.

## **5. How to verify — do not skip this**

A fix to a broken detector that has not been tested against a known-positive is just a different untested state.

1. Go to PR #817
2. Re-run the gitleaks job against it, or push an empty commit to retrigger it
3. **`Jenkins / Secret Scan` must now go RED**
4. Open the console output. It must name the finding:

```
RuleID:      aws-access-token
File:        qa-secret-scan-fixture.ts
```

If it stays green, the fix has not taken effect. The most likely cause is that the repository copy was patched instead of the Jenkins job — re-read §4.1.

5. Once red is confirmed, comment the result on `PMCM-750`, close PR #817 without merging, and delete the branch

## **6. Rollback**

Paste the script you saved in §4.2 step 3 back into the job and save. There is no state to unwind — the job clones fresh into `repo/` on every run.

The risk of the fix is that the scan starts failing pull requests that contain real secrets. That is the intended behaviour, and anything it catches was already merged or about to be. It is not a reason to roll back.

## **7. What this does NOT fix**

**Connection strings are still not caught.** Verified with gitleaks 8.18.4 and this repository's `.gitleaks.toml`: a `postgres://user:password@host:5432/db` string in a tracked file produces no finding. The `Security - Connection String Scan` workflow named in `PMCM-740` has never been built, and gitleaks does not cover that gap. A real database password sat committed in `backend/apps/user-service/seed-users.js` from `b56bb9077` and was never flagged.

**Anything under `docs/` is invisible.** `.gitleaks.toml` allowlists that directory wholesale, so a credential committed there is not scanned regardless of this fix. Raised separately.

**History is not re-scanned.** This fix makes future pull requests scannable. It says nothing about what is already in the repository. A full-history scan is a separate, larger task.

## **8. Change Log**

- **2026-10-26** — Written. Defect found by QA test case 14 (`PMCM-750`) on PR #817: a deliberately fake AWS key was not detected. Root cause traced to two independent faults in the Jenkins job. Fix written and verified in a scratch repository; **not yet applied to the Jenkins server.**
