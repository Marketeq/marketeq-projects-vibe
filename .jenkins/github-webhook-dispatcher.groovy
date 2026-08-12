// =============================================================================
// WARNING: THIS FILE IS NOT WHAT JENKINS RUNS.
//
// The `github-webhook-dispatcher` job stores its pipeline INLINE in the job config
// (<definition class="org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition">),
// so Jenkins never reads this file. Editing it -- or approving a PR that
// changes it -- has ZERO effect on the pipeline that actually executes.
//
// Verified 2026-08-07 against the Jenkins API: all four pipeline files in this
// repo are inline-backed, none are read from SCM.
//
// This has already caused one incident. PR #421 changed the /services/health
// behaviour and was reviewed and merged against this file on the assumption it
// was live. It was not, the live monitor kept its old logic, and PR #422 had to
// revert it.
//
// TO ACTUALLY CHANGE THE PIPELINE, do one of:
//   1. Edit the inline script in the Jenkins UI
//      (Job -> Configure -> Pipeline -> Script), then mirror the change here; or
//   2. Convert the job to CpsScmFlowDefinition so this file becomes
//      authoritative. NOTE: this repo is private, so the SCM checkout needs a
//      git credential (username/password or SSH). The existing `github-token`
//      credential is secret-text, which hudson.plugins.git.GitSCM cannot use --
//      a new credential must be created first or the job will fail to check out.
//
// Until a conversion happens, treat this file as DOCUMENTATION ONLY and keep it
// in sync by hand.
// =============================================================================

pipeline {
    agent any
    options {
        timestamps()
        timeout(time: 20, unit: 'MINUTES')
    }
    triggers {
        GenericTrigger(
            genericVariables: [
                [key: 'action', value: '$.action', defaultValue: ''],
                [key: 'repo_full_name', value: '$.repository.full_name', defaultValue: ''],
                [key: 'pr_number', value: '$.number', defaultValue: ''],
                [key: 'pr_title', value: '$.pull_request.title', defaultValue: ''],
                [key: 'pr_body', value: '$.pull_request.body', defaultValue: ''],
                [key: 'pr_base_ref', value: '$.pull_request.base.ref', defaultValue: ''],
                [key: 'pr_head_sha', value: '$.pull_request.head.sha', defaultValue: ''],
                [key: 'pr_author', value: '$.pull_request.user.login', defaultValue: ''],
                [key: 'push_ref', value: '$.ref', defaultValue: ''],
                [key: 'push_after', value: '$.after', defaultValue: ''],
                [key: 'pusher_name', value: '$.pusher.name', defaultValue: ''],
                [key: 'forced', value: '$.forced', defaultValue: 'false']
            ],
            genericHeaderVariables: [
                [key: 'X-GitHub-Event', regexpFilter: '']
            ],
            token: 'marketeq-dispatch',
            printContributedVariables: true,
            printPostContent: false,
            silentResponse: true,
            causeString: 'GitHub ${x_github_event} event'
        )
    }
    stages {
        stage('Dispatch') {
            steps {
                script {
                    def event = env.x_github_event ?: ''
                    def repo = repo_full_name ?: ''

                    echo "==> Repo: ${repo}, Event: ${event}"

                    if (repo == 'Marketeq/marketeq-website') {
                        dispatchWebsite(event)
                    } else if (repo == 'Marketeq/marketeq-projects-vibe') {
                        dispatchVibe(event)
                    } else {
                        echo "Unknown repo '${repo}' -- skipping"
                    }
                }
            }
        }
    }
    post {
        always { cleanWs() }
    }
}

