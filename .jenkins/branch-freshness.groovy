pipeline {
    agent any
    options { timestamps(); timeout(time: 5, unit: 'MINUTES') }
    parameters {
        string(name: 'PR_NUMBER', defaultValue: '', description: 'PR number')
        string(name: 'BASE_REF', defaultValue: 'dev-main', description: 'Base branch')
        string(name: 'HEAD_SHA', defaultValue: '', description: 'Head commit SHA (optional - looked up from the PR when blank)')
    }
    environment { REPO = 'Marketeq/marketeq-projects-vibe' }
    stages {
        stage('Check Branch Freshness') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    script {
                        def prNum = params.PR_NUMBER?.trim()
                        def baseRef = params.BASE_REF?.trim() ?: 'dev-main'
                        def headSha = params.HEAD_SHA?.trim()

                        // PR_NUMBER is the only hard requirement. HEAD_SHA is resolved from
                        // the PR when blank, so a push-triggered re-run only needs the number.
                        if (!prNum) {
                            error("PR_NUMBER is required -- cannot verify branch freshness")
                        }

                        writeFile file: 'freshness.py', text: freshnessScript()

                        if (headSha) {
                            postStatus(baseRef, headSha, 'pending', 'Checking if branch is up to date...')
                        }

                        def raw = ''
                        def rc = 0
                        withEnv(["PR_NUM=${prNum}", "BASE_REF_ENV=${baseRef}"]) {
                            raw = sh(script: 'python3 freshness.py 2>&1', returnStdout: true, returnStatus: false).trim()
                        }
                        echo "--- freshness.py output ---\n${raw}"

                        def m = [:]
                        for (line in raw.split('\n')) {
                            def i = line.indexOf('=')
                            if (i > 0) { m[line.substring(0, i).trim()] = line.substring(i + 1).trim() }
                        }

                        // Resolve the head SHA now that we may have learned it from the API.
                        if (!headSha && m['HEADSHA']) { headSha = m['HEADSHA'] }

                        // A closed/merged PR is not a freshness question. Re-checks are
                        // queued on every push to the base, and a job can still be sitting
                        // in the queue when the PR it refers to merges. Evaluating it then
                        // compares the branch against a base that already contains its own
                        // squash commit -- which reports "N behind, N overlapping files",
                        // the PR conflicting with itself, and posts a bogus stale-branch
                        // comment on a merged PR. Bail out before any status is posted.
                        if (m['STATUS'] == 'skip') {
                            echo "Skipping: ${m['REASON'] ?: 'PR is not open'}"
                            return
                        }

                        // FAIL CLOSED. Any lookup or parse failure blocks the PR instead of
                        // silently reporting success -- an unverifiable branch is not a fresh
                        // branch (SOP 4: "when in doubt, block").
                        if (m['STATUS'] != 'ok') {
                            def why = m['ERROR'] ?: 'freshness lookup failed'
                            echo "RESULT: error -- ${why}"
                            if (headSha) {
                                postStatus(baseRef, headSha, 'error', "Could not verify freshness - BLOCKED (${trunc(why, 80)})")
                            }
                            error("Could not verify branch freshness: ${why}")
                        }

                        if (m['TRUNCATED'] == '1') {
                            echo "RESULT: error -- base file list truncated at the API cap, overlap cannot be proven"
                            postStatus(baseRef, headSha, 'error', 'Too many base changes to verify overlap - BLOCKED, update branch')
                            error("Base changed too many files to verify overlap -- update the branch")
                        }

                        def behindBy = (m['BEHIND'] ?: '0').toInteger()
                        def aheadBy = (m['AHEAD'] ?: '0').toInteger()
                        def prBranch = m['HEADREF'] ?: '?'
                        def overlapCount = (m['OVERLAP_COUNT'] ?: '0').toInteger()
                        def overlapFiles = m['OVERLAP'] ?: ''
                        def disjointCount = (m['DISJOINT_COUNT'] ?: '0').toInteger()
                        def disjointFiles = m['DISJOINT'] ?: ''
                        def hasOverlap = overlapCount > 0

                        echo "PR #${prNum}: ${prBranch} -> ${baseRef}"
                        echo "Branch is ${behindBy} commit(s) behind and ${aheadBy} ahead of '${baseRef}'"
                        echo "PR touches ${m['PRFILES']} file(s); '${baseRef}' changed ${m['BASEFILES']} file(s) since the merge base"
                        echo "Overlap: ${overlapCount} file(s) ${hasOverlap ? '-- ' + overlapFiles : ''}"

                        // Decision logic -- SOP 3.6: a branch must be at ZERO commits
                        // behind before merge, so any distance >= 1 blocks. Overlap is
                        // now LINE-level: same file AND same line ranges on both sides is
                        // the case a squash merge silently clobbers (SOP 8.11). Same file
                        // in different regions is reported but is not itself the risk.
                        def state
                        def description

                        if (hasOverlap) {
                            state = 'failure'
                            description = "${behindBy} behind, ${overlapCount} SAME-LINE conflict(s) - update branch (SOP 8.11)"
                        } else if (behindBy > 0) {
                            state = 'failure'
                            description = "${behindBy} commit(s) behind ${baseRef}" + (disjointCount > 0 ? ", ${disjointCount} file(s) touched both sides" : "") + " - update branch (SOP 3.6)"
                        } else {
                            state = 'success'
                            description = "Up to date with ${baseRef}"
                        }

                        echo "RESULT: ${state} -- ${description}"
                        postStatus(baseRef, headSha, state, description)

                        if (state == 'failure') {
                            postStaleComment(prNum, prBranch, baseRef, behindBy, hasOverlap, overlapFiles, disjointFiles)
                            error("Branch is ${behindBy} commits behind ${baseRef}" + (hasOverlap ? " with ${overlapCount} same-line conflict(s)" : "") + " -- must update before merge")
                        }
                    }
                }
            }
        }
    }
    post {
        always { cleanWs() }
    }
}

