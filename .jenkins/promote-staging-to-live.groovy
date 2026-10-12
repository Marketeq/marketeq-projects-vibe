pipeline {
    agent any
    options { ansiColor('xterm'); timestamps(); timeout(time: 40, unit: 'MINUTES'); disableConcurrentBuilds() }
    parameters {
        string(name: 'SOURCE_BRANCH', defaultValue: 'staging', description: 'Source branch to promote from')
        string(name: 'TARGET_BRANCH', defaultValue: 'live', description: 'Production branch to promote INTO')
        string(name: 'CONFIRM', defaultValue: '', description: 'Type PROMOTE TO LIVE to confirm')
        booleanParam(name: 'DRY_RUN', defaultValue: false, description: 'Show what would promote without pushing')
    }
    environment {
        REPO = 'Marketeq/marketeq-projects-vibe'
        BACKEND_URL = 'https://marketeq-backend.onrender.com'
        VERCEL_LIVE_PROJECT_ID = 'prj_IWqlhXCreXE6l2QIF2Z82HXT1tdQ'
        VERCEL_TEAM_SLUG = 'marketeq-projects-d993fac5'
        LIVE_HOST = 'https://marketeq-projects-live.vercel.app'
    }
    stages {
        stage('Confirm') {
            when { expression { return params.DRY_RUN == false } }
            steps {
                script {
                    if (params.CONFIRM != 'PROMOTE TO LIVE') {
                        error("Promotion requires typing 'PROMOTE TO LIVE' in the CONFIRM field. Aborting.")
                    }
                    echo "Confirmation received. Promoting ${params.SOURCE_BRANCH} -> ${params.TARGET_BRANCH}."
                }
            }
        }

        stage('Pre-flight health check') {
            steps {
                sh '''#!/bin/bash
                    set -e
                    echo "=== Pre-flight: checking shared backend health ==="
                    HEALTH=$(curl -sf --max-time 15 "${BACKEND_URL}/services/health" 2>/dev/null || echo '{"overall":"unreachable"}')
                    OVERALL=$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('overall','unknown'))" 2>/dev/null || echo "parse_error")
                    echo "Backend health: $OVERALL"
                    if [ "$OVERALL" != "healthy" ]; then
                        echo "WARNING: Backend is $OVERALL -- proceeding with caution"
                    fi

                    echo "=== Pre-flight: checking auth-service login endpoint ==="
                    LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
                        -X POST "${BACKEND_URL}/api/auth/login" \
                        -H "Content-Type: application/json" \
                        -H "Origin: ${LIVE_HOST}" \
                        -d '{"email":"healthcheck@test.com","password":"healthcheck123"}' 2>/dev/null || echo "000")
                    echo "Auth login endpoint returned: $LOGIN_STATUS"
                    if [ "$LOGIN_STATUS" = "000" ]; then
                        echo "ERROR: Auth-service is not responding to POST requests."
                        echo "Login will be broken after promotion. Fix auth-service first."
                        exit 1
                    fi
                    echo "Pre-flight checks passed."
                '''
            }
        }

        stage('Preview') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh '''#!/bin/bash
                        set -e
                        rm -rf repo && git clone "https://${GH_TOKEN}@github.com/${REPO}.git" repo && cd repo

                        for i in 1 2 3; do
                            git fetch origin "${SOURCE_BRANCH}:refs/remotes/origin/${SOURCE_BRANCH}" "${TARGET_BRANCH}:refs/remotes/origin/${TARGET_BRANCH}" && break
                            echo "Fetch attempt $i failed, retrying in 5s..."
                            sleep 5
                        done
                        git rev-parse "origin/${TARGET_BRANCH}" >/dev/null 2>&1 || { echo "ERROR: target branch origin/${TARGET_BRANCH} not resolvable"; exit 1; }
                        git rev-parse "origin/${SOURCE_BRANCH}" >/dev/null 2>&1 || { echo "ERROR: source branch origin/${SOURCE_BRANCH} not resolvable"; exit 1; }

                        AHEAD=$(git rev-list --count "origin/${TARGET_BRANCH}..origin/${SOURCE_BRANCH}")
                        BEHIND=$(git rev-list --count "origin/${SOURCE_BRANCH}..origin/${TARGET_BRANCH}")
                        echo "=== Branch comparison ==="
                        echo "${SOURCE_BRANCH} is $AHEAD commits ahead of ${TARGET_BRANCH}"
                        echo "${SOURCE_BRANCH} is $BEHIND commits behind ${TARGET_BRANCH}"

                        if [ "$AHEAD" = "0" ]; then
                            echo "Nothing to promote -- ${TARGET_BRANCH} already contains ${SOURCE_BRANCH}."
                            touch ../nothing_to_promote.flag
                            exit 0
                        fi

                        echo ""
                        echo "=== Commits to promote (first 50) ==="
                        git log "origin/${TARGET_BRANCH}..origin/${SOURCE_BRANCH}" --oneline --no-merges | head -50
                        echo ""
                        echo "=== Files changed ==="
                        git diff --stat "origin/${TARGET_BRANCH}..origin/${SOURCE_BRANCH}" | tail -8
                    '''
                }
            }
        }

        stage('Merge promote') {
            when {
                allOf {
                    expression { return params.DRY_RUN == false }
                    expression { return !fileExists('nothing_to_promote.flag') }
                }
            }
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh '''#!/bin/bash
                        set -e
                        cd repo
                        git config user.email "jenkins@marketeq.com"
                        git config user.name "Jenkins CI"

                        git checkout -B "${TARGET_BRANCH}" "origin/${TARGET_BRANCH}"

                        # Protected files: PRODUCTION env templates win on conflict (SOP 7.2 step 5)
                        PROTECTED_FILES=(
                            "frontend/.env.production.example"
                            "backend/.env.production.example"
                            "frontend/vercel.json"
                            "render.yaml"
                        )

                        for f in "${PROTECTED_FILES[@]}"; do
                            if [ -f "$f" ]; then
                                cp "$f" "${f}.live-backup"
                            fi
                        done

                        if ! git merge "origin/${SOURCE_BRANCH}" --no-edit -m "promote: ${SOURCE_BRANCH} to ${TARGET_BRANCH} [Jenkins CI]"; then
                            echo "=== Merge conflict detected ==="
                            echo "Resolving protected files in favor of ${TARGET_BRANCH}..."

                            for f in "${PROTECTED_FILES[@]}"; do
                                if git diff --name-only --diff-filter=U | grep -q "^${f}$"; then
                                    if [ -f "${f}.live-backup" ]; then
                                        cp "${f}.live-backup" "$f"
                                        git add "$f"
                                        echo "  Resolved $f -> kept ${TARGET_BRANCH} version"
                                    fi
                                fi
                            done

                            REMAINING=$(git diff --name-only --diff-filter=U 2>/dev/null || true)
                            if [ -n "$REMAINING" ]; then
                                echo ""
                                echo "ERROR: Unresolved merge conflicts in non-protected files:"
                                echo "$REMAINING"
                                echo ""
                                echo "These require manual resolution. A developer must resolve them and re-run."
                                git merge --abort
                                exit 1
                            fi

                            git commit --no-edit
                            echo "Merge conflicts resolved and committed."
                        fi

                        find . -name "*.live-backup" -delete 2>/dev/null || true

                        echo "=== Merge complete ==="
                        git log --oneline -5
                    '''
                }
            }
        }

        stage('Secret scan') {
            when {
                allOf {
                    expression { return params.DRY_RUN == false }
                    expression { return !fileExists('nothing_to_promote.flag') }
                }
            }
            steps {
                sh '''#!/bin/bash
                    set -e
                    cd repo
                    echo "=== Running gitleaks on merged result ==="
                    if command -v gitleaks >/dev/null 2>&1; then
                        if ! gitleaks detect --source . --no-git --exit-code 1 2>/dev/null; then
                            echo "ERROR: gitleaks found secrets in the merged code. Aborting promotion."
                            exit 1
                        fi
                        echo "No secrets detected."
                    else
                        echo "WARNING: gitleaks not installed, skipping secret scan"
                    fi
                '''
            }
        }

        stage('Push') {
            when {
                allOf {
                    expression { return params.DRY_RUN == false }
                    expression { return !fileExists('nothing_to_promote.flag') }
                }
            }
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh '''#!/bin/bash
                        set -e
                        cd repo
                        git push origin "${TARGET_BRANCH}"
                        SHA=$(git rev-parse HEAD)
                        echo -n "$SHA" > ../pushed_sha.txt
                        echo "Pushed ${TARGET_BRANCH} at $SHA"

                        curl -sf -X POST -H "Authorization: token $GH_TOKEN" -H "Content-Type: application/json" \
                            -d '{"state":"success","context":"Jenkins / Live Promotion","description":"staging promoted to live via merge"}' \
                            "https://api.github.com/repos/${REPO}/statuses/$SHA" > /dev/null 2>&1 || true
                        echo "Posted commit status."
                    '''
                }
                script {
                    env.PUSHED_SHA = readFile('pushed_sha.txt').trim()
                    if (!env.PUSHED_SHA) {
                        error("Could not capture the pushed SHA. Refusing to deploy an unverified commit.")
                    }
                    echo "Captured pushed SHA: ${env.PUSHED_SHA}"
                }
            }
        }

        stage('Deploy to Vercel') {
            when {
                allOf {
                    expression { return params.DRY_RUN == false }
                    expression { return !fileExists('nothing_to_promote.flag') }
                }
            }
            steps {
                // Vercel is NOT git-triggered for this repo. The vercel-deploy job creates the
                // deployment via the Vercel API and blocks until it reports READY, so there is
                // no need to sleep and guess in the smoke test below.
                build job: '/marketeq-projects-vibe/deploy/vercel-deploy', wait: true, propagate: true, parameters: [
                    string(name: 'DEPLOY_BRANCH', value: params.TARGET_BRANCH),
                    string(name: 'DEPLOY_SHA', value: env.PUSHED_SHA),
                    booleanParam(name: 'DRY_RUN', value: false)
                ]
            }
        }

        stage('Post-deploy smoke test') {
            when {
                allOf {
                    expression { return params.DRY_RUN == false }
                    expression { return !fileExists('nothing_to_promote.flag') }
                }
            }
            steps {
                sh '''#!/bin/bash
                    set -e
                    FRONTEND_BAD=0

                    echo "=== Smoke test: live frontend ==="
                    FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 \
                        "${LIVE_HOST}/sign-in" 2>/dev/null || echo "000")
                    echo "Live frontend /sign-in: $FRONTEND_STATUS"
                    case "$FRONTEND_STATUS" in
                        2*|3*) echo "Live frontend responding." ;;
                        *) echo "ERROR: live frontend returned $FRONTEND_STATUS"; FRONTEND_BAD=1 ;;
                    esac

                    echo "=== Smoke test: auth login endpoint (shared backend) ==="
                    LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 \
                        -X POST "${BACKEND_URL}/api/auth/login" \
                        -H "Content-Type: application/json" \
                        -H "Origin: ${LIVE_HOST}" \
                        -d '{"email":"smoketest@test.com","password":"smoketest123"}' 2>/dev/null || echo "000")
                    echo "Auth login endpoint: $LOGIN_STATUS"

                    echo "=== Smoke test: Google OAuth endpoint ==="
                    GOOGLE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 \
                        -X POST "${BACKEND_URL}/api/auth/google" \
                        -H "Content-Type: application/json" \
                        -H "Origin: ${LIVE_HOST}" \
                        -d '{"credential":"smoketest"}' 2>/dev/null || echo "000")
                    echo "Google OAuth endpoint: $GOOGLE_STATUS"

                    if [ "$FRONTEND_BAD" = "1" ] || [ "$LOGIN_STATUS" = "000" ] || [ "$GOOGLE_STATUS" = "000" ]; then
                        echo ""
                        echo "WARNING: Live site or auth endpoints unhealthy after promotion. Investigate immediately."
                        exit 1
                    fi

                    echo ""
                    echo "Smoke tests passed. Live promotion complete."
                '''
            }
        }
    }
    post {
        success { echo 'Live promotion completed successfully.' }
        failure { echo 'Live promotion FAILED. Check logs above for details.' }
        always { cleanWs() }
    }
}
