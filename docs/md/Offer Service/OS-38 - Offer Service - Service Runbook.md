**OS-38**

**Offer Service --- Service Runbook**

**Incident types:** Service down • Scheduler stopped • Events not
publishing • Bad state • Performance

This runbook is the incident response guide for offer-service. It covers
every failure mode that has occurred or is likely to occur in
production. For each scenario: the alert that fires, the diagnostic
commands to identify root cause, and the exact recovery steps. All SQL
and kubectl commands are copy-paste ready.

+-----------------------------------------------------------------------+
| Before starting any runbook:                                          |
|                                                                       |
| 1\. Acknowledge the alert in your alerting tool (PagerDuty/OpsGenie). |
|                                                                       |
| 2\. Open an incident channel in Slack (#incidents).                   |
|                                                                       |
| 3\. Paste the alert message and the runbook section you are           |
| following.                                                            |
|                                                                       |
| 4\. Provide a status update every 10 minutes until resolved.          |
|                                                                       |
| 5\. After resolution: write a 5-line incident summary in the channel. |
|                                                                       |
| 6\. Create a post-mortem ticket if the incident lasted \> 15 minutes  |
| or caused user impact.                                                |
+-----------------------------------------------------------------------+

**Runbook Index**

  ------------------ ---------------------- ------------------------------
  **Symptom /        **Primary indicator**  **Go to section**
  Alert**                                   

  Service down or    GET /v1/ready returns  **RB-01: Service Down**
  pods crashing      503 or pods not        
                     running                

  Offers not         Expiry backlog \> 0    **RB-02: Scheduler Stopped**
  expiring           for \> 5 min           

  48h warnings not   No offer.expiring_soon **RB-03: Warning Processor
  sent               events in 6 hours      Stopped**

  Events not         Outbox PENDING \> 500  **RB-04: Events Not
  reaching           or consumers reporting Publishing**
  downstream         gaps                   

  Outbox FAILED      SELECT \* FROM outbox  **RB-05: Outbox FAILED**
  events             WHERE                  
                     status=\'FAILED\'      

  Offer stuck in     Manual report: talent  **RB-06: Bad Offer State**
  wrong state        cannot act on offer    

  CAS conflict storm 409 rate \> 5% over 10 **RB-07: CAS Conflict Storm**
                     min                    

  High API latency   p95 \> 1000ms over 5   **RB-08: High Latency**
                     min                    

  DB connection pool /ready returns         **RB-09: DB Connection
  exhausted          db=disconnected or     Issues**
                     pool \> 90%            

  Ably real-time     Clients not receiving  **RB-10: Ably Service Issues**
  broken             live updates           
  ------------------ ---------------------- ------------------------------

+-----------------------------------------------------------------------+
| **RB-01 Service Down**                                                |
|                                                                       |
| Pods crashing, /ready returning 503, or no pods running               |
+-----------------------------------------------------------------------+

**Alert**

GET /ready returns 503 for \>= 2 consecutive checks. OR: kubectl get
pods shows CrashLoopBackOff or 0 running pods.

**Step 1: Confirm the incident**

+-----------------------------------------------------------------------+
| \# Check pod status:                                                  |
|                                                                       |
| kubectl get pods -l app=offer-service \--namespace=marketeq-prod      |
|                                                                       |
| \# Expected when healthy:                                             |
|                                                                       |
| \# NAME READY STATUS RESTARTS AGE                                     |
|                                                                       |
| \# offer-service-7d9d4b5c6-abc12 1/1 Running 0 2d                     |
|                                                                       |
| \# offer-service-7d9d4b5c6-def34 1/1 Running 0 2d                     |
|                                                                       |
| \# offer-service-7d9d4b5c6-ghi56 1/1 Running 0 2d                     |
|                                                                       |
| \# If you see CrashLoopBackOff or 0/1 READY:                          |
|                                                                       |
| \# The container is crashing on startup.                              |
|                                                                       |
| \# Check /ready to see which dependency is failing:                   |
|                                                                       |
| curl -s https://api.marketeq.com/v1/ready \| jq .                     |
+-----------------------------------------------------------------------+

**Step 2: Read the crash logs**

+-----------------------------------------------------------------------+
| \# Get logs from a crashing pod:                                      |
|                                                                       |
| kubectl logs \<pod-name\> \--namespace=marketeq-prod \--previous      |
|                                                                       |
| \# \--previous: shows logs from the last (crashed) container instance |
|                                                                       |
| \# If CrashLoopBackOff: describe the pod for events:                  |
|                                                                       |
| kubectl describe pod \<pod-name\> \--namespace=marketeq-prod          |
|                                                                       |
| \# Look at the \"Events\" section at the bottom for the crash reason. |
|                                                                       |
| \# Common crash causes and their log signatures:                      |
|                                                                       |
| \# 1. Missing environment variable:                                   |
|                                                                       |
| \# {\"level\":\"error\",\"message\":\"Configuration validation        |
| failed\",                                                             |
|                                                                       |
| \# \"details\":\"DATABASE_URL is required\"}                          |
|                                                                       |
| \# Fix: check the K8s secret has all required vars (OS-37 Step 8).    |
|                                                                       |
| \# 2. DB connection refused on startup:                               |
|                                                                       |
| \# {\"level\":\"error\",\"message\":\"Unable to connect to the        |
| database\",                                                           |
|                                                                       |
| \# \"error\":\"connect ECONNREFUSED 10.0.0.5:5432\"}                  |
|                                                                       |
| \# Fix: verify DATABASE_URL in the K8s secret. Check if DB server is  |
| up.                                                                   |
|                                                                       |
| \# 3. Invalid JWT public key format:                                  |
|                                                                       |
| \# {\"level\":\"error\",\"message\":\"secretOrKey must be provided\"} |
|                                                                       |
| \# Fix: verify JWT_PUBLIC_KEY is a valid PEM-format RSA public key.   |
|                                                                       |
| \# 4. Port already in use:                                            |
|                                                                       |
| \# {\"level\":\"error\",\"message\":\"listen EADDRINUSE: address      |
| already in use 0.0.0.0:3005\"}                                        |
|                                                                       |
| \# Unlikely in K8s. If occurs: check if PORT env var is set to a used |
| port.                                                                 |
+-----------------------------------------------------------------------+

**Step 3: Recovery**

+-----------------------------------------------------------------------+
| \# If the crash is caused by a bad deployment (code bug):             |
|                                                                       |
| kubectl rollout undo deployment/offer-service                         |
| \--namespace=marketeq-prod                                            |
|                                                                       |
| kubectl rollout status deployment/offer-service                       |
| \--namespace=marketeq-prod                                            |
|                                                                       |
| \# If the crash is caused by a missing secret:                        |
|                                                                       |
| \# Fix the secret first:                                              |
|                                                                       |
| kubectl patch secret offer-service-secrets \\                         |
|                                                                       |
| \--namespace=marketeq-prod \\                                         |
|                                                                       |
| -p \'{\"stringData\":{\"DATABASE_URL\":\"correct-url-here\"}}\'       |
|                                                                       |
| \# Then restart the pods:                                             |
|                                                                       |
| kubectl rollout restart deployment/offer-service                      |
| \--namespace=marketeq-prod                                            |
|                                                                       |
| kubectl rollout status deployment/offer-service                       |
| \--namespace=marketeq-prod                                            |
|                                                                       |
| \# If DB is down: escalate to DB on-call. Do not restart              |
| offer-service.                                                        |
|                                                                       |
| \# It will keep crashing until the DB is available.                   |
|                                                                       |
| \# Verify recovery:                                                   |
|                                                                       |
| curl -s https://api.marketeq.com/v1/ready \| jq .status               |
|                                                                       |
| \# Expected: \"ok\"                                                   |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **RB-02 Scheduler Stopped --- Expiry Cron Not Running**               |
|                                                                       |
| Offers are not being expired even though their TTL has passed         |
+-----------------------------------------------------------------------+

**How to detect**

+-----------------------------------------------------------------------+
| \# Check for expired-but-PENDING offers (expiry backlog):             |
|                                                                       |
| SELECT COUNT(\*) AS overdue                                           |
|                                                                       |
| FROM offer_service.offers                                             |
|                                                                       |
| WHERE status = \'PENDING\'                                            |
|                                                                       |
| AND expires_at \<= NOW() - INTERVAL \'2 minutes\';                    |
|                                                                       |
| \# Any value \> 0 means the expiry cron has not run in the last       |
| minute.                                                               |
|                                                                       |
| \# Check for the last expiry log line:                                |
|                                                                       |
| kubectl logs -l app=offer-service \--namespace=marketeq-prod          |
| \--since=10m \\                                                       |
|                                                                       |
| \| jq -r \'select(.context==\"ExpiryProcessor\") \| \[.timestamp,     |
| .message\] \| \@csv\'                                                 |
|                                                                       |
| \# Expected: a log line every 60 seconds.                             |
|                                                                       |
| \# If no log in \> 3 minutes: the cron has stopped.                   |
+-----------------------------------------------------------------------+

