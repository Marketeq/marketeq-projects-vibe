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
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh """#!/bin/bash
                        PR_DATA=\$(curl -sf -H "Authorization: token \$GH_TOKEN" \
                            "https://api.github.com/repos/${env.REPO}/commits/${params.COMMIT_SHA}/pulls" 2>/dev/null || echo "[]")
                        PR_NUM=\$(echo "\$PR_DATA" | python3 -c "import sys,json; prs=json.load(sys.stdin); print(prs[0]['number'] if prs else '')" 2>/dev/null || echo "")

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

                        # ALERT ONLY -- post a comment. NEVER auto-revert.
                        echo "\$FAILED_CHECKS" | tr '|' '\n' | sed 's/^/- /' > /tmp/failed_list.txt
                        python3 -c "
import json
failed = open('/tmp/failed_list.txt').read().strip()
body = '## SOP Audit Warning\\\\n\\\\nThis PR was merged with failing checks:\\\\n' + failed.replace(chr(10), '\\\\n') + '\\\\n\\\\n'
body += '**Action required:** Review whether these failures are legitimate.\\\\n'
body += 'No auto-revert performed. Reverts require manual decision.\\\\n\\\\n'
body += 'Posted by Jenkins CI'
print(json.dumps({'body': body}))
" > pr_comment.json
                        curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                            -d @pr_comment.json \
                            "https://api.github.com/repos/${env.REPO}/issues/\${PR_NUM}/comments" > /dev/null 2>&1 || true

                        echo "Posted audit warning -- no auto-revert"
                    """
                }
            }
        }
    }
    post { always { cleanWs() } }
}
