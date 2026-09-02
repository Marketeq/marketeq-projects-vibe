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
        stage('Test') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh 'curl -sf -H "Authorization: token $GH_TOKEN" "https://api.github.com/repos/${REPO}" > /dev/null && echo "PASS: GitHub API"'
                }
            }
        }
        stage('Check Login Files') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh '''#!/bin/bash
                        rm -rf repo && git clone --depth=50 "https://x-access-token:${GH_TOKEN}@github.com/${REPO}.git" repo && cd repo
                        git fetch origin "${BASE_REF}" --depth=1 || true
                        if [ -n "${HEAD_SHA}" ]; then
                            git fetch origin "${HEAD_SHA}" --depth=1 || true
                            git checkout "${HEAD_SHA}" || true
                        fi
                        BASE_SHA=$(git rev-parse "origin/${BASE_REF}" 2>/dev/null || git rev-parse HEAD~1)
                        CHANGED=$(git diff --name-only "$BASE_SHA"...HEAD 2>/dev/null || echo "")
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
                                backend/apps/user-service/src/guards/*|\
                                backend/apps/api-gateway/src/proxy/proxy.service.ts|\
                                backend/libs/shared/src/guards/*|\
                                backend/libs/shared/src/decorators/*)
                                    LOGIN_FILES="$LOGIN_FILES $f" ;;
                            esac
                        done <<< "$CHANGED"
                        if [ -z "$LOGIN_FILES" ]; then
                            echo "No login files touched - gate passes"
                            echo "none" > ../login_gate_result.txt
                            exit 0
                        fi
                        echo "Login files touched:$LOGIN_FILES"
                        echo "$LOGIN_FILES" > ../login_files_list.txt
                        if [ "${PR_AUTHOR}" = "${REPO_OWNER}" ]; then
                            echo "Author is repo owner - allowed"
                            echo "pass" > ../login_gate_result.txt
                            exit 0
                        fi
                        if [ -n "${PR_NUMBER}" ]; then
                            APPROVED=$(curl -sf -H "Authorization: token $GH_TOKEN" \
                                "https://api.github.com/repos/${REPO}/pulls/${PR_NUMBER}/reviews" | \
                                python3 -c "
import sys, json
reviews = json.load(sys.stdin)
approved = any(r.get('user',{}).get('login') == '${REPO_OWNER}' and r.get('state') == 'APPROVED' for r in reviews)
print('true' if approved else 'false')
" 2>/dev/null || echo "false")
                            if [ "$APPROVED" = "true" ]; then
                                echo "CTorres9800 has APPROVED - gate passes"
                                echo "pass" > ../login_gate_result.txt
                                exit 0
                            fi
                        fi
                        echo "BLOCKED: Login files changed without owner approval"
                        echo "blocked" > ../login_gate_result.txt
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
                        def body = "## Login Gate - BLOCKED\n\nThis PR modifies login/auth files and requires @CTorres9800 approval.\n\n**Restricted files changed:**\n${fileList.split(' ').collect { "- `${it}`" }.join('\n')}\n\n**To unblock:** @CTorres9800 must submit an APPROVED review on this PR.\n\nPosted by Jenkins CI"
                        writeFile file: 'gate_comment.json', text: groovy.json.JsonOutput.toJson([body: body])
                        sh """
                            curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                                -d @gate_comment.json \
                                "https://api.github.com/repos/${env.REPO}/issues/${prNum}/comments" > /dev/null
                            curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                                -d '{"labels":["login-restricted"]}' \
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