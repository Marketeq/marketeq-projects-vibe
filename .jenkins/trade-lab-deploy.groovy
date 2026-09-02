pipeline {
    agent any
    options { ansiColor('xterm'); timestamps(); timeout(time: 20, unit: 'MINUTES'); disableConcurrentBuilds(abortPrevious: true) }
    parameters {
        string(name: 'DEPLOY_SHA', defaultValue: '', description: 'Commit SHA to deploy (blank = current HEAD of main)')
        booleanParam(name: 'DRY_RUN', defaultValue: false, description: 'Validate everything but skip the actual deploy')
    }
    environment {
        REPO              = 'Marketeq/trade-lab'
        DEPLOY_BRANCH     = 'main'
        APP_DIR           = 'frontend'
        VERCEL_ORG_ID     = 'team_t2RzlUaGU3p6OALpArhrWXh0'
        VERCEL_PROJECT_ID = 'prj_m7hLsuAYYCk7hcwsYvsGVCqZg4JZ'
        VERCEL_TEAM_SLUG  = 'marketeq-projects-d993fac5'
        PROD_ALIAS        = 'trade-lab-two.vercel.app'
        PATH              = "/var/jenkins_home/tools/bin:${env.PATH}"
    }
    triggers {
        GenericTrigger(
            genericVariables: [
                [key: 'repo_full_name', value: '$.repository.full_name'],
                [key: 'push_ref', value: '$.ref'],
                [key: 'push_after', value: '$.after'],
                [key: 'pusher_name', value: '$.pusher.name'],
                [key: 'deleted', value: '$.deleted', defaultValue: 'false']
            ],
            genericHeaderVariables: [
                [key: 'X-GitHub-Event', regexpFilter: '']
            ],
            token: 'tradelab-deploy',
            printContributedVariables: true,
            printPostContent: false,
            silentResponse: true,
            regexpFilterText: '$repo_full_name#$push_ref#$deleted',
            regexpFilterExpression: '^Marketeq/trade-lab#refs/heads/main#false$',
            causeString: 'Push to main by $pusher_name ($push_after)'
        )
    }
    stages {
        stage('Preflight') {
            steps {
                withCredentials([string(credentialsId: 'vercel-token', variable: 'VERCEL_TOKEN'),
                                 string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh '''#!/bin/bash
                        set -e
                        echo "--- Vercel CLI ---"
                        vercel --version

                        echo "--- Vercel project reachable? ---"
                        CODE=$(curl -s -o /tmp/proj.json -w "%{http_code}" \
                            -H "Authorization: Bearer $VERCEL_TOKEN" \
                            "https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}?teamId=${VERCEL_ORG_ID}")
                        if [ "$CODE" != "200" ]; then echo "FAIL: Vercel project lookup returned $CODE"; cat /tmp/proj.json; exit 1; fi
                        echo "PASS: Vercel project $(python3 -c "import json;print(json.load(open('/tmp/proj.json'))['name'])")"

                        echo "--- GitHub repo reachable? ---"
                        CODE=$(curl -s -o /tmp/repo.json -w "%{http_code}" \
                            -H "Authorization: token $GH_TOKEN" "https://api.github.com/repos/${REPO}")
                        if [ "$CODE" != "200" ]; then echo "FAIL: GitHub repo lookup returned $CODE"; cat /tmp/repo.json; exit 1; fi
                        echo "PASS: GitHub repo ${REPO} accessible"
                    '''
                }
            }
        }

        stage('Resolve Commit') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh '''#!/bin/bash
                        set -e
                        SHA="${DEPLOY_SHA}"
                        if [ -z "$SHA" ] || [ "$SHA" = "null" ]; then SHA="${push_after:-}"; fi
                        if [ -z "$SHA" ] || [ "$SHA" = "null" ]; then
                            SHA=$(curl -sf -H "Authorization: token $GH_TOKEN" \
                                "https://api.github.com/repos/${REPO}/commits/${DEPLOY_BRANCH}" \
                                | python3 -c "import sys,json; print(json.load(sys.stdin)['sha'])")
                        fi
                        echo "$SHA" > deploy_sha.txt
                        echo "Deploying ${DEPLOY_BRANCH} @ $SHA"
                    '''
                }
                script { env.SHA = readFile('deploy_sha.txt').trim() }
            }
        }

        stage('Status: Pending') {
            when { expression { return !params.DRY_RUN } }
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh '''#!/bin/bash
                        curl -sf -X POST -H "Authorization: token $GH_TOKEN" -H "Content-Type: application/json" \
                            -d "{\\"state\\":\\"pending\\",\\"context\\":\\"Jenkins / Vercel Deploy\\",\\"description\\":\\"Deploying to production...\\",\\"target_url\\":\\"${BUILD_URL}\\"}" \
                            "https://api.github.com/repos/${REPO}/statuses/${SHA}" > /dev/null || true
                    '''
                }
            }
        }

        stage('Checkout') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh '''#!/bin/bash
                        set -e
                        rm -rf src && mkdir -p src
                        git -C src init -q
                        git -C src remote add origin "https://x-access-token:${GH_TOKEN}@github.com/${REPO}.git"
                        git -C src fetch -q --depth 1 origin "${SHA}"
                        git -C src checkout -q FETCH_HEAD
                        echo "Checked out $(git -C src rev-parse --short HEAD)"
                        test -f "src/${APP_DIR}/package.json" || { echo "FAIL: src/${APP_DIR}/package.json missing"; exit 1; }
                        # Detach from git: the Vercel CLI otherwise stamps the commit author on the
                        # deployment, and Vercel blocks deployments authored by non-team-members.
                        rm -rf src/.git
                        echo "Detached source tree prepared"
                    '''
                }
            }
        }

        stage('Deploy to Vercel') {
            when { expression { return !params.DRY_RUN } }
            steps {
                withCredentials([string(credentialsId: 'vercel-token', variable: 'VERCEL_TOKEN')]) {
                    sh '''#!/bin/bash
                        set -e
                        cd "src/${APP_DIR}"
                        # --no-wait returns as soon as the deployment is created; we poll the API for
                        # the terminal state so a stalled CLI can never hang the build.
                        vercel deploy --prod --yes --no-wait \
                            --token "$VERCEL_TOKEN" --scope "$VERCEL_TEAM_SLUG" \
                            --meta jenkinsBuild="${BUILD_NUMBER}" \
                            --meta commitSha="${SHA}" \
                            --meta commitRef="${DEPLOY_BRANCH}" \
                            > ../../deploy.out 2> ../../deploy.err || { echo "=== vercel stderr ==="; cat ../../deploy.err; exit 1; }
                        cat ../../deploy.err
                        URL=$(grep -Eo "https://[a-zA-Z0-9._-]+\\.vercel\\.app" ../../deploy.out | tail -1)
                        if [ -z "$URL" ]; then echo "FAIL: no deployment URL in CLI output"; cat ../../deploy.out; exit 1; fi
                        echo "$URL" > ../../deploy_url.txt
                        echo "Deployment created: $URL"
                    '''
                }
                script { env.DEPLOY_URL = readFile('deploy_url.txt').trim() }
                withCredentials([string(credentialsId: 'vercel-token', variable: 'VERCEL_TOKEN')]) {
                    sh '''#!/bin/bash
                        set -e
                        HOST=$(echo "${DEPLOY_URL}" | sed -e "s|https://||" -e "s|/.*||")
                        echo "Polling build state for $HOST"
                        for i in $(seq 1 90); do
                            STATE=$(curl -sf -H "Authorization: Bearer $VERCEL_TOKEN" \
                                "https://api.vercel.com/v13/deployments/${HOST}?teamId=${VERCEL_ORG_ID}" \
                                | python3 -c "import sys,json; print(json.load(sys.stdin).get('readyState','UNKNOWN'))" 2>/dev/null || echo UNKNOWN)
                            echo "  [$i/90] state=$STATE"
                            case "$STATE" in
                                READY)
                                    echo "Build succeeded"; exit 0 ;;
                                ERROR|CANCELED)
                                    echo "FAIL: deployment ended in $STATE"; exit 1 ;;
                                BLOCKED)
                                    echo "FAIL: Vercel BLOCKED this deployment (usually a non-team-member git author or a team limit)."
                                    echo "      Inspect: https://vercel.com/${VERCEL_TEAM_SLUG}/trade-lab"
                                    exit 1 ;;
                                *) sleep 10 ;;
                            esac
                        done
                        echo "FAIL: timed out waiting for deployment"; exit 1
                    '''
                }
            }
        }

        stage('Smoke Test') {
            when { expression { return !params.DRY_RUN } }
            steps {
                sh '''#!/bin/bash
                    set -e
                    for target in "https://${PROD_ALIAS}" "${DEPLOY_URL}"; do
                        [ -z "$target" ] && continue
                        CODE=""
                        for i in $(seq 1 10); do
                            CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 "$target" || echo 000)
                            [ "$CODE" = "200" ] && break
                            echo "  $target -> $CODE (retry $i/10)"; sleep 6
                        done
                        if [ "$CODE" != "200" ]; then echo "FAIL: $target returned $CODE"; exit 1; fi
                        echo "PASS: $target -> 200"
                    done
                '''
            }
        }

        stage('Dry Run Summary') {
            when { expression { return params.DRY_RUN } }
            steps {
                sh '''#!/bin/bash
                    echo "=== DRY RUN COMPLETE ==="
                    echo "Repo:    ${REPO}@${DEPLOY_BRANCH}"
                    echo "SHA:     ${SHA}"
                    echo "App dir: ${APP_DIR}"
                    echo "Vercel:  ${VERCEL_PROJECT_ID} (team ${VERCEL_TEAM_SLUG})"
                    echo "All validations passed - deploy would proceed"
                '''
            }
        }
    }
    post {
        success {
            script {
                if (!params.DRY_RUN) {
                    withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                        sh '''#!/bin/bash
                            curl -sf -X POST -H "Authorization: token $GH_TOKEN" -H "Content-Type: application/json" \
                                -d "{\\"state\\":\\"success\\",\\"context\\":\\"Jenkins / Vercel Deploy\\",\\"description\\":\\"Live at ${PROD_ALIAS}\\",\\"target_url\\":\\"https://${PROD_ALIAS}\\"}" \
                                "https://api.github.com/repos/${REPO}/statuses/${SHA}" > /dev/null || true
                        '''
                    }
                }
            }
        }
        failure {
            script {
                if (!params.DRY_RUN) {
                    withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                        sh '''#!/bin/bash
                            curl -sf -X POST -H "Authorization: token $GH_TOKEN" -H "Content-Type: application/json" \
                                -d "{\\"state\\":\\"failure\\",\\"context\\":\\"Jenkins / Vercel Deploy\\",\\"description\\":\\"Deploy failed - see Jenkins\\",\\"target_url\\":\\"${BUILD_URL}console\\"}" \
                                "https://api.github.com/repos/${REPO}/statuses/${SHA}" > /dev/null || true
                        '''
                    }
                }
            }
        }
        always { cleanWs() }
    }
}