def dispatchWebsite(event) {
    def protectedBranches = ['development', 'qa-staging', 'live']
    def REPO = 'Marketeq/marketeq-website'

    if (event == 'pull_request') {
        def validActions = ['opened', 'synchronize', 'reopened', 'edited']
        if (!validActions.contains(action)) {
            echo "PR action '${action}' -- skipping"
            return
        }
        if (!protectedBranches.contains(pr_base_ref)) {
            echo "[website] PR #${pr_number} targets '${pr_base_ref}' -- skipping"
            return
        }

        echo "==> [website] PR #${pr_number} targeting ${pr_base_ref} (sha: ${pr_head_sha})"

        if (pr_head_sha?.trim()) {
            withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                sh """
                    curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                        -d '{"state":"pending","context":"Jenkins / Lint & Type Check","description":"Queued...","target_url":"${BUILD_URL}"}' \
                        "https://api.github.com/repos/${REPO}/statuses/${pr_head_sha}" > /dev/null 2>&1 || true
                """
            }
        }

        build job: 'website-lint', wait: false, parameters: [
            string(name: 'PR_NUMBER', value: pr_number),
            string(name: 'HEAD_SHA', value: pr_head_sha),
            string(name: 'BASE_REF', value: pr_base_ref)
        ]
    }
    else if (event == 'push') {
        def branch = (push_ref ?: '').replaceAll('refs/heads/', '')
        if (!protectedBranches.contains(branch)) {
            echo "[website] Push to '${branch}' -- skipping"
            return
        }
        echo "==> [website] Push to ${branch} by ${pusher_name} (sha: ${push_after})"
    }
    else {
        echo "[website] Event '${event}' -- no dispatch rules, skipping."
    }
}