**Root causes and fixes**

+-----------------------------------------------------------------------+
| \# CAUSE 1: ScheduleModule not imported in AppModule.                 |
|                                                                       |
| \# This would mean the \@Cron decorators never registered.            |
|                                                                       |
| \# SYMPTOM: No \"Registered offer-expiry cron job\" in startup logs.  |
|                                                                       |
| \# Check startup logs for cron registration:                          |
|                                                                       |
| kubectl logs \<pod-name\> \--namespace=marketeq-prod \| grep \"cron\" |
|                                                                       |
| \# Expected: \"\[SchedulerRegistry\] Registered offer-expiry cron     |
| job\"                                                                 |
|                                                                       |
| \# If missing: ScheduleModule.forRoot() is not in AppModule.          |
|                                                                       |
| \# Fix: add to AppModule, re-deploy.                                  |
|                                                                       |
| \# CAUSE 2: All offer-service pods were restarted simultaneously.     |
|                                                                       |
| \# The cron is in-memory. If all 3 pods restart at the same time,     |
|                                                                       |
| \# there is a brief window where no cron is running.                  |
|                                                                       |
| \# SYMPTOM: Overdue count increases sharply then resolves in 60s.     |
|                                                                       |
| \# FIX: Not a real incident. K8s rolling update prevents this in      |
| production.                                                           |
|                                                                       |
| \# CAUSE 3: ExpiryProcessor is throwing an unhandled exception.       |
|                                                                       |
| \# The \@Cron decorator catches exceptions silently and reschedules.  |
|                                                                       |
| \# SYMPTOM: No \"Expiring N primary offer(s)\" log lines.             |
|                                                                       |
| \# Check for errors in ExpiryProcessor:                               |
|                                                                       |
| kubectl logs -l app=offer-service \--namespace=marketeq-prod          |
| \--since=30m \\                                                       |
|                                                                       |
| \| jq \'select(.level==\"error\" and .context==\"ExpiryProcessor\")\' |
|                                                                       |
| \# CAUSE 4: DB connection issues preventing the expiry query.         |
|                                                                       |
| \# See RB-09.                                                         |
+-----------------------------------------------------------------------+

**Manual expiry trigger (emergency only)**

+-----------------------------------------------------------------------+
| \# If the cron has been stopped for \> 10 minutes and offers are      |
| overdue,                                                              |
|                                                                       |
| \# you can trigger expiry manually via a one-off SQL UPDATE.          |
|                                                                       |
| \# This bypasses the outbox pattern --- only use as a last resort.    |
|                                                                       |
| crit_warn: \"This SQL expires offers without writing outbox events.\" |
|                                                                       |
| \# The outbox events will NOT be published. downstream services       |
| (notification-service)                                                |
|                                                                       |
| \# will NOT receive offer.expired events for these offers.            |
|                                                                       |
| \# Only use if the scheduler will be fixed immediately after.         |
|                                                                       |
| \# Count overdue offers first:                                        |
|                                                                       |
| SELECT COUNT(\*) FROM offer_service.offers                            |
|                                                                       |
| WHERE status = \'PENDING\' AND expires_at \<= NOW();                  |
|                                                                       |
| \# If acceptable, expire them:                                        |
|                                                                       |
| UPDATE offer_service.offers                                           |
|                                                                       |
| SET status = \'EXPIRED\', expired_at = NOW()                          |
|                                                                       |
| WHERE status = \'PENDING\' AND expires_at \<= NOW();                  |
|                                                                       |
| \# Then restart the offer-service pod to restart the cron:            |
|                                                                       |
| kubectl rollout restart deployment/offer-service                      |
| \--namespace=marketeq-prod                                            |
|                                                                       |
| \# Verify cron is running again:                                      |
|                                                                       |
| kubectl logs -l app=offer-service \--namespace=marketeq-prod          |
| \--since=3m \\                                                        |
|                                                                       |
| \| jq \'select(.context==\"ExpiryProcessor\")\'                       |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **RB-03 Warning Processor Stopped --- 48h Warnings Not Sending**      |
|                                                                       |
| No offer.expiring_soon events in \> 30 minutes                        |
+-----------------------------------------------------------------------+