def trunc(s, n) {
    return s.length() > n ? s.substring(0, n) : s
}

// GitHub caps status descriptions at 140 chars. Strip characters that would
// break the JSON payload rather than relying on the shell to escape them.
def postStatus(baseRef, headSha, state, description) {
    def safe = trunc(description.replaceAll('["\\\\\n\r]', ' '), 138)
    sh """
        code=\$(curl -s -o status_resp.json -w '%{http_code}' -X POST \
            -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
            -d '{"state":"${state}","context":"Jenkins / Branch Freshness","description":"${safe}","target_url":"${BUILD_URL}"}' \
            "https://api.github.com/repos/${REPO}/statuses/${headSha}")
        echo "commit-status POST -> HTTP \$code"
        if [ "\$code" != "201" ]; then cat status_resp.json; echo "FAILED to post commit status"; exit 1; fi
    """
}

def postStaleComment(prNum, prBranch, baseRef, behindBy, hasOverlap, overlapFiles, disjointFiles) {
    def bt = '`'
    def bt3 = '```'
    def overlapSection = ''
    if (hasOverlap) {
        def pretty = overlapFiles.split(',').join('\n')
        overlapSection = "\n\n**:rotating_light: The SAME LINES were changed in both your branch and ${bt}${baseRef}${bt}:**\n${bt3}\n${pretty}\n${bt3}\n\nLine numbers are against the merge base. Merging without updating will **silently overwrite** one side (SOP 8.11).\n\n**Keep BOTH sides unless they genuinely contradict.** Resolve one hunk at a time (SOP 5.1) and confirm no behaviour that existed before is missing after. Never resolve with ${bt}--ours${bt} or ${bt}--theirs${bt} across a whole file. Nothing here is asking you to delete code: where two changes coexist, the resolution keeps both."
    }
    if (disjointFiles?.trim()) {
        def prettyD = disjointFiles.split(',').join('\n')
        overlapSection = overlapSection + "\n\n**FYI - touched by both sides but in different parts of the file (not a conflict):**\n${bt3}\n${prettyD}\n${bt3}"
    }
    def commentBody = "## :warning: Branch Out of Date\n\n" +
        "Your branch ${bt}${prBranch}${bt} is **${behindBy} commit(s) behind ${bt}${baseRef}${bt}**. It must be at zero before merge (SOP 3.6)." +
        overlapSection + "\n\n" +
        "### How to fix (non-destructive):\n" +
        "Click **\"Update branch\"** in the GitHub PR UI, or:\n" +
        "${bt3}bash\ngit checkout ${prBranch}\ngit pull origin ${baseRef}   # merge - keeps every one of your commits\n# resolve conflicts one hunk at a time, keeping both sides\ngit push\n${bt3}\n" +
        "**Do not rebase or force-push to fix this** - that rewrites your commits. A merge keeps them all (SOP 1.11).\n\n" +
        "<!-- branch-freshness-check -->"

    writeFile file: 'freshness_comment.json', text: groovy.json.JsonOutput.toJson([body: commentBody])

    sh """
        EXISTING_ID=\$(curl -sf -H "Authorization: token \$GH_TOKEN" \
            "https://api.github.com/repos/${REPO}/issues/${prNum}/comments?per_page=100" | \
            python3 -c "import sys,json;[print(c['id']) for c in json.load(sys.stdin) if '<!-- branch-freshness-check -->' in c.get('body','')][:1]" 2>/dev/null || echo "")

        if [ -n "\$EXISTING_ID" ]; then
            curl -sf -X PATCH -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                -d @freshness_comment.json \
                "https://api.github.com/repos/${REPO}/issues/comments/\$EXISTING_ID" > /dev/null
            echo "Updated existing freshness comment"
        else
            curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                -d @freshness_comment.json \
                "https://api.github.com/repos/${REPO}/issues/${prNum}/comments" > /dev/null
            echo "Posted freshness warning comment"
        fi
    """
}