def dispatchVibe(event) {
    def protectedBranches = ['dev-main', 'staging', 'live-mvp']
    def REPO = 'Marketeq/marketeq-projects-vibe'

    if (event == 'pull_request') {
        def validActions = ['opened', 'synchronize', 'reopened', 'edited']
        if (!validActions.contains(action)) {
            echo "PR action '${action}' -- skipping"
            return
        }
        if (!protectedBranches.contains(pr_base_ref)) {
            echo "PR #${pr_number} targets '${pr_base_ref}' -- skipping"
            return
        }

        echo "==> PR #${pr_number} targeting ${pr_base_ref} (sha: ${pr_head_sha})"

        def checks = [
            'Jenkins / SOP Check',
            'Jenkins / Deep Regression Check',
            'Jenkins / Branch Freshness',
            'Jenkins / Secret Scan',
            'Jenkins / Login Gate',
            'Jenkins / Code Review'
        ]
        if (pr_head_sha?.trim()) {
            withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                for (ctx in checks) {
                    sh """
                        curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                            -d '{"state":"pending","context":"${ctx}","description":"Queued...","target_url":"${BUILD_URL}"}' \
                            "https://api.github.com/repos/${REPO}/statuses/${pr_head_sha}" > /dev/null 2>&1 || true
                    """
                }
            }
            echo "Posted pending status for all 5 checks"
        }

        def results = [:]
        parallel(
            'SOP Check': {
                try {
                    build job: 'sop-check', parameters: [
                        string(name: 'PR_NUMBER', value: pr_number),
                        string(name: 'PR_TITLE', value: pr_title),
                        string(name: 'PR_BODY', value: pr_body),
                        string(name: 'BASE_REF', value: pr_base_ref),
                        string(name: 'HEAD_SHA', value: pr_head_sha)
                    ]
                    results['Jenkins / SOP Check'] = 'success'
                } catch (e) {
                    results['Jenkins / SOP Check'] = 'failure'
                }
            },
            'Deep Regression': {
                try {
                    build job: 'deep-regression-check', parameters: [
                        string(name: 'PR_NUMBER', value: pr_number),
                        string(name: 'BASE_REF', value: pr_base_ref),
                        string(name: 'HEAD_SHA', value: pr_head_sha)
                    ]
                    results['Jenkins / Deep Regression Check'] = 'success'
                } catch (e) {
                    results['Jenkins / Deep Regression Check'] = 'failure'
                }
            },
            'Branch Freshness': {
                try {
                    build job: 'branch-freshness', parameters: [
                        string(name: 'PR_NUMBER', value: pr_number),
                        string(name: 'BASE_REF', value: pr_base_ref),
                        string(name: 'HEAD_SHA', value: pr_head_sha)
                    ]
                    results['Jenkins / Branch Freshness'] = 'success'
                } catch (e) {
                    results['Jenkins / Branch Freshness'] = 'failure'
                }
            },
            'Secret Scan': {
                try {
                    build job: 'gitleaks', parameters: [
                        string(name: 'PR_NUMBER', value: pr_number),
                        string(name: 'BASE_SHA', value: ''),
                        string(name: 'SCAN_TYPE', value: 'pr')
                    ]
                    results['Jenkins / Secret Scan'] = 'success'
                } catch (e) {
                    results['Jenkins / Secret Scan'] = 'failure'
                }
            },
            'Login Gate': {
                try {
                    build job: 'login-gate', parameters: [
                        string(name: 'PR_NUMBER', value: pr_number),
                        string(name: 'PR_AUTHOR', value: pr_author),
                        string(name: 'BASE_REF', value: pr_base_ref),
                        string(name: 'HEAD_SHA', value: pr_head_sha)
                    ]
                    results['Jenkins / Login Gate'] = 'success'
                } catch (e) {
                    results['Jenkins / Login Gate'] = 'failure'
                }
            },
            'Code Review': {
                try {
                    build job: 'code-review', parameters: [
                        string(name: 'PR_NUMBER', value: pr_number),
                        string(name: 'BASE_REF', value: pr_base_ref),
                        string(name: 'HEAD_SHA', value: pr_head_sha)
                    ]
                    results['Jenkins / Code Review'] = 'success'
                } catch (e) {
                    results['Jenkins / Code Review'] = 'failure'
                }
            }
        )

        if (pr_head_sha?.trim()) {
            withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                results.each { ctx, state ->
                    def desc = (state == 'success') ? 'Passed' : 'Failed'
                    sh """
                        curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                            -d '{"state":"${state}","context":"${ctx}","description":"${desc}","target_url":"${BUILD_URL}"}' \
                            "https://api.github.com/repos/${REPO}/statuses/${pr_head_sha}" > /dev/null 2>&1 || true
                    """
                }
            }
            echo "Posted final statuses: ${results}"
        }
    }
    else if (event == 'push') {
        def branch = (push_ref ?: '').replaceAll('refs/heads/', '')
        if (!protectedBranches.contains(branch)) {
            echo "Push to '${branch}' -- skipping"
            return
        }

        echo "==> Push to ${branch} by ${pusher_name} (sha: ${push_after}, forced: ${forced})"

        // Post-merge checks (fire-and-forget)
        build job: 'post-merge-audit', wait: false, parameters: [
            string(name: 'BRANCH', value: branch),
            string(name: 'PUSHER', value: pusher_name),
            string(name: 'COMMIT_SHA', value: push_after),
            booleanParam(name: 'FORCED', value: forced == 'true')
        ]

        build job: 'login-violation-alert', wait: false, parameters: [
            string(name: 'BRANCH', value: branch),
            string(name: 'PUSHER', value: pusher_name),
            string(name: 'COMMIT_SHA', value: push_after)
        ]

        build job: 'gitleaks', wait: false, parameters: [
            string(name: 'PR_NUMBER', value: ''),
            string(name: 'BASE_SHA', value: ''),
            string(name: 'SCAN_TYPE', value: 'push')
        ]

        echo "Post-merge checks dispatched."

        // Deploy: trigger staging-orchestrator for full deploy pipeline
        // (handles Vercel deploy + Render deploy for staging/live-mvp + smoke tests)
        echo "==> Triggering deploy for ${branch} (sha: ${push_after})"
        build job: 'staging-orchestrator', wait: false, parameters: [
            string(name: 'BRANCH', value: branch),
            string(name: 'COMMIT_SHA', value: push_after),
            string(name: 'EVENT', value: 'push'),
            booleanParam(name: 'DRY_RUN', value: false)
        ]
        echo "Deploy pipeline dispatched (staging-orchestrator)."
    }
    else {
        echo "Event '${event}' -- no dispatch rules, skipping."
    }
}
