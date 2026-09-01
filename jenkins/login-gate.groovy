// Jenkins pipeline: login-gate
//
// Blocks PRs that modify SOP §1.4 permanently-locked login/auth files unless
// the repo owner (@CTorres9800) authored the PR or has submitted an APPROVED
// review.
//
// Apply by pasting into the `login-gate` job's inline pipeline script
// (Jenkins > login-gate > Configure > Pipeline script). Keep this file in sync
// with the job whenever either changes.
//
// Fixes vs. the version live as of 2026-08-28 (see issue #535):
//   1. Adds §1.4 paths the old allowlist missed — top-most-header.tsx,
//      marketplace-secondary-nav.tsx, active-project/[id]/page.tsx and the six
//      frozen env templates.
//   2. FAILS CLOSED. The old script derived changed files from a three-dot
//      `git diff` over a --depth=50 clone whose base and head were fetched at
//      --depth=1. With no reachable merge base git errored, the error was
//      swallowed by `2>/dev/null || echo ""`, the file list came back empty,
//      and the gate reported "No login files touched - gate passes". Changed
//      files now come from the GitHub PR files API, which needs no clone and
//      cannot silently degrade; any failure to determine the file list now
//      blocks instead of passing.
//   3. Applies the `login-touched` label documented in CODE_REVIEW_SOP §1.4
//      and CLAUDE.md (the old script applied `login-restricted`, which is why
//      the documented label never appeared).

