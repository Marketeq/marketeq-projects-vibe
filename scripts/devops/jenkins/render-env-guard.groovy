// render-env-guard — Runs every 30 min, checks Render env vars, auto-repairs drift
//
// Jenkins pipeline: create as "render-env-guard" with cron trigger H/30 * * * *
// Requires credentials: render-api-key, plus all RENDER_ENV_* secrets
//
// Can also be called as a pre-deploy gate from staging-orchestrator:
//   build job: 'render-env-guard', parameters: [string(name: 'MODE', value: 'check')]

pipeline {
    agent any

    triggers {
        cron('H/30 * * * *')
    }

    parameters {
        choice(name: 'MODE', choices: ['--cron', '--repair', 'check'], description: 'check = block on drift, --repair = fix drift, --cron = fix + report')
    }

    environment {
        RENDER_TOKEN = credentials('render-api-key')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: '*/dev-main']],
                    userRemoteConfigs: [[
                        url: 'https://github.com/Marketeq/marketeq-projects-vibe.git',
                        credentialsId: 'github-token'
                    ]]
                ])
            }
        }

        stage('Count Check') {
            steps {
                script {
                    def count = sh(
                        script: '''
                            curl -sf \
                              -H "Authorization: Bearer $RENDER_TOKEN" \
                              "https://api.render.com/v1/services/srv-d76r48nafjfc73e1djf0/env-vars?limit=100" \
                              | python3 -c "import json,sys; print(len(json.load(sys.stdin)))"
                        ''',
                        returnStdout: true
                    ).trim().toInteger()

                    echo "Render env var count: ${count} (minimum: 41)"

                    if (count < 41) {
                        def missing = 41 - count
                        echo "CRITICAL: ${missing} env vars have been deleted!"

                        if (params.MODE == 'check') {
                            error("BLOCKED: Only ${count}/41 env vars present. ${missing} vars missing. Run with --repair to fix.")
                        }
                        // --repair and --cron modes continue to repair stage
                        env.NEEDS_REPAIR = 'true'
                    } else {
                        env.NEEDS_REPAIR = 'false'
                    }
                }
            }
        }

        stage('Full Drift Check') {
            steps {
                script {
                    def result = sh(
                        script: '''
                            cd "${WORKSPACE}"
                            node scripts/devops/check-runtime-env-drift.mjs 2>&1 || true
                        ''',
                        returnStdout: true
                    ).trim()

                    def driftOk = false
                    try {
                        def parsed = readJSON text: result
                        driftOk = parsed.ok == true
                    } catch (e) {
                        echo "Could not parse drift check output: ${e.message}"
                    }

                    if (driftOk) {
                        echo "All env vars OK. No drift detected."
                    } else {
                        echo "DRIFT DETECTED:\n${result}"
                        if (params.MODE == 'check') {
                            error("BLOCKED: Env var drift detected. Run with --repair to fix.")
                        }
                        env.NEEDS_REPAIR = 'true'
                    }
                }
            }
        }

        stage('Auto-Repair') {
            when {
                expression { env.NEEDS_REPAIR == 'true' }
            }
            steps {
                script {
                    echo "Repairing Render env vars..."
                    sh '''
                        cd "${WORKSPACE}"
                        node scripts/devops/sync-staging-runtime-envs.mjs --apply --component render --json
                    '''

                    // Verify repair
                    def newCount = sh(
                        script: '''
                            curl -sf \
                              -H "Authorization: Bearer $RENDER_TOKEN" \
                              "https://api.render.com/v1/services/srv-d76r48nafjfc73e1djf0/env-vars?limit=100" \
                              | python3 -c "import json,sys; print(len(json.load(sys.stdin)))"
                        ''',
                        returnStdout: true
                    ).trim().toInteger()

                    if (newCount < 41) {
                        error("FATAL: Repair failed. Still only ${newCount}/41 vars.")
                    }

                    echo "Repair successful. ${newCount} env vars verified."
                }
            }
        }
    }

    post {
        failure {
            echo "ENV GUARD FAILED — Render env vars may be missing. Check immediately."
            // TODO: Add Slack/email notification here
        }
        success {
            echo "Render env guard passed."
        }
    }
}
