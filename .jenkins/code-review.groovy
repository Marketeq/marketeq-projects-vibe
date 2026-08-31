pipeline {
    agent any
    options { ansiColor('xterm'); timestamps(); timeout(time: 15, unit: 'MINUTES') }
    parameters {
        string(name: 'PR_NUMBER', defaultValue: '', description: 'PR number')
        string(name: 'BASE_REF', defaultValue: 'staging', description: 'Base branch (staging or live-mvp)')
        string(name: 'HEAD_SHA', defaultValue: '', description: 'Head commit SHA for status reporting')
    }
    environment { REPO = 'Marketeq/marketeq-projects-vibe' }
    stages {
        stage('Set Pending Status') {
            when { expression { return params.HEAD_SHA?.trim() } }
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh """
                        curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                            -d '{"state":"pending","context":"Jenkins / Code Review","description":"Running...","target_url":"${BUILD_URL}"}' \
                            "https://api.github.com/repos/${env.REPO}/statuses/${params.HEAD_SHA}" > /dev/null 2>&1 || true
                    """
                }
            }
        }
        stage('Test') {
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
                            echo "SKIP: Anthropic API returned $STATUS - AI review will be skipped"
                            echo "false" > anthropic_available.txt
                        fi
                    '''
                }
            }
        }
        stage('Checkout & Diff') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh '''
                        rm -rf repo && git clone --depth=50 "https://x-access-token:${GH_TOKEN}@github.com/${REPO}.git" repo
                        cd repo && git fetch origin "${BASE_REF}" --depth=50 || true
                        BASE_SHA=$(git rev-parse "origin/${BASE_REF}" 2>/dev/null || git rev-parse HEAD~1 2>/dev/null || echo "")
                        if [ -n "$BASE_SHA" ]; then
                            git diff "$BASE_SHA"...HEAD > review_diff.txt 2>/dev/null || echo "" > review_diff.txt
                        else
                            echo "No base SHA found - using last commit diff"
                            git show HEAD > review_diff.txt 2>/dev/null || echo "" > review_diff.txt
                        fi
                        echo "Diff extracted"
                    '''
                }
            }
        }
        stage('AI Code Review') {
            steps {
                script {
                    def available = readFile('anthropic_available.txt').trim()
                    if (available == 'false') {
                        echo 'Anthropic API key not configured - skipping AI review'
                        writeFile file: 'code_review.txt', text: 'AI code review skipped - ANTHROPIC_API_KEY not configured.'
                    } else {
                        withCredentials([string(credentialsId: 'anthropic-api-key', variable: 'ANTHROPIC_KEY')]) {
                            sh '''#!/bin/bash
DIFF_FILE=review_diff.txt
[ -f repo/review_diff.txt ] && DIFF_FILE=repo/review_diff.txt
python3 - "$DIFF_FILE" <<'PYEOF'
import json, sys
try:
    with open(sys.argv[1]) as f:
        diff = f.read()[:60000]
except FileNotFoundError:
    diff = ""
prompt = ("Review this code diff for: 1) Security issues 2) Bugs 3) Standards "
          "4) Breaking changes. Provide a summary and an approval recommendation.\\n\\n"
          "DIFF:\\n" + diff)
with open('review_payload.json', 'w') as out:
    json.dump({"model": "claude-sonnet-4-6", "max_tokens": 4096,
               "messages": [{"role": "user", "content": prompt}]}, out)
PYEOF
RESPONSE=$(curl -s -X POST -H "x-api-key: $ANTHROPIC_KEY" -H "anthropic-version: 2023-06-01" -H "Content-Type: application/json" -d @review_payload.json "https://api.anthropic.com/v1/messages")
echo "$RESPONSE" | python3 -c "import sys,json; r=json.load(sys.stdin); print(r.get('content',[{}])[0].get('text','ERROR'))" > code_review.txt 2>/dev/null || echo "Failed to parse AI response" > code_review.txt
cat code_review.txt
'''
                        }
                    }
                }
            }
        }
        stage('Post Review') {
            when { expression { return params.PR_NUMBER?.trim() } }
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    script {
                        def review = readFile('code_review.txt').trim().take(60000)
                        def prNum = params.PR_NUMBER
                        writeFile file: 'comment_body.json', text: groovy.json.JsonOutput.toJson([body: "## AI Code Review (Jenkins)\n\n${review}\n\nPosted by Jenkins CI"])
                        sh """
                            curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                                -d @comment_body.json \
                                "https://api.github.com/repos/${env.REPO}/issues/${prNum}/comments" > /dev/null
                            echo "Posted review comment to PR #${prNum}"
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
                                -d '{"state":"success","context":"Jenkins / Code Review","description":"Passed","target_url":"${BUILD_URL}"}' \
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
                                -d '{"state":"failure","context":"Jenkins / Code Review","description":"Failed","target_url":"${BUILD_URL}"}' \
                                "https://api.github.com/repos/${env.REPO}/statuses/${params.HEAD_SHA}" > /dev/null 2>&1 || true
                        """
                    }
                }
            }
        }
        always { cleanWs() }
    }
}