**How to detect**

+-----------------------------------------------------------------------+
| \# Check the last warning log:                                        |
|                                                                       |
| kubectl logs -l app=offer-service \--namespace=marketeq-prod          |
| \--since=1h \\                                                        |
|                                                                       |
| \| jq \'select(.context==\"WarningProcessor\")\'                      |
|                                                                       |
| \# Expected: a log every 5 minutes.                                   |
|                                                                       |
| \# Check for offers that SHOULD have received a warning but have not: |
|                                                                       |
| SELECT id, expires_at, warning_sent_at                                |
|                                                                       |
| FROM offer_service.offers                                             |
|                                                                       |
| WHERE status = \'PENDING\'                                            |
|                                                                       |
| AND expires_at \<= NOW() + INTERVAL \'48 hours\'                      |
|                                                                       |
| AND expires_at \> NOW()                                               |
|                                                                       |
| AND warning_sent_at IS NULL;                                          |
|                                                                       |
| \# Any rows here = offers in the 48h window that missed their         |
| warning.                                                              |
+-----------------------------------------------------------------------+

**Root causes and fixes**

+-----------------------------------------------------------------------+
| \# The WarningProcessor runs every 5 minutes.                         |
|                                                                       |
| \# Root causes are identical to RB-02 (ExpiryProcessor):              |
|                                                                       |
| \# - ScheduleModule not imported                                      |
|                                                                       |
| \# - Unhandled exception in the cron method                           |
|                                                                       |
| \# - DB connection issues                                             |
|                                                                       |
| \# Check for errors specifically in WarningProcessor:                 |
|                                                                       |
| kubectl logs -l app=offer-service \--namespace=marketeq-prod          |
| \--since=30m \\                                                       |
|                                                                       |
| \| jq \'select(.level==\"error\" and                                  |
| .context==\"WarningProcessor\")\'                                     |
|                                                                       |
| \# Manual trigger: send warnings for missed offers.                   |
|                                                                       |
| \# This is safe to run manually --- it sets warning_sent_at which     |
| prevents duplicates.                                                  |
|                                                                       |
| UPDATE offer_service.offers                                           |
|                                                                       |
| SET warning_sent_at = NOW()                                           |
|                                                                       |
| WHERE status = \'PENDING\'                                            |
|                                                                       |
| AND expires_at \<= NOW() + INTERVAL \'48 hours\'                      |
|                                                                       |
| AND expires_at \> NOW()                                               |
|                                                                       |
| AND warning_sent_at IS NULL                                           |
|                                                                       |
| RETURNING id;                                                         |
|                                                                       |
| \# The UPDATE returns the offer IDs that need warnings.               |
|                                                                       |
| \# Note: this sets the timestamp WITHOUT writing outbox events.       |
|                                                                       |
| \# Notification-service will NOT send the 48h email for these offers. |
|                                                                       |
| \# Only use as a last resort. Fix the scheduler instead.              |
|                                                                       |
| \# Restart the service to restart the cron:                           |
|                                                                       |
| kubectl rollout restart deployment/offer-service                      |
| \--namespace=marketeq-prod                                            |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **RB-04 Events Not Publishing --- Outbox Queue Growing**              |
|                                                                       |
| Outbox PENDING count is increasing but events are not reaching        |
| downstream services                                                   |
+-----------------------------------------------------------------------+

**How to detect**

+-----------------------------------------------------------------------+
| \# Check outbox queue depth:                                          |
|                                                                       |
| SELECT status, COUNT(\*) AS count                                     |
|                                                                       |
| FROM offer_service.outbox                                             |
|                                                                       |
| GROUP BY status;                                                      |
|                                                                       |
| \# Healthy: PENDING \< 100. Growing over time = outbox processor is   |
| not running.                                                          |
|                                                                       |
| \# Check for OutboxProcessor logs:                                    |
|                                                                       |
| kubectl logs -l app=offer-service \--namespace=marketeq-prod          |
| \--since=10m \\                                                       |
|                                                                       |
| \| jq \'select(.context==\"OutboxProcessor\")\'                       |
|                                                                       |
| \# Expected: regular \"Published N outbox events\" log lines.         |
|                                                                       |
| \# Check RabbitMQ connectivity from a pod:                            |
|                                                                       |
| kubectl exec -it \<offer-service-pod\> \--namespace=marketeq-prod \-- |
| \\                                                                    |
|                                                                       |
| wget -qO- http://guest:guest@rabbitmq-svc:15672/api/healthchecks/node |
|                                                                       |
| \# Expected: {\"status\":\"ok\"}                                      |
+-----------------------------------------------------------------------+

**Root cause A: RabbitMQ broker is down**

+-----------------------------------------------------------------------+
| \# Symptoms:                                                          |
|                                                                       |
| \# - Outbox PENDING growing                                           |
|                                                                       |
| \# - RabbitMQ health check fails                                      |
|                                                                       |
| \# - OutboxProcessor logs: \"AMQP connection error\"                  |
|                                                                       |
| \# Fix:                                                               |
|                                                                       |
| \# 1. Escalate to infrastructure on-call to restore RabbitMQ.         |
|                                                                       |
| \# 2. Once RabbitMQ is up, the OutboxProcessor reconnects             |
| automatically.                                                        |
|                                                                       |
| \# 3. All PENDING outbox events are published in order.               |
|                                                                       |
| \# Monitor recovery:                                                  |
|                                                                       |
| SELECT COUNT(\*) FROM offer_service.outbox WHERE status =             |
| \'PENDING\';                                                          |
|                                                                       |
| \# Should decrease steadily as outbox drains.                         |
|                                                                       |
| \# How long was the queue backed up?                                  |
|                                                                       |
| SELECT MIN(created_at) AS oldest_pending                              |
|                                                                       |
| FROM offer_service.outbox                                             |
|                                                                       |
| WHERE status = \'PENDING\';                                           |
|                                                                       |
| \# This shows how old the oldest unprocessed event is.                |
|                                                                       |
| \# If \> 30 minutes: some downstream consumers may have timed out.    |
|                                                                       |
| \# Alert notification-service on-call to verify their DLQ.            |
+-----------------------------------------------------------------------+

**Root cause B: OutboxProcessor is crashing or throwing**

