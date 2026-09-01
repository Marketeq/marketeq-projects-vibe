// Hourly guard against the recurring Render env-var deletions.
//
// Twice on 2026-08-13 the auth keys were removed from srv-d76r48nafjfc73e1djf0
// and it was only discovered hours later via a failed deploy (the api-gateway
// dies with "JwtStrategy requires a secret or key", boot-all exits 1, and the
// deploy reports nonZeroExit:1 while the OLD container keeps serving — so
// nothing user-visible breaks until the next restart).
//
// This job compares the service's live env-var NAMES against the expected
// manifest below. Values are never read, logged, or stored — names only.
// A name counts as present if it exists on the service OR in the linked
// marketeq-secrets env group, since the group is the fallback layer.
pipeline {
    agent any
    options { timestamps(); timeout(time: 5, unit: 'MINUTES') }
    triggers { cron('H * * * *') }
    environment {
        SERVICE_ID = 'srv-d76r48nafjfc73e1djf0'
        GROUP_ID   = 'evg-d9v34tajobas73au3rng'
        REPO       = 'Marketeq/marketeq-projects-vibe'
    }
    stages {
        stage('Check env drift') {
            steps {
                withCredentials([
                    string(credentialsId: 'render-api-key', variable: 'RENDER_KEY'),
                    string(credentialsId: 'github-token', variable: 'GH_TOKEN'),
                ]) {
                    script {
                        writeFile file: 'expected.txt', text: expectedManifest()
                        writeFile file: 'drift.py', text: driftScript()

                        def out = sh(script: 'python3 drift.py 2>&1', returnStdout: true).trim()
                        echo out

                        def missing = ''
                        for (line in out.split('\n')) {
                            if (line.startsWith('MISSING=')) { missing = line.substring(8).trim() }
                        }

                        if (!missing) {
                            echo 'RESULT: no drift — every expected variable is present.'
                            return
                        }

                        echo "RESULT: DRIFT DETECTED — missing: ${missing}"

                        // Open/refresh a GitHub issue. Same pattern as
                        // login-violation-alert: one sticky issue, not a new one per hour.
                        def body = "## :rotating_light: Render env vars missing\n\n" +
                            "The following environment variables are absent from BOTH the service " +
                            "(`${SERVICE_ID}`) and the `marketeq-secrets` group:\n\n" +
                            "```\n${missing.replace(',', '\n')}\n```\n\n" +
                            "**Why this matters:** the api-gateway hard-fails at boot without the " +
                            "`AUTH_JWT_*` keys, which exits the whole container. Production keeps " +
                            "serving on the previous container, so this stays invisible until the " +
                            "next deploy or restart — at which point the backend does not come back.\n\n" +
                            "**Fix:** restore the missing variables in the Render dashboard, then redeploy.\n\n" +
                            "Detected by `render-env-drift-check` build ${BUILD_NUMBER}.\n" +
                            "<!-- render-env-drift -->"

                        writeFile file: 'issue.json', text: groovy.json.JsonOutput.toJson([
                            title: 'Render env vars missing — deploys will fail',
                            body: body,
                            labels: ['infra'],
                        ])

                        sh '''
                            EXISTING=$(curl -sf -H "Authorization: token $GH_TOKEN" \
                                "https://api.github.com/repos/'''+"${REPO}"+'''/issues?state=open&per_page=100" | \
                                python3 -c "import sys,json;[print(i['number']) for i in json.load(sys.stdin) if '<!-- render-env-drift -->' in (i.get('body') or '')][:1]" 2>/dev/null || echo "")
                            if [ -n "$EXISTING" ]; then
                                curl -sf -X PATCH -H "Authorization: token $GH_TOKEN" -H "Content-Type: application/json" \
                                    -d @issue.json "https://api.github.com/repos/'''+"${REPO}"+'''/issues/$EXISTING" > /dev/null
                                echo "Updated existing drift issue #$EXISTING"
                            else
                                curl -sf -X POST -H "Authorization: token $GH_TOKEN" -H "Content-Type: application/json" \
                                    -d @issue.json "https://api.github.com/repos/'''+"${REPO}"+'''/issues" > /dev/null
                                echo "Opened new drift issue"
                            fi
                        '''
                        error("Env drift detected: ${missing}")
                    }
                }
            }
        }
    }
    post { always { cleanWs() } }
}

// Names only — no values here, deliberately.
def expectedManifest() {
    return '''ABLY_API_KEY
AUTH_JWT_PRIVATE_KEY
AUTH_JWT_PUBLIC_KEY
AUTH_JWT_TOKEN_EXPIRES_IN
AUTH_REFRESH_SECRET
AUTH_REFRESH_TOKEN_EXPIRES_IN
BREVO_API_KEY
BREVO_FROM_EMAIL
BREVO_FROM_NAME
BREVO_PASSWORD_RESET_TEMPLATE_ID
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_PUBLIC_URL
CLOUDFLARE_R2_ACCESS_KEY
CLOUDFLARE_R2_ACCESS_KEY_ID
CLOUDFLARE_R2_BUCKET
CLOUDFLARE_R2_ENDPOINT
CLOUDFLARE_R2_SECRET_ACCESS_KEY
CLOUDFLARE_R2_SECRET_KEY
COOKIE_SECURE
DATABASE_SSL
DATABASE_SSL_ENABLED
DATABASE_URL
E2EE_SERVER_SECRET
FE_ORIGIN
FRONTEND_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
INTERNAL_SERVICE_TOKEN
LINKEDIN_CLIENT_ID
LINKEDIN_CLIENT_SECRET
NODE_ENV
'''
}

def driftScript() {
    return '''
import json, os, sys, urllib.request

KEY = os.environ["RENDER_KEY"]
SVC = os.environ["SERVICE_ID"]
GRP = os.environ["GROUP_ID"]


def api(path):
    req = urllib.request.Request("https://api.render.com/v1" + path)
    req.add_header("Authorization", "Bearer " + KEY)
    req.add_header("Accept", "application/json")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


expected = [l.strip() for l in open("expected.txt") if l.strip()]

try:
    svc = {(i.get("envVar", i))["key"] for i in api("/services/%s/env-vars?limit=100" % SVC)}
except Exception as e:
    print("ERROR: could not read service env vars: %s" % e)
    sys.exit(1)

# The group is the fallback layer: a name present there still resolves at boot.
try:
    grp = {e["key"] for e in api("/env-groups/%s" % GRP).get("envVars", [])}
except Exception as e:
    print("WARN: could not read env group (%s) — checking service only" % e)
    grp = set()

present = svc | grp
missing = [k for k in expected if k not in present]

print("service vars: %d | group vars: %d | expected: %d" % (len(svc), len(grp), len(expected)))
print("MISSING=%s" % ",".join(missing))
'''
}
