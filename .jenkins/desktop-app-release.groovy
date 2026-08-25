// =============================================================================
// desktop-app-release  —  SCAFFOLD / DRY-RUN ONLY
// =============================================================================
// Manually triggered pipeline for cutting a Marketeq desktop app release.
//
// !! THIS IS A DUMMY PIPELINE. Every stage only echoes what it WOULD do.     !!
// !! No build runs, no version is bumped, nothing is pushed or published.    !!
// !! Real commands are marked  // TODO(real):  below.                        !!
//
// Source of truth : marketeq-projects-vibe/desktop
// Publish target  : github.com/Marketeq/desktop-time-tracker  (release artifacts only)
//
// -----------------------------------------------------------------------------
// BLOCKERS before this can be made real (verified on the Jenkins node, 2026-08-24)
// -----------------------------------------------------------------------------
//   node v20.20.2 / npm 10.8.2 / gh 2.92.0 / python3  ... available
//   docker ......... MISSING  -> needed to build Windows installers on Linux
//   wine ........... MISSING  -> alternative path for NSIS builds on Linux
//   os ............. Linux    -> CANNOT build macOS .dmg at all; needs a mac agent
//
//   So a real version of this job can currently produce NOTHING. Options:
//     (a) install Docker on the node and use electron-builder's wine image
//         (covers Windows only), and add a macOS agent for the .dmg, or
//     (b) run the whole job on a macOS agent (can produce mac + win via wine), or
//     (c) keep desktop builds on a developer machine and use this job only to
//         publish pre-built artifacts uploaded as job parameters.
//
//   Also outstanding: Marketeq/desktop-time-tracker is currently PRIVATE, which
//   breaks electron-updater's feed and the frontend download button. Repo
//   visibility is owner-only per CODE_REVIEW_SOP §1.6.
// =============================================================================