+-----------------------------------------------------------------------+
| \# Check OutboxProcessor error logs:                                  |
|                                                                       |
| kubectl logs -l app=offer-service \--namespace=marketeq-prod          |
| \--since=30m \\                                                       |
|                                                                       |
| \| jq \'select(.level==\"error\" and .context==\"OutboxProcessor\")\' |
|                                                                       |
| \# Common errors:                                                     |
|                                                                       |
| \# Error: \"duplicate key value violates unique constraint\"          |
|                                                                       |
| \# -\> A PUBLISHED event is being reprocessed. The idempotency check  |
| failed.                                                               |
|                                                                       |
| \# Fix: check if processed_at is being set correctly after publish.   |
|                                                                       |
| \# Error: \"Channel closed by server\" or \"Connection reset\"        |
|                                                                       |
| \# -\> AMQP channel is closing. May be a high message rate issue.     |
|                                                                       |
| \# Fix: ensure OutboxProcessor uses channel.confirm() mode.           |
|                                                                       |
| \# Check RABBITMQ_URL is pointing to the cluster load balancer, not a |
| single node.                                                          |
|                                                                       |
| \# Error: \"relation offer_service.outbox does not exist\"            |
|                                                                       |
| \# -\> Migrations have not been applied. See OS-37 Step 5.            |
|                                                                       |
| \# Fix: run migrations against the production DB.                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **RB-05 Outbox FAILED Events --- P1 Incident**                        |
|                                                                       |
| One or more events have reached max retries and are in FAILED status  |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| OUTBOX FAILED is the most critical offer-service incident.            |
|                                                                       |
| FAILED events will NEVER be retried automatically.                    |
|                                                                       |
| They represent events that downstream services (contracts-service,    |
|                                                                       |
| notification-service) have NOT received.                              |
|                                                                       |
| If offer.accepted is FAILED: contracts-service has not created the    |
| contract.                                                             |
|                                                                       |
| The talent and client believe the deal is done but no contract        |
| exists.                                                               |
|                                                                       |
| This requires immediate action.                                       |
+-----------------------------------------------------------------------+

**Step 1: Identify the FAILED events**

+-----------------------------------------------------------------------+
| SELECT id, event_type, aggregate_id, retry_count, last_error,         |
| created_at                                                            |
|                                                                       |
| FROM offer_service.outbox                                             |
|                                                                       |
| WHERE status = \'FAILED\'                                             |
|                                                                       |
| ORDER BY created_at ASC;                                              |
|                                                                       |
| \# Check the last_error to understand why they failed.                |
|                                                                       |
| \# Check the event_type to understand the severity:                   |
|                                                                       |
| \# offer.accepted: CRITICAL - contract not created                    |
|                                                                       |
| \# offer.counter_accepted: CRITICAL - contract not created            |
|                                                                       |
| \# offer.expired: HIGH - talent not notified, no extension prompt     |
|                                                                       |
| \# offer.countered: MEDIUM - talent/client notification not sent      |
|                                                                       |
| \# offer.declined/withdrawn: MEDIUM - notification not sent           |
+-----------------------------------------------------------------------+

**Step 2: Fix the underlying cause first**

+-----------------------------------------------------------------------+
| \# DO NOT reset FAILED events to PENDING before fixing the root       |
| cause.                                                                |
|                                                                       |
| \# If RabbitMQ is still down, they will just fail again.              |
|                                                                       |
| \# Verify RabbitMQ is healthy:                                        |
|                                                                       |
| curl -s -u guest:guest http://\<rabbitmq\>:15672/api/overview \| jq   |
| .object_totals                                                        |
|                                                                       |
| \# If not healthy: restore RabbitMQ first.                            |
|                                                                       |
| \# Verify the AMQP exchange exists:                                   |
|                                                                       |
| curl -s -u guest:guest                                                |
| http://\<rabbitmq\>:15672/api/exchanges/%2F/marketeq.offers \| jq     |
| .type                                                                 |
|                                                                       |
| \# Expected: \"topic\"                                                |
|                                                                       |
| \# If missing: exchange was deleted. Re-declare it.                   |
|                                                                       |
| \# The OutboxProcessor declares it on startup --- restart             |
| offer-service.                                                        |
|                                                                       |
| \# Verify the offer-service pods are healthy:                         |
|                                                                       |
| kubectl get pods -l app=offer-service \--namespace=marketeq-prod      |
+-----------------------------------------------------------------------+

**Step 3: Reset FAILED events to PENDING**

