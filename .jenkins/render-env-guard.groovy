// render-env-guard — Runs every 30 min, checks Render env vars, auto-repairs drift
//
// Jenkins pipeline: create as "render-env-guard" with cron trigger H/30 * * * *
// Requires credentials: render-api-key
//
// Can also be called as a pre-deploy gate from staging-orchestrator:
//   build job: 'render-env-guard', parameters: [string(name: 'MODE', value: 'check')]

pipeline {
    agent any
    options { ansiColor('xterm'); timestamps(); timeout(time: 5, unit: 'MINUTES') }

    triggers {
        cron('H/30 * * * *')
    }

    parameters {
        choice(name: 'MODE', choices: ['--cron', '--repair', 'check'], description: 'check = block on drift, --repair = fix drift, --cron = fix + report')
    }

    environment {
        REPO = 'Marketeq/marketeq-projects-vibe'
        SERVICE_ID = 'srv-d76r48nafjfc73e1djf0'
        // Floor, not the exact count. The service carries 57 vars as of
        // 2026-09-21; 55 leaves room to retire one or two deliberately
        // without going red, while still catching a bulk deletion. At the
        // old value of 41 sixteen variables could vanish unnoticed.
        MINIMUM_VARS = '55'
    }

    stages {
        stage('Count Check') {
            steps {
                withCredentials([string(credentialsId: 'render-api-key', variable: 'RENDER_TOKEN')]) {
                    script {
                        def count = sh(
                            script: '''#!/bin/bash
                                curl -sf \
                                  -H "Authorization: Bearer $RENDER_TOKEN" \
                                  "https://api.render.com/v1/services/${SERVICE_ID}/env-vars?limit=100" \
                                  | python3 -c "import json,sys; print(len(json.load(sys.stdin)))"
                            ''',
                            returnStdout: true
                        ).trim().toInteger()

                        def minimum = env.MINIMUM_VARS.toInteger()
                        echo "Render env var count: ${count} (minimum: ${minimum})"

                        if (count < minimum) {
                            def missing = minimum - count
                            echo "CRITICAL: ${missing} env vars have been deleted!"

                            if (params.MODE == 'check') {
                                error("BLOCKED: Only ${count}/${minimum} env vars present. ${missing} vars missing.")
                            }
                            env.NEEDS_REPAIR = 'true'
                        } else {
                            env.NEEDS_REPAIR = 'false'
                            echo "Count OK."
                        }
                    }
                }
            }
        }

        stage('Key Presence Check') {
            steps {
                withCredentials([string(credentialsId: 'render-api-key', variable: 'RENDER_TOKEN')]) {
                    script {
                        def result = sh(
                            script: '''#!/bin/bash
                                REQUIRED_KEYS="DATABASE_URL AUTH_JWT_PRIVATE_KEY AUTH_JWT_PUBLIC_KEY AUTH_REFRESH_SECRET INTERNAL_SERVICE_TOKEN E2EE_SERVER_SECRET GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET LINKEDIN_CLIENT_ID LINKEDIN_CLIENT_SECRET CLOUDFLARE_R2_ACCESS_KEY CLOUDFLARE_R2_SECRET_KEY BREVO_API_KEY ABLY_API_KEY GEMINI_API_KEY FRONTEND_URL NODE_ENV DATABASE_SSL DATABASE_SSL_ENABLED"

                                LIVE_KEYS=$(curl -sf \
                                  -H "Authorization: Bearer $RENDER_TOKEN" \
                                  "https://api.render.com/v1/services/${SERVICE_ID}/env-vars?limit=100" \
                                  | python3 -c "import json,sys; [print(e['envVar']['key']) for e in json.load(sys.stdin)]")

                                MISSING=""
                                for KEY in $REQUIRED_KEYS; do
                                    if ! echo "$LIVE_KEYS" | grep -q "^${KEY}$"; then
                                        MISSING="${MISSING} ${KEY}"
                                    fi
                                done

                                if [ -n "$MISSING" ]; then
                                    echo "MISSING:${MISSING}"
                                    exit 1
                                else
                                    echo "ALL_PRESENT"
                                    exit 0
                                fi
                            ''',
                            returnStdout: true,
                            returnStatus: false
                        ).trim()

                        if (result.startsWith('MISSING:')) {
                            def missingKeys = result.replace('MISSING:', '').trim()
                            echo "CRITICAL: Missing required env vars: ${missingKeys}"

                            if (params.MODE == 'check') {
                                error("BLOCKED: Required env vars missing: ${missingKeys}")
                            }
                            env.NEEDS_REPAIR = 'true'
                        } else {
                            echo "All required keys present."
                        }
                    }
                }
            }
        }

        stage('Auto-Repair') {
            when {
                expression { env.NEEDS_REPAIR == 'true' }
            }
            steps {
                withCredentials([
                    string(credentialsId: 'render-api-key', variable: 'RENDER_TOKEN'),
                    string(credentialsId: 'github-token', variable: 'GH_TOKEN')
                ]) {
                    script {
                        echo "Cloning repo for repair scripts..."
                        sh '''#!/bin/bash
                            rm -rf repo
                            git clone --depth=1 "https://${GH_TOKEN}@github.com/${REPO}.git" repo
                            cd repo
                            export RENDER_TOKEN
                            node scripts/devops/sync-staging-runtime-envs.mjs --apply --component render --json
                        '''

                        // Verify repair
                        def newCount = sh(
                            script: '''#!/bin/bash
                                curl -sf \
                                  -H "Authorization: Bearer $RENDER_TOKEN" \
                                  "https://api.render.com/v1/services/${SERVICE_ID}/env-vars?limit=100" \
                                  | python3 -c "import json,sys; print(len(json.load(sys.stdin)))"
                            ''',
                            returnStdout: true
                        ).trim().toInteger()

                        def minimum = env.MINIMUM_VARS.toInteger()
                        if (newCount < minimum) {
                            error("FATAL: Repair failed. Still only ${newCount}/${minimum} vars.")
                        }

                        echo "Repair successful. ${newCount} env vars verified."
                    }
                }
            }
        }
    }

    post {
        failure {
            echo "ENV GUARD FAILED — Render env vars may be missing or deleted. Check immediately."
        }
        success {
            echo "Render env guard passed."
        }
        always {
            cleanWs()
        }
    }
}
