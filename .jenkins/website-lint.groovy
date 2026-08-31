pipeline {
    agent any
    options {
        timestamps()
        timeout(time: 15, unit: 'MINUTES')
    }
    parameters {
        string(name: 'PR_NUMBER', defaultValue: '', description: 'PR number')
        string(name: 'HEAD_SHA', defaultValue: '', description: 'Head commit SHA')
        string(name: 'BASE_REF', defaultValue: '', description: 'Target branch')
    }
    environment {
        REPO = 'Marketeq/marketeq-website'
        CHECK_NAME = 'Jenkins / Lint & Type Check'
    }
    stages {
        stage('Post Pending') {
            steps {
                script {
                    if (params.HEAD_SHA?.trim()) {
                        withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                            sh """
                                curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                                    -d '{"state":"pending","context":"${CHECK_NAME}","description":"Running lint & type check...","target_url":"${BUILD_URL}"}' \
                                    "https://api.github.com/repos/${REPO}/statuses/${params.HEAD_SHA}" > /dev/null 2>&1 || true
                            """
                        }
                    }
                }
            }
        }
        stage('Checkout') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh """
                        rm -rf .git
                        git init
                        git remote add origin https://x-access-token:\$GH_TOKEN@github.com/${REPO}.git
                        git fetch origin
                        CHECKOUT_REF='${params.HEAD_SHA}'
                        if [ -z "\$CHECKOUT_REF" ]; then CHECKOUT_REF='origin/development'; fi
                        git checkout -f \$CHECKOUT_REF
                    """
                }
            }
        }
        stage('Install') {
            steps {
                sh 'node --version && npm --version'
                sh 'npm ci --ignore-scripts'
            }
        }
        stage('Lint & Type Check') {
            steps {
                sh 'NODE_OPTIONS=--max-old-space-size=3072 npx tsc --noEmit'
                sh 'npm run lint'
                sh 'npm run format:check'
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
                                -d '{"state":"success","context":"${CHECK_NAME}","description":"Passed","target_url":"${BUILD_URL}"}' \
                                "https://api.github.com/repos/${REPO}/statuses/${params.HEAD_SHA}" > /dev/null 2>&1 || true
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
                                -d '{"state":"failure","context":"${CHECK_NAME}","description":"Failed","target_url":"${BUILD_URL}"}' \
                                "https://api.github.com/repos/${REPO}/statuses/${params.HEAD_SHA}" > /dev/null 2>&1 || true
                        """
                    }
                }
            }
        }
        always { cleanWs() }
    }
}