+-----------------------------------------------------------------------+
| \# Once RabbitMQ is healthy and offer-service is running:             |
|                                                                       |
| \# Option A: Reset ALL FAILED events (most common):                   |
|                                                                       |
| UPDATE offer_service.outbox                                           |
|                                                                       |
| SET status = \'PENDING\',                                             |
|                                                                       |
| retry_count = 0,                                                      |
|                                                                       |
| last_error = NULL,                                                    |
|                                                                       |
| scheduled_at = NOW()                                                  |
|                                                                       |
| WHERE status = \'FAILED\'                                             |
|                                                                       |
| RETURNING id, event_type, aggregate_id;                               |
|                                                                       |
| \# Option B: Reset only specific event types (for selective retry):   |
|                                                                       |
| UPDATE offer_service.outbox                                           |
|                                                                       |
| SET status = \'PENDING\', retry_count = 0, last_error = NULL,         |
|                                                                       |
| scheduled_at = NOW()                                                  |
|                                                                       |
| WHERE status = \'FAILED\'                                             |
|                                                                       |
| AND event_type IN (\'offer.accepted\', \'offer.counter_accepted\')    |
|                                                                       |
| RETURNING id, event_type;                                             |
|                                                                       |
| \# Wait 30 seconds for the OutboxProcessor to pick them up.           |
|                                                                       |
| SELECT id, status, processed_at                                       |
|                                                                       |
| FROM offer_service.outbox                                             |
|                                                                       |
| WHERE status IN (\'FAILED\', \'PENDING\', \'PROCESSING\')             |
|                                                                       |
| ORDER BY created_at DESC;                                             |
|                                                                       |
| \# Expected: events transition from PENDING -\> PROCESSING -\> (row   |
| removed or PUBLISHED)                                                 |
+-----------------------------------------------------------------------+

**Step 4: Verify downstream services received the events**

+-----------------------------------------------------------------------+
| \# For offer.accepted events: verify contracts-service created the    |
| contract.                                                             |
|                                                                       |
| \# Check contracts-service logs for the specific offerId:             |
|                                                                       |
| kubectl logs -l app=contracts-service \--namespace=marketeq-prod      |
| \--since=30m \\                                                       |
|                                                                       |
| \| grep \"\<offerId\>\"                                               |
|                                                                       |
| \# If contracts-service did NOT receive the event:                    |
|                                                                       |
| \# After resetting to PENDING and the event publishes,                |
|                                                                       |
| \# contracts-service should process it and create the contract.       |
|                                                                       |
| \# Verify: SELECT \* FROM contract_service.contract_groups WHERE      |
| offer_id = \'\<offerId\>\';                                           |
|                                                                       |
| \# For notification events: check notification-service DLQ.           |
|                                                                       |
| \# Notification failures are lower severity --- the user just did not |
| get an email.                                                         |
|                                                                       |
| \# No data integrity issue.                                           |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **RB-06 Bad Offer State --- Manual Correction**                       |
|                                                                       |
| Offer is stuck in an incorrect status or has wrong data               |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| NEVER update offer status directly in SQL without understanding the   |
| full impact:                                                          |
|                                                                       |
| \- Active counter offers must be resolved before changing offer       |
| status.                                                               |
|                                                                       |
| \- Changing status without an outbox event means downstream services  |
|                                                                       |
| (contracts-service, notification-service) will not be aware of the    |
| change.                                                               |
|                                                                       |
| \- Always write a matching outbox event alongside any manual status   |
| change.                                                               |
|                                                                       |
| \- Document every manual DB change in the incident log.               |
+-----------------------------------------------------------------------+

**Scenario A: Offer stuck in COUNTERED with no active CO**

+-----------------------------------------------------------------------+
| \# Detection: offer status=COUNTERED but no PENDING CO exists.        |
|                                                                       |
| SELECT o.id, o.status, co.id as co_id, co.status as co_status         |
|                                                                       |
| FROM offer_service.offers o                                           |
|                                                                       |
| LEFT JOIN offer_service.counter_offers co                             |
|                                                                       |
| ON co.offer_id = o.id AND co.status = \'PENDING\'                     |
|                                                                       |
| WHERE o.status = \'COUNTERED\'                                        |
|                                                                       |
| AND co.id IS NULL;                                                    |
|                                                                       |
| \# Root cause: race condition in CO terminal logic that left the      |
| parent                                                                |
|                                                                       |
| \# in COUNTERED state without restoring to PENDING.                   |
|                                                                       |
| \# Fix: restore the offer to PENDING and write an outbox event.       |
|                                                                       |
| BEGIN;                                                                |
|                                                                       |
| \-- Update offer status                                               |
|                                                                       |
| UPDATE offer_service.offers                                           |
|                                                                       |
| SET status = \'PENDING\'                                              |
|                                                                       |
| WHERE id = \'\<offerId\>\' AND status = \'COUNTERED\';                |
|                                                                       |
| \-- Write matching outbox event (so notification-service knows)       |
|                                                                       |
| INSERT INTO offer_service.outbox                                      |
|                                                                       |
| (id, aggregate_id, aggregate_type, event_type, exchange, routing_key, |
| payload, status)                                                      |
|                                                                       |
| VALUES (                                                              |
|                                                                       |
| gen_random_uuid(), \'\<offerId\>\', \'offer\',                        |
| \'offer.counter_expired\',                                            |
|                                                                       |
| \'marketeq.offers\', \'offer.counter_expired\',                       |
|                                                                       |
| \'{\"offerId\": \"\<offerId\>\", \"parentOfferStatus\": \"PENDING\",  |
| \"reason\": \"MANUAL_CORRECTION\"}\'::jsonb,                          |
|                                                                       |
| \'PENDING\'                                                           |
|                                                                       |
| );                                                                    |
|                                                                       |
| COMMIT;                                                               |
+-----------------------------------------------------------------------+

**Scenario B: Offer accepted but contracts-service not notified**

+-----------------------------------------------------------------------+
| \# Detection: offer status=ACCEPTED but offer.accepted event is       |
| FAILED in outbox.                                                     |
|                                                                       |
| \# Already handled in RB-05. Reset the FAILED event to PENDING.       |
|                                                                       |
| \# Scenario: offer.accepted was published but contracts-service       |
| missed it (their DLQ)                                                 |
|                                                                       |
| \# In this case: the outbox event is PUBLISHED (or gone).             |
| Contracts-service must replay.                                        |
|                                                                       |
| \# Manually re-publish the event by inserting a new outbox row:       |
|                                                                       |
| \-- First: get the offer details                                      |
|                                                                       |
| SELECT id, client_id, talent_id, job_listing_id, contract_type,       |
|                                                                       |
| contract_title, rate, currency_code, accepted_at                      |
|                                                                       |
| FROM offer_service.offers                                             |
|                                                                       |
| WHERE id = \'\<offerId\>\';                                           |
|                                                                       |
| \-- Insert a new outbox event to re-trigger contracts-service:        |
|                                                                       |
| INSERT INTO offer_service.outbox                                      |
|                                                                       |
| (id, aggregate_id, aggregate_type, event_type, exchange, routing_key, |
| payload, status)                                                      |
|                                                                       |
| VALUES (                                                              |
|                                                                       |
| gen_random_uuid(), \'\<offerId\>\', \'offer\', \'offer.accepted\',    |
|                                                                       |
| \'marketeq.offers\', \'offer.accepted\',                              |
|                                                                       |
| \'{\"offerId\": \"\<offerId\>\", \"clientId\": \"\...\",              |
| \"talentId\": \"\...\",                                               |
|                                                                       |
| \"contractType\": \"PROJECT\", \"contractTitle\": \"\...\",           |
|                                                                       |
| \"rate\": 95, \"currencyCode\": \"USD\", \"redelivery\":              |
| true}\'::jsonb,                                                       |
|                                                                       |
| \'PENDING\'                                                           |
|                                                                       |
| );                                                                    |
|                                                                       |
| \# Note the \"redelivery\": true flag in the payload.                 |
|                                                                       |
| \# contracts-service must be idempotent and handle duplicate          |
| offer.accepted events.                                                |
|                                                                       |
| \# Verify contracts-service idempotency before using this procedure.  |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **RB-07 CAS Conflict Storm --- 409 Rate \> 5%**                       |
|                                                                       |
| Concurrent accept/decline requests causing a high rate of 409 errors  |
+-----------------------------------------------------------------------+

**What is happening**

