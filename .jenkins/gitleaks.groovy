pipeline {
    agent any
    options { ansiColor('xterm'); timestamps(); timeout(time: 10, unit: 'MINUTES') }
    parameters {
        string(name: 'PR_NUMBER', defaultValue: '', description: 'PR number (empty for push scan)')
        string(name: 'BASE_SHA', defaultValue: '', description: 'Base SHA for PR scan')
        string(name: 'HEAD_SHA', defaultValue: '', description: 'Head commit SHA for status reporting')
        string(name: 'SCAN_TYPE', defaultValue: 'pr', description: 'pr or push')
    }
    environment { REPO = 'Marketeq/marketeq-projects-vibe' }
    stages {
        stage('Set Pending Status') {
            when { expression { return params.HEAD_SHA?.trim() } }
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh """
                        curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                            -d '{"state":"pending","context":"Jenkins / Secret Scan","description":"Running...","target_url":"${BUILD_URL}"}' \
                            "https://api.github.com/repos/${env.REPO}/statuses/${params.HEAD_SHA}" > /dev/null 2>&1 || true
                    """
                }
            }
        }
        stage('Test - Gitleaks Install') {
            steps {
                sh '''
                    GITLEAKS_VERSION="8.18.4"
                    if ! command -v gitleaks >/dev/null 2>&1; then
                        curl -sSfL "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz" | tar -xz -C /usr/local/bin gitleaks
                    fi
                    gitleaks version
                    echo "PASS: Gitleaks installed"
                '''
            }
        }
        stage('Checkout') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh 'rm -rf repo && git clone --depth=50 "https://x-access-token:${GH_TOKEN}@github.com/${REPO}.git" repo'
                }
            }
        }
        stage('Scan for Secrets') {
            steps {
                sh '''#!/bin/bash
                    cd repo
                    CONFIG_FLAG=""
                    [ -f ".gitleaks.toml" ] && CONFIG_FLAG="--config=.gitleaks.toml"
                    if [ "${SCAN_TYPE}" = "pr" ] && [ -n "${BASE_SHA}" ]; then
                        gitleaks detect --source=. $CONFIG_FLAG --log-opts="${BASE_SHA}..HEAD" --verbose
                    else
                        gitleaks detect --source=. $CONFIG_FLAG --log-opts="HEAD~1..HEAD" --verbose
                    fi
                    echo "PASS: No secrets detected"
                '''
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
                                -d '{"state":"success","context":"Jenkins / Secret Scan","description":"No secrets found","target_url":"${BUILD_URL}"}' \
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
                                -d '{"state":"failure","context":"Jenkins / Secret Scan","description":"Secrets detected","target_url":"${BUILD_URL}"}' \
                                "https://api.github.com/repos/${env.REPO}/statuses/${params.HEAD_SHA}" > /dev/null 2>&1 || true
                        """
                    }
                }
            }
        }
        always { cleanWs() }
    }
}