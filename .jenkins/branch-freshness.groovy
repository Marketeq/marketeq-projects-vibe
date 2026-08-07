// =============================================================================
// WARNING: THIS FILE IS NOT WHAT JENKINS RUNS.
//
// The `branch-freshness` job stores its pipeline INLINE in the job config
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
    options { timestamps(); timeout(time: 5, unit: 'MINUTES') }
    parameters {
        string(name: 'PR_NUMBER', defaultValue: '', description: 'PR number')
        string(name: 'BASE_REF', defaultValue: 'dev-main', description: 'Base branch')
        string(name: 'HEAD_SHA', defaultValue: '', description: 'Head commit SHA')
    }
    environment { REPO = 'Marketeq/marketeq-projects-vibe' }
    stages {
        stage('Check Branch Freshness') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    script {
                        def prNum = params.PR_NUMBER?.trim()
                        def baseRef = params.BASE_REF?.trim() ?: 'dev-main'
                        def headSha = params.HEAD_SHA?.trim()

                        if (!prNum || !headSha) {
                            echo "Missing PR_NUMBER or HEAD_SHA -- skipping"
                            return
                        }

                        // Post pending status
                        sh """
                            curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                                -d '{"state":"pending","context":"Jenkins / Branch Freshness","description":"Checking if branch is up to date...","target_url":"${BUILD_URL}"}' \
                                "https://api.github.com/repos/${REPO}/statuses/${headSha}" > /dev/null 2>&1 || true
                        """

                        // Get PR info: base SHA (snapshot), head branch name, changed files count
                        def prInfo = sh(script: """
                            curl -sf -H "Authorization: token \$GH_TOKEN" \
                                "https://api.github.com/repos/${REPO}/pulls/${prNum}" | \
                                python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('base',{}).get('sha','')+' '+d.get('head',{}).get('ref','')+' '+str(d.get('changed_files',0)))"
                        """, returnStdout: true).trim()

                        def infoParts = prInfo.split(' ')
                        def prBaseSha = infoParts[0]
                        def prBranch = infoParts.length > 1 ? infoParts[1] : '?'
                        def changedFiles = infoParts.length > 2 ? infoParts[2] : '0'

                        echo "PR #${prNum}: ${prBranch} -> ${baseRef} (${changedFiles} files changed)"
                        echo "PR base snapshot: ${prBaseSha}"

                        if (!prBaseSha) {
                            echo "Could not get PR base SHA"
                            sh """
                                curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                                    -d '{"state":"success","context":"Jenkins / Branch Freshness","description":"Could not check -- skipping","target_url":"${BUILD_URL}"}' \
                                    "https://api.github.com/repos/${REPO}/statuses/${headSha}" > /dev/null 2>&1 || true
                            """
                            return
                        }

                        // Get current tip of base branch
                        def currentBaseTip = sh(script: """
                            curl -sf -H "Authorization: token \$GH_TOKEN" \
                                "https://api.github.com/repos/${REPO}/git/ref/heads/${baseRef}" | \
                                python3 -c "import json,sys; print(json.load(sys.stdin).get('object',{}).get('sha',''))"
                        """, returnStdout: true).trim()

                        echo "Current ${baseRef} tip: ${currentBaseTip}"

                        if (prBaseSha == currentBaseTip) {
                            echo "Branch is up to date with ${baseRef}"
                            sh """
                                curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                                    -d '{"state":"success","context":"Jenkins / Branch Freshness","description":"Up to date with ${baseRef}","target_url":"${BUILD_URL}"}' \
                                    "https://api.github.com/repos/${REPO}/statuses/${headSha}" > /dev/null 2>&1 || true
                            """
                            return
                        }

                        // Compare: how many commits has the base branch moved since PR was last synced?
                        def behindBy = sh(script: """
                            curl -sf -H "Authorization: token \$GH_TOKEN" \
                                "https://api.github.com/repos/${REPO}/compare/${prBaseSha}...${currentBaseTip}" | \
                                python3 -c "import json,sys; print(json.load(sys.stdin).get('ahead_by',0))"
                        """, returnStdout: true).trim().toInteger()

                        echo "Branch '${prBranch}' is ${behindBy} commit(s) behind '${baseRef}'"

                        // Check for overlapping files (regression risk)
                        def conflictInfo = ''
                        if (behindBy > 0) {
                            conflictInfo = sh(script: """#!/bin/bash
                                PR_FILES=\$(curl -sf -H "Authorization: token \$GH_TOKEN" \
                                    "https://api.github.com/repos/${REPO}/pulls/${prNum}/files?per_page=100" | \
                                    python3 -c "import json,sys; [print(f.get('filename','')) for f in json.load(sys.stdin)]" 2>/dev/null | sort)
                                BASE_FILES=\$(curl -sf -H "Authorization: token \$GH_TOKEN" \
                                    "https://api.github.com/repos/${REPO}/compare/${prBaseSha}...${currentBaseTip}" | \
                                    python3 -c "import json,sys; [print(f.get('filename','')) for f in json.load(sys.stdin).get('files',[])]" 2>/dev/null | sort)
                                if [ -n "\$PR_FILES" ] && [ -n "\$BASE_FILES" ]; then
                                    OVERLAP=\$(comm -12 <(echo "\$PR_FILES") <(echo "\$BASE_FILES") 2>/dev/null || echo "")
                                    if [ -n "\$OVERLAP" ]; then
                                        OVERLAP_COUNT=\$(echo "\$OVERLAP" | grep -c . || echo 0)
                                        echo "\$OVERLAP_COUNT conflicting files"
                                        echo "---"
                                        echo "\$OVERLAP" | head -10
                                    else
                                        echo "no file overlap"
                                    fi
                                else
                                    echo "could not check"
                                fi
                            """, returnStdout: true).trim()
                            echo "File overlap check: ${conflictInfo}"
                        }

                        def hasOverlap = conflictInfo.contains('conflicting files')
                        def overlapCount = 0
                        def overlapFiles = ''
                        if (hasOverlap) {
                            def ciParts = conflictInfo.split('---')
                            overlapCount = ciParts[0].trim().replaceAll('[^0-9]', '').toInteger()
                            overlapFiles = ciParts.length > 1 ? ciParts[1].trim() : ''
                        }

                        // Decision logic
                        def state = 'success'
                        def description = ''

                        if (behindBy <= 3 && !hasOverlap) {
                            // Small gap, no file conflicts -- allow
                            description = "${behindBy} commit(s) behind ${baseRef}, no conflicts"
                            state = 'success'
                        } else if (hasOverlap) {
                            // File conflicts -- always block regardless of how far behind
                            description = "${behindBy} behind, ${overlapCount} file conflict(s) - UPDATE BRANCH"
                            state = 'failure'
                        } else if (behindBy <= 10) {
                            // Medium gap, no conflicts -- warn but allow
                            description = "${behindBy} commits behind ${baseRef} - consider updating"
                            state = 'success'
                        } else {
                            // Large gap -- block
                            description = "${behindBy} commits behind ${baseRef} - STALE, must update"
                            state = 'failure'
                        }

                        echo "RESULT: ${state} -- ${description}"

                        sh """
                            curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                                -d '{"state":"${state}","context":"Jenkins / Branch Freshness","description":"${description}","target_url":"${BUILD_URL}"}' \
                                "https://api.github.com/repos/${REPO}/statuses/${headSha}" > /dev/null 2>&1 || true
                        """

                        // Post a PR comment if branch is stale
                        if (state == 'failure') {
                            def bt = '`'
                            def bt3 = '```'
                            def overlapSection = hasOverlap ? "\n\n**:rotating_light: These files were changed in BOTH your branch and ${bt}${baseRef}${bt}:**\n${bt3}\n${overlapFiles}\n${bt3}\n\nMerging without updating will **silently overwrite** the ${bt}${baseRef}${bt} changes to these files." : ''
                            def commentBody = "## :warning: Branch Out of Date\n\n" +
                                "Your branch ${bt}${prBranch}${bt} is **${behindBy} commit(s) behind ${bt}${baseRef}${bt}**." +
                                overlapSection + "\n\n" +
                                "### How to fix:\n" +
                                "${bt3}bash\ngit checkout ${prBranch}\ngit pull origin ${baseRef}\n# resolve any conflicts\ngit push\n${bt3}\n\n" +
                                "Or click **\"Update branch\"** in the GitHub PR UI.\n\n" +
                                "<!-- branch-freshness-check -->"

                            writeFile file: 'freshness_comment.json', text: groovy.json.JsonOutput.toJson([body: commentBody])

                            sh """
                                EXISTING_ID=\$(curl -sf -H "Authorization: token \$GH_TOKEN" \
                                    "https://api.github.com/repos/${REPO}/issues/${prNum}/comments?per_page=100" | \
                                    python3 -c "import sys,json;[print(c['id']) for c in json.load(sys.stdin) if '<!-- branch-freshness-check -->' in c.get('body','')][:1]" 2>/dev/null || echo "")

                                if [ -n "\$EXISTING_ID" ]; then
                                    curl -sf -X PATCH -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                                        -d @freshness_comment.json \
                                        "https://api.github.com/repos/${REPO}/issues/comments/\$EXISTING_ID" > /dev/null
                                    echo "Updated existing freshness comment"
                                else
                                    curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                                        -d @freshness_comment.json \
                                        "https://api.github.com/repos/${REPO}/issues/${prNum}/comments" > /dev/null
                                    echo "Posted freshness warning comment"
                                fi
                            """

                            error("Branch is ${behindBy} commits behind ${baseRef} with conflicts -- must update before merge")
                        }
                    }
                }
            }
        }
    }
    post {
        always { cleanWs() }
    }
}