Multiple clients are sending concurrent mutating requests to the same
offer at the same time. The CAS pattern correctly rejects all but one
request with 409 OFFER_CONCURRENT_MODIFICATION. If the 409 rate is high
enough to trigger the alert, it indicates either a client bug (retry
loop without backoff) or unusual traffic pattern.

**Diagnose**

+-----------------------------------------------------------------------+
| \# Find which offers are generating the most 409 errors:              |
|                                                                       |
| kubectl logs -l app=offer-service \--namespace=marketeq-prod          |
| \--since=10m \\                                                       |
|                                                                       |
| \| jq \'select(.errorCode==\"OFFER_CONCURRENT_MODIFICATION\") \|      |
| .path\' \\                                                            |
|                                                                       |
| \| sort \| uniq -c \| sort -rn \| head -20                            |
|                                                                       |
| \# Expected output:                                                   |
|                                                                       |
| \# 47 \"/v1/offers/f47ac10b-\.../accept\" \<- 47 concurrent accepts   |
| on one offer                                                          |
|                                                                       |
| \# 3 \"/v1/offers/a1b2c3d4-\.../accept\"                              |
|                                                                       |
| \# Check if it is a client retry loop:                                |
|                                                                       |
| \# Look at the userId pattern in logs for the same offer:             |
|                                                                       |
| kubectl logs -l app=offer-service \--namespace=marketeq-prod          |
| \--since=5m \\                                                        |
|                                                                       |
| \| jq \'select(.path==\"/v1/offers/\<offerId\>/accept\") \|           |
| \[.userId, .idempotencyKey\]\' \\                                     |
|                                                                       |
| \| sort \| uniq -c                                                    |
|                                                                       |
| \# If the same userId with different idempotency keys:                |
|                                                                       |
| \# -\> Client is retrying without proper idempotency key reuse.       |
|                                                                       |
| \# -\> Contact the frontend team to fix the retry logic (OS-30).      |
|                                                                       |
| \# If many different userIds:                                         |
|                                                                       |
| \# -\> Unusual traffic from multiple concurrent users.                |
|                                                                       |
| \# -\> May be normal for high-demand offers (popular talent, fast     |
| offer).                                                               |
+-----------------------------------------------------------------------+

**Recovery**

+-----------------------------------------------------------------------+
| \# This is usually NOT an incident requiring manual recovery.         |
|                                                                       |
| \# The CAS correctly handles concurrent requests:                     |
|                                                                       |
| \# - One request succeeds (200)                                       |
|                                                                       |
| \# - All others fail with 409                                         |
|                                                                       |
| \# - The frontend retries on 409 with reloaded state                  |
|                                                                       |
| \# If a specific client is stuck in a retry loop:                     |
|                                                                       |
| \# 1. Check if the client is rate-limited:                            |
|                                                                       |
| kubectl logs -l app=offer-service \--namespace=marketeq-prod          |
| \--since=5m \\                                                        |
|                                                                       |
| \| jq \'select(.userId==\"\<problematic-userId\>\" and                |
| .errorCode==\"RATE_LIMIT_EXCEEDED\")\'                                |
|                                                                       |
| \# 2. If not rate-limited: alert the client team (or rate-limit       |
| manually).                                                            |
|                                                                       |
| \# 3. If the offer itself is in an inconsistent state:                |
|                                                                       |
| SELECT id, status FROM offer_service.offers WHERE id =                |
| \'\<offerId\>\';                                                      |
|                                                                       |
| \# If status is already ACCEPTED/DECLINED but 409 keeps occurring:    |
|                                                                       |
| \# The client is sending requests against a terminal offer.           |
|                                                                       |
| \# Frontend bug: action buttons should be hidden for terminal offers. |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **RB-08 High API Latency --- p95 \> 1 000ms**                         |
|                                                                       |
| Requests taking too long                                              |
+-----------------------------------------------------------------------+

**Step 1: Identify the slow endpoint**

+-----------------------------------------------------------------------+
| \# Find which endpoints are slowest:                                  |
|                                                                       |
| kubectl logs -l app=offer-service \--namespace=marketeq-prod          |
| \--since=10m \\                                                       |
|                                                                       |
| \| jq -r \'select(.level==\"info\" and .durationMs) \| \[.path,       |
| .durationMs\] \| \@csv\' \\                                           |
|                                                                       |
| \| awk -F, \'{path\[\$1\]+=\$2; count\[\$1\]++} END {for(p in path)   |
| print p, path\[p\]/count\[p\]}\' \\                                   |
|                                                                       |
| \| sort -k2 -rn \| head -10                                           |
|                                                                       |
| \# Common slow patterns:                                              |
|                                                                       |
| \# POST /v1/offers (\> 500ms) -\> listings-service call is slow       |
|                                                                       |
| \# GET /v1/offers/:id (\> 200ms) -\> missing DB index or N+1 query    |
|                                                                       |
| \# POST /v1/offers/:id/accept (\> 500ms) -\> DB lock contention       |
+-----------------------------------------------------------------------+

**Step 2: Check DB query performance**

