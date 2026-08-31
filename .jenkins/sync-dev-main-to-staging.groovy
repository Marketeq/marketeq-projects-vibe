pipeline {
    agent any
    options { ansiColor('xterm'); timestamps(); timeout(time: 15, unit: 'MINUTES'); disableConcurrentBuilds() }
    parameters {
        string(name: 'SOURCE_BRANCH', defaultValue: 'dev-main', description: 'Source branch to promote from')
        string(name: 'CONFIRM', defaultValue: '', description: 'Type PROMOTE TO STAGING to confirm')
        booleanParam(name: 'DRY_RUN', defaultValue: false, description: 'Show what would sync without pushing')
    }
    environment {
        REPO = 'Marketeq/marketeq-projects-vibe'
        BACKEND_URL = 'https://marketeq-backend.onrender.com'
        VERCEL_STAGING_PROJECT_ID = 'prj_zxwZ4cEzY1kRsMbPst6nAoMWTxTG'
        VERCEL_TEAM_SLUG = 'marketeq-projects-d993fac5'
    }
    stages {
        stage('Confirm') {
            when { expression { return params.DRY_RUN == false } }
            steps {
                script {
                    if (params.CONFIRM != 'PROMOTE TO STAGING') {
                        error("Promotion requires typing 'PROMOTE TO STAGING' in the CONFIRM field. Aborting.")
                    }
                    echo "Confirmation received. Proceeding with promotion."
                }
            }
        }

        stage('Pre-flight health check') {
            steps {
                sh '''#!/bin/bash
                    set -e
                    echo "=== Pre-flight: checking backend health ==="
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
                        -H "Origin: https://staging-marketeq-projects.vercel.app" \
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
                        rm -rf repo && git clone --depth=100 "https://${GH_TOKEN}@github.com/${REPO}.git" repo && cd repo

                        for i in 1 2 3; do
                            git fetch origin dev-main:refs/remotes/origin/dev-main staging:refs/remotes/origin/staging --depth=100 && break
                            echo "Fetch attempt $i failed, retrying in 5s..."
                            sleep 5
                        done
                        git rev-parse origin/staging >/dev/null 2>&1 || { echo "ERROR: fetch failed after 3 attempts, staging ref still not resolvable"; exit 1; }

                        AHEAD=$(git rev-list --count origin/staging..origin/dev-main)
                        BEHIND=$(git rev-list --count origin/dev-main..origin/staging)
                        echo "=== Branch comparison ==="
                        echo "dev-main is $AHEAD commits ahead of staging"
                        echo "dev-main is $BEHIND commits behind staging"

                        if [ "$AHEAD" = "0" ]; then
                            echo "Nothing to promote -- branches are already in sync."
                            touch ../nothing_to_promote.flag
                            exit 0
                        fi

                        echo ""
                        echo "=== Commits to promote ==="
                        git log origin/staging..origin/dev-main --oneline --no-merges | head -50
                        echo ""
                        echo "=== Files changed ==="
                        git diff --stat origin/staging..origin/dev-main | tail -5
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

                        git checkout -B staging origin/staging

                        # Protected files: staging env templates win on conflict
                        PROTECTED_FILES=(
                            "frontend/.env.staging.example"
                            "backend/.env.staging.example"
                            "frontend/.env.production.example"
                            "backend/.env.production.example"
                            "frontend/vercel.json"
                            "render.yaml"
                        )

                        # Back up protected files before merge
                        for f in "${PROTECTED_FILES[@]}"; do
                            if [ -f "$f" ]; then
                                cp "$f" "${f}.staging-backup"
                            fi
                        done

                        # Merge dev-main into staging (not reset --hard)
                        if ! git merge origin/dev-main --no-edit -m "chore: promote dev-main to staging [Jenkins CI]"; then
                            echo "=== Merge conflict detected ==="
                            echo "Resolving protected files in favor of staging..."

                            CONFLICT_RESOLVED=false
                            for f in "${PROTECTED_FILES[@]}"; do
                                if git diff --name-only --diff-filter=U | grep -q "^${f}$"; then
                                    if [ -f "${f}.staging-backup" ]; then
                                        cp "${f}.staging-backup" "$f"
                                        git add "$f"
                                        echo "  Resolved $f -> kept staging version"
                                        CONFLICT_RESOLVED=true
                                    fi
                                fi
                            done

                            # Check if there are remaining unresolved conflicts
                            REMAINING=$(git diff --name-only --diff-filter=U 2>/dev/null || true)
                            if [ -n "$REMAINING" ]; then
                                echo ""
                                echo "ERROR: Unresolved merge conflicts in non-protected files:"
                                echo "$REMAINING"
                                echo ""
                                echo "These conflicts require manual resolution."
                                echo "A developer must resolve them and re-run the promotion."
                                git merge --abort
                                exit 1
                            fi

                            git commit --no-edit
                            echo "Merge conflicts resolved and committed."
                        fi

                        # Clean up backup files
                        find . -name "*.staging-backup" -delete 2>/dev/null || true

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
                        git push origin staging
                        SHA=$(git rev-parse HEAD)
                        echo "Pushed staging at $SHA"

                        # Post commit status
                        curl -sf -X POST -H "Authorization: token $GH_TOKEN" -H "Content-Type: application/json" \
                            -d '{"state":"success","context":"Jenkins / Staging Promotion","description":"dev-main promoted to staging via merge"}' \
                            "https://api.github.com/repos/${REPO}/statuses/$SHA" > /dev/null 2>&1 || true
                        echo "Posted commit status."
                    '''
                }
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
                    echo "=== Waiting 30s for Vercel to pick up the push ==="
                    sleep 30

                    echo "=== Smoke test: staging frontend ==="
                    FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 \
                        "https://staging-marketeq-projects.vercel.app/sign-in" 2>/dev/null || echo "000")
                    echo "Staging frontend /sign-in: $FRONTEND_STATUS"

                    echo "=== Smoke test: auth login endpoint ==="
                    LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 \
                        -X POST "${BACKEND_URL}/api/auth/login" \
                        -H "Content-Type: application/json" \
                        -H "Origin: https://staging-marketeq-projects.vercel.app" \
                        -d '{"email":"smoketest@test.com","password":"smoketest123"}' 2>/dev/null || echo "000")
                    echo "Auth login endpoint: $LOGIN_STATUS"

                    echo "=== Smoke test: Google OAuth endpoint ==="
                    GOOGLE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 \
                        -X POST "${BACKEND_URL}/api/auth/google" \
                        -H "Content-Type: application/json" \
                        -H "Origin: https://staging-marketeq-projects.vercel.app" \
                        -d '{"credential":"smoketest"}' 2>/dev/null || echo "000")
                    echo "Google OAuth endpoint: $GOOGLE_STATUS"

                    if [ "$LOGIN_STATUS" = "000" ] || [ "$GOOGLE_STATUS" = "000" ]; then
                        echo ""
                        echo "WARNING: Auth endpoints are not responding after promotion."
                        echo "Login may be broken on staging. Investigate immediately."
                        exit 1
                    fi

                    echo ""
                    echo "Smoke tests passed. Staging promotion complete."
                '''
            }
        }
    }
    post {
        success { echo 'Staging promotion completed successfully.' }
        failure { echo 'Staging promotion FAILED. Check logs above for details.' }
        always { cleanWs() }
    }
}