pipeline {
    agent any

    options {
        ansiColor('xterm')
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    parameters {
        choice(
            name: 'SOURCE_BRANCH',
            choices: ['dev-main', 'staging'],
            description: 'Branch to build the release from'
        )
        choice(
            name: 'VERSION_BUMP',
            choices: ['patch', 'minor', 'major', 'explicit'],
            description: 'How to bump desktop/package.json version (current: 1.0.0)'
        )
        string(
            name: 'EXPLICIT_VERSION',
            defaultValue: '',
            description: 'Only used when VERSION_BUMP=explicit, e.g. 1.0.1'
        )
        choice(
            name: 'CHANNEL',
            choices: ['stable', 'beta', 'alpha'],
            description: 'Release channel (maps to electron-updater allowPrerelease)'
        )
        booleanParam(
            name: 'BUILD_WINDOWS',
            defaultValue: true,
            description: 'Build the NSIS installer + portable exe'
        )
        booleanParam(
            name: 'BUILD_MAC',
            defaultValue: true,
            description: 'Build the mac dmg + zip (requires a macOS agent — not available yet)'
        )
        string(
            name: 'CONFIRM',
            defaultValue: '',
            description: 'Type PUBLISH RELEASE to confirm (ignored while DRY_RUN=true)'
        )
        booleanParam(
            name: 'DRY_RUN',
            defaultValue: true,
            description: 'SCAFFOLD: leave true. Nothing is built or published either way yet.'
        )
    }

    environment {
        REPO         = 'Marketeq/marketeq-projects-vibe'
        RELEASE_REPO = 'Marketeq/desktop-time-tracker'
        APP_DIR      = 'desktop'
    }

    stages {

        stage('Scaffold notice') {
            steps {
                echo '''
=============================================================
  desktop-app-release — SCAFFOLD BUILD
  Nothing is compiled, bumped, tagged, pushed, or published.
  Each stage below prints the command it would run.
=============================================================
'''
            }
        }

        stage('Confirm') {
            steps {
                script {
                    if (!params.DRY_RUN && params.CONFIRM != 'PUBLISH RELEASE') {
                        error("Publishing requires CONFIRM = 'PUBLISH RELEASE'. Aborting.")
                    }
                    echo "Source branch : ${params.SOURCE_BRANCH}"
                    echo "Version bump  : ${params.VERSION_BUMP}" +
                         (params.VERSION_BUMP == 'explicit' ? " -> ${params.EXPLICIT_VERSION}" : "")
                    echo "Channel       : ${params.CHANNEL}"
                    echo "Targets       : " +
                         (params.BUILD_WINDOWS ? 'win ' : '') +
                         (params.BUILD_MAC ? 'mac' : '')
                }
            }
        }

        stage('Preflight — toolchain') {
            steps {
                echo 'Would verify the node can actually produce the requested artifacts.'
                sh '''#!/bin/bash
                    echo "--- what this node really has ---"
                    echo "os      : $(uname -s) $(uname -m)"
                    echo "node    : $(node --version 2>/dev/null || echo MISSING)"
                    echo "npm     : $(npm --version 2>/dev/null || echo MISSING)"
                    echo "docker  : $(docker --version 2>/dev/null || echo MISSING)"
                    echo "wine    : $(wine --version 2>/dev/null || echo MISSING)"
                    echo "gh      : $(gh --version 2>/dev/null | head -1 || echo MISSING)"
                    echo
                    echo "NOTE: with docker+wine MISSING on Linux, a real run could not"
                    echo "      build Windows artifacts. macOS artifacts need a mac agent."
                '''
            }
        }

        stage('Checkout') {
            steps {
                echo "Would clone ${env.REPO} @ ${params.SOURCE_BRANCH} and cd ${env.APP_DIR}"
                // TODO(real):
                // git clone --depth=1 -b ${params.SOURCE_BRANCH} https://$GH_TOKEN@github.com/${REPO}.git repo
                // cd repo/desktop
            }
        }

        stage('Install deps') {
            steps {
                echo 'Would run: npm ci  (then electron-builder install-app-deps via postinstall)'
                // TODO(real): npm ci
            }
        }

        stage('Quality gate') {
            steps {
                echo 'Would run the same checks the PR gate runs, so a release can never'
                echo 'ship something dev-main would have blocked:'
                echo '  npx tsc --noEmit        (main / preload / renderer)'
                echo '  npx vitest run          (full suite)'
                // TODO(real): fail the build on non-zero exit from either
            }
        }

        stage('Bump version') {
            steps {
                echo "Would bump desktop/package.json (currently 1.0.0) using ${params.VERSION_BUMP}"
                echo 'Would commit the bump back to ' + params.SOURCE_BRANCH + ' as:'
                echo '  chore(desktop): release v<NEW_VERSION>'
                // TODO(real): npm version <bump> --no-git-tag-version
                // TODO(real): commit + push the bump (respecting SOP — no direct push
                //             to a protected branch without the promotion exemption)
            }
        }

        stage('Build — Windows') {
            when { expression { return params.BUILD_WINDOWS } }
            steps {
                echo 'Would run: npm run dist:win'
                echo 'Expected artifacts:'
                echo '  Marketeq-Setup-win-x64.exe'
                echo '  Marketeq-Setup-win-arm64.exe'
                echo '  Marketeq-win-x64-portable.exe'
                echo '  Marketeq-win-arm64-portable.exe'
                echo 'BLOCKED IN REALITY: needs docker or wine on this Linux node.'
                // TODO(real): npm run dist:win
            }
        }

        stage('Build — macOS') {
            when { expression { return params.BUILD_MAC } }
            steps {
                echo 'Would run: npm run dist:mac'
                echo 'Expected artifacts:'
                echo '  Marketeq-mac-x64.dmg / Marketeq-mac-arm64.dmg'
                echo '  Marketeq-mac-x64.zip / Marketeq-mac-arm64.zip'
                echo 'BLOCKED IN REALITY: .dmg cannot be produced on Linux — needs a macOS agent.'
                // TODO(real): run this stage on  agent { label "macos" }
            }
        }

        stage('Publish release') {
            steps {
                echo "Would publish a GitHub Release to ${env.RELEASE_REPO}"
                echo '  tag        : v<NEW_VERSION>'
                echo '  prerelease : ' + (params.CHANNEL == 'stable' ? 'false' : 'true')
                echo '  assets     : every artifact from the build stages above'
                echo ''
                echo 'REMINDER: that repo is currently PRIVATE. electron-updater calls'
                echo 'setFeedURL with no token and the frontend download button uses an'
                echo 'anonymous releases/latest/download URL — both 404 against a private'
                echo 'repo, so a published release would still not reach any user.'
                // TODO(real): gh release create v$VERSION --repo $RELEASE_REPO \
                //               --title "v$VERSION" --notes-file NOTES.md dist/*.exe dist/*.dmg
            }
        }

        stage('Verify') {
            steps {
                echo 'Would confirm the release is actually reachable before declaring success:'
                echo '  gh release view v<VERSION> --repo ' + env.RELEASE_REPO
                echo '  curl -sfI https://github.com/' + env.RELEASE_REPO + '/releases/latest/download/Marketeq-Setup-win-x64.exe'
                echo 'A release that 404s anonymously is a failed release, not a passing one.'
                // TODO(real): fail the build if the anonymous HEAD request is not 200/302
            }
        }
    }

    post {
        success {
            echo 'SCAFFOLD run complete — nothing was built or published.'
        }
        always {
            cleanWs()
        }
    }
}
