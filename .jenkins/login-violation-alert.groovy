pipeline {
    agent any
    options { ansiColor('xterm'); timestamps(); timeout(time: 5, unit: 'MINUTES') }
    parameters {
        string(name: 'PUSHER', defaultValue: '', description: 'Who pushed')
        string(name: 'BRANCH', defaultValue: 'dev-main', description: 'Branch pushed to')
        string(name: 'COMMIT_SHA', defaultValue: '', description: 'Commit SHA')
    }
    environment { REPO = 'Marketeq/marketeq-projects-vibe'; REPO_OWNER = 'CTorres9800' }
    stages {
        stage('Check for Login Violations') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh '''#!/bin/bash
                        if [ "${PUSHER}" = "${REPO_OWNER}" ]; then echo "Owner push - skip"; exit 0; fi
                        rm -rf repo && git clone --depth=5 "https://x-access-token:${GH_TOKEN}@github.com/${REPO}.git" repo && cd repo
                        CHANGED=$(git diff --name-only HEAD~1..HEAD 2>/dev/null || echo "")
                        LOGIN_HIT=0
                        LOGIN_FILES=""
                        while IFS= read -r f; do
                            case "$f" in
                                frontend/app/sign-in/*|frontend/app/sign-up/*|\
                                frontend/contexts/auth.tsx|frontend/src/lib/api/auth.ts|\
                                frontend/service/http/auth.ts|\
                                frontend/hoc/AuthenticatedRoute.tsx|frontend/hoc/UnauthenticatedRoute.tsx|\
                                frontend/middleware.ts|\
                                frontend/app/forgot-password/*|frontend/app/reset-password/*|\
                                frontend/components/auth/*|\
                                backend/apps/auth-service/*|\
                                backend/libs/shared/src/guards/*|\
                                backend/libs/shared/src/decorators/*)
                                    LOGIN_HIT=1
                                    LOGIN_FILES="${LOGIN_FILES}- ${f}\\n" ;;
                            esac
                        done <<< "$CHANGED"
                        if [ "$LOGIN_HIT" = "0" ]; then echo "No login files in push"; exit 0; fi

                        # Check if there was an associated PR with CTorres9800 approval
                        APPROVED="false"
                        PR_DATA=$(curl -sf -H "Authorization: token $GH_TOKEN" \
                            "https://api.github.com/repos/${REPO}/commits/${COMMIT_SHA}/pulls" 2>/dev/null || echo "[]")
                        PR_NUM=$(echo "$PR_DATA" | python3 -c "import sys,json; prs=json.load(sys.stdin); print(prs[0]['number'] if prs else '')" 2>/dev/null || echo "")
                        PR_REF="direct push"
                        if [ -n "$PR_NUM" ]; then
                            PR_REF="PR #${PR_NUM}"
                            APPROVED=$(curl -sf -H "Authorization: token $GH_TOKEN" \
                                "https://api.github.com/repos/${REPO}/pulls/${PR_NUM}/reviews" | \
                                python3 -c "
import sys, json
reviews = json.load(sys.stdin)
approved = any(r.get('user',{}).get('login') == '${REPO_OWNER}' and r.get('state') == 'APPROVED' for r in reviews)
print('true' if approved else 'false')
" 2>/dev/null || echo "false")
                        fi

                        if [ "$APPROVED" = "true" ]; then
                            echo "Change was approved by CTorres9800 - no violation"
                            exit 0
                        fi

                        echo "LOGIN VIOLATION: ${PUSHER} pushed login files to ${BRANCH} without approval"

                        # Build issue JSON
                        SHORT_SHA=$(echo "${COMMIT_SHA}" | head -c 8)
                        python3 -c "
import json, sys
body = '## Login Branch Rule Violated\n\n'
body += '**Developer:** @${PUSHER}\n'
body += '**Branch:** ${BRANCH}\n'
body += '**Commit:** [' + '${SHORT_SHA}' + '](https://github.com/${REPO}/commit/${COMMIT_SHA})\n'
body += '**Source:** ${PR_REF}\n\n'
body += '### Files Changed\n$(echo -e "$LOGIN_FILES")\n\n'
body += '### Why This Matters\nLogin/auth code is frozen (SOP 1.4). Changes require explicit approval from @${REPO_OWNER}.\n\n'
body += '### Required Action\n1. @${REPO_OWNER} must retroactively review and approve\n2. If not approved within 24 hours, changes must be reverted\n\nPosted by Jenkins CI'
print(json.dumps({'title': 'Login branch rule violated by @${PUSHER} - ${PR_REF}', 'body': body, 'assignees': ['${PUSHER}', '${REPO_OWNER}'], 'labels': ['login-restricted', 'urgent']}))
" > issue_body.json

                        curl -sf -X POST -H "Authorization: token $GH_TOKEN" -H "Content-Type: application/json" \
                            -d @issue_body.json \
                            "https://api.github.com/repos/${REPO}/issues" > /dev/null
                        echo "Created violation issue"
                    '''
                }
            }
        }
    }
    post { always { cleanWs() } }
}
