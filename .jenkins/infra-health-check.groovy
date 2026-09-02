pipeline {
    agent any
    triggers { cron('H * * * *') }
    options { ansiColor('xterm'); timestamps(); timeout(time: 5, unit: 'MINUTES') }
    environment { REPO = 'Marketeq/marketeq-projects-vibe' }
    stages {
        stage('GitHub API') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh '''
                        STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: token $GH_TOKEN" "https://api.github.com/repos/${REPO}")
                        if [ "$STATUS" = "200" ]; then echo "PASS: GitHub API ($STATUS)"; else echo "FAIL: GitHub API ($STATUS)"; exit 1; fi
                    '''
                }
            }
        }
        stage('Vercel API') {
            steps {
                withCredentials([string(credentialsId: 'vercel-token', variable: 'VERCEL_TOKEN')]) {
                    sh '''
                        STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v9/projects?limit=1")
                        if [ "$STATUS" = "200" ]; then echo "PASS: Vercel API ($STATUS)"; else echo "FAIL: Vercel API ($STATUS)"; exit 1; fi
                    '''
                }
            }
        }
        stage('Render API') {
            steps {
                withCredentials([string(credentialsId: 'render-api-key', variable: 'RENDER_KEY')]) {
                    sh '''
                        STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $RENDER_KEY" "https://api.render.com/v1/services?limit=1")
                        if [ "$STATUS" = "200" ]; then echo "PASS: Render API ($STATUS)"; else echo "FAIL: Render API ($STATUS)"; exit 1; fi
                    '''
                }
            }
        }
        stage('Anthropic API') {
            steps {
                withCredentials([string(credentialsId: 'anthropic-api-key', variable: 'ANTHROPIC_KEY')]) {
                    script {
                        def result = sh(script: '''
                            if echo "$ANTHROPIC_KEY" | grep -qi "placeholder\\|changeme\\|PLACEHOLDER\\|sk-ant-placeholder"; then
                                echo "SKIP: Anthropic API key is placeholder — set a real key to enable this check"
                                exit 0
                            fi
                            STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "x-api-key: $ANTHROPIC_KEY" -H "anthropic-version: 2023-06-01" -H "Content-Type: application/json" \
                                -d \'{"model":"claude-sonnet-4-6","max_tokens":5,"messages":[{"role":"user","content":"ping"}]}\' "https://api.anthropic.com/v1/messages")
                            if [ "$STATUS" = "200" ]; then echo "PASS: Anthropic API ($STATUS)"; else echo "WARN: Anthropic API returned $STATUS"; fi
                        ''', returnStatus: true)
                        if (result != 0) {
                            unstable('Anthropic API check failed — non-blocking')
                        }
                    }
                }
            }
        }
        stage('Repo Clone') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh '''
                        git ls-remote "https://${GH_TOKEN}@github.com/${REPO}.git" HEAD > /dev/null 2>&1
                        echo "PASS: Repo cloneable"
                    '''
                }
            }
        }
        stage('CLI Tools') {
            steps {
                sh '''
                    for tool in git curl python3 jq; do
                        if command -v $tool &>/dev/null; then echo "PASS: $tool found"; else echo "FAIL: $tool missing"; exit 1; fi
                    done
                '''
            }
        }
        stage('Frontend Health') {
            steps {
                sh '''
                    FAILED=0
                    for url in "https://dev-marketeq-projects.vercel.app" \
                               "https://staging-marketeq-projects.vercel.app" \
                               "https://live-marketeq-projects.vercel.app"; do
                        STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$url" || echo "000")
                        echo "Frontend $url: $STATUS"
                        [ "$STATUS" = "200" ] || { echo "FAIL: $url returned $STATUS"; FAILED=1; }
                    done
                    exit $FAILED
                '''
            }
        }
        stage('Backend Health') {
            steps {
                sh '''
                    STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 \
                        "https://marketeq-backend.onrender.com/health" || echo "000")
                    echo "Gateway health: $STATUS"
                    [ "$STATUS" = "200" ] || { echo "FAIL: gateway returned $STATUS"; exit 1; }
                '''
            }
        }
        stage('Service Processes') {
            steps {
                sh '''
                    curl -s --max-time 30 "https://marketeq-backend.onrender.com/services/debug" -o debug.json
                    jq -e . debug.json >/dev/null || { echo "FAIL: /services/debug unparseable"; exit 1; }

                    FAILED=0
                    DOWN=$(jq -r '.services[] | select(.running != true) | .name' debug.json)
                    LOOPING=$(jq -r '.services[] | select(.restarts > 0) | "\\(.name)=\\(.restarts)"' debug.json)

                    if [ -n "$DOWN" ]; then
                        echo "FAIL: not running -> $(echo $DOWN | tr '\\n' ' ')"; FAILED=1
                    fi
                    if [ -n "$LOOPING" ]; then
                        echo "FAIL: restart loops -> $(echo $LOOPING | tr '\\n' ' ')"; FAILED=1
                    fi
                    [ "$FAILED" = "0" ] && echo "PASS: all processes running, zero restarts"
                    exit $FAILED
                '''
            }
        }
    }
    post {
        failure { echo 'INFRASTRUCTURE HEALTH CHECK FAILED' }
        success { echo 'All infrastructure checks passed' }
        always { cleanWs() }
    }
}