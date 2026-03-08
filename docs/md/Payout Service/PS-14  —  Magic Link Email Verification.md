**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**payout-service**

PS-14 --- Magic Link Email Verification

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        PS-14 --- Magic Link Email Verification

  **Version**         1.0

  **Applies to**      All withdrawal initiations requiring email
                      verification step. All deposit method types.

  **Token TTL**       15 minutes from generation. Hard expiry --- no
                      extension, no refresh.

  **Token storage**   SHA-256 hash only. Plain-text token never persisted
                      anywhere.

  **One-use           Token deleted from Redis on first use. Reuse
  enforcement**       returns ERR_MAGIC_LINK_ALREADY_USED.

  **Delivery**        SendGrid via notification-service. payout-service
                      publishes event --- never calls SendGrid directly.

  **Retry**           Expired or used token returns contractor to step 1
                      of withdrawal flow.

  **Prerequisites**   PS-02, notification-service
  -----------------------------------------------------------------------

# **1. Overview**

Magic link email verification is a one-time authentication step injected
into the withdrawal flow before a payout is processed. When a contractor
initiates a withdrawal, payout-service generates a cryptographically
random single-use token, hashes it with SHA-256, stores only the hash in
Redis with a 15-minute TTL, and publishes an event to
notification-service which delivers the link via SendGrid. The
contractor clicks the link in their email, the token is validated and
immediately consumed, and the withdrawal proceeds. If the link expires
or has already been used the contractor is returned to step 1 of the
withdrawal flow and must start again.

+-----------------------------------------------------------------------+
| **Plain-text token is never stored --- hash only**                    |
|                                                                       |
| The raw token exists in memory only long enough to be included in the |
| email link.                                                           |
|                                                                       |
| It is never written to any database, log, audit trail, or cache in    |
| plain text.                                                           |
|                                                                       |
| Redis stores the SHA-256 hash of the token.                           |
|                                                                       |
| If the Redis key is compromised, the hash cannot be reversed to       |
| reconstruct the link.                                                 |
|                                                                       |
| Logs must never include the token, the full magic link URL, or any    |
| derivative of the raw token.                                          |
+=======================================================================+