+-----------------------------------------------------------------------+
| \# Check pg_stat_statements for slow queries:                         |
|                                                                       |
| \# (requires pg_stat_statements extension)                            |
|                                                                       |
| SELECT query, calls, mean_exec_time, max_exec_time                    |
|                                                                       |
| FROM pg_stat_statements                                               |
|                                                                       |
| WHERE query LIKE \'%offer_service%\'                                  |
|                                                                       |
| ORDER BY mean_exec_time DESC                                          |
|                                                                       |
| LIMIT 10;                                                             |
|                                                                       |
| \# Check for long-running queries currently executing:                |
|                                                                       |
| SELECT pid, state, wait_event, query, NOW() - query_start AS duration |
|                                                                       |
| FROM pg_stat_activity                                                 |
|                                                                       |
| WHERE datname = \'marketeq_prod\'                                     |
|                                                                       |
| AND state != \'idle\'                                                 |
|                                                                       |
| AND query NOT LIKE \'%pg_stat%\'                                      |
|                                                                       |
| ORDER BY duration DESC;                                               |
|                                                                       |
| \# If a query has been running \> 30 seconds: investigate.            |
|                                                                       |
| \# To kill a stuck query (confirm with DBA first):                    |
|                                                                       |
| \# SELECT pg_terminate_backend(\<pid\>);                              |
|                                                                       |
| \# Verify indexes are being used:                                     |
|                                                                       |
| EXPLAIN (ANALYZE, BUFFERS) SELECT id, status FROM                     |
| offer_service.offers                                                  |
|                                                                       |
| WHERE client_id = \'\...\' AND talent_id = \'\...\'                   |
|                                                                       |
| AND status IN (\'PENDING\', \'COUNTERED\');                           |
|                                                                       |
| \# Expected: \"Index Scan using idx_offers_client_talent\"            |
|                                                                       |
| \# If not: the index may be missing. Check OS-16 migrations ran.      |
+-----------------------------------------------------------------------+

**Step 3: Check downstream service latency**

+-----------------------------------------------------------------------+
| \# For POST /v1/offers (create): listings-service is called           |
| synchronously.                                                        |
|                                                                       |
| \# Check listings-service response time from offer-service logs:      |
|                                                                       |
| kubectl logs -l app=offer-service \--namespace=marketeq-prod          |
| \--since=10m \\                                                       |
|                                                                       |
| \| jq \'select(.context==\"ListingsClient\") \| {message,             |
| durationMs}\'                                                         |
|                                                                       |
| \# If listings-service is slow: escalate to listings-service on-call. |
|                                                                       |
| \# Offer creation will remain slow until listings-service recovers.   |
|                                                                       |
| \# Temporary mitigation: increase LISTINGS_TIMEOUT_MS                 |
|                                                                       |
| \# (allows more time but also means slower 503 responses on timeout)  |
|                                                                       |
| kubectl patch secret offer-service-secrets \\                         |
|                                                                       |
| \--namespace=marketeq-prod \\                                         |
|                                                                       |
| -p \'{\"stringData\":{\"LISTINGS_TIMEOUT_MS\":\"5000\"}}\'            |
|                                                                       |
| kubectl rollout restart deployment/offer-service                      |
| \--namespace=marketeq-prod                                            |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **RB-09 DB Connection Issues**                                        |
|                                                                       |
| /ready shows db=disconnected or connection pool exhausted             |
+-----------------------------------------------------------------------+

**Diagnose**

