// =============================================================================
// WARNING: THIS FILE IS NOT WHAT JENKINS RUNS.
//
// The `deep-regression-check` job stores its pipeline INLINE in the job config
// (<definition class="org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition">),
// so Jenkins never reads this file. Editing it -- or approving a PR that
// changes it -- has ZERO effect on the pipeline that actually executes.
//
// Verified 2026-08-07 against the Jenkins API: all four pipeline files in this
// repo are inline-backed, none are read from SCM.
//
// This has already caused one incident. PR #421 changed the /services/health
// behaviour and was reviewed and merged against this file on the assumption it
// was live. It was not, the live monitor kept its old logic, and PR #422 had to
// revert it.
//
// TO ACTUALLY CHANGE THE PIPELINE, do one of:
//   1. Edit the inline script in the Jenkins UI
//      (Job -> Configure -> Pipeline -> Script), then mirror the change here; or
//   2. Convert the job to CpsScmFlowDefinition so this file becomes
//      authoritative. NOTE: this repo is private, so the SCM checkout needs a
//      git credential (username/password or SSH). The existing `github-token`
//      credential is secret-text, which hudson.plugins.git.GitSCM cannot use --
//      a new credential must be created first or the job will fail to check out.
//
// Until a conversion happens, treat this file as DOCUMENTATION ONLY and keep it
// in sync by hand.
// =============================================================================