# **2. Full Verification Flow**

  ---------------------------------------------------------------------------------------------------------------------------------
  **Step**   **Actor**              **Action**                    **System state after**
  ---------- ---------------------- ----------------------------- -----------------------------------------------------------------
  **1**      Contractor             Submits withdrawal request    payout_requests row created with status=awaiting_verification.
                                    via POST                      magic_link_verifications row created (hashed token, expiresAt,
                                    /v1/payouts/initiate.         used=false).

  **2**      payout-service         Publishes                     Event on queue. payout-service returns 202 to frontend: {
                                    payout.magic_link.requested   payoutRequestId, status: \"awaiting_verification\", message:
                                    event to RabbitMQ.            \"Check your email to confirm this withdrawal.\" }

  **3**      notification-service   Consumes event. Calls         Email delivered. SendGrid delivery receipt stored in
                                    SendGrid. Sends magic link    notification-service.
                                    email to contractor.          

  **4**      Contractor             Receives email. Clicks magic  Browser hits GET
                                    link within 15 minutes.       /v1/payouts/verify-email?token={rawToken}&id={payoutRequestId}.

  **5**      payout-service         Hashes incoming token. Looks  If valid: token deleted from Redis. payout_requests.status →
                                    up hash in Redis. Validates:  processing.
                                    hash match, not expired, not  
                                    used.                         

  **6**      payout-service         Payout execution proceeds     Payout executes. Contractor notified of success separately.
                                    normally (PS-02 state machine 
                                    continues).                   
  ---------------------------------------------------------------------------------------------------------------------------------

# **3. Token Generation**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/magic-link/magic-link.service.ts                               |
|                                                                       |
| // Folder: /apps/payout-service/src/magic-link/                       |
|                                                                       |
| import crypto from \"crypto\";                                        |
|                                                                       |
| async generateAndStore(                                               |
|                                                                       |
| payoutRequestId: string,                                              |
|                                                                       |
| contractorId: string,                                                 |
|                                                                       |
| ): Promise\<string\> { // returns raw token --- used once to build    |
| the email URL, never stored                                           |
|                                                                       |
| // 1. Generate cryptographically random 32-byte token                 |
|                                                                       |
| const rawToken = crypto.randomBytes(32).toString(\"hex\"); // 64-char |
| hex string                                                            |
|                                                                       |
| // 2. Hash with SHA-256 --- only the hash is stored                   |
|                                                                       |
| const tokenHash = crypto                                              |
|                                                                       |
| .createHash(\"sha256\")                                               |
|                                                                       |
| .update(rawToken)                                                     |
|                                                                       |
| .digest(\"hex\");                                                     |
|                                                                       |
| const ttlSeconds = 15 \* 60; // 15 minutes --- hard, no extension     |
|                                                                       |
| const expiresAt = new Date(Date.now() + ttlSeconds \* 1000);          |
|                                                                       |
| // 3. Store hash in Redis with TTL                                    |
|                                                                       |
| // Key includes payoutRequestId to scope the token to this specific   |
| withdrawal                                                            |
|                                                                       |
| await this.redis.set(                                                 |
|                                                                       |
| \`magiclink:\${tokenHash}\`,                                          |
|                                                                       |
| JSON.stringify({                                                      |
|                                                                       |
| payoutRequestId,                                                      |
|                                                                       |
| contractorId,                                                         |
|                                                                       |
| used: false,                                                          |
|                                                                       |
| expiresAt: expiresAt.toISOString(),                                   |
|                                                                       |
| }),                                                                   |
|                                                                       |
| \"EX\", ttlSeconds,                                                   |
|                                                                       |
| );                                                                    |
|                                                                       |
| // 4. Persist verification record in DB for audit trail               |
|                                                                       |
| // DB stores hash only --- never raw token                            |
|                                                                       |
| await this.verificationRepo.save({                                    |
|                                                                       |
| payoutRequestId,                                                      |
|                                                                       |
| contractorId,                                                         |
|                                                                       |
| tokenHash,                                                            |
|                                                                       |
| expiresAt,                                                            |
|                                                                       |
| used: false,                                                          |
|                                                                       |
| createdAt: new Date(),                                                |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Raw token returned to caller --- used ONLY to build the email link |
| URL                                                                   |
|                                                                       |
| // It must not be logged, stored, or passed beyond the email          |
| composition step                                                      |
|                                                                       |
| return rawToken;                                                      |
|                                                                       |
| }                                                                     |
+=======================================================================+

  -----------------------------------------------------------------------
  **Property**          **Value**
  --------------------- -------------------------------------------------
  **Token source**      crypto.randomBytes(32) --- 256 bits of OS-level
                        entropy

  **Token format**      64-character lowercase hex string

  **Hash algorithm**    SHA-256 --- one-way, collision resistant, not
                        reversible

  **Redis key pattern** magiclink:{sha256Hash}

  **Redis TTL**         900 seconds (15 minutes). Enforced by Redis
                        natively --- no cron needed.

  **DB record**         magic_link_verifications table --- stores hash,
                        payoutRequestId, contractorId, expiresAt, used,
                        usedAt
  -----------------------------------------------------------------------

# **4. Email Delivery via notification-service**

payout-service never calls SendGrid directly. It publishes a RabbitMQ
event and notification-service owns delivery. This decouples
payout-service from email provider changes and ensures delivery retries
are handled by notification-service independently of payout execution.

## **4.1 RabbitMQ event published by payout-service**

+----------------------------------------------------------------------------------+
| typescript                                                                       |
+----------------------------------------------------------------------------------+
| // Event: payout.magic_link.requested                                            |
|                                                                                  |
| // Exchange: payout-service (direct)                                             |
|                                                                                  |
| // Routing key: payout.magic_link.requested                                      |
|                                                                                  |
| {                                                                                |
|                                                                                  |
| payoutRequestId: string, // UUID --- used to scope the token                     |
|                                                                                  |
| contractorId: string, // UUID                                                    |
|                                                                                  |
| contractorEmail: string, // Delivery address --- fetched from user-service       |
|                                                                                  |
| magicLinkUrl: string, // Full URL including raw token                            |
|                                                                                  |
| // e.g.                                                                          |
| https://app.marketeq.com/verify-withdrawal?token={rawToken}&id={payoutRequestId} |
|                                                                                  |
| expiresAt: string, // ISO 8601 --- shown in email body: \"This link expires at   |
| 10:45 AM UTC\"                                                                   |
|                                                                                  |
| amountUSD: number, // Shown in email: \"Confirm your \$250.00 withdrawal\"       |
|                                                                                  |
| methodLabel: string, // e.g. \"PayPal (john@email.com)\" --- shown in email for  |
| context                                                                          |
|                                                                                  |
| occurredAt: string, // ISO 8601                                                  |
|                                                                                  |
| }                                                                                |
+==================================================================================+

## **4.2 Email content requirements**

  -----------------------------------------------------------------------
  **Email field**       **Value**
  --------------------- -------------------------------------------------
  **Subject**           Confirm your Marketeq withdrawal --- action
                        required

  **Headline**          Confirm your withdrawal

  **Body line 1**       You requested a withdrawal of {amountUSD} to
                        {methodLabel}.

  **Body line 2**       Click the button below to confirm. This link
                        expires at {expiresAt} UTC.

  **CTA button label**  Confirm withdrawal

  **CTA URL**           magicLinkUrl from event payload

  **Security note below If you did not request this withdrawal, contact
  CTA**                 support immediately at support@marketeq.com.

  **No-action note**    If you do not confirm within 15 minutes, your
                        withdrawal request will be cancelled and your
                        balance will remain unchanged.

  **Footer**            Do not forward this email. This link can only be
                        used once.
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Raw token appears only in the email link URL --- never anywhere     |
| else**                                                                |
|                                                                       |
| The magicLinkUrl in the RabbitMQ event payload contains the raw       |
| token.                                                                |
|                                                                       |
| notification-service must treat this payload as sensitive --- it must |
| not be logged in full.                                                |
|                                                                       |
| The URL must only appear in the SendGrid API call body (the email     |
| link).                                                                |
|                                                                       |
| notification-service logs should record that a magic link email was   |
| sent to contractorId,                                                 |
|                                                                       |
| but must not log the full URL or token value.                         |
+=======================================================================+

# **5. Token Validation --- GET /v1/payouts/verify-email**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // GET /v1/payouts/verify-email?token={rawToken}&id={payoutRequestId} |
|                                                                       |
| // No auth header required --- token IS the authentication for this   |
| step                                                                  |
|                                                                       |
| async verifyMagicLink(                                                |
|                                                                       |
| rawToken: string,                                                     |
|                                                                       |
| payoutRequestId: string,                                              |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| // 1. Hash the incoming token --- never compare raw values            |
|                                                                       |
| const incomingHash = crypto                                           |
|                                                                       |
| .createHash(\"sha256\")                                               |
|                                                                       |
| .update(rawToken)                                                     |
|                                                                       |
| .digest(\"hex\");                                                     |
|                                                                       |
| // 2. Look up hash in Redis                                           |
|                                                                       |
| const raw = await this.redis.get(\`magiclink:\${incomingHash}\`);     |
|                                                                       |
| // 3. Redis key missing = expired (TTL elapsed) or never existed      |
|                                                                       |
| if (!raw) {                                                           |
|                                                                       |
| // Check DB to distinguish \"expired\" from \"never existed\" for     |
| error response                                                        |
|                                                                       |
| const dbRecord = await this.verificationRepo.findOne({                |
|                                                                       |
| where: { tokenHash: incomingHash },                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (dbRecord?.used) {                                                 |
|                                                                       |
| throw new PayoutError(                                                |
|                                                                       |
| \"This verification link has already been used.\",                    |
|                                                                       |
| HttpStatus.GONE, \"ERR_MAGIC_LINK_ALREADY_USED\",                     |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| throw new PayoutError(                                                |
|                                                                       |
| \"This verification link has expired. Please start your withdrawal    |
| again.\",                                                             |
|                                                                       |
| HttpStatus.GONE, \"ERR_MAGIC_LINK_EXPIRED\",                          |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| const session = JSON.parse(raw);                                      |
|                                                                       |
| // 4. Validate payoutRequestId matches --- prevents token             |
| substitution across requests                                          |
|                                                                       |
| if (session.payoutRequestId !== payoutRequestId) {                    |
|                                                                       |
| throw new PayoutError(                                                |
|                                                                       |
| \"Invalid verification link.\",                                       |
|                                                                       |
| HttpStatus.UNPROCESSABLE_ENTITY, \"ERR_MAGIC_LINK_INVALID\",          |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // 5. Consume token atomically --- delete from Redis before doing     |
| anything else                                                         |
|                                                                       |
| // If delete returns 0, another request consumed it first (race       |
| condition guard)                                                      |
|                                                                       |
| const deleted = await this.redis.del(\`magiclink:\${incomingHash}\`); |
|                                                                       |
| if (deleted === 0) {                                                  |
|                                                                       |
| throw new PayoutError(                                                |
|                                                                       |
| \"This verification link has already been used.\",                    |
|                                                                       |
| HttpStatus.GONE, \"ERR_MAGIC_LINK_ALREADY_USED\",                     |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // 6. Mark as used in DB audit record                                 |
|                                                                       |
| await this.verificationRepo.update(                                   |
|                                                                       |
| { tokenHash: incomingHash },                                          |
|                                                                       |
| { used: true, usedAt: new Date() },                                   |
|                                                                       |
| );                                                                    |
|                                                                       |
| // 7. Advance payout request to processing                            |
|                                                                       |
| await this.payoutRequestRepo.update(                                  |
|                                                                       |
| { id: payoutRequestId, status: PayoutStatus.AWAITING_VERIFICATION },  |
|                                                                       |
| { status: PayoutStatus.PROCESSING },                                  |
|                                                                       |
| );                                                                    |
|                                                                       |
| // 8. Trigger payout execution via RabbitMQ                           |
|                                                                       |
| await this.rabbitMQ.publish(\"payout.execution.requested\", {         |
|                                                                       |
| payoutRequestId,                                                      |
|                                                                       |
| occurredAt: new Date().toISOString(),                                 |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **6. Token States**

  -------------------------------------------------------------------------------
  **State**     **Redis key   **DB used  **How reached**    **Contractor-facing
                exists?**     flag**                        message**
  ------------- ------------- ---------- ------------------ ---------------------
  **pending**   Yes           false      Token generated.   N/A --- token not yet
                                         Email sent.        presented
                                         Awaiting click.    

  **valid**     Yes           false      Contractor clicks  Verification
                                         link within 15     succeeds. Withdrawal
                                         minutes.           proceeds.
                                         Validation in      
                                         progress.          

  **used**      No (deleted   true       Token successfully \"This link has
                on use)                  validated and      already been used.\"
                                         consumed.          (if clicked again)

  **expired**   No (TTL       false      15 minutes passed  \"This link has
                elapsed)                 with no click.     expired. Please start
                                                            your withdrawal
                                                            again.\"

  **invalid**   N/A           N/A        Token value not    \"Invalid
                                         found in Redis and verification link.\"
                                         no DB record.      
  -------------------------------------------------------------------------------

# **7. Expiry and Retry Flow**

  -----------------------------------------------------------------------
  **Scenario**          **What happens**
  --------------------- -------------------------------------------------
  **Contractor does not Redis key expires. payout_requests.status →
  click within 15       cancelled (automatic via scheduled job polling
  minutes**             AWAITING_VERIFICATION rows older than 15 min).
                        Contractor notified: \"Your withdrawal request
                        expired. Your balance is unchanged.\"

  **Contractor clicks   GET /verify-email returns ERR_MAGIC_LINK_EXPIRED
  expired link**        with HTTP 410. Frontend redirects contractor to
                        step 1 of withdrawal flow. No retry limit ---
                        contractor may initiate a new withdrawal
                        immediately.

  **Contractor clicks   GET /verify-email returns
  used link (clicked    ERR_MAGIC_LINK_ALREADY_USED with HTTP 410. If the
  twice)**              first click succeeded: payout is already in
                        processing --- second click has no effect.
                        Frontend shows: \"This link has already been
                        used. Check your payout status in the Earnings
                        tab.\"

  **Email not           Contractor can request a new magic link via POST
  received**            /v1/payouts/:id/resend-verification. This
                        invalidates the previous token (Redis key
                        deleted, DB record marked superseded) and
                        generates a new one. Rate-limited: max 3 resends
                        per payoutRequestId.

  **Contractor          Previous payout_requests row remains as
  initiates a           cancelled. New row created. New token generated.
  completely new        Fresh 15-minute window.
  withdrawal after      
  expiry**              
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // POST /v1/payouts/:id/resend-verification                           |
|                                                                       |
| // Rate limited to 3 resends per payoutRequestId                      |
|                                                                       |
| async resendVerification(                                             |
|                                                                       |
| contractorId: string,                                                 |
|                                                                       |
| payoutRequestId: string,                                              |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| const payout = await this.payoutRequestRepo.findOne({                 |
|                                                                       |
| where: {                                                              |
|                                                                       |
| id: payoutRequestId,                                                  |
|                                                                       |
| contractorId,                                                         |
|                                                                       |
| status: PayoutStatus.AWAITING_VERIFICATION,                           |
|                                                                       |
| },                                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (!payout)                                                          |
|                                                                       |
| throw new PayoutError(\"Payout not found or no longer awaiting        |
| verification.\",                                                      |
|                                                                       |
| HttpStatus.NOT_FOUND, \"ERR_PAYOUT_NOT_FOUND\");                      |
|                                                                       |
| // Check resend rate limit                                            |
|                                                                       |
| const resendCount = await this.verificationRepo.count({               |
|                                                                       |
| where: { payoutRequestId, superseded: false },                        |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (resendCount \>= 3)                                                |
|                                                                       |
| throw new PayoutError(\"Maximum verification resends reached. Please  |
| start a new withdrawal.\",                                            |
|                                                                       |
| HttpStatus.TOO_MANY_REQUESTS, \"ERR_MAGIC_LINK_RESEND_LIMIT\");       |
|                                                                       |
| // Invalidate previous token --- delete from Redis by hash lookup     |
|                                                                       |
| const previous = await this.verificationRepo.findOne({                |
|                                                                       |
| where: { payoutRequestId, used: false, superseded: false },           |
|                                                                       |
| order: { createdAt: \"DESC\" },                                       |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (previous) {                                                       |
|                                                                       |
| await this.redis.del(\`magiclink:\${previous.tokenHash}\`);           |
|                                                                       |
| await this.verificationRepo.update({ id: previous.id }, { superseded: |
| true });                                                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Generate and send new token                                        |
|                                                                       |
| const rawToken = await this.generateAndStore(payoutRequestId,         |
| contractorId);                                                        |
|                                                                       |
| await this.publishMagicLinkEvent(payout, rawToken);                   |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **8. Security Considerations**

  -----------------------------------------------------------------------
  **Threat**            **Mitigation**
  --------------------- -------------------------------------------------
  **Token enumeration   256 bits of entropy (crypto.randomBytes(32)).
  (brute-force          2\^256 possible values. Brute-force
  guessing)**           computationally infeasible.

  **Token interception  HTTPS enforced on all endpoints. Magic link URL
  in transit**          transmitted only via SendGrid TLS-encrypted
                        delivery.

  **Token stored in     Never stored in plain text. SHA-256 hash stored
  plain text**          in Redis and DB. Raw token exists in memory only
                        for the duration of event publishing.

  **Token reuse (replay Redis key deleted atomically on first successful
  attack)**             use (redis.del check). Second use returns
                        ERR_MAGIC_LINK_ALREADY_USED.

  **Race condition on   Atomic Redis DEL. Only one request can delete the
  simultaneous clicks** key --- all others get deleted=0 and are
                        rejected.

  **Token substitution  payoutRequestId embedded in Redis value and
  (using token from one validated against URL param. Token scoped to
  withdrawal for        specific withdrawal.
  another)**            

  **Email forwarding /  Footer warns against forwarding. One-use
  link sharing**        enforcement means forwarded link is useless after
                        first use. Contractor\'s email account is the
                        trust boundary.

  **Log leakage**       All logging must use contractorId and
                        payoutRequestId only. Raw token and magicLinkUrl
                        must never appear in any log output at any log
                        level.

  **Expired token still HTTP 410 response. Contractor redirected to start
  in email inbox**      a new withdrawal. Expired token cannot be
                        reactivated.

  **CSRF on verify      GET /verify-email requires the token --- no
  endpoint**            session cookie. CSRF not applicable to
                        token-authenticated endpoints.
  -----------------------------------------------------------------------

# **9. Database Table --- magic_link_verifications**

+-----------------------------------------------------------------------+
| sql                                                                   |
+-----------------------------------------------------------------------+
| \-- /apps/payout-service/src/magic-link/migrations/                   |
|                                                                       |
| CREATE TABLE magic_link_verifications (                               |
|                                                                       |
| id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| payout_request_id UUID NOT NULL REFERENCES payout_requests(id) ON     |
| DELETE CASCADE,                                                       |
|                                                                       |
| contractor_id UUID NOT NULL,                                          |
|                                                                       |
| token_hash VARCHAR(64) NOT NULL, \-- SHA-256 hex. NOT the raw token.  |
|                                                                       |
| expires_at TIMESTAMPTZ NOT NULL,                                      |
|                                                                       |
| used BOOLEAN NOT NULL DEFAULT false,                                  |
|                                                                       |
| used_at TIMESTAMPTZ,                                                  |
|                                                                       |
| superseded BOOLEAN NOT NULL DEFAULT false, \-- true if resend         |
| invalidated this token                                                |
|                                                                       |
| created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()                         |
|                                                                       |
| );                                                                    |
|                                                                       |
| CREATE UNIQUE INDEX idx_mlv_token_hash ON                             |
| magic_link_verifications(token_hash);                                 |
|                                                                       |
| CREATE INDEX idx_mlv_payout_req ON                                    |
| magic_link_verifications(payout_request_id);                          |
|                                                                       |
| CREATE INDEX idx_mlv_contractor ON                                    |
| magic_link_verifications(contractor_id);                              |
|                                                                       |
| \-- token_hash column must never be selected in application logs or   |
| debug output                                                          |
+=======================================================================+

# **10. Automatic Cancellation of Expired Payout Requests**

A scheduled job runs every 5 minutes to cancel any payout_requests rows
that have been in AWAITING_VERIFICATION status for more than 15 minutes.
This ensures the payout state machine does not leave orphaned rows in an
unresolvable state if the contractor never clicks the link.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/magic-link/expiry-cancellation.job.ts                          |
|                                                                       |
| // Runs every 5 minutes via \@nestjs/schedule \@Cron                  |
|                                                                       |
| \@Cron(\"\*/5 \* \* \* \*\")                                          |
|                                                                       |
| async cancelExpiredVerifications(): Promise\<void\> {                 |
|                                                                       |
| const cutoff = new Date(Date.now() - 15 \* 60 \* 1000);               |
|                                                                       |
| const expired = await this.payoutRequestRepo.find({                   |
|                                                                       |
| where: {                                                              |
|                                                                       |
| status: PayoutStatus.AWAITING_VERIFICATION,                           |
|                                                                       |
| createdAt: LessThan(cutoff),                                          |
|                                                                       |
| },                                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| for (const payout of expired) {                                       |
|                                                                       |
| await this.dataSource.transaction(async (em) =\> {                    |
|                                                                       |
| await em.update(PayoutRequest, payout.id, {                           |
|                                                                       |
| status: PayoutStatus.CANCELLED,                                       |
|                                                                       |
| metadata: { cancellationReason: \"magic_link_expired\" },             |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Notify contractor                                                  |
|                                                                       |
| await this.rabbitMQ.publish(\"payout.cancelled\", {                   |
|                                                                       |
| payoutRequestId: payout.id,                                           |
|                                                                       |
| contractorId: payout.contractorId,                                    |
|                                                                       |
| reason: \"magic_link_expired\",                                       |
|                                                                       |
| message: \"Your withdrawal request expired because the email link was |
| not confirmed. Your balance is unchanged.\",                          |
|                                                                       |
| occurredAt: new Date().toISOString(),                                 |
|                                                                       |
| });                                                                   |
|                                                                       |
| this.logger.log(\"Cancelled expired payout\", { payoutRequestId:      |
| payout.id });                                                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **11. Error Code Reference**

  ----------------------------------------------------------------------------------
  **Error code**                    **HTTP     **When thrown**
                                    status**   
  --------------------------------- ---------- -------------------------------------
  **ERR_MAGIC_LINK_EXPIRED**        410        Token not found in Redis and DB
                                               record shows used=false. TTL elapsed.

  **ERR_MAGIC_LINK_ALREADY_USED**   410        Redis DEL returned 0 (already
                                               consumed) or DB record shows
                                               used=true.

  **ERR_MAGIC_LINK_INVALID**        422        Token hash found no Redis or DB
                                               record. Malformed or fabricated
                                               token.

  **ERR_MAGIC_LINK_RESEND_LIMIT**   429        POST /resend-verification called more
                                               than 3 times for same
                                               payoutRequestId.

  **ERR_PAYOUT_NOT_FOUND**          404        POST /resend-verification:
                                               payoutRequestId not found or not in
                                               AWAITING_VERIFICATION status.
  ----------------------------------------------------------------------------------

# **12. References**

  -------------------------------------------------------------------------
  **Document / Resource**  **Relevant to**
  ------------------------ ------------------------------------------------
  **PS-02 --- Withdrawal   AWAITING_VERIFICATION and PROCESSING status
  Flow & Payout State      transitions. Cancellation state.
  Machine**                

  **PS-04 --- Deposit      Method context passed in magic link email
  Method Management**      (methodLabel).

  **notification-service   Owns SendGrid delivery. Consumes
  (event consumer)**       payout.magic_link.requested event.
  -------------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
payout-service PS-14 \| v1.0
