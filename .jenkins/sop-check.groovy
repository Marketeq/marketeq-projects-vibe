pipeline {
    agent any
    options {
        ansiColor('xterm')
        timestamps()
        timeout(time: 10, unit: 'MINUTES')
    }
    parameters {
        string(name: 'PR_NUMBER', defaultValue: '', description: 'Pull request number')
        string(name: 'PR_TITLE', defaultValue: '', description: 'Pull request title')
        string(name: 'PR_BODY', defaultValue: '', description: 'Pull request body')
        string(name: 'BASE_REF', defaultValue: 'dev-main', description: 'Base branch')
        string(name: 'HEAD_SHA', defaultValue: '', description: 'Head commit SHA')
        string(name: 'PR_AUTHOR', defaultValue: '', description: 'PR author GitHub login')
    }
    environment {
        REPO = 'Marketeq/marketeq-projects-vibe'
    }
    stages {
        stage('Test - Validate Environment') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh '''
                        echo "Testing GitHub API access..."
                        curl -sf -H "Authorization: token $GH_TOKEN" "https://api.github.com/repos/${REPO}" > /dev/null
                        echo "PASS: GitHub API accessible"
                    '''
                }
            }
        }

        stage('Set Pending Status') {
            when { expression { return params.HEAD_SHA?.trim() } }
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh """
                        curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                            -d '{"state":"pending","context":"Jenkins / SOP Check","description":"Running...","target_url":"${BUILD_URL}"}' \
                            "https://api.github.com/repos/${REPO}/statuses/${HEAD_SHA}" > /dev/null 2>&1 || true
                        echo "Posted pending commit status"
                    """
                }
            }
        }
        stage('Checkout') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh '''
                        rm -rf repo && mkdir repo && cd repo
                        git clone --depth=50 "https://x-access-token:${GH_TOKEN}@github.com/${REPO}.git" .
                        git fetch origin "${BASE_REF}" --depth=1 || true
                        git rev-parse FETCH_HEAD > ../base_sha.txt 2>/dev/null || true
                        if [ -n "${HEAD_SHA}" ]; then
                            git fetch origin "${HEAD_SHA}" --depth=1 || true
                            git checkout "${HEAD_SHA}" || true
                        fi
                    '''
                }
            }
        }
        stage('SOP Checks') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh '''#!/bin/bash
                        set -e
                        cd repo
                        BASE_SHA=$(cat ../base_sha.txt 2>/dev/null | tr -d '[:space:]')
[ -z "$BASE_SHA" ] && BASE_SHA=$(git rev-parse "origin/${BASE_REF}" 2>/dev/null || git rev-parse HEAD~1)
                        CHANGED_FILES=$(git diff --name-only "$BASE_SHA"...HEAD 2>/dev/null || echo "")
                        ADDED_FILES=$(git diff --name-only --diff-filter=A "$BASE_SHA"...HEAD 2>/dev/null || echo "")
                        DIFF_LINE_COUNT=$(git diff --shortstat "$BASE_SHA"...HEAD 2>/dev/null | awk '{print $4+$6}' || echo "0")
                        DIFF_LINE_COUNT=${DIFF_LINE_COUNT:-0}

                        VIOLATIONS=()
                        add() { VIOLATIONS+=("$1"); }

                        # Section 1: Secrets / key material
                        while IFS= read -r f; do
                            [ -z "$f" ] && continue
                            case "$f" in
                                *.pem|*.key|*.p12|*.pfx|*id_rsa|*id_rsa.*|*id_ed25519|*id_ed25519.*)
                                    add "Key material committed: $f" ;;
                                .env|.env.*|*/.env|*/.env.*)
                                    if [ "$f" != ".env.example" ] && [[ "$f" != *".env.example" ]]; then
                                        add "Committed .env file: $f"
                                    fi ;;
                            esac
                        done <<< "$ADDED_FILES"

                        # PEM headers in added files
                        while IFS= read -r f; do
                            [ -z "$f" ] && continue
                            [ -f "$f" ] || continue
                            if grep -lE '-----BEGIN (RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----' "$f" >/dev/null 2>&1; then
                                add "PEM private-key header in: $f"
                            fi
                        done <<< "$ADDED_FILES"

                        # Section 2: Root-level lockfiles
                        while IFS= read -r f; do
                            case "$f" in
                                package.json|package-lock.json|yarn.lock|pnpm-lock.yaml)
                                    add "Root-level $f added" ;;
                            esac
                        done <<< "$ADDED_FILES"

                        # Section 3a: Profile loading files
                        PROFILE_HIT=0
                        while IFS= read -r f; do
                            case "$f" in
                                frontend/app/\\(group\\)/\\(group\\)/talent-profile/page.tsx|\
                                frontend/app/\\(group\\)/\\(group\\)/client-profile/page.tsx|\
                                frontend/components/edit-profile-modals.tsx|\
                                frontend/contexts/auth.tsx|\
                                frontend/src/lib/api/user.ts)
                                    PROFILE_HIT=1 ;;
                            esac
                        done <<< "$CHANGED_FILES"

                        if [ "$PROFILE_HIT" = "1" ]; then
                            CONFIRMATIONS_OK=1
                            for needle in \
                                "no API call shapes in the profile data-loading path were changed" \
                                "useEffect ordering around the profile fetch was not modified" \
                                "loading spinner / fallback states still work" \
                                "manual QA was performed against the live backend"; do
                                if ! grep -Fqi "$needle" <<< "${PR_BODY}"; then
                                    CONFIRMATIONS_OK=0
                                fi
                            done
                            if [ "$CONFIRMATIONS_OK" = "0" ]; then
                                add "Off-limits profile-loading files touched without four-point confirmation"
                            fi
                        fi

                        # Section 3b: Login frozen files
                        LOGIN_HIT=0
                        LOGIN_FILE_LIST=""
                        while IFS= read -r f; do
                            case "$f" in
                                frontend/app/sign-in/*|frontend/app/sign-up/*|\
                                frontend/contexts/auth.tsx|frontend/src/lib/api/auth.ts|\
                                frontend/middleware.ts|backend/apps/auth-service/*|\
                                backend/libs/shared/src/guards/*|backend/libs/shared/src/decorators/*|\
                                backend/apps/user-service/src/guards/*|\
                                backend/apps/user-service/src/user/dtos/onboarding-dismissed.dto.ts|\
                                frontend/app/top-most-header.tsx|\
                                frontend/components/navigation/marketplace-secondary-nav.tsx|\
                                frontend/components/settings-sidebar.tsx|\
                                "frontend/app/(group)/onboarding/"*|\
                                frontend/app/forgot-password/*|\
                                frontend/app/reset-password/*|\
                                frontend/hoc/AuthenticatedRoute.tsx|\
                                frontend/hoc/UnauthenticatedRoute.tsx|\
                                frontend/components/auth/*|\
                                frontend/service/http/auth.ts|\
                                frontend/.env.local.example|frontend/.env.staging.example|\
                                frontend/.env.production.example|backend/.env.local.example|\
                                backend/.env.staging.example|backend/.env.production.example)
                                    LOGIN_HIT=1
                                    LOGIN_FILE_LIST="$LOGIN_FILE_LIST $f" ;;
                            esac
                        done <<< "$CHANGED_FILES"

                        if [ "$LOGIN_HIT" = "1" ]; then
                            LOGIN_OK=1
                            for needle in \
                                "local dev login on the frontend still works against a fresh .env" \
                                "backend JWT signing, verification, and guards are unchanged" \
                                "manual QA was performed locally with a client account and a talent account" \
                                "no credentials, keys, or secrets are committed in this PR"; do
                                if ! grep -Fqi "$needle" <<< "${PR_BODY}"; then
                                    LOGIN_OK=0
                                fi
                            done
                            if [ "$LOGIN_OK" = "0" ]; then
                                add "Off-limits login files touched without four-point login confirmation"
                            fi
                        fi

                        # Section 3c: DESIGN-FROZEN screens (SOP 1.4)
                        # These screens look the way the CTO wants them. Backend work and
                        # API wiring are FINE. What is not fine is changing how the screen
                        # LOOKS. Swapping a hardcoded string for API data: allowed. That
                        # same edit moving one pixel, renaming a class, or adding/removing
                        # an element: blocked.
                        #
                        # We compare the design surface of the file before and after:
                        #   - every className / class value
                        #   - every JSX tag name and how many times it appears
                        # Identical on both sides -> only data changed -> PASS.
                        # Different -> the design moved -> BLOCK.
                        # Per-PR waiver: @CTorres9800 adds the `frozen-unlock` label.
                        design_surface() {
                            # $1 = git revision, $2 = path. Prints a stable fingerprint.
                            git show "$1:$2" 2>/dev/null | {
                                grep -oE 'class(Name)?="[^"]*"|</?[A-Za-z][A-Za-z0-9.]*' || true
                            } | tr -s '[:space:]' ' ' | sort | uniq -c
                        }

                        FROZEN_UI_HIT=0
                        FROZEN_UI_FILES=""
                        FROZEN_OK_FILES=""
                        while IFS= read -r f; do
                            [ -z "$f" ] && continue
                            case "$f" in
                                "frontend/app/(group)/active-project/[id]/page.tsx"|\
                                "frontend/app/(group)/job-screening/page.tsx"|\
                                frontend/components/listing-card.tsx|\
                                frontend/components/listing-card-compact.tsx|\
                                frontend/components/search-card.tsx|\
                                frontend/components/search-card-landscape.tsx|\
                                frontend/components/talent-profile-card.tsx|\
                                frontend/components/talent-search-card.tsx|\
                                frontend/components/talent-search-card-landscape.tsx|\
                                frontend/components/talent-card-landscape.tsx|\
                                frontend/components/settings-tax-info.tsx|\
                                frontend/src/lib/api/tax-info.ts|\
                                "frontend/app/(group)/billing/page.tsx"|\
                                "frontend/app/(group)/billing/transactions/page.tsx"|\
                                "frontend/app/(group)/billing/invoices/page.tsx"|\
                                "frontend/app/(group)/billing/my-plans/page.tsx"|\
                                "frontend/app/(group)/billing/payment-methods/page.tsx"|\
                                "frontend/app/(group)/my-jobs/page.tsx")
                                    BEFORE=$(design_surface "$BASE_SHA" "$f")
                                    AFTER=$(design_surface HEAD "$f")
                                    if [ "$BEFORE" = "$AFTER" ]; then
                                        FROZEN_OK_FILES="$FROZEN_OK_FILES $f"
                                    else
                                        FROZEN_UI_HIT=1
                                        FROZEN_UI_FILES="$FROZEN_UI_FILES $f"
                                    fi ;;
                            esac
                        done <<< "$CHANGED_FILES"

                        if [ -n "$FROZEN_OK_FILES" ]; then
                            echo "Design-frozen screens touched but design unchanged (data/API only -- allowed):$FROZEN_OK_FILES"
                        fi

                        if [ "$FROZEN_UI_HIT" = "1" ]; then
                            FROZEN_UNLOCK=""
                            if [ -n "${PR_NUMBER:-}" ]; then
                                FROZEN_UNLOCK=$(curl -sf -H "Authorization: token $GH_TOKEN" \
                                    "https://api.github.com/repos/${REPO}/issues/${PR_NUMBER}/labels" 2>/dev/null \
                                    | grep -o '"name"[[:space:]]*:[[:space:]]*"frozen-unlock"' || true)
                            fi
                            if [ -z "$FROZEN_UNLOCK" ]; then
                                add "Design change on a frozen screen:$FROZEN_UI_FILES -- the frozen version WINS. These screens are locked to how they look. Backend work and API wiring are fine; changing a class, an element, or the layout is not. Nothing here is reverted or deleted: keep your data/API changes, put the markup back as it was, and this passes. Only @CTorres9800 overrides, via the frozen-unlock label."
                            fi
                        fi

                        # Section 4: Entity without migration
                        ENTITY_CHANGED=0
                        MIGRATION_ADDED=0
                        while IFS= read -r f; do
                            case "$f" in
                                backend/apps/*/src/**/entities/*.entity.ts|backend/apps/*/src/entities/*.entity.ts) ENTITY_CHANGED=1 ;;
                                backend/apps/*/src/migrations/*.ts|backend/apps/*/migrations/*.ts) MIGRATION_ADDED=1 ;;
                            esac
                        done <<< "$CHANGED_FILES"
                        if [ "$ENTITY_CHANGED" = "1" ] && [ "$MIGRATION_ADDED" = "0" ]; then
                            add "TypeORM entity changed without a migration"
                        fi

                        # Section 5: Junk files
                        while IFS= read -r f; do
                            case "$f" in
                                *.DS_Store|*/dist/*|*/build/*|*/node_modules/*|*/.next/*)
                                    add "Junk file committed: $f" ;;
                            esac
                        done <<< "$ADDED_FILES"

                        # Section 6: Raw throw new Error in backend
                        BACKEND_RAW_THROW=$(git diff "$BASE_SHA"...HEAD -- 'backend/apps/**/*.ts' 2>/dev/null | grep -E '^\\+[^+].*throw new Error\\(' || true)
                        if [ -n "$BACKEND_RAW_THROW" ]; then
                            add "Raw throw new Error() in backend code -- use NestJS exceptions"
                        fi

                        # Section 7: Bypass flags
                        BYPASS_HIT=$(git diff "$BASE_SHA"...HEAD 2>/dev/null | grep -E '^\\+.*(--no-verify|gh pr merge .*--admin)' || true)
                        if [ -n "$BYPASS_HIT" ]; then
                            add "Bypass flag detected (--no-verify or --admin)"
                        fi

                        # Section 8: Oversized PR
                        if [ "$DIFF_LINE_COUNT" -gt 2000 ] && [[ "${PR_TITLE}" != \\[EPIC\\]* ]]; then
                            add "Oversized PR: $DIFF_LINE_COUNT lines changed"
                        fi

                        # Section 7a: Render URLs in local env
                        RENDER_IN_LOCAL=$(git diff "$BASE_SHA"...HEAD -- 'frontend/.env.local.example' 'backend/.env.local.example' 2>/dev/null | grep -E '^\\+[^+].*onrender\\.com' || true)
                        if [ -n "$RENDER_IN_LOCAL" ]; then
                            add "Render URL in .env.local.example -- local dev should use localhost"
                        fi

                        # Section 8b: Hardcoded login values in login code
                        if [ "$LOGIN_HIT" = "1" ]; then
                            LOGIN_DIFF=$(git diff "$BASE_SHA"...HEAD -- \
                                'frontend/app/sign-in/**' 'frontend/app/sign-up/**' \
                                'frontend/contexts/auth.tsx' 'frontend/src/lib/api/auth.ts' \
                                'frontend/middleware.ts' 'backend/apps/auth-service/**' \
                                'backend/libs/shared/src/guards/**' 2>/dev/null || echo "")
                            HARDCODED_RENDER=$(echo "$LOGIN_DIFF" | grep -E '^\\+[^+].*onrender\\.com' || true)
                            HARDCODED_SAMESITE=$(echo "$LOGIN_DIFF" | grep -E '^\\+[^+].*sameSite:' | grep -vE 'process\\.env' || true)
                            HARDCODED_SECURE=$(echo "$LOGIN_DIFF" | grep -E '^\\+[^+].*secure:' | grep -vE 'process\\.env' || true)
                            HARDCODED_LOCALHOST=$(echo "$LOGIN_DIFF" | grep -E '^\\+[^+].*localhost' | grep -vE 'process\\.env' || true)
                            if [ -n "$HARDCODED_RENDER" ]; then add "Hardcoded Render URL in login code -- use process.env"; fi
                            if [ -n "$HARDCODED_SAMESITE" ]; then add "Hardcoded sameSite cookie flag in login code -- use process.env"; fi
                            if [ -n "$HARDCODED_SECURE" ]; then add "Hardcoded secure cookie flag in login code -- use process.env"; fi
                            if [ -n "$HARDCODED_LOCALHOST" ]; then add "Hardcoded localhost in login code -- use process.env"; fi
                        fi

                        # Section 9a: Hardcoded SSL based on NODE_ENV
                        SSL_HARDCODED=$(git diff "$BASE_SHA"...HEAD -- 'backend/**/*.ts' 2>/dev/null | grep -E '^\\+[^+].*ssl:.*NODE_ENV.*production' || true)
                        if [ -n "$SSL_HARDCODED" ]; then
                            add "Hardcoded SSL based on NODE_ENV -- use DATABASE_SSL_ENABLED env var"
                        fi

                        # Section 8c: Env template branch mismatch
                        touches_local=0; touches_staging=0; touches_prod=0
                        while IFS= read -r f; do
                            case "$f" in
                                frontend/.env.local.example|backend/.env.local.example) touches_local=1 ;;
                                frontend/.env.staging.example|backend/.env.staging.example) touches_staging=1 ;;
                                frontend/.env.production.example|backend/.env.production.example) touches_prod=1 ;;
                            esac
                        done <<< "$CHANGED_FILES"
                        total=$((touches_local + touches_staging + touches_prod))
                        if [ "$total" -gt 1 ]; then
                            add "PR modifies more than one .env.*.example template at once"
                        fi
                        if [ "$touches_staging" = "1" ] && [ "${BASE_REF}" != "staging" ]; then
                            add ".env.staging.example modified on PR targeting ${BASE_REF} (should target staging)"
                        fi
                        if [ "$touches_prod" = "1" ] && [ "${BASE_REF}" != "live-mvp" ]; then
                            add ".env.production.example modified on PR targeting ${BASE_REF} (should target live-mvp)"
                        fi
                        if [ "$touches_local" = "1" ] && [ "${BASE_REF}" != "dev-main" ]; then
                            add ".env.local.example modified on PR targeting ${BASE_REF} (should target dev-main)"
                        fi

                        # Section 10: Security sprint PRs must be backend-only
                        # Currently scoped to SomiLA1 only. Add more authors to the list as needed.
                        SECURITY_SPRINT_AUTHORS="SomiLA1"
                        IS_SECURITY_SPRINT_AUTHOR=0
                        for sec_author in $SECURITY_SPRINT_AUTHORS; do
                            if [ "${PR_AUTHOR}" = "$sec_author" ]; then
                                IS_SECURITY_SPRINT_AUTHOR=1
                                break
                            fi
                        done
                        if [ "$IS_SECURITY_SPRINT_AUTHOR" = "1" ]; then
                            FRONTEND_IN_SEC=""
                            while IFS= read -r f; do
                                case "$f" in
                                    frontend/*) FRONTEND_IN_SEC="$FRONTEND_IN_SEC $f" ;;
                                esac
                            done <<< "$CHANGED_FILES"
                            if [ -n "$FRONTEND_IN_SEC" ]; then
                                add "Security sprint PR by ${PR_AUTHOR} contains frontend changes -- security sprints are backend-only. Remove all frontend/ files:$FRONTEND_IN_SEC"
                            fi
                        fi

                        # Section 9: @ts-ignore without justification
                        TS_IGNORE=$(git diff "$BASE_SHA"...HEAD -- '*.ts' '*.tsx' 2>/dev/null | grep -E '^\\+[^+].*@ts-ignore' | grep -vE '@ts-ignore.*--' || true)
                        if [ -n "$TS_IGNORE" ]; then
                            add "@ts-ignore without justification comment"
                        fi

                        # Write results for downstream stages
                        echo "$LOGIN_HIT" > ../sop_login_hit.txt
                        echo "$LOGIN_FILE_LIST" > ../sop_login_files.txt
                        if [ ${#VIOLATIONS[@]} -eq 0 ]; then
                            echo "PASS" > ../sop_result.txt
                            echo "" > ../sop_violations.txt
                            echo "All SOP checks passed (0 violations)"
                        else
                            echo "FAIL" > ../sop_result.txt
                            printf '%s\n' "${VIOLATIONS[@]}" > ../sop_violations.txt
                            echo "SOP Check FAILED -- ${#VIOLATIONS[@]} violation(s):"
                            for v in "${VIOLATIONS[@]}"; do
                                echo "  - $v"
                            done
                            exit 1
                        fi
                    '''
                }
            }
        }
        stage('Post SOP Comment') {
            when { expression { return params.PR_NUMBER?.trim() } }
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    script {
                        def prNum = params.PR_NUMBER
                        def result = 'PASS'
                        def violations = ''
                        try { result = readFile('sop_result.txt').trim() } catch(e) {}
                        try { violations = readFile('sop_violations.txt').trim() } catch(e) {}

                        def body = ''
                        if (result == 'PASS') {
                            body = "## Jenkins SOP Check - PASSED\n\nAll mechanical checks passed.\n\n<!-- sop-check-comment -->\nPosted by Jenkins CI"
                        } else {
                            def vList = violations.split('\n').collect { "- ${it}" }.join('\n')
                            body = "## Jenkins SOP Check - FAILED\n\n${vList}\n\n<!-- sop-check-comment -->\nPosted by Jenkins CI"
                        }

                        // Find existing comment with marker to update idempotently
                        writeFile file: 'sop_comment.json', text: groovy.json.JsonOutput.toJson([body: body])
                        sh """
                            # Check for existing marker comment
                            EXISTING_ID=\$(curl -sf -H "Authorization: token \$GH_TOKEN" \
                                "https://api.github.com/repos/${env.REPO}/issues/${prNum}/comments?per_page=100" | \
                                python3 -c "
import sys, json
comments = json.load(sys.stdin)
for c in comments:
    if '<!-- sop-check-comment -->' in c.get('body',''):
        print(c['id'])
        break
" 2>/dev/null || echo "")

                            if [ -n "\$EXISTING_ID" ]; then
                                curl -sf -X PATCH -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                                    -d @sop_comment.json \
                                    "https://api.github.com/repos/${env.REPO}/issues/comments/\$EXISTING_ID" > /dev/null
                                echo "Updated existing SOP comment"
                            else
                                curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                                    -d @sop_comment.json \
                                    "https://api.github.com/repos/${env.REPO}/issues/${prNum}/comments" > /dev/null
                                echo "Posted new SOP comment"
                            fi
                        """
                    }
                }
            }
        }
        stage('Login Sentinel Comment') {
            when { expression { try { return readFile('sop_login_hit.txt').trim() == '1' } catch(e) { return false } } }
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    script {
                        def prNum = params.PR_NUMBER
                        if (!prNum?.trim()) return

                        def loginFiles = ''
                        try { loginFiles = readFile('sop_login_files.txt').trim() } catch(e) {}
                        def fileList = loginFiles.split(' ').findAll { it }.collect { "- `${it}`" }.join('\n')

                        def sentinelBody = """## Login Sentinel Notice

This PR touches **login-frozen files** (SOP 1.4). Login is fixed once, bidirectionally.

**Files changed:**
${fileList}

### Mandatory Reviewer Checklist
Before approving, the reviewer MUST:
1. Check out this branch locally
2. Delete all `.env.local` files
3. Copy `.env.example` files fresh
4. Boot backend + frontend locally
5. Sign in with a **client** test account
6. Sign in with a **talent** test account
7. Both accounts reach their dashboards

<!-- login-sentinel-comment -->
Posted by Jenkins CI"""

                        writeFile file: 'sentinel_comment.json', text: groovy.json.JsonOutput.toJson([body: sentinelBody])
                        sh """
                            # Check for existing sentinel comment
                            EXISTING_ID=\$(curl -sf -H "Authorization: token \$GH_TOKEN" \
                                "https://api.github.com/repos/${env.REPO}/issues/${prNum}/comments?per_page=100" | \
                                python3 -c "
import sys, json
comments = json.load(sys.stdin)
for c in comments:
    if '<!-- login-sentinel-comment -->' in c.get('body',''):
        print(c['id'])
        break
" 2>/dev/null || echo "")

                            if [ -n "\$EXISTING_ID" ]; then
                                curl -sf -X PATCH -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                                    -d @sentinel_comment.json \
                                    "https://api.github.com/repos/${env.REPO}/issues/comments/\$EXISTING_ID" > /dev/null
                                echo "Updated login sentinel comment"
                            else
                                curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                                    -d @sentinel_comment.json \
                                    "https://api.github.com/repos/${env.REPO}/issues/${prNum}/comments" > /dev/null
                                echo "Posted login sentinel comment"
                            fi

                            # Add login-touched label
                            curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                                -d '{"labels":["login-touched"]}' \
                                "https://api.github.com/repos/${env.REPO}/issues/${prNum}/labels" > /dev/null 2>&1 || true

                            # Request review from CTorres9800
                            curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                                -d '{"reviewers":["CTorres9800"]}' \
                                "https://api.github.com/repos/${env.REPO}/pulls/${prNum}/requested_reviewers" > /dev/null 2>&1 || true

                            echo "Added login-touched label and requested CTorres9800 review"
                        """
                    }
                }
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
                                -d '{"state":"success","context":"Jenkins / SOP Check","description":"Passed","target_url":"${BUILD_URL}"}' \
                                "https://api.github.com/repos/${REPO}/statuses/${HEAD_SHA}" > /dev/null 2>&1 || true
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
                                -d '{"state":"failure","context":"Jenkins / SOP Check","description":"Failed","target_url":"${BUILD_URL}"}' \
                                "https://api.github.com/repos/${REPO}/statuses/${HEAD_SHA}" > /dev/null 2>&1 || true
                        """
                    }
                }
            }
        }
        always { cleanWs() }
    }
}
