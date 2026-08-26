#!/bin/bash
# n8n health monitor. Emails via Brevo only when state CHANGES, so a sustained
# outage costs one email, not one per run. Created after incident MQ-N8N-2026-0813,
# where a total automation stoppage went unnoticed for 10 days.
set -uo pipefail
set -a; source /etc/n8n-alerts.env; set +a
DB=/var/lib/docker/volumes/n8n_data/_data/database.sqlite
STATE=/var/lib/n8n-alerts.state
LOG=/var/log/n8n-healthcheck.log
PROBLEMS=""

add(){ PROBLEMS="${PROBLEMS}- $1"$'\n'; }

# 1. HTTP responding
code=$(curl -s -m 20 -o /dev/null -w '%{http_code}' https://n8n.srv1149839.hstgr.cloud/rest/settings || echo 000)
[ "$code" != "200" ] && add "n8n HTTP check returned $code (expected 200)"

# 2. container restarted since last check
rc=$(docker inspect root-n8n-1 --format '{{.RestartCount}}' 2>/dev/null || echo "?")
prev_rc=$(grep -oP '^rc=\K.*' "$STATE" 2>/dev/null || echo "$rc")
[ "$rc" != "$prev_rc" ] && add "n8n container restarted (RestartCount $prev_rc -> $rc)"

# 3. heap exhaustion, the original failure mode
heap=$(docker logs root-n8n-1 2>&1 | grep -ic "heap out of memory" || true)
[ "${heap:-0}" -gt 0 ] && add "JavaScript heap out of memory found in logs ($heap occurrences)"

# 4. database size
dbmb=$(du -m "$DB" 2>/dev/null | cut -f1 || echo 0)
[ "${dbmb:-0}" -gt 3072 ] && add "Database is ${dbmb}MB (over 3GB). Pruning or vacuum may not be working."

# 5. disk
freemb=$(df -m / | tail -1 | awk '{print $4}')
[ "${freemb:-0}" -lt 5120 ] && add "Only ${freemb}MB disk free"

# 6. memory
availmb=$(free -m | awk '/Mem:/{print $7}')
[ "${availmb:-0}" -lt 300 ] && add "Only ${availmb}MB memory available"

# 7. did anything run in the last 2 hours
recent=$(sqlite3 "file:$DB?mode=ro" "SELECT count(*) FROM execution_entity WHERE startedAt > datetime('now','-2 hours');" 2>/dev/null || echo 0)
[ "${recent:-0}" -eq 0 ] && add "No workflow executions in the last 2 hours. Automations may be silently stopped."

# 8. failure rate over the last hour
ok=$(sqlite3 "file:$DB?mode=ro" "SELECT count(*) FROM execution_entity WHERE status='success' AND startedAt > datetime('now','-1 hour');" 2>/dev/null || echo 0)
er=$(sqlite3 "file:$DB?mode=ro" "SELECT count(*) FROM execution_entity WHERE status!='success' AND startedAt > datetime('now','-1 hour');" 2>/dev/null || echo 0)
tot=$((ok+er))
if [ "$tot" -ge 10 ] && [ $((er*100/tot)) -ge 80 ]; then add "Failure rate $((er*100/tot))% : ${er} errors of ${tot} runs in the last hour"; fi

now=$(date -u +%FT%TZ)
if [ -n "$PROBLEMS" ]; then STATUS=PROBLEM; else STATUS=OK; fi
prev=$(grep -oP '^status=\K.*' "$STATE" 2>/dev/null || echo INIT)
printf 'status=%s\nrc=%s\n' "$STATUS" "$rc" > "$STATE"
echo "$now $STATUS db=${dbmb}MB mem=${availmb}MB runs1h=${ok}ok/${er}err" >> "$LOG"

[ "$STATUS" = "$prev" ] && exit 0   # no change, stay quiet
[ "$prev" = "INIT" ] && [ "$STATUS" = "OK" ] && exit 0   # first run, nothing to announce

if [ "$STATUS" = "PROBLEM" ]; then
  SUBJ="n8n ALERT: problem detected on srv1149839"
  BODY="n8n health check failed at ${now}.

${PROBLEMS}
Current state:
- database ${dbmb}MB, memory ${availmb}MB available, disk ${freemb}MB free
- executions last hour: ${ok} ok, ${er} error
- container restarts: ${rc}

https://n8n.srv1149839.hstgr.cloud"
else
  SUBJ="n8n recovered on srv1149839"
  BODY="n8n health check is back to normal at ${now}.

- database ${dbmb}MB, memory ${availmb}MB available
- executions last hour: ${ok} ok, ${er} error"
fi

export SUBJ BODY

# Primary channel: ntfy push. No account, no API key, works from this IP.
PRIO=default; TAG=white_check_mark
[ "$STATUS" = "PROBLEM" ] && { PRIO=high; TAG=rotating_light; }
curl -s -m 25 -o /dev/null -w "  ntfy http %{http_code}\n" \
  -H "Title: $SUBJ" -H "Priority: $PRIO" -H "Tags: $TAG" \
  --data-binary "$BODY" "https://ntfy.sh/$NTFY_TOPIC" >> "$LOG" 2>&1

# Secondary channel: Brevo email. Currently blocked by Brevo's authorised-IP list;
# starts working automatically once 145.223.126.80 and 2a02:4780:2d:5e4c::1 are added.
python3 - <<'PYEOF' >> "$LOG" 2>&1
import json,os,urllib.request
payload=json.dumps({
 "sender":{"name":"n8n Monitor","email":os.environ["ALERT_FROM"]},
 "to":[{"email":e.strip()} for e in os.environ["ALERT_TO"].split(",")],
 "subject":os.environ["SUBJ"],
 "textContent":os.environ["BODY"]}).encode()
r=urllib.request.Request("https://api.brevo.com/v3/smtp/email",data=payload,
 headers={"api-key":os.environ["BREVO_API_KEY"],"content-type":"application/json"})
try:
    print("  email sent:",urllib.request.urlopen(r,timeout=30).status)
except Exception as e:
    print("  email skipped:",str(e)[:80])
PYEOF
