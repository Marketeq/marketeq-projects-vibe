// Dependency Scan (SCA) -- Jenkins.
//
// Ported from .github/workflows/sca.yml, which could never run: GitHub Actions
// has no billing on this account, so all eight of its jobs failed in about two
// seconds without a runner (PR #800). Jenkins is this repository's CI, so the
// scan lives here instead. The three Python scripts are carried over unchanged.
//
// Two defects from the review of #800 are fixed here, not ported:
//
//   1. The Trivy install fell back to downloading `latest` unverified when the
//      pinned release was missing -- inside a job holding a write token. There
//      is no fallback now, and the download is verified before it runs.
//
//   2. The gate discarded scanner errors, so a scan that failed produced no
//      output file, which the next step read as "no lockfile changed" and
//      passed. A broken scanner was indistinguishable from a clean one. The
//      two conditions are now tracked separately.
//
pipeline {
    agent any
    options { ansiColor('xterm'); timestamps(); timeout(time: 30, unit: 'MINUTES') }
    parameters {
        string(name: 'PR_NUMBER',  defaultValue: '', description: 'PR number (empty for a push or scheduled run)')
        string(name: 'BASE_SHA',   defaultValue: '', description: 'Base commit of the PR, for the gate comparison')
        string(name: 'HEAD_SHA',   defaultValue: '', description: 'Head commit, for status reporting')
        string(name: 'SCAN_TYPE',  defaultValue: 'pr', description: 'pr | push | scheduled')
        // No default. A missing or wrong version must fail loudly rather than
        // silently install something nobody chose.
        string(name: 'TRIVY_VERSION', defaultValue: '', description: 'Exact Trivy version to use, e.g. 0.76.1. Required.')
    }
    environment { REPO = 'Marketeq/marketeq-projects-vibe' }

    stages {

        stage('Set Pending Status') {
            when { expression { return params.HEAD_SHA?.trim() } }
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh """
                        curl -sf -X POST -H "Authorization: token \$GH_TOKEN" -H "Content-Type: application/json" \
                            -d '{"state":"pending","context":"Jenkins / Dependency Scan","description":"Running...","target_url":"${BUILD_URL}"}' \
                            "https://api.github.com/repos/${env.REPO}/statuses/${params.HEAD_SHA}" > /dev/null 2>&1 || true
                    """
                }
            }
        }

        stage('Install Trivy') {
            steps {
                sh '''#!/bin/bash
                    set -euo pipefail

                    if [ -z "${TRIVY_VERSION:-}" ]; then
                        echo "FAIL: TRIVY_VERSION is not set."
                        echo "This job will not pick a version for you. Pinning is the point:"
                        echo "an unpinned scanner is a binary nobody chose, run with a write token."
                        exit 1
                    fi

                    V="${TRIVY_VERSION#v}"
                    BASE="https://github.com/aquasecurity/trivy/releases/download/v${V}"
                    TARBALL="trivy_${V}_Linux-64bit.tar.gz"

                    rm -rf trivy-install && mkdir trivy-install && cd trivy-install

                    # No "|| fall back to latest". If the pinned release is gone,
                    # that is a decision for a human, not for a shell script.
                    if ! curl -sSfL --retry 3 --max-time 180 -o "${TARBALL}" "${BASE}/${TARBALL}"; then
                        echo "FAIL: Trivy v${V} could not be downloaded."
                        echo "The release may not exist. Check the tag and set TRIVY_VERSION to a real one."
                        echo "Deliberately NOT falling back to latest: that is how a backdoored"
                        echo "release gets installed automatically (see PR #800 review)."
                        exit 1
                    fi

                    if ! curl -sSfL --retry 3 --max-time 60 -o checksums.txt "${BASE}/trivy_${V}_checksums.txt"; then
                        echo "FAIL: no checksums file published for v${V}; refusing to run an unverified binary."
                        exit 1
                    fi

                    # Integrity: the tarball is what that release published.
                    grep " ${TARBALL}\\$" checksums.txt > expected.sha256
                    if ! sha256sum -c expected.sha256; then
                        echo "FAIL: checksum mismatch for ${TARBALL}. Not unpacking it."
                        exit 1
                    fi
                    echo "PASS: checksum matches the published release"

                    # Authenticity, when cosign is available: the checksums file
                    # itself is signed. Without this, checksum and tarball come
                    # from the same place and verify nothing about provenance.
                    if command -v cosign >/dev/null 2>&1; then
                        if curl -sSfL --max-time 60 -o checksums.txt.sigstore.json \
                             "${BASE}/trivy_${V}_checksums.txt.sigstore.json"; then
                            cosign verify-blob checksums.txt \
                                --bundle checksums.txt.sigstore.json \
                                --certificate-identity-regexp '^https://github\\.com/aquasecurity/trivy' \
                                --certificate-oidc-issuer https://token.actions.githubusercontent.com
                            echo "PASS: signature verified with cosign"
                        else
                            echo "WARN: no sigstore bundle published for v${V}; integrity checked, provenance not."
                        fi
                    else
                        echo "WARN: cosign not installed, so provenance is unverified."
                        echo "      The checksum proves the download is intact, not that the release is genuine."
                        echo "      Install cosign on this agent to close that gap."
                    fi

                    tar -xzf "${TARBALL}" trivy
                    mkdir -p "${WORKSPACE}/bin" && mv trivy "${WORKSPACE}/bin/trivy"
                    chmod +x "${WORKSPACE}/bin/trivy"
                    "${WORKSPACE}/bin/trivy" --version
                '''
            }
        }

        stage('Checkout') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh '''#!/bin/bash
                        set -euo pipefail
                        rm -rf repo
                        # Full history, blobs on demand. The gate needs the base commit
                        # reachable; a shallow clone makes that comparison impossible
                        # and the failure is silent (see the SOP check, PR #842).
                        git clone --filter=blob:none "https://x-access-token:${GH_TOKEN}@github.com/${REPO}.git" repo
                        cd repo
                        if [ -n "${PR_NUMBER:-}" ]; then
                            git fetch origin "pull/${PR_NUMBER}/head:pr-${PR_NUMBER}"
                            git checkout --detach "pr-${PR_NUMBER}"
                        fi
                        echo "Scanning $(git rev-parse --short HEAD)"
                    '''
                }
            }
        }

        stage('Accepted findings are documented') {
            steps {
                sh '''#!/bin/bash
                    set -euo pipefail
                    cd repo
                    # The only check here allowed to fail the build on its own.
                    python3 scripts/security/sca/check-sca-ignores.py
                '''
            }
        }

        stage('Scan lockfiles') {
            steps {
                sh '''#!/bin/bash
                    set -uo pipefail
                    cd repo
                    TRIVY="${WORKSPACE}/bin/trivy"
                    mkdir -p ../results

                    # label:lockfile
                    TARGETS="backend:backend/package-lock.json frontend:frontend/package-lock.json cms-service:backend/apps/cms-service/package-lock.json"

                    for entry in $TARGETS; do
                        label="${entry%%:*}"; lock="${entry#*:}"
                        pkg="$(dirname "$lock")/package.json"
                        if [ ! -f "$lock" ]; then
                            echo "WARN: no lockfile at $lock -- skipping $label"
                            continue
                        fi
                        # The manifest pair is copied into an empty directory and scanned
                        # there. Scanning backend/ in place would walk apps/ and its 30
                        # lockfile-less manifests.
                        rm -rf ../stage && mkdir -p ../stage
                        cp "$lock" ../stage/package-lock.json
                        cp "$pkg"  ../stage/package.json

                        # Two passes: runtime only, then including dev. The difference is
                        # what separates "73 problems" from "163 problems".
                        "$TRIVY" fs --scanners vuln --format json --ignorefile .trivyignore.yaml \
                            --include-dev-deps=false --output "../results/${label}-runtime.json" --exit-code 0 ../stage
                        "$TRIVY" fs --scanners vuln --format json --ignorefile .trivyignore.yaml \
                            --include-dev-deps --output "../results/${label}-all.json" --exit-code 0 ../stage
                        echo "scanned ${label}"
                    done
                '''
            }
        }

        stage('Scan base image') {
            steps {
                sh '''#!/bin/bash
                    set -uo pipefail
                    cd repo
                    "${WORKSPACE}/bin/trivy" image --scanners vuln --format json \
                        --ignorefile .trivyignore.yaml \
                        --output ../results/base-image.json --exit-code 0 node:20-alpine || \
                        echo "WARN: base image scan failed; reported, not gated"
                '''
            }
        }

        stage('Gate') {
            when { expression { return params.PR_NUMBER?.trim() && params.BASE_SHA?.trim() } }
            steps {
                sh '''#!/bin/bash
                    set -uo pipefail
                    cd repo
                    TRIVY="${WORKSPACE}/bin/trivy"
                    TARGETS="backend:backend/package-lock.json frontend:frontend/package-lock.json cms-service:backend/apps/cms-service/package-lock.json"

                    CHANGED=""       # lockfiles this PR actually touched
                    SCAN_FAILED=""   # of those, the ones we could not scan
                    ARGS=""

                    for entry in $TARGETS; do
                        label="${entry%%:*}"; lock="${entry#*:}"
                        pkg="$(dirname "$lock")/package.json"
                        [ -f "$lock" ] || continue

                        # Unchanged lockfile -> no dependency changed -> nothing to compare.
                        if git cat-file -e "${BASE_SHA}:${lock}" 2>/dev/null \
                           && git show "${BASE_SHA}:${lock}" | cmp -s - "$lock"; then
                            echo "${label}: lockfile unchanged since base"
                            continue
                        fi

                        CHANGED="$CHANGED $label"
                        rm -rf ../head ../base && mkdir -p ../head ../base
                        cp "$lock" ../head/package-lock.json
                        cp "$pkg"  ../head/package.json

                        # THE FIX. Each scan's exit status is kept. Previously these were
                        # "|| true" and a failure left no file, which the next step read
                        # as "no lockfile changed" and passed.
                        if ! "$TRIVY" fs --scanners vuln --format json --ignorefile .trivyignore.yaml \
                                --output "../head-${label}.json" --exit-code 0 ../head; then
                            SCAN_FAILED="$SCAN_FAILED ${label}(head)"
                            continue
                        fi

                        if git cat-file -e "${BASE_SHA}:${lock}" 2>/dev/null; then
                            git show "${BASE_SHA}:${lock}" > ../base/package-lock.json
                            git show "${BASE_SHA}:${pkg}"  > ../base/package.json 2>/dev/null || cp "$pkg" ../base/package.json
                            if ! "$TRIVY" fs --scanners vuln --format json --ignorefile .trivyignore.yaml \
                                    --output "../base-${label}.json" --exit-code 0 ../base; then
                                SCAN_FAILED="$SCAN_FAILED ${label}(base)"
                                continue
                            fi
                            ARGS="$ARGS --target ${label} ../head-${label}.json ../base-${label}.json"
                        else
                            echo "${label}: no lockfile at base -- new install root, reported but not gated"
                        fi
                    done

                    if [ -n "$SCAN_FAILED" ]; then
                        echo "FAIL: lockfiles changed in this PR could not be scanned:${SCAN_FAILED}"
                        echo "This is NOT a clean result. The gate cannot tell whether this PR adds"
                        echo "vulnerable dependencies, so it refuses to report a pass."
                        exit 1
                    fi

                    if [ -z "$CHANGED" ]; then
                        echo "No lockfile changed in this pull request -- nothing for the gate to check."
                        exit 0
                    fi

                    if [ -z "$ARGS" ]; then
                        echo "Lockfiles changed (${CHANGED}) but none had a base to compare against."
                        exit 0
                    fi

                    echo "Comparing against base for:${CHANGED}"
                    python3 scripts/security/sca/sca-gate.py $ARGS
                '''
            }
        }

        stage('Summarise') {
            steps {
                sh '''#!/bin/bash
                    set -uo pipefail
                    python3 - <<'PY'
import json, os, glob
rows = []
for f in sorted(glob.glob('results/*-runtime.json')):
    label = os.path.basename(f).replace('-runtime.json', '')
    def count(path):
        sev = {}
        try:
            d = json.load(open(path))
        except Exception:
            return None
        for res in (d.get('Results') or []):
            for v in (res.get('Vulnerabilities') or []):
                s = (v.get('Severity') or 'UNKNOWN').title()
                sev[s] = sev.get(s, 0) + 1
        return sev
    rt = count(f)
    al = count(f.replace('-runtime.json', '-all.json'))
    rows.append((label, rt, al))

print()
print('| Root | Runtime | Including dev |')
print('|---|---|---|')
def fmt(s):
    if s is None: return 'scan failed'
    if not s: return '0'
    order = ['Critical', 'High', 'Medium', 'Low', 'Unknown']
    return f"{sum(s.values())} (" + ', '.join(f"{k.lower()} {s[k]}" for k in order if k in s) + ")"
for label, rt, al in rows:
    print(f"| {label} | {fmt(rt)} | {fmt(al)} |")
print()
PY
                '''
                archiveArtifacts artifacts: 'results/*.json, head-*.json, base-*.json', allowEmptyArchive: true, fingerprint: true
            }
        }

        stage('Weekly report') {
            when { expression { return params.SCAN_TYPE == 'scheduled' } }
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh '''#!/bin/bash
                        set -uo pipefail
                        cd repo
                        GITHUB_REPOSITORY="${REPO}" GITHUB_TOKEN="${GH_TOKEN}" \
                            python3 scripts/security/sca/sca-weekly-report.py || \
                            echo "WARN: weekly report failed; scan results above still stand"
                    '''
                }
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
                                -d '{"state":"success","context":"Jenkins / Dependency Scan","description":"No new vulnerable dependencies","target_url":"${BUILD_URL}"}' \
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
                                -d '{"state":"failure","context":"Jenkins / Dependency Scan","description":"See the build log","target_url":"${BUILD_URL}"}' \
                                "https://api.github.com/repos/${env.REPO}/statuses/${params.HEAD_SHA}" > /dev/null 2>&1 || true
                        """
                    }
                }
            }
        }
        always { cleanWs() }
    }
}
