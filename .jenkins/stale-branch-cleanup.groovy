pipeline {
    agent any
    triggers { cron('0 14 * * 1') }
    options { ansiColor('xterm'); timestamps(); timeout(time: 5, unit: 'MINUTES') }
    environment { REPO = 'Marketeq/marketeq-projects-vibe' }
    stages {
        stage('Test') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh 'curl -sf -H "Authorization: token $GH_TOKEN" "https://api.github.com/repos/${REPO}/branches?per_page=1" > /dev/null && echo "PASS"'
                }
            }
        }
        stage('Find Stale Branches') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GH_TOKEN')]) {
                    sh '''#!/bin/bash
                        CUTOFF=$(date -d "30 days ago" +%s 2>/dev/null || date -v-30d +%s)
                        PAGE=1
                        STALE_COUNT=0
                        > stale_rows.txt

                        while true; do
                            BRANCHES=$(curl -sf -H "Authorization: token $GH_TOKEN" \
                                "https://api.github.com/repos/${REPO}/branches?per_page=100&page=$PAGE" 2>/dev/null)
                            COUNT=$(echo "$BRANCHES" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
                            [ "$COUNT" = "0" ] && break

                            echo "$BRANCHES" | python3 -c "
import sys, json
branches = json.load(sys.stdin)
for b in branches:
    name = b['name']
    date = b.get('commit',{}).get('commit',{}).get('committer',{}).get('date','')
    author = b.get('commit',{}).get('commit',{}).get('author',{}).get('name','unknown')
    print(f'{name}|{date}|{author}')
" 2>/dev/null | while IFS='|' read -r bname bdate bauthor; do
                                [ -z "$bname" ] && continue
                                case "$bname" in dev-main|staging|live-mvp) continue ;; esac
                                LAST_TS=$(date -d "$bdate" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$bdate" +%s 2>/dev/null || echo "0")
                                if [ "$LAST_TS" -lt "$CUTOFF" ] && [ "$LAST_TS" -gt 0 ]; then
                                    echo "| $bname | $bauthor | $bdate |" >> stale_rows.txt
                                fi
                            done

                            PAGE=$((PAGE + 1))
                        done

                        STALE_COUNT=$(wc -l < stale_rows.txt | tr -d ' ')
                        if [ "$STALE_COUNT" = "0" ]; then
                            echo "No stale branches found"
                            exit 0
                        fi

                        ROWS=$(cat stale_rows.txt)
                        TODAY=$(date +%Y-%m-%d)
                        python3 -c "
import json
rows = open('stale_rows.txt').read()
body = '## Weekly Stale Branch Audit\\n\\n'
body += 'Branches with no activity for >30 days:\\n\\n'
body += '| Branch | Author | Last Activity |\\n'
body += '|---|---|---|\\n'
body += rows + '\\n\\n'
body += '**Action:** Delete stale branches or update them.\\n\\nPosted by Jenkins CI'
print(json.dumps({'title': 'Weekly stale branch audit - ${STALE_COUNT} branches (${TODAY})', 'body': body, 'labels': ['stale-branch-audit']}))
" > stale_issue.json

                        curl -sf -X POST -H "Authorization: token $GH_TOKEN" -H "Content-Type: application/json" \
                            -d @stale_issue.json \
                            "https://api.github.com/repos/${REPO}/issues" > /dev/null
                        echo "Created stale branch report issue ($STALE_COUNT branches)"
                    '''
                }
            }
        }
    }
    post { always { cleanWs() } }
}
