pipeline {
    agent any
    options { ansiColor('xterm'); timestamps(); timeout(time: 10, unit: 'MINUTES') }
    parameters {
        string(name: 'BRANCH', defaultValue: 'dev-main', description: 'Branch that was pushed to')
        string(name: 'COMMIT_SHA', defaultValue: '', description: 'Commit SHA')
        string(name: 'PUSHER', defaultValue: '', description: 'Who pushed')
        booleanParam(name: 'FORCED', defaultValue: false, description: 'Was it a force push?')
    }
    environment { REPO = 'Marketeq/marketeq-projects-vibe'; REPO_OWNER = 'CTorres9800' }
    stages {
        stage('Test') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh 'curl -sf -H "Authorization: token $GH_TOKEN" "https://api.github.com/repos/${REPO}" > /dev/null && echo "PASS"'
                }
            }
        }
        stage('Force Push Detection') {
            when { expression { return params.FORCED == true } }
            steps {
                script {
                    if (params.BRANCH == 'staging') {
                        echo "Force push to staging -- checking if this is a sync from dev-main..."
                        def devMainSha = ''
                        withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                            devMainSha = sh(
                                script: """curl -sf -H "Authorization: token \$GH_TOKEN" "https://api.github.com/repos/${env.REPO}/commits/dev-main" | python3 -c "import sys,json; print(json.load(sys.stdin)['sha'])" """,
                                returnStdout: true
                            ).trim()
                        }
                        if (params.COMMIT_SHA == devMainSha) {
                            echo "Force push SHA matches dev-main HEAD -- approved sync, skipping"
                            return
                        }
                        echo "Force push SHA does NOT match dev-main HEAD -- flagging as violation"
                    }
                    withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                        sh """#!/bin/bash
                            echo "FORCE PUSH detected on ${params.BRANCH} by ${params.PUSHER}"
                            TIMESTAMP=\$(date -u +%Y-%m-%dT%H:%M:%SZ)
                            python3 -c "
import json
body = '## URGENT: Force push to ${params.BRANCH} by @${params.PUSHER}\\\\n\\\\n'
body += '**Commit:** ${params.COMMIT_SHA}\\\\n'
body += '**Timestamp:** ' + '\$TIMESTAMP' + '\\\\n\\\\n'
body += 'Force pushes to protected branches are prohibited.\\\\n\\\\n'
body += 'Posted by Jenkins CI'
print(json.dumps({'title': 'URGENT: forced push to ${params.BRANCH} by @${params.PUSHER}', 'body': body, 'assignees': ['${env.REPO_OWNER}'], 'labels': ['urgent', 'force-push-violation']}))
" > force_issue.json
                            curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                                -d @force_issue.json \
                                "https://api.github.com/repos/${env.REPO}/issues" > /dev/null
                            exit 1
                        """
                    }
                }
            }
        }
        stage('Wait for Statuses') {
            when { expression { return params.FORCED == false } }
            steps {
                echo "Waiting 30s for PR gate statuses to settle..."
                sleep(time: 30, unit: 'SECONDS')
            }
        }
        stage('Audit') {
            when { expression { return params.FORCED == false } }
            steps {
                sh '''cat > review_audit.py <<'REVIEW_AUDIT_PY'
import fnmatch, json, sys

# Paths owned by the repo owner: the auth, login, profile and infrastructure
# files the SOP treats as off-limits. Deliberately NOT every owned path --
# CODEOWNERS opens with "* @Marketeq/code-review", which owns everything, and
# several rules own whole service directories. Auditing on those would flag
# most merges (741 merged, 47 carry an approval), and an alert that fires on
# everything is an alert nobody reads.
OWNER = '@CTorres9800'

def specific_rules(text):
    rules = []
    for line in text.splitlines():
        line = line.split('#', 1)[0].strip()
        if not line:
            continue
        parts = line.split()
        if len(parts) < 2 or parts[0] == '*':
            continue
        rules.append((parts[0], parts[1:]))
    return rules

def owners_for(path, rules):
    found = []
    for pattern, owners in rules:
        p = pattern[1:] if pattern.startswith('/') else pattern
        if p.endswith('/'):
            hit = path.startswith(p)
        elif any(c in p for c in '*?['):
            hit = fnmatch.fnmatch(path, p) or fnmatch.fnmatch(path, '*/' + p)
        else:
            hit = path == p or path.startswith(p + '/')
        if hit:
            found = owners
    return found

data = json.load(sys.stdin)
rules = specific_rules(data.get('codeowners', ''))
author = (data.get('author') or '').lower()

sensitive = [f for f in data.get('files', []) if OWNER in owners_for(f, rules)]
if not sensitive:
    print('')
    sys.exit(0)

# Latest review state per reviewer. The author's own review never counts, and a
# later CHANGES_REQUESTED overrides an earlier approval from the same person.
latest = {}
for r in data.get('reviews', []):
    who = ((r.get('user') or {}).get('login') or '').lower()
    if not who or who == author:
        continue
    latest[who] = (r.get('state') or '').upper()

if any(st == 'APPROVED' for st in latest.values()):
    print('')
    sys.exit(0)

print(json.dumps({'files': sensitive[:10], 'count': len(sensitive)}))
REVIEW_AUDIT_PY
echo "review_audit.py written"'''
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh """#!/bin/bash
                        export COMMIT_SHA="${params.COMMIT_SHA}"

                        PR_DATA=\$(curl -sf -H "Authorization: token \$GH_TOKEN" \
                            "https://api.github.com/repos/${env.REPO}/commits/${params.COMMIT_SHA}/pulls" 2>/dev/null || echo "[]")
                        PR_NUM=\$(echo "\$PR_DATA" | python3 -c "import sys,json; prs=json.load(sys.stdin); print(prs[0]['number'] if prs else '')" 2>/dev/null || echo "")

                        # GitHub populates the commit -> PR association behind /commits/<sha>/pulls
                        # ASYNCHRONOUSLY. For a squash merge it can still be empty minutes after the
                        # merge, so this audit -- which runs ~30s later -- would see no PR and report
                        # a fully reviewed merge as a direct push. That is what opened the bogus
                        # urgent issue #549 for PR #545: the endpoint returned [] at 23:01, then
                        # returned PR #545 for the same commit a few minutes on.
                        #
                        # Waiting longer would only make the race less likely, never remove it, so
                        # resolve the PR deterministically instead: GitHub appends "(#N)" to the
                        # squash commit subject, so recover N from there.
                        #
                        # The number is then VERIFIED against the API: PR #N must be merged AND its
                        # merge_commit_sha must be this exact commit. Without that check, writing
                        # "(#123)" into a real direct-push commit message would skip the audit.
                        if [ -z "\$PR_NUM" ] || [ "\$PR_NUM" = "None" ]; then
                            PR_NUM=\$(curl -sf -H "Authorization: token \$GH_TOKEN" \
                                "https://api.github.com/repos/${env.REPO}/commits/${params.COMMIT_SHA}" 2>/dev/null | python3 -c '
import json, os, sys, urllib.request

try:
    commit = json.load(sys.stdin)
except Exception:
    sys.exit(0)

subject = (commit.get("commit", {}).get("message") or "").split(chr(10))[0].rstrip()

# Trailing "(#N)" only -- no regex, backslash escapes do not survive the Groovy string.
num = ""
if subject.endswith(")"):
    start = subject.rfind("(#")
    if start != -1:
        candidate = subject[start + 2:-1]
        if candidate.isdigit():
            num = candidate

if not num:
    sys.exit(0)

request = urllib.request.Request(
    "https://api.github.com/repos/" + os.environ["REPO"] + "/pulls/" + num,
    headers={"Authorization": "token " + os.environ["GH_TOKEN"]},
)
try:
    pr = json.load(urllib.request.urlopen(request, timeout=15))
except Exception:
    sys.exit(0)

if pr.get("merged") and pr.get("merge_commit_sha") == os.environ["COMMIT_SHA"]:
    print(num)
' 2>/dev/null || echo "")

                            if [ -n "\$PR_NUM" ]; then
                                echo "Squash merge of PR #\$PR_NUM -- merge_commit_sha matches ${params.COMMIT_SHA}, auditing that PR"
                            fi
                        fi

                        if [ -z "\$PR_NUM" ] || [ "\$PR_NUM" = "None" ]; then
                            # Promotion merges (dev-main -> staging, staging -> live-mvp) are pushed
                            # straight to the target branch by the QA promotion scripts and the sync
                            # job, so they never have a PR of their own. They are legitimate as long
                            # as the merge only brings in code already on the upstream branch -- i.e.
                            # its second parent is an ancestor of that branch, so every commit in it
                            # already went through PR review there. Mirrors the exemption the
                            # force-push path grants (docs/JENKINS_REMEDIATION.md Issue 5).
                            UPSTREAM=""
                            case "${params.BRANCH}" in
                                staging)  UPSTREAM="dev-main" ;;
                                live-mvp) UPSTREAM="staging" ;;
                            esac

                            if [ -n "\$UPSTREAM" ]; then
                                PARENTS=\$(curl -sf -H "Authorization: token \$GH_TOKEN" "https://api.github.com/repos/${env.REPO}/commits/${params.COMMIT_SHA}" 2>/dev/null | python3 -c "import sys,json; print(' '.join(p['sha'] for p in json.load(sys.stdin).get('parents',[])))" 2>/dev/null || echo "")

                                if [ "\$(echo \$PARENTS | wc -w)" -eq 2 ]; then
                                    MERGED_IN=\$(echo \$PARENTS | awk '{print \$2}')
                                    # compare/BASE...HEAD is "identical" when both are the same commit
                                    # and "ahead" when HEAD moved past BASE. Either way MERGED_IN is an
                                    # ancestor of UPSTREAM. "behind"/"diverged" mean it is not.
                                    CMP=\$(curl -sf -H "Authorization: token \$GH_TOKEN" "https://api.github.com/repos/${env.REPO}/compare/\${MERGED_IN}...\${UPSTREAM}" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null || echo "")

                                    if [ "\$CMP" = "identical" ] || [ "\$CMP" = "ahead" ]; then
                                        echo "Promotion merge of \$UPSTREAM into ${params.BRANCH} (second parent \${MERGED_IN} is on \$UPSTREAM, cmp=\$CMP) -- approved, skipping audit"
                                        exit 0
                                    fi
                                    echo "Merge second parent \${MERGED_IN} is NOT on \$UPSTREAM (cmp=\${CMP:-unknown}) -- not an approved promotion"
                                else
                                    echo "Push to ${params.BRANCH} is not a two-parent merge -- not a promotion"
                                fi
                            fi

                            if [ "${params.PUSHER}" != "${env.REPO_OWNER}" ]; then
                                echo "Direct push with no PR by ${params.PUSHER} -- creating issue"
                                SHORT_SHA=\$(echo "${params.COMMIT_SHA}" | head -c 8)
                                python3 -c "
import json
body = '## Direct push to ${params.BRANCH} bypassed PR review\\\\n\\\\n'
body += '**Pusher:** @${params.PUSHER}\\\\n'
body += '**Commit:** [' + '\$SHORT_SHA' + '](https://github.com/${env.REPO}/commit/${params.COMMIT_SHA})\\\\n\\\\n'
body += 'Posted by Jenkins CI'
print(json.dumps({'title': 'Direct push to ${params.BRANCH} by @${params.PUSHER}', 'body': body, 'assignees': ['${env.REPO_OWNER}'], 'labels': ['urgent', 'sop-violation']}))
" > direct_push_issue.json
                                curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                                    -d @direct_push_issue.json \
                                    "https://api.github.com/repos/${env.REPO}/issues" > /dev/null
                                exit 1
                            fi
                            echo "Repo owner direct push - skip audit"
                            exit 0
                        fi

                        echo "Auditing PR #\$PR_NUM"
                        HEAD_SHA_PR=\$(curl -sf -H "Authorization: token \$GH_TOKEN" \
                            "https://api.github.com/repos/${env.REPO}/pulls/\${PR_NUM}" | \
                            python3 -c "import sys,json; print(json.load(sys.stdin).get('head',{}).get('sha',''))" 2>/dev/null)

                        # --- Review audit: AC-3.3.1 (grant approval) and US-6.1 (case 16) ---
                        # Was a PR touching an off-limits path merged with nobody but its
                        # author approving it? Scoped to repo-owner paths; see review_audit.py.
                        PR_JSON=\$(curl -sf -H "Authorization: token \$GH_TOKEN" \
                            "https://api.github.com/repos/${env.REPO}/pulls/\${PR_NUM}" 2>/dev/null || echo '{}')
                        curl -sf -H "Authorization: token \$GH_TOKEN" \
                            "https://api.github.com/repos/${env.REPO}/pulls/\${PR_NUM}/files?per_page=100" \
                            > pr_files.json 2>/dev/null || echo '[]' > pr_files.json
                        curl -sf -H "Authorization: token \$GH_TOKEN" \
                            "https://api.github.com/repos/${env.REPO}/pulls/\${PR_NUM}/reviews?per_page=100" \
                            > pr_reviews.json 2>/dev/null || echo '[]' > pr_reviews.json
                        curl -sf -H "Authorization: token \$GH_TOKEN" -H "Accept: application/vnd.github.raw" \
                            "https://api.github.com/repos/${env.REPO}/contents/.github/CODEOWNERS?ref=${params.COMMIT_SHA}" \
                            > codeowners.txt 2>/dev/null || : > codeowners.txt

                        echo "\$PR_JSON" > pr.json
                        python3 -c "
import json
pr = json.load(open('pr.json'))
print(json.dumps({
    'codeowners': open('codeowners.txt').read(),
    'author': (pr.get('user') or {}).get('login', ''),
    'files': [f['filename'] for f in json.load(open('pr_files.json'))],
    'reviews': json.load(open('pr_reviews.json')),
}))
" > audit_input.json 2>/dev/null || echo '{}' > audit_input.json

                        UNAPPROVED=\$(python3 review_audit.py < audit_input.json 2>/dev/null || echo "")
                        if [ -n "\$UNAPPROVED" ]; then
                            echo "PR #\$PR_NUM touched off-limits paths and merged unapproved: \$UNAPPROVED"
                            echo "\$UNAPPROVED" > unapproved.json
                            python3 -c "
import json
d = json.load(open('unapproved.json'))
files = chr(10).join('- ' + f for f in d['files'])
more = '' if d['count'] <= 10 else chr(10) + '...and ' + str(d['count'] - 10) + ' more.'
body = ('## Merged without owner approval' + chr(10) + chr(10) +
        'This PR changed ' + str(d['count']) + ' file(s) under paths owned by @CTorres9800 '
        'and was merged with no approving review from anyone other than its author.' + chr(10) + chr(10) +
        files + more + chr(10) + chr(10) +
        'These paths are off-limits under CODE_REVIEW_SOP SS1.3 and SS1.4. Required '
        'reviewers cannot be enforced on this GitHub plan, so this is detected after '
        'the fact rather than prevented.' + chr(10) + chr(10) +
        '**Action required:** @CTorres9800 to confirm the change was intended. '
        'Fix forward -- keep the code and open a follow-up PR if not.' + chr(10) + chr(10) +
        'Posted by Jenkins CI')
print(json.dumps({'body': body}))
" > review_comment.json
                            curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                                -d @review_comment.json \
                                "https://api.github.com/repos/${env.REPO}/issues/\${PR_NUM}/comments" > /dev/null 2>&1 || true
                            echo "Posted unapproved-merge warning -- report only"
                        else
                            echo "Review audit PASSED for PR #\$PR_NUM"
                        fi

                        STATUSES=\$(curl -sf -H "Authorization: token \$GH_TOKEN" \
                            "https://api.github.com/repos/${env.REPO}/commits/\${HEAD_SHA_PR}/statuses?per_page=100" 2>/dev/null || echo '[]')

                        FAILED_CHECKS=\$(echo "\$STATUSES" | python3 -c "
import sys, json
statuses = json.load(sys.stdin)
required = {
    'Jenkins / AI Breakage Detector',
    'Jenkins / Secret Scan',
    'Jenkins / SOP Check',
    'Jenkins / Login Gate',
    'Jenkins / Code Review'
}
latest = {}
for s in statuses:
    ctx = s.get('context', '')
    if ctx not in latest:
        latest[ctx] = s.get('state', '')
failed = []
for req in sorted(required):
    if req not in latest:
        continue
    elif latest[req] not in ('success',):
        failed.append(req + ' (' + latest[req] + ')')
print('|'.join(failed) if failed else '')
" 2>/dev/null || echo "")

                        if [ -z "\$FAILED_CHECKS" ]; then
                            echo "Post-merge audit PASSED for PR #\$PR_NUM"
                            exit 0
                        fi

                        echo "PR #\$PR_NUM merged with failing checks: \$FAILED_CHECKS"

                        # REPORT ONLY -- post a comment. This pipeline never modifies code.
                        echo "\$FAILED_CHECKS" | tr '|' '\n' | sed 's/^/- /' > /tmp/failed_list.txt
                        python3 -c "
import json
failed = open('/tmp/failed_list.txt').read().strip()
body = '## SOP Audit Warning\\\\n\\\\nThis PR was merged with failing checks:\\\\n' + failed.replace(chr(10), '\\\\n') + '\\\\n\\\\n'
body += '**Action required:** Review whether these failures are legitimate.\\\\n'
body += 'Fix forward: keep the code and open a follow-up PR.\\\\n\\\\n'
body += 'Posted by Jenkins CI'
print(json.dumps({'body': body}))
" > pr_comment.json
                        curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                            -d @pr_comment.json \
                            "https://api.github.com/repos/${env.REPO}/issues/\${PR_NUM}/comments" > /dev/null 2>&1 || true

                        echo "Posted audit warning -- report only"
                    """
                }
            }
        }
    }
    post { always { cleanWs() } }
}
