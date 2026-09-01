pipeline {
    agent any
    options { ansiColor('xterm'); timestamps(); timeout(time: 20, unit: 'MINUTES'); disableConcurrentBuilds(abortPrevious: true) }
    parameters {
        string(name: 'DEPLOY_BRANCH', defaultValue: 'dev-main', description: 'Branch to deploy (dev-main, staging, live-mvp, live)')
        string(name: 'DEPLOY_SHA', defaultValue: '', description: 'Specific SHA (blank = branch HEAD)')
        booleanParam(name: 'DRY_RUN', defaultValue: false, description: 'Validate everything but skip actual deploy')
    }
    environment {
        REPO = 'Marketeq/marketeq-projects-vibe'
        VERCEL_TEAM_SLUG = 'marketeq-projects-d993fac5'
        SHA_FILE = "${WORKSPACE}/deploy_sha.txt"
    }
    stages {
        stage('Test - Vercel API') {
            steps {
                withCredentials([string(credentialsId: 'vercel-token', variable: 'VERCEL_TOKEN'), string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh '''
                        echo "Testing Vercel API..."
                        STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v9/projects?slug=$VERCEL_TEAM_SLUG&limit=1")
                        if [ "$STATUS" != "200" ]; then echo "FAIL: Vercel API returned $STATUS"; exit 1; fi
                        echo "PASS: Vercel API accessible"
                        echo "Testing GitHub API..."
                        curl -sf -H "Authorization: token $GH_TOKEN" "https://api.github.com/repos/${REPO}" > /dev/null
                        echo "PASS: GitHub API accessible"
                    '''
                }
            }
        }
        stage('Map Branch') {
            steps {
                script {
                    def branch = params.DEPLOY_BRANCH
                    def projectMap = [
                        'dev-main' : 'marketeq-projects-dev',
                        'staging'  : 'marketeq-projects-staging',
                        'live-mvp' : 'marketeq-projects-live-mvp',
                        'live'     : 'marketeq-projects-live'
                    ]
                    def idMap = [
                        'dev-main' : 'prj_IuUgufT5MaEY03bNmdb3lFcr51WC',
                        'staging'  : 'prj_zxwZ4cEzY1kRsMbPst6nAoMWTxTG',
                        'live-mvp' : 'prj_vvtSNsNsVxyMteDejCo32rh2CEiD',
                        'live'     : 'prj_IWqlhXCreXE6l2QIF2Z82HXT1tdQ'
                    ]
                    env.VERCEL_PROJECT = projectMap[branch] ?: error("Unknown branch: ${branch}")
                    env.VERCEL_PROJECT_ID = idMap[branch] ?: error("No Vercel project ID mapped for branch: ${branch}")
                    echo "Deploying ${branch} -> ${env.VERCEL_PROJECT}"
                }
            }
        }
        stage('Resolve SHA') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh '''#!/bin/bash
                        set -e
                        if [ -n "${DEPLOY_SHA}" ]; then
                            echo "${DEPLOY_SHA}" > "${SHA_FILE}"
                        else
                            SHA=$(curl -sf -H "Authorization: token $GH_TOKEN" "https://api.github.com/repos/${REPO}/commits/${DEPLOY_BRANCH}" | python3 -c "import sys,json; print(json.load(sys.stdin)['sha'])")
                            echo "$SHA" > "${SHA_FILE}"
                        fi

                        RESOLVED=$(cat "${SHA_FILE}" | tr -d '[:space:]')
                        if [ -z "$RESOLVED" ]; then
                            echo "ERROR: could not resolve a SHA for ${DEPLOY_BRANCH}. Refusing to deploy."
                            exit 1
                        fi
                        echo "$RESOLVED" > "${SHA_FILE}"
                        echo "Deploying SHA: $RESOLVED"
                    '''
                }
            }
        }
        stage('Make Repo Public') {
            when { expression { return params.DRY_RUN == false } }
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh '''
                        curl -sf -X PATCH -H "Authorization: token $GH_TOKEN" -H "Content-Type: application/json" \
                            -d '{"visibility":"public"}' "https://api.github.com/repos/${REPO}"
                        echo "Repo set to public"
                    '''
                }
            }
        }
        stage('Deploy to Vercel') {
            when { expression { return params.DRY_RUN == false } }
            steps {
                withCredentials([string(credentialsId: 'vercel-token', variable: 'VERCEL_TOKEN')]) {
                    sh '''#!/bin/bash
                        set -e
                        SHA=$(cat "${SHA_FILE}")
                        PAYLOAD=$(python3 -c "
import json
print(json.dumps({
    'name': '${VERCEL_PROJECT}',
    'project': '${VERCEL_PROJECT}',
    'target': 'production',
    'gitSource': {
        'type': 'github',
        'org': 'Marketeq',
        'repo': 'marketeq-projects-vibe',
        'ref': '${DEPLOY_BRANCH}',
        'sha': '$SHA'
    }
}))
")
                        RESPONSE=$(curl -sS -X POST -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json" \
                            -d "$PAYLOAD" "https://api.vercel.com/v13/deployments?slug=$VERCEL_TEAM_SLUG")
                        DEPLOY_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
                        DEPLOY_URL=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('url',''))" 2>/dev/null)
                        if [ -z "$DEPLOY_ID" ] || [ "$DEPLOY_ID" = "None" ]; then
                            echo "Failed to create deployment: $RESPONSE"
                            exit 1
                        fi
                        echo "Deployment $DEPLOY_ID created at $DEPLOY_URL"

                        # 60 attempts x 10s = 10 minutes, comfortably inside the 20 minute pipeline timeout
                        # so a slow build fails cleanly instead of being ABORTED with the repo still public
                        for i in $(seq 1 60); do
                            STATE=$(curl -sf -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v13/deployments/$DEPLOY_ID" | python3 -c "import sys,json; print(json.load(sys.stdin).get('readyState','UNKNOWN'))" 2>/dev/null)
                            echo "Attempt $i/60: state=$STATE"
                            case "$STATE" in
                                READY) echo "Deploy succeeded: https://$DEPLOY_URL"; exit 0 ;;
                                ERROR|CANCELED) echo "Deploy failed"; exit 1 ;;
                                *) sleep 10 ;;
                            esac
                        done
                        echo "Timed out waiting for deployment $DEPLOY_ID to become READY"; exit 1
                    '''
                }
            }
        }
        stage('Dry Run Summary') {
            when { expression { return params.DRY_RUN == true } }
            steps {
                sh '''
                    echo "=== DRY RUN COMPLETE ==="
                    echo "Branch: ${DEPLOY_BRANCH}"
                    echo "SHA: $(cat "${SHA_FILE}")"
                    echo "Vercel Project: ${VERCEL_PROJECT}"
                    echo "All validations passed - deploy would proceed"
                '''
            }
        }
    }
    post {
        always {
            script {
                // Restore repo privacy on EVERY outcome, including ABORTED.
                // post { failure } alone does not cover pipeline timeout or abortPrevious,
                // both of which would otherwise leave the repo world-readable.
                if (params.DRY_RUN == false) {
                    withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                        sh '''
                            curl -sf -X PATCH -H "Authorization: token $GH_TOKEN" -H "Content-Type: application/json" \
                                -d '{"visibility":"private"}' "https://api.github.com/repos/${REPO}" \
                                && echo "Repo set back to private" \
                                || echo "WARNING: failed to restore repo privacy - CHECK GITHUB IMMEDIATELY"
                        '''
                    }
                }
            }
            cleanWs()
        }
    }
}