// Measures staleness as compare(BASE...HEAD).behind_by -- the number of commits
// on the base branch that the PR head does not contain. This is the real
// merge-base-relative distance, so it drops to 0 the moment the author updates
// the branch. The previous implementation used pull_request.base.sha, which is
// a snapshot frozen at PR creation: it never moved when the author updated the
// branch (false red) and, worse, was compared against a base tip that could
// already contain the PR's own merge commit (false red on merged PRs).
def freshnessScript() {
    return '''
import json, os, sys, urllib.request, urllib.error

TOKEN = os.environ["GH_TOKEN"]
REPO = os.environ["REPO"]
PR = os.environ["PR_NUM"]
BASE = os.environ["BASE_REF_ENV"]

FILE_CAP = 300


def api(path):
    req = urllib.request.Request("https://api.github.com/repos/%s/%s" % (REPO, path))
    req.add_header("Authorization", "token " + TOKEN)
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("User-Agent", "marketeq-branch-freshness")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


try:
    pr = api("pulls/" + PR)

    # Only open PRs have a meaningful freshness answer. See the groovy caller
    # for why a queued job can arrive here after its PR already merged.
    if pr.get("state") != "open" or pr.get("merged_at"):
        print("STATUS=skip")
        print("REASON=PR is %s%s" % (pr.get("state"), " and merged" if pr.get("merged_at") else ""))
        sys.exit(0)

    head_sha = pr["head"]["sha"]
    head_ref = pr["head"]["ref"]

    # base...head : behind_by = commits on base that head does not have.
    cmp_ = api("compare/%s...%s" % (BASE, head_sha))
    behind = int(cmp_.get("behind_by", 0))
    ahead = int(cmp_.get("ahead_by", 0))
    merge_base = cmp_["merge_base_commit"]["sha"]

    # Line ranges are read from the "-" side of each hunk header. For BOTH
    # diffs the "-" side is the merge-base version of the file, so the two
    # sets of line numbers share a common reference and can be intersected.
    # A file with no patch (binary, too large, renamed) is treated as
    # whole-file: conservative, so a real risk is never missed.
    WHOLE = [(1, 10 ** 9)]

    def hunk_ranges(patch):
        if not patch:
            return list(WHOLE)
        out = []
        for line in patch.split(chr(10)):
            if not line.startswith("@@"):
                continue
            try:
                old_part = line.split("@@")[1].strip().split(" ")[0]
                spec = old_part[1:]
                if "," in spec:
                    start_s, count_s = spec.split(",", 1)
                    start, count = int(start_s), int(count_s)
                else:
                    start, count = int(spec), 1
                if count == 0:
                    out.append((start, start + 1))
                else:
                    out.append((start, start + count - 1))
            except (ValueError, IndexError):
                return list(WHOLE)
        return out or list(WHOLE)

    pr_files = set()
    pr_ranges = {}
    page = 1
    while page <= 5:
        batch = api("pulls/%s/files?per_page=100&page=%d" % (PR, page))
        if not batch:
            break
        for f in batch:
            pr_files.add(f["filename"])
            pr_ranges.setdefault(f["filename"], []).extend(
                hunk_ranges(f.get("patch")))
        if len(batch) < 100:
            break
        page += 1

    # Files the base branch changed since the two diverged. Only these can be
    # clobbered by a squash merge of this PR.
    base_files = set()
    base_ranges = {}
    truncated = False
    if behind > 0:
        bc = api("compare/%s...%s" % (merge_base, BASE))
        flist = bc.get("files", [])
        if len(flist) >= FILE_CAP:
            truncated = True
        for f in flist:
            base_files.add(f["filename"])
            base_ranges.setdefault(f["filename"], []).extend(
                hunk_ranges(f.get("patch")))

    # Same file on both sides. Necessary but not sufficient.
    file_overlap = sorted(pr_files & base_files)

    # Same LINES on both sides -- this is the real clobber risk.
    line_overlap = []
    for name in file_overlap:
        a = pr_ranges.get(name) or list(WHOLE)
        b = base_ranges.get(name) or list(WHOLE)
        hit = None
        for (s1, e1) in a:
            for (s2, e2) in b:
                lo, hi = max(s1, s2), min(e1, e2)
                if lo <= hi:
                    hit = (lo, hi)
                    break
            if hit:
                break
        if hit:
            line_overlap.append("%s:%d-%d" % (name, hit[0], hit[1]))

    # Files both sides touched but in different regions -- reported, not fatal.
    disjoint = [n for n in file_overlap
                if not any(x.split(":")[0] == n for x in line_overlap)]

    overlap = line_overlap

    print("STATUS=ok")
    print("BEHIND=%d" % behind)
    print("AHEAD=%d" % ahead)
    print("HEADREF=%s" % head_ref)
    print("HEADSHA=%s" % head_sha)
    print("PRFILES=%d" % len(pr_files))
    print("BASEFILES=%d" % len(base_files))
    print("FILEOVERLAP_COUNT=%d" % len(file_overlap))
    print("OVERLAP_COUNT=%d" % len(line_overlap))
    print("OVERLAP=%s" % ",".join(line_overlap[:20]))
    print("DISJOINT_COUNT=%d" % len(disjoint))
    print("DISJOINT=%s" % ",".join(disjoint[:20]))
    print("TRUNCATED=%s" % ("1" if truncated else "0"))
except Exception as e:
    print("STATUS=error")
    print("ERROR=%s" % str(e).replace("\\n", " ")[:200])
    sys.exit(1)
'''
}
