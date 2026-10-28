pipeline {
    agent any
    options { ansiColor('xterm'); timestamps(); timeout(time: 10, unit: 'MINUTES') }
    parameters {
        string(name: 'PR_NUMBER', defaultValue: '', description: 'PR number (empty for push scan)')
        string(name: 'BASE_SHA', defaultValue: '', description: 'Base SHA for PR scan')
        string(name: 'HEAD_SHA', defaultValue: '', description: 'Head commit SHA for status reporting')
        string(name: 'SCAN_TYPE', defaultValue: 'pr', description: 'pr or push')
    }
    environment { REPO = 'Marketeq/marketeq-projects-vibe' }
    stages {
        stage('Set Pending Status') {
            when { expression { return params.HEAD_SHA?.trim() } }
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh """
                        curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                            -d '{"state":"pending","context":"Jenkins / Secret Scan","description":"Running...","target_url":"${BUILD_URL}"}' \
                            "https://api.github.com/repos/${env.REPO}/statuses/${params.HEAD_SHA}" > /dev/null 2>&1 || true
                    """
                }
            }
        }
        stage('Test - Gitleaks Install') {
            steps {
                sh '''
                    GITLEAKS_VERSION="8.18.4"
                    if ! command -v gitleaks >/dev/null 2>&1; then
                        curl -sSfL "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz" | tar -xz -C /usr/local/bin gitleaks
                    fi
                    gitleaks version
                    echo "PASS: Gitleaks installed"
                '''
            }
        }
        stage('Checkout') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh '''#!/bin/bash
                        set -euo pipefail
                        rm -rf repo
                        # PMCM-750: full commit history, blobs on demand. --depth=50 could
                        # leave the base unreachable and shrink the scan range to nothing
                        # without an error. Do not reintroduce --depth.
                        git clone --filter=blob:none --no-checkout "https://x-access-token:${GH_TOKEN}@github.com/${REPO}.git" repo
                        cd repo
                        if [ "${SCAN_TYPE:-}" = "pr" ]; then
                            if [ -z "${PR_NUMBER:-}" ]; then
                                echo "FAIL: SCAN_TYPE=pr but PR_NUMBER is empty - refusing to scan the default branch instead"
                                exit 1
                            fi
                            # Without this the clone holds only the default branch and the
                            # PR's own commits are never scanned (PMCM-750 defect 3.1).
                            git fetch origin "pull/${PR_NUMBER}/head:pr-${PR_NUMBER}"
                            echo "Scanning PR #${PR_NUMBER} at $(git rev-parse --short "pr-${PR_NUMBER}")"
                        fi
                    '''
                }
            }
        }
        stage('Scan for Secrets') {
            steps {
                sh '''#!/bin/bash
                    # set -e is load-bearing: without it a gitleaks exit 1 falls through to
                    # the PASS echo and the PR gets a green tick with a secret in it
                    # (PMCM-750 defect 3.2).
                    set -euo pipefail
                    cd repo
                    # Read the config from dev-main, not from the PR: otherwise a PR can
                    # allowlist its own secret by editing .gitleaks.toml.
                    CONFIG_FLAG=""
                    if git cat-file -e origin/dev-main:.gitleaks.toml 2>/dev/null; then
                        git show origin/dev-main:.gitleaks.toml > ../gitleaks-base.toml
                        CONFIG_FLAG="--config=../gitleaks-base.toml"
                        echo "Using .gitleaks.toml from origin/dev-main"
                    else
                        echo "No .gitleaks.toml on origin/dev-main - using gitleaks default rules"
                    fi
                    if [ "${SCAN_TYPE:-}" = "pr" ]; then
                        SCAN_REF="pr-${PR_NUMBER}"
                        if [ -n "${BASE_SHA:-}" ]; then
                            git cat-file -e "${BASE_SHA}^{commit}" 2>/dev/null || { echo "FAIL: BASE_SHA ${BASE_SHA} not reachable - scan range would be empty"; exit 1; }
                            RANGE="${BASE_SHA}..${SCAN_REF}"
                        else
                            # The dispatcher sends no BASE_SHA. Scan every commit on the PR
                            # that is not already on a protected branch: the PR's own commits.
                            RANGE="${SCAN_REF} --not origin/dev-main origin/staging origin/live-mvp"
                        fi
                    elif [ -n "${HEAD_SHA:-}" ]; then
                        # Push: the dispatcher sends the push's before/after SHAs. Scan exactly
                        # the commits the push added to the branch.
                        git cat-file -e "${HEAD_SHA}^{commit}" 2>/dev/null || { echo "FAIL: pushed commit ${HEAD_SHA} not reachable"; exit 1; }
                        if [ -n "${BASE_SHA:-}" ] && ! [[ "${BASE_SHA}" =~ ^0+$ ]]; then
                            git cat-file -e "${BASE_SHA}^{commit}" 2>/dev/null || { echo "FAIL: push base ${BASE_SHA} not reachable (force push?) - scan range would be wrong"; exit 1; }
                            RANGE="${BASE_SHA}..${HEAD_SHA}"
                        else
                            RANGE="${HEAD_SHA}~1..${HEAD_SHA}"
                        fi
                    else
                        # Manual run with no SHAs: the default branch's newest commit.
                        RANGE="HEAD~1..HEAD"
                    fi
                    # Also the bad-ref guard: git log errors do not fail gitleaks.
                    COUNT=$(git rev-list --count ${RANGE})
                    echo "Scanning ${COUNT} commit(s): ${RANGE}"
                    gitleaks detect --source=. ${CONFIG_FLAG} --log-opts="${RANGE}" --redact --verbose
                    echo "PASS: No secrets detected"
                '''
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
                                -d '{"state":"success","context":"Jenkins / Secret Scan","description":"No secrets found","target_url":"${BUILD_URL}"}' \
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
                                -d '{"state":"failure","context":"Jenkins / Secret Scan","description":"Secrets detected","target_url":"${BUILD_URL}"}' \
                                "https://api.github.com/repos/${env.REPO}/statuses/${params.HEAD_SHA}" > /dev/null 2>&1 || true
                        """
                    }
                }
            }
        }
        always { cleanWs() }
    }
}