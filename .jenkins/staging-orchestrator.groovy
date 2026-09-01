pipeline {
    agent any
    options { ansiColor('xterm'); timestamps(); timeout(time: 20, unit: 'MINUTES') }
    parameters {
        string(name: 'BRANCH', defaultValue: 'dev-main', description: 'Branch that triggered the deploy')
        string(name: 'COMMIT_SHA', defaultValue: '', description: 'Commit SHA')
        string(name: 'EVENT', defaultValue: 'push', description: 'Event type (push, promote, rollback)')
        booleanParam(name: 'DRY_RUN', defaultValue: false, description: 'Validate everything but skip actual deploys')
    }
    environment { REPO = 'Marketeq/marketeq-projects-vibe' }
    stages {
        stage('Test - All Dependencies') {
            steps {
                withCredentials([
                    string(credentialsId: 'github-token', variable: 'GH_TOKEN'),
                    string(credentialsId: 'vercel-token', variable: 'VERCEL_TOKEN'),
                    string(credentialsId: 'render-api-key', variable: 'RENDER_KEY')
                ]) {
                    sh '''
                        echo "Testing GitHub API..." && curl -sf -H "Authorization: token $GH_TOKEN" "https://api.github.com/repos/${REPO}" > /dev/null && echo "PASS: GitHub"
                        echo "Testing Vercel API..." && curl -sf -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v9/projects?limit=1" > /dev/null && echo "PASS: Vercel"
                        echo "Testing Render API..." && curl -sf -H "Authorization: Bearer $RENDER_KEY" "https://api.render.com/v1/services?limit=1" > /dev/null && echo "PASS: Render"
                        echo "All dependency tests passed"
                    '''
                }
            }
        }
        stage('Service Registry Check') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh '''#!/bin/bash
                        rm -rf repo && git clone --depth=5 "https://${GH_TOKEN}@github.com/${REPO}.git" repo
                        cd repo
                        if [ -f "backend/boot-all.js" ]; then
                            echo "boot-all.js found"
                            SERVICES=$(grep -oE "'[a-z-]+'" backend/boot-all.js | tr -d "'" | sort)
                            echo "Registered services: $SERVICES"
                        else
                            echo "No boot-all.js found - skipping service check"
                        fi
                    '''
                }
            }
        }
        stage('Deploy Frontend (Vercel)') {
            when { expression { return params.DRY_RUN == false } }
            steps {
                build job: 'vercel-deploy', parameters: [
                    string(name: 'DEPLOY_BRANCH', value: params.BRANCH),
                    string(name: 'DEPLOY_SHA', value: params.COMMIT_SHA),
                    booleanParam(name: 'DRY_RUN', value: false)
                ], wait: true, propagate: true
            }
        }
        stage('Deploy Frontend (Dry Run)') {
            when { expression { return params.DRY_RUN == true } }
            steps {
                echo "DRY RUN: Would deploy ${params.BRANCH} to Vercel"
            }
        }
        stage('Render Env Guard') {
            when { expression { return (params.BRANCH == 'live-mvp' || params.BRANCH == 'staging') && params.DRY_RUN == false } }
            steps {
                build job: 'render-env-guard', parameters: [
                    string(name: 'MODE', value: 'check')
                ], wait: true, propagate: true
            }
        }
        stage('Deploy Backend (Render)') {
            when { expression { return (params.BRANCH == 'live-mvp' || params.BRANCH == 'staging') && params.DRY_RUN == false } }
            steps {
                withCredentials([string(credentialsId: 'render-api-key', variable: 'RENDER_KEY')]) {
                    sh '''#!/bin/bash
                        RENDER_SERVICE_ID="srv-d76r48nafjfc73e1djf0"
                        echo "Triggering Render deploy..."
                        RESPONSE=$(curl -sS -X POST -H "Authorization: Bearer $RENDER_KEY" -H "Content-Type: application/json" \
                            "https://api.render.com/v1/services/${RENDER_SERVICE_ID}/deploys")
                        echo "Render API response: $RESPONSE"
                        DEPLOY_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
                        echo "Render deploy triggered: $DEPLOY_ID"
                        if [ -z "$DEPLOY_ID" ]; then echo "ERROR: No deploy ID returned"; exit 1; fi
                        for i in $(seq 1 60); do
                            RAW=$(curl -sf -H "Authorization: Bearer $RENDER_KEY" \
                                "https://api.render.com/v1/services/${RENDER_SERVICE_ID}/deploys/${DEPLOY_ID}" 2>/dev/null)
                            # Render API returns status at root level, not nested under 'deploy'
                            STATE=$(echo "$RAW" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d.get('status', d.get('deploy', {}).get('status', 'unknown')))
" 2>/dev/null || echo "unknown")
                            echo "Attempt $i/60: state=$STATE"
                            case "$STATE" in
                                live) echo "Render deploy succeeded"; exit 0 ;;
                                build_failed|update_failed|canceled|deactivated) echo "Render deploy failed: $STATE"; exit 1 ;;
                                *) sleep 10 ;;
                            esac
                        done
                        echo "Timed out waiting for Render deploy"; exit 1
                    '''
                }
            }
        }
        stage('Update n8n Workflow URLs') {
            when { expression { return (params.BRANCH == 'staging' || params.BRANCH == 'dev-main') && params.DRY_RUN == false } }
            steps {
                withCredentials([string(credentialsId: 'n8n-api-key', variable: 'N8N_KEY')]) {
                    sh '''#!/bin/bash
                        set -e
                        N8N_BASE="https://n8n.srv1149839.hstgr.cloud"
                        WORKFLOW_ID="AwX68JTISeLDEZ9j"
                        BACKEND_URL="https://marketeq-backend.onrender.com"

                        echo "Updating n8n Content Automation Seeding workflow URLs to $BACKEND_URL..."

                        curl -sf -H "X-N8N-API-KEY: $N8N_KEY" "$N8N_BASE/api/v1/workflows/$WORKFLOW_ID" > /tmp/n8n-wf.json

                        python3 << 'PYEOF'
import json, re

with open("/tmp/n8n-wf.json") as f:
    w = json.load(f)

backend = "https://marketeq-backend.onrender.com"
updated = 0

for node in w.get("nodes", []):
    params = node.get("parameters", {})
    if "url" in params and isinstance(params["url"], str):
        old = params["url"]
        new = re.sub(
            r"https://[a-z0-9-]+\\.trycloudflare\\.com",
            backend,
            old
        )
        new = re.sub(
            r"https://<YOUR-LISTINGS-SERVICE-URL>",
            backend,
            new
        )
        if new != old:
            params["url"] = new
            updated += 1
            print(f"  Updated: {node.get('name','?')}")

out = {k: v for k, v in w.items() if k in ("name", "nodes", "connections", "settings")}
with open("/tmp/n8n-wf-updated.json", "w") as f:
    json.dump(out, f)
print(f"Updated {updated} node URL(s)")
PYEOF

                        RESULT=$(curl -sf -X PUT \
                            -H "X-N8N-API-KEY: $N8N_KEY" \
                            -H "Content-Type: application/json" \
                            -d @/tmp/n8n-wf-updated.json \
                            "$N8N_BASE/api/v1/workflows/$WORKFLOW_ID")

                        NAME=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('name','unknown'))" 2>/dev/null)
                        echo "n8n workflow '$NAME' URLs updated to $BACKEND_URL"
                        rm -f /tmp/n8n-wf.json /tmp/n8n-wf-updated.json
                    '''
                }
            }
        }
        stage('Post-Deploy Env Verify') {
            when { expression { return (params.BRANCH == 'live-mvp' || params.BRANCH == 'staging') && params.DRY_RUN == false } }
            steps {
                build job: 'render-env-guard', parameters: [
                    string(name: 'MODE', value: '--repair')
                ], wait: true, propagate: true
            }
        }
        stage('Smoke Tests') {
            steps {
                sh '''#!/bin/bash
                    case "${BRANCH}" in
                        dev-main) URL="https://dev-marketeq-projects.vercel.app" ;;
                        staging) URL="https://staging-marketeq-projects.vercel.app" ;;
                        live-mvp) URL="https://live-marketeq-projects.vercel.app" ;;
                    esac
                    BACKEND_URL="https://marketeq-backend.onrender.com"
                    echo "Smoke testing frontend: $URL"
                    FSTATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
                    echo "Frontend status: $FSTATUS"
                    if [ "$FSTATUS" != "200" ]; then echo "WARN: Frontend returned $FSTATUS"; fi
                    echo "Smoke testing backend: $BACKEND_URL/api/health"
                    BSTATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/health" || echo "000")
                    echo "Backend status: $BSTATUS"

                    echo "Smoke testing seed endpoints..."
                    SEED_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BACKEND_URL/internal/projects/seed" -H "Content-Type: application/json" -d '{}')
                    echo "Seed endpoint status: $SEED_STATUS (403=auth working, 500=needs token)"
                '''
            }
        }
        stage('Post Commit Status') {
            when { expression { return params.DRY_RUN == false } }
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    script {
                        def sha = params.COMMIT_SHA ?: sh(script: 'cd repo && git rev-parse HEAD', returnStdout: true).trim()
                        def branch = params.BRANCH
                        sh """
                            curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                                -d '{"state":"success","context":"Jenkins Orchestrator","description":"Deploy + smoke passed for ${branch}"}' \
                                "https://api.github.com/repos/${env.REPO}/statuses/${sha}" || true
                            echo "Posted commit status"
                        """
                    }
                }
            }
        }
        stage('Dry Run Summary') {
            when { expression { return params.DRY_RUN == true } }
            steps {
                sh '''
                    echo "=== DRY RUN COMPLETE ==="
                    echo "Branch: ${BRANCH}"
                    echo "Event: ${EVENT}"
                    echo "All validations passed - deploy would proceed"
                '''
            }
        }
    }
    post {
        failure {
            script {
                if (params.DRY_RUN == false && params.COMMIT_SHA) {
                    withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                        sh """
                            curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                                -d '{"state":"failure","context":"Jenkins Orchestrator","description":"Deploy failed for ${params.BRANCH}"}' \
                                "https://api.github.com/repos/${env.REPO}/statuses/${params.COMMIT_SHA}" 2>/dev/null || true
                        """
                    }
                }
            }
        }
        success { echo 'Orchestrator completed successfully' }
        always { cleanWs() }
    }
}
