pipeline {
    agent any
    options { ansiColor('xterm'); timestamps(); timeout(time: 15, unit: 'MINUTES') }
    parameters {
        string(name: 'PR_NUMBER', defaultValue: '', description: 'PR number')
        string(name: 'BASE_REF', defaultValue: 'dev-main', description: 'Base branch')
        string(name: 'HEAD_SHA', defaultValue: '', description: 'Head commit SHA')
    }
    environment { REPO = 'Marketeq/marketeq-projects-vibe' }
    stages {
        stage('Test - Validate Dependencies') {
            steps {
                withCredentials([string(credentialsId: 'anthropic-api-key', variable: 'ANTHROPIC_KEY'), string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh '''
                        echo "Testing GitHub API..."
                        curl -sf -H "Authorization: token $GH_TOKEN" "https://api.github.com/repos/${REPO}" > /dev/null
                        echo "PASS: GitHub API"
                        echo "Testing Anthropic API..."
                        STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "x-api-key: $ANTHROPIC_KEY" -H "anthropic-version: 2023-06-01" -H "Content-Type: application/json" -d '{"model":"claude-sonnet-4-6","max_tokens":10,"messages":[{"role":"user","content":"ping"}]}' "https://api.anthropic.com/v1/messages")
                        if [ "$STATUS" = "200" ]; then
                            echo "PASS: Anthropic API"
                            echo "true" > anthropic_available.txt
                        else
                            echo "SKIP: Anthropic API returned $STATUS - AI analysis will be skipped"
                            echo "false" > anthropic_available.txt
                        fi
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
                            -d '{"state":"pending","context":"Jenkins / AI Breakage Detector","description":"Running...","target_url":"${BUILD_URL}"}' \
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
                        rm -rf repo && git clone --depth=50 "https://x-access-token:${GH_TOKEN}@github.com/${REPO}.git" repo
                        cd repo
                        git fetch origin "${BASE_REF}" --depth=1 || true
                        if [ -n "${HEAD_SHA}" ]; then
                            git fetch origin "${HEAD_SHA}" --depth=1 || true
                            git checkout "${HEAD_SHA}" || true
                        fi
                    '''
                }
            }
        }
        stage('Extract Symbols & Callers') {
            steps {
                sh '''#!/bin/bash
                    cd repo
                    BASE_SHA=$(git rev-parse "origin/${BASE_REF}" 2>/dev/null || git rev-parse HEAD~1 2>/dev/null || echo "")
                    if [ -z "$BASE_SHA" ]; then
                        echo "No base SHA available - skipping symbol extraction"
                        echo "" > pr_diff.txt
                        echo "" > symbols.txt
                        echo "" > callers.txt
                        exit 0
                    fi
                    DIFF=$(git diff "$BASE_SHA"...HEAD 2>/dev/null | head -c 80000)
                    echo "$DIFF" > pr_diff.txt
                    CHANGED_TS=$(git diff --name-only "$BASE_SHA"...HEAD -- '*.ts' '*.tsx' 2>/dev/null || echo "")
                    SYMBOLS=""
                    CALLERS=""
                    for f in $CHANGED_TS; do
                        [ -f "$f" ] || continue
                        EXPORTS=$(git show "$BASE_SHA:$f" 2>/dev/null | grep -E '^export ' | head -20 || true)
                        if [ -n "$EXPORTS" ]; then
                            SYMBOLS="$SYMBOLS\n--- $f ---\n$EXPORTS"
                            for sym in $(echo "$EXPORTS" | grep -oE '(function|const|class|type|interface|enum) [A-Za-z_]+' | awk '{print $2}' | head -10); do
                                CALLER_FILES=$(grep -rl "$sym" --include='*.ts' --include='*.tsx' . 2>/dev/null | grep -v node_modules | grep -v "$f" | head -5)
                                for cf in $CALLER_FILES; do
                                    SNIPPET=$(head -50 "$cf")
                                    CALLERS="$CALLERS\n--- $cf (uses $sym) ---\n$SNIPPET"
                                done
                            done
                        fi
                    done
                    printf '%b' "$SYMBOLS" > symbols.txt
                    printf '%b' "$CALLERS" > callers.txt
                    echo "Extracted symbols and callers"
                '''
            }
        }
        stage('AI Regression Analysis') {
            steps {
                script {
                    def available = readFile('anthropic_available.txt').trim()
                    if (available == 'false') {
                        echo 'Anthropic API key not configured - skipping AI breakage check'
                        writeFile file: 'ai_verdict.txt', text: 'AI breakage check skipped - ANTHROPIC_API_KEY not configured.'
                    } else {
                        withCredentials([string(credentialsId: 'anthropic-api-key', variable: 'ANTHROPIC_KEY')]) {
                            sh '''#!/bin/bash
                                DIFF=$(cat pr_diff.txt | head -c 60000 | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))" | sed 's/^"//;s/"$//')
                                SYMBOLS=$(cat symbols.txt | head -c 10000 | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))" | sed 's/^"//;s/"$//')
                                CALLERS=$(cat callers.txt | head -c 20000 | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))" | sed 's/^"//;s/"$//')

                                PROMPT="You are the Regression Detector. Analyze this PR diff for: 1) Changed signatures breaking callers 2) Removed exports still referenced 3) Lost fixes/guards 4) Profile loading changes 5) Hardcoded login values. Respond with Verdict (SAFE/RISKY/BLOCK).\\n\\nDIFF:\\n${DIFF}\\n\\nSYMBOLS:\\n${SYMBOLS}\\n\\nCALLERS:\\n${CALLERS}"

                                RESPONSE=$(curl -s -X POST \
                                    -H "x-api-key: $ANTHROPIC_KEY" \
                                    -H "anthropic-version: 2023-06-01" \
                                    -H "Content-Type: application/json" \
                                    -d "{\\"model\\":\\"claude-sonnet-4-6\\",\\"max_tokens\\":4096,\\"messages\\":[{\\"role\\":\\"user\\",\\"content\\":\\"$PROMPT\\"}]}" \
                                    "https://api.anthropic.com/v1/messages")

                                VERDICT=$(echo "$RESPONSE" | python3 -c "import sys,json; r=json.load(sys.stdin); print(r.get('content',[{}])[0].get('text','ERROR'))" 2>/dev/null || echo "ERROR parsing response")
                                echo "$VERDICT"
                                echo "$VERDICT" > ai_verdict.txt

                                if echo "$VERDICT" | grep -qi "BLOCK"; then
                                    echo "AI Breakage Detector: BLOCK"
                                    exit 1
                                fi
                                echo "AI Breakage Detector: SAFE/RISKY"
                            '''
                        }
                    }
                }
            }
        }
        stage('Post Results to GitHub') {
            when { expression { return params.PR_NUMBER?.trim() } }
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    script {
                        def verdict = readFile('ai_verdict.txt').trim().take(60000)
                        def prNum = params.PR_NUMBER
                        writeFile file: 'comment_body.json', text: groovy.json.JsonOutput.toJson([body: "## AI Breakage Check (Jenkins)\n\n${verdict}\n\nPosted by Jenkins CI"])
                        sh """
                            curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                                -d @comment_body.json \
                                "https://api.github.com/repos/${env.REPO}/issues/${prNum}/comments" > /dev/null
                            echo "Posted breakage check to PR #${prNum}"
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
                                -d '{"state":"success","context":"Jenkins / AI Breakage Detector","description":"Passed","target_url":"${BUILD_URL}"}' \
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
                                -d '{"state":"failure","context":"Jenkins / AI Breakage Detector","description":"Failed","target_url":"${BUILD_URL}"}' \
                                "https://api.github.com/repos/${REPO}/statuses/${HEAD_SHA}" > /dev/null 2>&1 || true
                        """
                    }
                }
            }
        }
        always { cleanWs() }
    }
}