pipeline {
    agent any
    options { ansiColor('xterm'); timestamps(); timeout(time: 20, unit: 'MINUTES') }
    parameters {
        string(name: 'PR_NUMBER', defaultValue: '', description: 'PR number')
        string(name: 'BASE_REF', defaultValue: 'dev-main', description: 'Base branch')
        string(name: 'HEAD_SHA', defaultValue: '', description: 'Head commit SHA')
    }
    environment { REPO = 'Marketeq/marketeq-projects-vibe' }
    stages {
        stage('Validate') {
            steps {
                withCredentials([string(credentialsId: 'anthropic-api-key', variable: 'ANTHROPIC_KEY'), string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh '''
                        rm -f /tmp/verdict.json
                        curl -sf -H "Authorization: token $GH_TOKEN" "https://api.github.com/repos/Marketeq/marketeq-projects-vibe" > /dev/null
                        echo "PASS: GitHub API"
                        STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "x-api-key: $ANTHROPIC_KEY" -H "anthropic-version: 2023-06-01" -H "Content-Type: application/json" -d '{"model":"claude-sonnet-4-6","max_tokens":10,"messages":[{"role":"user","content":"ping"}]}' "https://api.anthropic.com/v1/messages")
                        if [ "$STATUS" = "200" ]; then
                            echo "PASS: Anthropic API"
                            echo "true" > anthropic_ok.txt
                        else
                            echo "WARN: Anthropic API returned $STATUS"
                            echo "false" > anthropic_ok.txt
                        fi
                    '''
                }
            }
        }

        stage('Set Pending') {
            when { expression { return params.HEAD_SHA?.trim() } }
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh """
                        curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                            -d '{"state":"pending","context":"Jenkins / Deep Regression Check","description":"Analyzing every changed line...","target_url":"${BUILD_URL}"}' \
                            "https://api.github.com/repos/${REPO}/statuses/${HEAD_SHA}" > /dev/null 2>&1 || true
                    """
                }
            }
        }

        stage('Checkout') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh '''
                        rm -rf repo && git clone --depth=100 "https://${GH_TOKEN}@github.com/Marketeq/marketeq-projects-vibe.git" repo
                        cd repo
                        git fetch origin "${BASE_REF}" --depth=50 || true
                        if [ -n "${HEAD_SHA}" ]; then
                            git fetch origin "${HEAD_SHA}" --depth=50 || true
                            git checkout "${HEAD_SHA}" || true
                        fi
                    '''
                }
            }
        }

        stage('Extract Deep Context') {
            steps {
                sh '''#!/bin/bash
                    cd repo
                    BASE_SHA=$(git merge-base "origin/${BASE_REF}" HEAD 2>/dev/null || git rev-parse "origin/${BASE_REF}" 2>/dev/null || git rev-parse HEAD~1 2>/dev/null || echo "")
                    if [ -z "$BASE_SHA" ]; then
                        echo "No base SHA available"
                        echo "{}" > ../analysis_context.json
                        echo '{"verdict":"SKIP","summary":"No base to diff against","regressions":[]}' > /tmp/verdict.json
                        exit 0
                    fi
                    echo "$BASE_SHA" > ../base_sha.txt

                    CHANGED=$(git diff --name-only "$BASE_SHA"...HEAD 2>/dev/null || echo "")
                    echo "$CHANGED" > ../changed_files.txt
                    echo "Changed files: $(echo "$CHANGED" | grep -c . || echo 0)"

                    if [ -z "$CHANGED" ]; then
                        echo "No changed files"
                        echo '{"verdict":"SAFE","summary":"No files changed","regressions":[]}' > /tmp/verdict.json
                        exit 0
                    fi

                    # Full diff with 10 lines of context
                    git diff -U10 "$BASE_SHA"...HEAD -- "*.ts" "*.tsx" 2>/dev/null | head -c 120000 > ../full_diff.txt

                    # Before/after files
                    mkdir -p ../before ../after
                    for f in $CHANGED; do
                        case "$f" in *.ts|*.tsx) ;; *) continue ;; esac
                        case "$f" in node_modules/*|*/node_modules/*|dist/*|*/dist/*|.next/*|*/.next/*) continue ;; esac
                        DIR=$(dirname "$f")
                        mkdir -p "../before/$DIR" "../after/$DIR"
                        git show "$BASE_SHA:$f" 2>/dev/null > "../before/$f" || true
                        [ -f "$f" ] && cp "$f" "../after/$f" || true
                    done

                    # Import dependency map
                    echo "" > ../importers.txt
                    for f in $CHANGED; do
                        case "$f" in *.ts|*.tsx) ;; *) continue ;; esac
                        case "$f" in node_modules/*|*/node_modules/*) continue ;; esac
                        BASENAME=$(basename "$f" | sed 's/\\.tsx\\?$//')
                        IMPORTERS=$(grep -rl --include="*.ts" --include="*.tsx" "$BASENAME" . 2>/dev/null | grep -v node_modules | grep -v "$f" | head -10)
                        if [ -n "$IMPORTERS" ]; then
                            echo "=== Importers of $f ===" >> ../importers.txt
                            for imp in $IMPORTERS; do
                                echo "--- $imp ---" >> ../importers.txt
                                head -80 "$imp" >> ../importers.txt 2>/dev/null
                                echo "" >> ../importers.txt
                            done
                        fi
                    done

                    # Manifest
                    if [ -f ".jenkins/REGRESSION_MANIFEST.json" ]; then
                        cp ".jenkins/REGRESSION_MANIFEST.json" ../manifest.json
                    else
                        echo "{}" > ../manifest.json
                    fi

                    # Check affected critical flows using external script
                    if [ -f ".jenkins/scripts/extract_context.py" ]; then
                        python3 ".jenkins/scripts/extract_context.py" affected-flows ../manifest.json ../changed_files.txt > ../affected_flows.txt 2>/dev/null || echo "" > ../affected_flows.txt
                    else
                        echo "" > ../affected_flows.txt
                    fi

                    # API shape changes
                    echo "" > ../api_shape_changes.txt
                    for f in $CHANGED; do
                        case "$f" in *.service.ts|*.controller.ts|*.dto.ts|*types/*.ts) ;; *) continue ;; esac
                        case "$f" in node_modules/*|*/node_modules/*) continue ;; esac
                        BEFORE_CONTENT=$(git show "$BASE_SHA:$f" 2>/dev/null || echo "")
                        AFTER_CONTENT=""
                        [ -f "$f" ] && AFTER_CONTENT=$(cat "$f")
                        if [ -n "$BEFORE_CONTENT" ] && [ -n "$AFTER_CONTENT" ]; then
                            BEFORE_IFACE=$(echo "$BEFORE_CONTENT" | grep -n -E "(interface |type |return |export class |@Column|@JoinColumn|@ManyToOne|@OneToMany)" | head -40)
                            AFTER_IFACE=$(echo "$AFTER_CONTENT" | grep -n -E "(interface |type |return |export class |@Column|@JoinColumn|@ManyToOne|@OneToMany)" | head -40)
                            if [ "$BEFORE_IFACE" != "$AFTER_IFACE" ]; then
                                echo "=== API/Type shape change in $f ===" >> ../api_shape_changes.txt
                                echo "BEFORE:" >> ../api_shape_changes.txt
                                echo "$BEFORE_IFACE" >> ../api_shape_changes.txt
                                echo "AFTER:" >> ../api_shape_changes.txt
                                echo "$AFTER_IFACE" >> ../api_shape_changes.txt
                                echo "" >> ../api_shape_changes.txt
                            fi
                        fi
                    done

                    # Layout changes
                    echo "" > ../layout_changes.txt
                    for f in $CHANGED; do
                        case "$f" in frontend/components/*.tsx|frontend/app/*.tsx|frontend/app/**/*.tsx) ;; *) continue ;; esac
                        LAYOUT_DIFF=$(git diff "$BASE_SHA"...HEAD -- "$f" 2>/dev/null | grep -E "^[+-].*(className|grid-|flex |gap-|space-|rounded-|shadow-|border-|overflow)" | head -40)
                        if [ -n "$LAYOUT_DIFF" ]; then
                            echo "=== Layout/CSS changes in $f ===" >> ../layout_changes.txt
                            echo "$LAYOUT_DIFF" >> ../layout_changes.txt
                            echo "" >> ../layout_changes.txt
                        fi
                    done

                    echo "Deep context extraction complete"
                '''
            }
        }

        stage('AI Deep Regression Analysis') {
            steps {
                script {
                    def available = readFile('anthropic_ok.txt').trim()
                    if (available == 'false') {
                        writeFile file: '/tmp/verdict.json', text: '{"verdict":"SKIP","summary":"Anthropic API unavailable","regressions":[]}'
                        echo 'Anthropic API unavailable - skipping AI analysis'
                        return
                    }
                    // Check if we already have a verdict (e.g. no changes)
                    try {
                        def existing = sh(script: 'cat /tmp/verdict.json 2>/dev/null || echo ""', returnStdout: true).trim()
                        if (existing) {
                            echo "Verdict already set: ${existing.take(100)}"
                            return
                        }
                    } catch (e) { /* no verdict yet */ }
                }
                withCredentials([string(credentialsId: 'anthropic-api-key', variable: 'ANTHROPIC_KEY')]) {
                    sh '''#!/bin/bash
                        # Skip if verdict already exists
                        if [ -f /tmp/verdict.json ]; then
                            echo "Verdict already set, skipping AI analysis"
                            exit 0
                        fi

                        DIFF=$(cat full_diff.txt 2>/dev/null | head -c 80000)
                        CHANGED_FILES=$(cat changed_files.txt 2>/dev/null)
                        IMPORTERS=$(cat importers.txt 2>/dev/null | head -c 30000)
                        AFFECTED_FLOWS=$(cat affected_flows.txt 2>/dev/null)
                        API_SHAPES=$(cat api_shape_changes.txt 2>/dev/null | head -c 15000)
                        LAYOUT_CHANGES=$(cat layout_changes.txt 2>/dev/null | head -c 10000)
                        MANIFEST=$(cat manifest.json 2>/dev/null | head -c 20000)

                        # Build the prompt file
                        cat > prompt.txt << PROMPT_END
You are the Deep Regression Detector for the Marketeq Projects platform. Your job is to catch EVERY regression before it reaches production. You must be thorough and paranoid.

## YOUR TASK
Analyze this PR diff line-by-line. For EVERY changed line, determine if it could break existing functionality. You must check:

### 1. DATA FLOW REGRESSIONS (CRITICAL)
- Does any change alter what data is returned from an API endpoint?
- Does any change alter how data is mapped, transformed, or displayed?
- Are any fields being dropped, renamed, or set to null/undefined?
- Is location data being truncated (e.g., full address to just country)?
- Are calculated fields (e.g., years of experience) still being computed correctly?
- Are database queries still joining all required relations?
- Are SELECT statements still including all needed columns?

### 2. COMPONENT/PROP REGRESSIONS
- Does any component still receive all the props it needs?
- Are any props being renamed without updating all consumers?
- Are any conditional renders now showing/hiding incorrectly?
- Are any fallback values masking missing data (showing "0" or "N/A" instead of real data)?

### 3. API CONTRACT REGRESSIONS
- Has any endpoint response shape changed?
- Are any fields missing from the response that the frontend expects?
- Has any query builder (.select, .addSelect, .leftJoin, .leftJoinAndSelect) been modified?
- Has any TypeORM relation loading changed?

### 4. LAYOUT/UI REGRESSIONS
- Were any CSS classes, grid layouts, or HTML structure changed?
- If this PR is supposed to "wire data" or "add content", it should ONLY replace static text with dynamic data - NO layout changes allowed.
- Were any hover effects, transitions, or animations removed?

### 5. AUTH/SECURITY REGRESSIONS
- Were any guards, decorators, or middleware changed?
- Could any endpoint now be accessible without proper auth?
- Were any role checks removed or weakened?

### 6. IMPORT/EXPORT REGRESSIONS
- Were any exports removed that other files still import?
- Were any function signatures changed (params added/removed/reordered)?
- Were any type definitions changed that other files depend on?

### 7. COPY/TEXT REGRESSIONS
- Were any em dashes used? (NEVER allowed in website copy)
- Were any user-facing strings changed incorrectly?

## RESPONSE FORMAT
You MUST respond with valid JSON only, no markdown fencing:
{
  "verdict": "SAFE" | "RISKY" | "BLOCK",
  "summary": "One paragraph summary of findings",
  "regressions": [
    {
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      "file": "path/to/file.ts",
      "line_range": "42-48",
      "category": "DATA_FLOW | COMPONENT | API_CONTRACT | LAYOUT | AUTH | IMPORT | COPY",
      "description": "What specifically broke and why",
      "before": "What the code did before",
      "after": "What the code does now",
      "impact": "What user-visible behavior changes"
    }
  ],
  "affected_critical_flows": ["Profile Location Display", "Years of Experience Calculation"],
  "safe_changes": "Brief note on changes that look safe"
}

Rules:
- verdict BLOCK = any CRITICAL regression found
- verdict RISKY = HIGH or MEDIUM regressions found
- verdict SAFE = only LOW or no regressions
- Be PARANOID. It is better to flag a false positive than miss a real regression.
- Check EVERY line of the diff. Do not skip files.
- If a data mapping function changes, trace the data from API to component to display.

## REGRESSION MANIFEST (Critical data flows to protect)
${MANIFEST}

## AFFECTED CRITICAL FLOWS
${AFFECTED_FLOWS}

## CHANGED FILES
${CHANGED_FILES}

## FULL DIFF (with 10 lines of context)
${DIFF}

## FILES THAT IMPORT THE CHANGED FILES (check for breakage)
${IMPORTERS}

## API/TYPE SHAPE CHANGES (before vs after)
${API_SHAPES}

## LAYOUT/CSS CHANGES (should be empty if this is a data-wiring PR)
${LAYOUT_CHANGES}
PROMPT_END

                        # Build API request body directly from prompt.txt (all file-based, no shell vars)
                        python3 -c "
import json
with open('prompt.txt', 'r') as f:
    content = f.read()
if len(content) > 180000:
    content = content[:180000] + chr(10) + chr(10) + '[TRUNCATED - analyze what is provided]'
body = {'model': 'claude-sonnet-4-6', 'max_tokens': 8192, 'messages': [{'role': 'user', 'content': content}]}
with open('api_request.json', 'w') as f:
    json.dump(body, f)
import os
sz = os.path.getsize('api_request.json')
print(f'Request body: {sz} bytes, prompt: {len(content)} chars')
" 2>/dev/null

                        if [ ! -f api_request.json ] || [ ! -s api_request.json ]; then
                            echo "Failed to build API request body"
                            echo '{"verdict":"ERROR","summary":"Failed to encode prompt","regressions":[]}' > /tmp/verdict.json
                            exit 0
                        fi

                        # Call Claude API
                        echo "Calling Claude API..."
                        RESPONSE=$(curl -s -X POST \
                            -H "x-api-key: $ANTHROPIC_KEY" \
                            -H "anthropic-version: 2023-06-01" \
                            -H "Content-Type: application/json" \
                            --max-time 180 \
                            -d @api_request.json \
                            "https://api.anthropic.com/v1/messages")
                        echo "API call complete"

                        RESP_LEN=$(echo "$RESPONSE" | wc -c | tr -d ' ')
                        echo "API response length: $RESP_LEN chars"
                        # Show first 500 chars of response for debugging
                        echo "$RESPONSE" | head -c 500
                        echo ""
                        echo "$RESPONSE" | python3 -c "import sys,json; r=json.load(sys.stdin); print('Model:', r.get('model','?'), 'Stop:', r.get('stop_reason','?'), 'Usage:', r.get('usage',{}))" 2>/dev/null || echo "Could not parse API response metadata"

                        # Parse verdict using repo script
                        if [ -f "repo/.jenkins/scripts/parse_verdict.py" ]; then
                            echo "$RESPONSE" | python3 repo/.jenkins/scripts/parse_verdict.py > /tmp/verdict.json 2>/dev/null
                        else
                            echo "$RESPONSE" | python3 -c "
import sys,json
try:
 r=json.load(sys.stdin)
 t=r.get('content',[{}])[0].get('text','')
 t=t.strip()
 if t.startswith(chr(96)*3): t=t.split(chr(10),1)[1] if chr(10) in t else t[3:]
 if t.endswith(chr(96)*3): t=t[:-3]
 t=t.strip()
 if t.startswith('json'): t=t[4:].strip()
 print(json.dumps(json.loads(t)))
except Exception as e:
 print(json.dumps({'verdict':'ERROR','summary':str(e),'regressions':[]}))
" > /tmp/verdict.json 2>/dev/null
                        fi

                        # Read verdict
                        VERDICT=$(cat /tmp/verdict.json | python3 -c "import json,sys; print(json.load(sys.stdin).get('verdict','ERROR'))" 2>/dev/null || echo "ERROR")
                        REG_COUNT=$(cat /tmp/verdict.json | python3 -c "import json,sys; print(len(json.load(sys.stdin).get('regressions',[])))" 2>/dev/null || echo "0")

                        echo "========================================"
                        echo "VERDICT: $VERDICT"
                        echo "REGRESSIONS FOUND: $REG_COUNT"
                        echo "========================================"

                        # Pretty print
                        if [ -f "repo/.jenkins/scripts/pretty_print.py" ]; then
                            cat /tmp/verdict.json | python3 repo/.jenkins/scripts/pretty_print.py 2>/dev/null || true
                        fi

                        if [ "$VERDICT" = "BLOCK" ]; then
                            echo "BLOCKING: Critical regressions detected"
                            exit 1
                        fi
                    '''
                }
            }
        }

        stage('Post Results') {
            when { expression { return params.PR_NUMBER?.trim() } }
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    script {
                        def prNum = params.PR_NUMBER

                        // Build comment using repo script
                        def commentBody = sh(script: '''#!/bin/bash
                            # Make verdict available in CWD for build_comment.py (older versions read verdict.json)
                            cp /tmp/verdict.json verdict.json 2>/dev/null || true
                            COMMENT=""
                            if [ -f "repo/.jenkins/scripts/build_comment.py" ]; then
                                COMMENT=$(python3 repo/.jenkins/scripts/build_comment.py 2>/dev/null || echo "")
                            fi
                            if [ -z "$COMMENT" ]; then
                                COMMENT="## Deep Regression Check\n\n$(cat /tmp/verdict.json 2>/dev/null || echo 'No verdict')\n\n<!-- deep-regression-check -->"
                            fi
                            echo "$COMMENT"
                        ''', returnStdout: true).trim()

                        writeFile file: 'regression_comment.json', text: groovy.json.JsonOutput.toJson([body: commentBody])

                        sh """
                            EXISTING_ID=\$(curl -sf -H "Authorization: token \$GH_TOKEN" \
                                "https://api.github.com/repos/${env.REPO}/issues/${prNum}/comments?per_page=100" | \
                                python3 -c "import sys,json;[print(c['id']) for c in json.load(sys.stdin) if '<!-- deep-regression-check -->' in c.get('body','')][:1]" 2>/dev/null || echo "")

                            if [ -n "\$EXISTING_ID" ]; then
                                curl -sf -X PATCH -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                                    -d @regression_comment.json \
                                    "https://api.github.com/repos/${env.REPO}/issues/comments/\$EXISTING_ID" > /dev/null
                                echo "Updated existing regression check comment"
                            else
                                curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                                    -d @regression_comment.json \
                                    "https://api.github.com/repos/${env.REPO}/issues/${prNum}/comments" > /dev/null
                                echo "Posted new regression check comment"
                            fi
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
                            VERDICT=\$(cat /tmp/verdict.json | python3 -c "import json,sys; print(json.load(sys.stdin).get('verdict','?'))" 2>/dev/null || echo "?")
                            REG_COUNT=\$(cat /tmp/verdict.json | python3 -c "import json,sys; print(len(json.load(sys.stdin).get('regressions',[])))" 2>/dev/null || echo "0")
                            if [ "\$VERDICT" = "RISKY" ]; then
                                DESC="Risky - \${REG_COUNT} regression(s) found"
                            elif [ "\$VERDICT" = "SKIP" ]; then
                                DESC="Skipped"
                            elif [ "\$VERDICT" = "ERROR" ]; then
                                DESC="Error during analysis"
                            else
                                DESC="Passed - no regressions"
                            fi
                            curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                                -d "{\\"state\\":\\"success\\",\\"context\\":\\"Jenkins / Deep Regression Check\\",\\"description\\":\\"\$DESC\\",\\"target_url\\":\\"${BUILD_URL}\\"}" \
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
                            REG_COUNT=\$(cat /tmp/verdict.json | python3 -c "import json,sys; print(len(json.load(sys.stdin).get('regressions',[])))" 2>/dev/null || echo "?")
                            curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                                -d "{\\"state\\":\\"failure\\",\\"context\\":\\"Jenkins / Deep Regression Check\\",\\"description\\":\\"BLOCKED - \${REG_COUNT} critical regression(s)\\",\\"target_url\\":\\"${BUILD_URL}\\"}" \
                                "https://api.github.com/repos/${REPO}/statuses/${HEAD_SHA}" > /dev/null 2>&1 || true
                        """
                    }
                }
            }
        }
        always { cleanWs() }
    }
}