pipeline {
    agent any
    options { ansiColor('xterm'); timestamps(); timeout(time: 5, unit: 'MINUTES') }
    parameters {
        string(name: 'PR_NUMBER', defaultValue: '', description: 'PR number')
        string(name: 'PR_AUTHOR', defaultValue: '', description: 'PR author')
        string(name: 'BASE_REF', defaultValue: 'dev-main', description: 'Base branch')
        string(name: 'HEAD_SHA', defaultValue: '', description: 'Head commit SHA')
    }
    environment { REPO = 'Marketeq/marketeq-projects-vibe'; REPO_OWNER = 'CTorres9800' }
    stages {
        stage('Set Pending Status') {
            when { expression { return params.HEAD_SHA?.trim() } }
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh """
                        curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                            -d '{"state":"pending","context":"Jenkins / Login Gate","description":"Running...","target_url":"${BUILD_URL}"}' \
                            "https://api.github.com/repos/${env.REPO}/statuses/${params.HEAD_SHA}" > /dev/null 2>&1 || true
                    """
                }
            }
        }

        stage('Check Login Files') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh '''#!/bin/bash
                        set -uo pipefail

                        # A PR number is required to determine the changed files.
                        # Without one we cannot evaluate the gate, so fail closed.
                        if [ -z "${PR_NUMBER}" ]; then
                            echo "ERROR: PR_NUMBER is empty - cannot determine changed files."
                            echo "Failing closed: a login-file change cannot be ruled out."
                            echo "error" > login_gate_result.txt
                            exit 1
                        fi

                        # Changed files come from the GitHub API rather than a
                        # shallow-clone diff: no clone, no merge-base, and a
                        # failure is detectable instead of looking like "no
                        # files changed". Paginated to cover large PRs.
                        CHANGED=""
                        page=1
                        while [ "$page" -le 10 ]; do
                            resp=$(curl -sS -w '\\n%{http_code}' \
                                -H "Authorization: token ${GH_TOKEN}" \
                                -H "Accept: application/vnd.github+json" \
                                "https://api.github.com/repos/${REPO}/pulls/${PR_NUMBER}/files?per_page=100&page=${page}")
                            code=$(printf '%s' "$resp" | tail -n1)
                            body=$(printf '%s' "$resp" | sed '$d')

                            if [ "$code" != "200" ]; then
                                echo "ERROR: GitHub API returned HTTP ${code} listing PR files."
                                echo "Failing closed rather than assuming no login files changed."
                                echo "error" > login_gate_result.txt
                                exit 1
                            fi

                            names=$(printf '%s' "$body" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
except Exception as e:
    sys.stderr.write('parse error: %s' % e)
    sys.exit(3)
if not isinstance(data, list):
    sys.stderr.write('unexpected payload')
    sys.exit(3)
print('\\n'.join(f.get('filename','') for f in data))
")
                            if [ $? -ne 0 ]; then
                                echo "ERROR: could not parse the PR files response."
                                echo "Failing closed."
                                echo "error" > login_gate_result.txt
                                exit 1
                            fi

                            [ -z "$names" ] && break
                            CHANGED="${CHANGED}${names}"$'\\n'
                            # Fewer than a full page means this was the last one.
                            [ "$(printf '%s' "$names" | wc -l)" -lt 99 ] && break
                            page=$((page + 1))
                        done

                        if [ -z "$(printf '%s' "$CHANGED" | tr -d '[:space:]')" ]; then
                            echo "ERROR: PR #${PR_NUMBER} reported zero changed files."
                            echo "That is never true for a real PR - failing closed."
                            echo "error" > login_gate_result.txt
                            exit 1
                        fi

                        echo "Changed files in PR #${PR_NUMBER}:"
                        printf '%s\\n' "$CHANGED" | sed '/^$/d' | sed 's/^/  /'

                        # SOP §1.4 permanently-locked paths, plus the §1.3
                        # profile-loading files that require confirmation.
                        LOGIN_FILES=""
                        while IFS= read -r f; do
                            [ -z "$f" ] && continue
                            case "$f" in
                                frontend/app/sign-in/*|frontend/app/sign-up/*|\
                                frontend/app/forgot-password/*|frontend/app/reset-password/*|\
                                frontend/contexts/auth.tsx|\
                                frontend/src/lib/api/auth.ts|\
                                frontend/service/http/auth.ts|\
                                frontend/hoc/AuthenticatedRoute.tsx|\
                                frontend/hoc/UnauthenticatedRoute.tsx|\
                                frontend/middleware.ts|\
                                frontend/components/auth/*|\
                                frontend/app/top-most-header.tsx|\
                                frontend/components/navigation/marketplace-secondary-nav.tsx|\
                                "frontend/app/(group)/active-project/[id]/page.tsx"|\
                                frontend/.env.local.example|frontend/.env.staging.example|\
                                frontend/.env.production.example|\
                                backend/.env.local.example|backend/.env.staging.example|\
                                backend/.env.production.example|\
                                backend/apps/auth-service/*|\
                                backend/apps/user-service/src/guards/*|\
                                backend/apps/api-gateway/src/proxy/proxy.service.ts|\
                                backend/libs/shared/src/guards/*|\
                                backend/libs/shared/src/decorators/*)
                                    LOGIN_FILES="$LOGIN_FILES $f" ;;
                            esac
                        done <<< "$CHANGED"

                        if [ -z "$LOGIN_FILES" ]; then
                            echo "No SOP 1.4 locked files touched - gate passes"
                            echo "none" > login_gate_result.txt
                            exit 0
                        fi

                        echo "SOP 1.4 locked files touched:$LOGIN_FILES"
                        echo "$LOGIN_FILES" > login_files_list.txt

                        if [ "${PR_AUTHOR}" = "${REPO_OWNER}" ]; then
                            echo "Author is the repo owner - allowed"
                            echo "pass" > login_gate_result.txt
                            exit 0
                        fi

                        reviews=$(curl -sS -w '\\n%{http_code}' \
                            -H "Authorization: token ${GH_TOKEN}" \
                            "https://api.github.com/repos/${REPO}/pulls/${PR_NUMBER}/reviews?per_page=100")
                        rcode=$(printf '%s' "$reviews" | tail -n1)
                        rbody=$(printf '%s' "$reviews" | sed '$d')
                        if [ "$rcode" != "200" ]; then
                            echo "ERROR: could not read reviews (HTTP ${rcode}) - failing closed."
                            echo "blocked" > login_gate_result.txt
                            exit 0
                        fi

                        APPROVED=$(printf '%s' "$rbody" | python3 -c "
import sys, json
try:
    reviews = json.load(sys.stdin)
except Exception:
    print('false'); sys.exit(0)
print('true' if any(
    r.get('user', {}).get('login') == '${REPO_OWNER}' and r.get('state') == 'APPROVED'
    for r in reviews
) else 'false')
")
                        if [ "$APPROVED" = "true" ]; then
                            echo "${REPO_OWNER} has APPROVED - gate passes"
                            echo "pass" > login_gate_result.txt
                            exit 0
                        fi

                        echo "BLOCKED: SOP 1.4 locked files changed without owner approval"
                        echo "blocked" > login_gate_result.txt
                    '''
                }
            }
        }

        stage('Post Block Comment') {
            when { expression { try { return readFile('login_gate_result.txt').trim() == 'blocked' } catch(e) { return false } } }
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    script {
                        def prNum = params.PR_NUMBER
                        def fileList = ''
                        try { fileList = readFile('login_files_list.txt').trim() } catch(e) { fileList = '(unknown)' }
                        def body = "## Login Gate - BLOCKED\n\nThis PR modifies files that CODE_REVIEW_SOP §1.4 reserves to @CTorres9800.\n\n**Restricted files changed:**\n${fileList.split(' ').findAll { it }.collect { "- `${it}`" }.join('\n')}\n\n**To unblock:** @CTorres9800 must submit an APPROVED review on this PR. Per §1.4 no other confirmation substitutes for that.\n\nPosted by Jenkins CI"
                        writeFile file: 'gate_comment.json', text: groovy.json.JsonOutput.toJson([body: body])
                        sh """
                            curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                                -d @gate_comment.json \
                                "https://api.github.com/repos/${env.REPO}/issues/${prNum}/comments" > /dev/null || true
                            curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                                -d '{"labels":["login-touched"]}' \
                                "https://api.github.com/repos/${env.REPO}/issues/${prNum}/labels" > /dev/null 2>&1 || true
                            curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                                -d '{"reviewers":["CTorres9800"]}' \
                                "https://api.github.com/repos/${env.REPO}/pulls/${prNum}/requested_reviewers" > /dev/null 2>&1 || true
                        """
                    }
                }
                error('Login gate BLOCKED - requires CTorres9800 approval')
            }
        }
    }

    post {
        success {
            script {
                if (params.HEAD_SHA?.trim()) {
                    withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                        sh """
                            curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                                -d '{"state":"success","context":"Jenkins / Login Gate","description":"Passed","target_url":"${BUILD_URL}"}' \
                                "https://api.github.com/repos/${env.REPO}/statuses/${params.HEAD_SHA}" > /dev/null 2>&1 || true
                        """
                    }
                }
            }
        }
        failure {
            script {
                if (params.HEAD_SHA?.trim()) {
                    withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                        sh """
                            curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                                -d '{"state":"failure","context":"Jenkins / Login Gate","description":"Blocked - requires owner approval","target_url":"${BUILD_URL}"}' \
                                "https://api.github.com/repos/${env.REPO}/statuses/${params.HEAD_SHA}" > /dev/null 2>&1 || true
                        """
                    }
                }
            }
        }
        always { cleanWs() }
    }
}
