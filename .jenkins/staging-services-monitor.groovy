// staging-services-monitor.groovy
// Jenkins DevOps Agent: Ensures ALL backend microservices are running
// on staging at 100% health. Auto-remediates failures.
//
// Trigger: Every 5 minutes via cron
// Benchmark: 28 services + gateway = 100% healthy at all times

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
        EXPECTED_SERVICES  = '28'
        HEALTH_LOG         = '/var/jenkins_home/health-metrics/staging-health.jsonl'
        ALERT_THRESHOLD    = '3' // consecutive failures before alert
        RENDER_OWNER_ID    = 'tea-d0r57undiees73bn5npg'
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
    down = []
    for name, info in data.get('services', {}).items():
        if info.get('status') != 'healthy':
            down.append(name)
    print(f'{healthy}/{total} ({pct}%)')
    if down:
        print('DOWN:' + ','.join(down))
    else:
        print('DOWN:none')
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

                        if (downStr == 'none') {
                            env.HEALTH_STATUS = 'healthy'
                            env.DOWN_SERVICES = ''
                            echo "ALL SERVICES HEALTHY - 100% uptime benchmark met"
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

        stage('Application Error Scan') {
            // Health checks only prove a process is listening. Every fault in
            // the 2026-08-19 encryption incident sat in the backend log while
            // /health returned 200 and this monitor reported 28/28 healthy for
            // seven days. This reads the log itself and groups what it finds.
            steps {
                script {
                    withCredentials([string(credentialsId: 'render-api-key', variable: 'RENDER_TOKEN')]) {
                        sh '''
                            # Only look at the window since the last run. A rolling
                            # 300-line fetch keeps returning hours-old entries and the
                            # job would stay UNSTABLE forever on faults already fixed,
                            # which is the alert fatigue this stage exists to prevent.
                            SINCE=$(date -u -d '15 minutes ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-15M +%Y-%m-%dT%H:%M:%SZ)
                            # Keep the HTTP status. curl -s exits 0 on a 503, so a
                            # fallback on curl's exit code never fires: when Render's
                            # log store (Loki) is down the API answers 503 "failed to
                            # query loki", and this stage used to read that as an empty
                            # log and report "No application errors" (2026-10-02).
                            rm -f /tmp/log-scan-status.txt
                            LOG_HTTP=$(curl -s -m 45 -o /tmp/backend-errors.json -w '%{http_code}' -H "Authorization: Bearer $RENDER_TOKEN" "https://api.render.com/v1/logs?ownerId=${RENDER_OWNER_ID}&resource=${RENDER_SERVICE_ID}&limit=300&text=ERROR&startTime=${SINCE}") || LOG_HTTP=000
                            export LOG_HTTP
                            echo "scanning backend errors since ${SINCE} (logs API http ${LOG_HTTP})"

                            python3 - > /tmp/app-errors.txt <<'PY'
import json, os, re, collections
ESC = chr(27)

def strip(text):
    text = text or ""
    out, i = [], 0
    while i < len(text):
        if text[i] == ESC:
            while i < len(text) and text[i] != "m":
                i += 1
            i += 1
        else:
            out.append(text[i])
            i += 1
    return "".join(out)

# Only a 200 carrying a "logs" list is a scan. Anything else -- Loki down
# (503), a rejected token (401), a timeout (000) -- means the scan did not
# run, and an empty result from it must not be reported as "no errors".
http = os.environ.get("LOG_HTTP", "000")
try:
    body = json.load(open("/tmp/backend-errors.json"))
except Exception:
    body = None
if http != "200" or not isinstance(body, dict) or not isinstance(body.get("logs"), list):
    reason = "http " + http
    if isinstance(body, dict) and body.get("message"):
        reason += ": " + " ".join(str(body["message"]).split())[:160]
    open("/tmp/log-scan-status.txt", "w").write(reason)
    raise SystemExit(0)
open("/tmp/log-scan-status.txt", "w").write("ok")
logs = body["logs"]

pattern = re.compile("ExceptionsHandler|EncryptionService|QueryFailedError|GlobalExceptionFilter")
# Uptime probes hit / unauthenticated and log a 401 or 404 every time. They are
# not faults, and leaving them in keeps the job permanently unstable, which is
# how a real alert stops being read.
noise = re.compile("(GET|HEAD) / . (401|404)|(GET|HEAD) / - (401|404)")
counts = collections.Counter()
for entry in logs:
    message = strip(entry.get("message"))
    if pattern.search(message) and not noise.search(message):
        counts[re.sub("[0-9a-f-]{8,}", "<id>", message)[-90:].strip()] += 1

for message, n in counts.most_common(8):
    print(str(n) + "x " + message)
PY
                        '''
                        def scanStatus = readFile('/tmp/log-scan-status.txt').trim()
                        def hits = readFile('/tmp/app-errors.txt').trim()
                        if (scanStatus != 'ok') {
                            // Same rule as Pending Migrations below: a check that
                            // did not run is not an all clear.
                            env.APP_ERRORS = ''
                            echo "Application error scan DID NOT RUN (logs API ${scanStatus}). This is not an all clear."
                            currentBuild.result = 'UNSTABLE'
                            currentBuild.description = ((currentBuild.description ?: '') + ' log scan unavailable').trim()
                        } else if (hits) {
                            env.APP_ERRORS = hits
                            echo "Application errors present in the backend log:"
                            echo hits
                            currentBuild.result = 'UNSTABLE'
                            currentBuild.description = 'application errors in log'
                        } else {
                            env.APP_ERRORS = ''
                            echo 'No application errors in the log window.'
                        }
                    }
                }
            }
        }

        stage('Pending Migrations') {
            // Three migrations sat unapplied because the oldest failed and
            // stopped the rest. The deploy still reported success, so nothing
            // surfaced it until an endpoint started returning 500.
            steps {
                script {
                    def code = sh(returnStdout: true, script: 'curl -s -o /tmp/mig.json -w "%{http_code}" -m 30 "${BACKEND_URL}/health/migrations" || echo 000').trim()
                    def body = sh(returnStdout: true, script: 'cat /tmp/mig.json 2>/dev/null || true').trim()

                    if (code == '200' && body.contains('"pending"')) {
                        if (body.contains('"pending":0')) {
                            echo 'Migrations up to date.'
                        } else {
                            echo "Pending migrations reported: ${body}"
                            currentBuild.result = 'UNSTABLE'
                            currentBuild.description = ((currentBuild.description ?: '') + ' pending migrations').trim()
                        }
                    } else {
                        // Anything else means the check did not run. Saying
                        // "no pending migrations" here would be a false all
                        // clear, which is the failure this stage exists to
                        // prevent. The endpoint does not exist yet: the
                        // gateway answers 401 for unmatched paths.
                        echo "Migration check DID NOT RUN (http ${code}). This is not an all clear."
                        currentBuild.result = 'UNSTABLE'
                        currentBuild.description = ((currentBuild.description ?: '') + ' migration check unavailable').trim()
                    }
                }
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