+-----------------------------------------------------------------------+
| \# Check current DB connection count:                                 |
|                                                                       |
| SELECT COUNT(\*) AS total_connections,                                |
|                                                                       |
| COUNT(\*) FILTER (WHERE state != \'idle\') AS active,                 |
|                                                                       |
| MAX(NOW() - state_change) AS longest_connection                       |
|                                                                       |
| FROM pg_stat_activity                                                 |
|                                                                       |
| WHERE datname = \'marketeq_prod\';                                    |
|                                                                       |
| \# Check offer-service pool settings:                                 |
|                                                                       |
| \# TypeORM pool defaults: min=2, max=10.                              |
|                                                                       |
| \# If active connections = max: pool is exhausted.                    |
|                                                                       |
| \# Check for long-running transactions blocking pool connections:     |
|                                                                       |
| SELECT pid, state, wait_event_type, wait_event, query, NOW() -        |
| xact_start AS txn_age                                                 |
|                                                                       |
| FROM pg_stat_activity                                                 |
|                                                                       |
| WHERE datname = \'marketeq_prod\'                                     |
|                                                                       |
| AND state = \'active\'                                                |
|                                                                       |
| AND xact_start \< NOW() - INTERVAL \'10 seconds\'                     |
|                                                                       |
| ORDER BY txn_age DESC;                                                |
+-----------------------------------------------------------------------+

**Fix: Connection pool exhaustion**

+-----------------------------------------------------------------------+
| \# Increase TypeORM pool size via environment variable:               |
|                                                                       |
| kubectl patch secret offer-service-secrets \\                         |
|                                                                       |
| \--namespace=marketeq-prod \\                                         |
|                                                                       |
| -p \'{\"stringData\":{\"DB_POOL_SIZE\":\"20\"}}\'                     |
|                                                                       |
| \# In data-source.config.ts (permanent fix):                          |
|                                                                       |
| // extra: { max: parseInt(process.env.DB_POOL_SIZE ?? \"10\", 10) }   |
|                                                                       |
| \# Restart pods to apply new pool size:                               |
|                                                                       |
| kubectl rollout restart deployment/offer-service                      |
| \--namespace=marketeq-prod                                            |
|                                                                       |
| \# If a specific transaction is stuck (blocking other queries):       |
|                                                                       |
| \# Find it:                                                           |
|                                                                       |
| SELECT pid, query FROM pg_stat_activity WHERE state = \'idle in       |
| transaction\'                                                         |
|                                                                       |
| AND NOW() - state_change \> INTERVAL \'60 seconds\';                  |
|                                                                       |
| \# Terminate the stuck connection (confirm with DBA):                 |
|                                                                       |
| \# SELECT pg_terminate_backend(\<pid\>);                              |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **RB-10 Ably Real-Time Broken --- Clients Not Receiving Live          |
| Updates**                                                             |
|                                                                       |
| offer.updated events not reaching the frontend in real-time           |
+-----------------------------------------------------------------------+

**Impact and severity**

When Ably is down, the REST API continues to work. Offer actions
(accept, decline, counter offer) still succeed via HTTP. The only impact
is that the frontend does not update automatically --- users must
refresh the page to see the new state. This is a P2 incident, not P1.

**Diagnose**

+-----------------------------------------------------------------------+
| \# Check Ably service status:                                         |
|                                                                       |
| curl -s https://status.ably.com/api/v2/status.json \| jq              |
| .status.indicator                                                     |
|                                                                       |
| \# \"none\" = all good. Anything else = Ably has an incident.         |
|                                                                       |
| \# Check Ably publish errors in offer-service logs:                   |
|                                                                       |
| kubectl logs -l app=offer-service \--namespace=marketeq-prod          |
| \--since=15m \\                                                       |
|                                                                       |
| \| jq \'select(.level==\"warn\" and (.message \|                      |
| contains(\"ably\")))\'                                                |
|                                                                       |
| \# Check /ready for Ably status:                                      |
|                                                                       |
| curl -s https://api.marketeq.com/v1/ready \| jq .checks.ably          |
|                                                                       |
| \# \"degraded\" = Ably is down. \"connected\" = Ably is up.           |
|                                                                       |
| \# Ably degraded does NOT cause /ready to return 503.                 |
|                                                                       |
| \# /ready returns 200 with status=\"degraded\".                       |
|                                                                       |
| \# No traffic is stopped. The frontend just loses real-time updates.  |
+-----------------------------------------------------------------------+

**Recovery options**

+-----------------------------------------------------------------------+
| \# Option 1: Wait for Ably to recover.                                |
|                                                                       |
| \# Ably.publish() is fire-and-forget. When Ably recovers,             |
|                                                                       |
| \# subsequent offer actions will push real-time updates again.        |
|                                                                       |
| \# Backlogged real-time events (during downtime) are NOT replayed.    |
|                                                                       |
| \# Users refresh the page to get the current state via REST.          |
|                                                                       |
| \# Option 2: If Ably is down for \> 30 minutes:                       |
|                                                                       |
| \# Publish a status banner on the frontend:                           |
|                                                                       |
| \# \"Real-time updates are currently delayed. Refresh the page to see |
| the latest offer status.\"                                            |
|                                                                       |
| \# Option 3: If Ably API key has been rotated or expired:             |
|                                                                       |
| \# Update the ABLY_API_KEY secret and restart pods:                   |
|                                                                       |
| kubectl patch secret offer-service-secrets \\                         |
|                                                                       |
| \--namespace=marketeq-prod \\                                         |
|                                                                       |
| -p \'{\"stringData\":{\"ABLY_API_KEY\":\"new-key-here\"}}\'           |
|                                                                       |
| kubectl rollout restart deployment/offer-service                      |
| \--namespace=marketeq-prod                                            |
|                                                                       |
| \# Verify Ably is working after key rotation:                         |
|                                                                       |
| curl -s https://api.marketeq.com/v1/ready \| jq .checks.ably          |
|                                                                       |
| \# Expected: \"connected\"                                            |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Reference Useful Queries --- Quick Reference**                      |
|                                                                       |
| Copy-paste queries for common diagnostic scenarios                    |
+-----------------------------------------------------------------------+

**Offer state inspection**

+-----------------------------------------------------------------------+
| \-- Full offer with all related data:                                 |
|                                                                       |
| SELECT o.id, o.status, o.rate, o.currency_code,                       |
|                                                                       |
| o.client_id, o.talent_id, o.expires_at, o.accepted_at,                |
|                                                                       |
| o.declined_at, o.withdrawn_at, o.expired_at,                          |
|                                                                       |
| co.id as co_id, co.status as co_status, co.rate as co_rate,           |
|                                                                       |
| co.submitted_by, co.expires_at as co_expires_at                       |
|                                                                       |
| FROM offer_service.offers o                                           |
|                                                                       |
| LEFT JOIN offer_service.counter_offers co                             |
|                                                                       |
| ON co.offer_id = o.id AND co.status = \'PENDING\'                     |
|                                                                       |
| WHERE o.id = \'\<offerId\>\';                                         |
|                                                                       |
| \-- All offers for a client-talent pair:                              |
|                                                                       |
| SELECT id, status, rate, created_at, accepted_at                      |
|                                                                       |
| FROM offer_service.offers                                             |
|                                                                       |
| WHERE client_id = \'\<clientId\>\' AND talent_id = \'\<talentId\>\'   |
|                                                                       |
| ORDER BY created_at DESC;                                             |
|                                                                       |
| \-- Offer history events:                                             |
|                                                                       |
| SELECT id, event_type, actor, actor_id, terms, created_at             |
|                                                                       |
| FROM offer_service.offer_history                                      |
|                                                                       |
| WHERE offer_id = \'\<offerId\>\'                                      |
|                                                                       |
| ORDER BY created_at ASC;                                              |
+-----------------------------------------------------------------------+

**Outbox inspection**

+-----------------------------------------------------------------------+
| \-- Full outbox status:                                               |
|                                                                       |
| SELECT status, COUNT(\*) FROM offer_service.outbox GROUP BY status;   |
|                                                                       |
| \-- FAILED events with details:                                       |
|                                                                       |
| SELECT id, event_type, aggregate_id, retry_count, last_error,         |
| created_at                                                            |
|                                                                       |
| FROM offer_service.outbox                                             |
|                                                                       |
| WHERE status = \'FAILED\'                                             |
|                                                                       |
| ORDER BY created_at DESC LIMIT 20;                                    |
|                                                                       |
| \-- Outbox events for a specific offer:                               |
|                                                                       |
| SELECT id, event_type, status, retry_count, processed_at              |
|                                                                       |
| FROM offer_service.outbox                                             |
|                                                                       |
| WHERE aggregate_id = \'\<offerId\>\'                                  |
|                                                                       |
| ORDER BY created_at DESC;                                             |
|                                                                       |
| \-- Reset a single FAILED event to PENDING:                           |
|                                                                       |
| UPDATE offer_service.outbox                                           |
|                                                                       |
| SET status = \'PENDING\', retry_count = 0, last_error = NULL,         |
|                                                                       |
| scheduled_at = NOW()                                                  |
|                                                                       |
| WHERE id = \'\<outboxId\>\' AND status = \'FAILED\';                  |
+-----------------------------------------------------------------------+

**Quick kubectl reference**

+-----------------------------------------------------------------------+
| \# Get all offer-service pods:                                        |
|                                                                       |
| kubectl get pods -l app=offer-service \--namespace=marketeq-prod      |
|                                                                       |
| \# Tail logs from all pods:                                           |
|                                                                       |
| kubectl logs -l app=offer-service \--namespace=marketeq-prod -f       |
| \--max-log-requests=5                                                 |
|                                                                       |
| \# Tail logs filtered to errors only:                                 |
|                                                                       |
| kubectl logs -l app=offer-service \--namespace=marketeq-prod -f \\    |
|                                                                       |
| \| jq \'select(.level==\"error\")\'                                   |
|                                                                       |
| \# Describe a pod (shows crash events):                               |
|                                                                       |
| kubectl describe pod \<pod-name\> \--namespace=marketeq-prod          |
|                                                                       |
| \# Get into a running pod for debugging:                              |
|                                                                       |
| kubectl exec -it \<pod-name\> \--namespace=marketeq-prod \-- /bin/sh  |
|                                                                       |
| \# Check deployment history (for rollback):                           |
|                                                                       |
| kubectl rollout history deployment/offer-service                      |
| \--namespace=marketeq-prod                                            |
|                                                                       |
| \# Rollback to previous version:                                      |
|                                                                       |
| kubectl rollout undo deployment/offer-service                         |
| \--namespace=marketeq-prod                                            |
|                                                                       |
| \# Scale deployment (emergency scale-up):                             |
|                                                                       |
| kubectl scale deployment/offer-service \--replicas=6                  |
| \--namespace=marketeq-prod                                            |
|                                                                       |
| \# Remember to scale back down after incident: \--replicas=3          |
+-----------------------------------------------------------------------+
