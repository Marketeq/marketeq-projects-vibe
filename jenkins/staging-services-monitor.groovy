// staging-services-monitor.groovy
// Jenkins DevOps Agent: Ensures ALL backend microservices are running
// on staging at 100% health. Auto-remediates failures.
//
// Trigger: Every 5 minutes via cron
// Benchmark: no service reporting 'down' or 'unhealthy'. Services reporting
// 'unknown' (listening, but no /health route) are surfaced but not remediated —
// a restart cannot fix a missing route.

pipeline {
    agent any

    triggers {
        cron('H/5 * * * *')
    }

    options {
        timeout(time: 10, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '288')) // 24h of 5-min checks
    }

    environment {
        BACKEND_URL        = 'https://marketeq-backend.onrender.com'
        RENDER_SERVICE_ID  = 'srv-d76r48nafjfc73e1djf0'
        EXPECTED_SERVICES  = '29'
        HEALTH_LOG         = '/var/jenkins_home/health-metrics/staging-health.jsonl'
        ALERT_THRESHOLD    = '3' // consecutive failures before alert
    }

    stages {
        stage('Setup') {
            steps {
                sh '''
                    mkdir -p /var/jenkins_home/health-metrics
                '''
            }
        }

        stage('Gateway Health') {
            steps {
                script {
                    def gwStatus = sh(
                        script: "curl -s -o /dev/null -w '%{http_code}' --max-time 10 ${BACKEND_URL}/health",
                        returnStdout: true
                    ).trim()

                    if (gwStatus != '200') {
                        env.GATEWAY_DOWN = 'true'
                        error("API Gateway is DOWN (HTTP ${gwStatus}). Container may need restart.")
                    }
                    echo "Gateway: OK (HTTP ${gwStatus})"
                }
            }
        }

        stage('Service Health Check') {
            steps {
                script {
                    // Hit the /services/health aggregation endpoint
                    def healthJson = sh(
                        script: """
                            curl -s --max-time 30 '${BACKEND_URL}/services/health' || echo '{"error":"timeout"}'
                        """,
                        returnStdout: true
                    ).trim()

                    writeFile file: 'health-result.json', text: healthJson

                    // Parse the health response
                    def parsed = sh(
                        script: '''
                            python3 -c "
import json, sys
try:
    data = json.load(open('health-result.json'))
    if 'error' in data:
        print('ERROR')
        sys.exit(0)
    healthy = data.get('healthy', 0)
    total = data.get('total', 0)
    pct = data.get('uptimePercent', '0')
    # Only 'down' (unreachable) and 'unhealthy' (responding with an error) are
    # actionable. 'unknown' means the process is listening but exposes no /health
    # route — restarting it would not change the reading, so it must never drive
    # remediation. Older payloads without these fields fall back to the old rule.
    down = []
    unknown = []
    for name, info in data.get('services', {}).items():
        status = info.get('status')
        if status in ('down', 'unhealthy'):
            down.append(name)
        elif status == 'unknown':
            unknown.append(name)
        elif status != 'healthy':
            down.append(name)
    print(f'{healthy}/{total} ({pct}%)')
    print('DOWN:' + (','.join(down) if down else 'none'))
    print('UNKNOWN:' + (','.join(unknown) if unknown else 'none'))
except Exception as e:
    print(f'PARSE_ERROR:{e}')
"
                        ''',
                        returnStdout: true
                    ).trim()

                    def lines = parsed.split('\\n')
                    def summary = lines[0]

                    if (summary == 'ERROR' || summary.startsWith('PARSE_ERROR')) {
                        env.HEALTH_STATUS = 'error'
                        env.DOWN_SERVICES = 'unknown'
                        echo "WARNING: Could not reach /services/health endpoint"
                        echo "This likely means the gateway is up but the endpoint is not deployed yet."
                        echo "A deploy with the new health endpoint is needed."
                    } else {
                        echo "Service Health: ${summary}"

                        def downLine = lines.size() > 1 ? lines[1] : 'DOWN:none'
                        def downStr = downLine.replace('DOWN:', '')

                        def unknownLine = lines.size() > 2 ? lines[2] : 'UNKNOWN:none'
                        def unknownStr = unknownLine.replace('UNKNOWN:', '')
                        env.UNKNOWN_SERVICES = unknownStr == 'none' ? '' : unknownStr

                        if (unknownStr != 'none') {
                            def unknownList = unknownStr.split(',')
                            echo "NOTE: ${unknownList.size()} service(s) expose no /health route — health unverified, not remediated: ${unknownStr}"
                        }

                        if (downStr == 'none') {
                            env.HEALTH_STATUS = 'healthy'
                            env.DOWN_SERVICES = ''
                            echo "No services down or erroring."
                        } else {
                            env.HEALTH_STATUS = 'degraded'
                            env.DOWN_SERVICES = downStr
                            def downList = downStr.split(',')
                            echo "WARNING: ${downList.size()} service(s) DOWN: ${downStr}"
                        }
                    }

                    env.HEALTH_SUMMARY = summary
                }
            }
        }

        stage('Auto-Remediate') {
            when {
                expression { return env.DOWN_SERVICES?.trim() && env.DOWN_SERVICES != 'unknown' }
            }
            steps {
                script {
                    def downList = env.DOWN_SERVICES.split(',')
                    echo "Attempting auto-remediation for ${downList.size()} down service(s)..."

                    // Check consecutive failure count
                    def failCount = sh(
                        script: """
                            if [ -f /var/jenkins_home/health-metrics/fail-counter.txt ]; then
                                cat /var/jenkins_home/health-metrics/fail-counter.txt
                            else
                                echo 0
                            fi
                        """,
                        returnStdout: true
                    ).trim().toInteger()

                    failCount++
                    writeFile file: '/var/jenkins_home/health-metrics/fail-counter.txt', text: "${failCount}"

                    echo "Consecutive failure count: ${failCount}"

                    if (failCount == 1) {
                        echo "First failure detected. Waiting for next check cycle before taking action."
                        echo "Services may be in startup stagger (up to 90s after deploy)."
                    } else if (failCount <= 3) {
                        echo "Triggering Render service restart via API..."
                        withCredentials([string(credentialsId: 'render-api-key', variable: 'RENDER_KEY')]) {
                            def restartStatus = sh(
                                script: """
                                    curl -s -o /dev/null -w '%{http_code}' \\
                                        -X POST \\
                                        -H 'Authorization: Bearer ${RENDER_KEY}' \\
                                        -H 'Content-Type: application/json' \\
                                        "https://api.render.com/v1/services/${RENDER_SERVICE_ID}/restart"
                                """,
                                returnStdout: true
                            ).trim()

                            if (restartStatus == '200' || restartStatus == '202') {
                                echo "Restart triggered successfully (HTTP ${restartStatus})"
                                echo "Services will take ~90s to fully restart (staggered boot)"
                            } else {
                                echo "WARNING: Restart API returned HTTP ${restartStatus}"
                            }
                        }
                    } else if (failCount <= 6) {
                        echo "Multiple restart attempts failed. Triggering full redeploy..."
                        withCredentials([string(credentialsId: 'render-api-key', variable: 'RENDER_KEY')]) {
                            def deployStatus = sh(
                                script: """
                                    curl -s -o /dev/null -w '%{http_code}' \\
                                        -X POST \\
                                        -H 'Authorization: Bearer ${RENDER_KEY}' \\
                                        -H 'Content-Type: application/json' \\
                                        -d '{"clearCache":"do_not_clear"}' \\
                                        "https://api.render.com/v1/services/${RENDER_SERVICE_ID}/deploys"
                                """,
                                returnStdout: true
                            ).trim()

                            echo "Redeploy triggered (HTTP ${deployStatus})"
                        }
                    } else {
                        echo "CRITICAL: ${failCount} consecutive failures. Automated remediation exhausted."
                        echo "Manual intervention required. Possible causes:"
                        echo "  - Out of memory (check Render metrics)"
                        echo "  - Database connection failures"
                        echo "  - Missing environment variables"
                        echo "  - Service crash loop (check Render logs)"
                    }
                }
            }
        }

        stage('Reset Counter') {
            when {
                expression { return env.HEALTH_STATUS == 'healthy' }
            }
            steps {
                writeFile file: '/var/jenkins_home/health-metrics/fail-counter.txt', text: '0'
                echo "Failure counter reset — all services healthy."
            }
        }

        stage('Record Metrics') {
            steps {
                script {
                    def timestamp = new Date().format("yyyy-MM-dd'T'HH:mm:ss'Z'", TimeZone.getTimeZone('UTC'))
                    def status = env.HEALTH_STATUS ?: 'unknown'
                    def summary = env.HEALTH_SUMMARY ?: 'N/A'
                    def down = env.DOWN_SERVICES ?: ''

                    // Append to JSONL log
                    sh """
                        echo '{"ts":"${timestamp}","status":"${status}","summary":"${summary}","down":"${down}"}' >> ${HEALTH_LOG}
                    """

                    // Keep only last 7 days of metrics (2016 entries at 5-min intervals)
                    sh """
                        if [ -f ${HEALTH_LOG} ]; then
                            LINES=\$(wc -l < ${HEALTH_LOG})
                            if [ \$LINES -gt 2016 ]; then
                                tail -n 2016 ${HEALTH_LOG} > ${HEALTH_LOG}.tmp
                                mv ${HEALTH_LOG}.tmp ${HEALTH_LOG}
                            fi
                        fi
                    """

                    // Calculate uptime over last 24h
                    def uptimeCalc = sh(
                        script: """
                            python3 -c "
import json
lines = open('${HEALTH_LOG}').readlines()[-288:]  # last 24h
total = len(lines)
healthy = sum(1 for l in lines if json.loads(l).get('status') == 'healthy')
pct = (healthy / total * 100) if total > 0 else 0
print(f'{pct:.1f}')
" 2>/dev/null || echo "N/A"
                        """,
                        returnStdout: true
                    ).trim()

                    echo "24h Uptime: ${uptimeCalc}%"
                    env.UPTIME_24H = uptimeCalc
                }
            }
        }

        stage('Report') {
            steps {
                script {
                    def status = env.HEALTH_STATUS ?: 'unknown'
                    def summary = env.HEALTH_SUMMARY ?: 'N/A'
                    def uptime = env.UPTIME_24H ?: 'N/A'

                    echo "╔══════════════════════════════════════════════╗"
                    echo "║  STAGING SERVICES HEALTH REPORT              ║"
                    echo "╠══════════════════════════════════════════════╣"
                    echo "║  Status:      ${status.padRight(31)}║"
                    echo "║  Services:    ${summary.padRight(31)}║"
                    echo "║  24h Uptime:  ${(uptime + '%').padRight(31)}║"
                    if (env.DOWN_SERVICES?.trim()) {
                        echo "║  Down:        ${env.DOWN_SERVICES.take(31).padRight(31)}║"
                    }
                    if (env.UNKNOWN_SERVICES?.trim()) {
                        echo "║  No /health:  ${env.UNKNOWN_SERVICES.take(31).padRight(31)}║"
                    }
                    echo "╚══════════════════════════════════════════════╝"

                    if (status == 'degraded') {
                        unstable("Services degraded: ${env.DOWN_SERVICES}")
                    } else if (status == 'error') {
                        unstable("Health endpoint unreachable")
                    }
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        failure {
            script {
                echo "CRITICAL: Staging health check pipeline FAILED"
                echo "Gateway may be completely down. Check Render dashboard."
            }
        }
    }
}
