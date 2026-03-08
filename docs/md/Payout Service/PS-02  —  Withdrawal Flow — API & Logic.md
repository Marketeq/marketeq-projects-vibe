**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**payout-service**

PS-02 --- Withdrawal Flow --- API & Logic

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        PS-02 --- Withdrawal Flow --- API & Logic

  **Version**         1.0

  **Flow steps**      6 --- Amount → Speed → Method → Review → Magic Link
                      → Execution

  **Minimum           \$50.00 USD (manual). No minimum for scheduled
  withdrawal**        payouts below threshold.

  **Instant fee**     \$1.75 USD flat --- deducted from payout amount

  **Idempotency**     UUID v4 per request --- UNIQUE constraint in
                      payout_requests

  **Prerequisites**   PS-00, PS-01
  -----------------------------------------------------------------------

# **1. Withdrawal Flow Overview**

A manual withdrawal moves through 6 steps. Each step has a corresponding
API call. The frontend drives step transitions --- the backend enforces
all validation independently of frontend state.

  ----------------------------------------------------------------------------------------
  **Step**         **UI action**    **API call**                   **Backend action**
  ---------------- ---------------- ------------------------------ -----------------------
  **1 --- Amount   Contractor       POST                           Validates amount ≥
  entry**          enters amount    /v1/payouts/validate-amount    \$50, ≤ available
                                                                   balance, returns fee
                                                                   preview

  **2 --- Speed    Contractor       Included in step 1 response    Fee calculated:
  selection**      selects Standard --- no separate call           standard=\$0,
                   or Instant                                      instant=\$1.75

  **3 --- Method   Contractor       GET /v1/deposit-methods (list) Returns active verified
  selection**      selects deposit                                 methods only
                   method                                          

  **4 --- Review** Contractor       POST /v1/payouts/initiate      Creates payout_request,
                   reviews summary                                 sends magic link email,
                                                                   returns jobId

  **5 --- Magic    Contractor       GET                            Validates token,
  link             clicks email     /v1/payouts/verify?token={t}   transitions status to
  verification**   link                                            queued

  **6 ---          Automatic after  Internal --- no frontend call  Provider API called,
  Execution**      verification                                    status → processing →
                                                                   completed or failed
  ----------------------------------------------------------------------------------------

# **2. Withdrawal Request State Machine**

  -----------------------------------------------------------------------------------------------------------------
  **From state**             **To state**           **Trigger**                 **Who transitions**
  -------------------------- ---------------------- --------------------------- -----------------------------------
  **---**                    pending_verification   POST /v1/payouts/initiate   PayoutService.initiate()
                                                    succeeds                    

  **pending_verification**   queued                 GET /v1/payouts/verify ---  MagicLinkService.verify()
                                                    valid token                 

  **pending_verification**   cancelled              Contractor calls DELETE     PayoutService.cancel()
                                                    /v1/payouts/:id             

  **pending_verification**   cancelled              Magic link TTL expires (15  SchedulerService.cleanupExpired()
                                                    min) --- cleanup cron       

  **queued**                 processing             PayoutProcessor picks up    PayoutProcessor.process()
                                                    job from Bull queue         

  **queued**                 cancelled              Contractor calls DELETE     PayoutService.cancel()
                                                    /v1/payouts/:id before      
                                                    processing starts           

  **processing**             completed              Provider API returns        PayoutProcessor.handleSuccess()
                                                    success confirmation        

  **processing**             failed                 Provider rejects or 3       PayoutProcessor.handleFailure()
                                                    retries exhausted           

  **failed**                 queued                 Contractor retries (new     PayoutService.initiate() new
                                                    idempotency_key required)   request
  -----------------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **completed and failed are terminal**                                 |
|                                                                       |
| Once a payout_request reaches completed or failed, it cannot          |
| transition to any other state.                                        |
|                                                                       |
| A failed payout requires the contractor to initiate a new withdrawal  |
| (new idempotency_key).                                                |
|                                                                       |
| Retrying with the same idempotency_key always returns the original    |
| request --- no re-processing.                                         |
+=======================================================================+

# **3. Endpoint Specifications**

## **3.1 POST /v1/payouts/validate-amount**

Step 1 + 2. Validates the requested amount and returns fee previews for
both speeds. Does not create any DB record --- pure validation and
calculation.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Request body                                                       |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"amountUsd\": \"200.00\", // amount contractor wants to receive      |
| (before fee for instant)                                              |
|                                                                       |
| \"speed\": \"instant\" \| \"standard\"                                |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Response 200                                                       |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"amountUsd\": \"200.00\",                                            |
|                                                                       |
| \"speed\": \"instant\",                                               |
|                                                                       |
| \"feeUsd\": \"1.75\",                                                 |
|                                                                       |
| \"netAmountUsd\": \"198.25\", // what contractor receives after fee   |
|                                                                       |
| \"availableBalanceUsd\": \"350.00\",                                  |
|                                                                       |
| \"balanceAfterUsd\": \"150.00\", // availableBalance - amountUsd (not |
| netAmount)                                                            |
|                                                                       |
| \"meetsMinimum\": true,                                               |
|                                                                       |
| \"standardPreview\": { \"feeUsd\":\"0.00\",                           |
| \"netAmountUsd\":\"200.00\" },                                        |
|                                                                       |
| \"instantPreview\": { \"feeUsd\":\"1.75\",                            |
| \"netAmountUsd\":\"198.25\" }                                         |
|                                                                       |
| }                                                                     |
+=======================================================================+

  ---------------------------------------------------------------------------------------
  **Validation rule**      **Error code**                    **Message**
  ------------------------ --------------------------------- ----------------------------
  **amountUsd must be a    ERR_PAYOUT_INVALID_AMOUNT         The amount entered is not
  valid positive decimal**                                   valid.

  **amountUsd \>=          ERR_PAYOUT_BELOW_MINIMUM          The minimum withdrawal
  PAYOUT_MINIMUM_USD                                         amount is \$50.
  (\$50)**                                                   

  **amountUsd \<=          ERR_PAYOUT_INSUFFICIENT_BALANCE   Your available balance is
  availableBalance**                                         insufficient for this
                                                             withdrawal.

  **For instant:           ERR_PAYOUT_FEE_EXCEEDS_AMOUNT     The instant withdrawal fee
  (amountUsd - \$1.75) \>                                    exceeds the requested
  0**                                                        amount. See §3.6.

  **speed must be          ERR_PAYOUT_INVALID_SPEED          Speed must be instant or
  \"instant\" or                                             standard.
  \"standard\"**                                             
  ---------------------------------------------------------------------------------------

## **3.2 GET /v1/deposit-methods**

Step 3. Returns the contractor\'s active, verified deposit methods. Used
to populate the method selection step.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Response 200                                                       |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"methods\": \[                                                       |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"id\": \"uuid\",                                                     |
|                                                                       |
| \"methodType\": \"BANK_STRIPE\",                                      |
|                                                                       |
| \"displayLabel\": \"Chase ••••4242\",                                 |
|                                                                       |
| \"isDefault\": true,                                                  |
|                                                                       |
| \"verificationStatus\": \"verified\",                                 |
|                                                                       |
| \"bankCurrency\": \"USD\",                                            |
|                                                                       |
| \"bankCountry\": \"US\"                                               |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"id\": \"uuid\",                                                     |
|                                                                       |
| \"methodType\": \"PAYPAL\",                                           |
|                                                                       |
| \"displayLabel\": \"PayPal (jane@example.com)\",                      |
|                                                                       |
| \"isDefault\": false,                                                 |
|                                                                       |
| \"verificationStatus\": \"verified\"                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| \]                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Only returns methods where is_active=true AND                      |
| verificationStatus=verified                                           |
|                                                                       |
| // Unverified or deactivated methods are never shown in withdrawal    |
| flow                                                                  |
+=======================================================================+

## **3.3 POST /v1/payouts/initiate --- Step 4 (Review → Submit)**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Request body                                                       |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"amountUsd\": \"200.00\",                                            |
|                                                                       |
| \"speed\": \"instant\",                                               |
|                                                                       |
| \"depositMethodId\": \"uuid\",                                        |
|                                                                       |
| \"idempotencyKey\": \"uuid-v4-generated-by-frontend\"                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Response 200 --- payout_request created, magic link email sent     |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"payoutRequestId\": \"uuid\",                                        |
|                                                                       |
| \"status\": \"pending_verification\",                                 |
|                                                                       |
| \"amountUsd\": \"200.00\",                                            |
|                                                                       |
| \"feeUsd\": \"1.75\",                                                 |
|                                                                       |
| \"netAmountUsd\": \"198.25\",                                         |
|                                                                       |
| \"magicLinkSentTo\": \"j\*\*\*@example.com\", // masked email         |
|                                                                       |
| \"magicLinkExpiresAt\": \"2025-06-10T15:00:00Z\",                     |
|                                                                       |
| \"message\": \"A verification link has been sent to your email.       |
| Please click the link to confirm your withdrawal.\"                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Response 200 --- idempotency replay (same idempotencyKey)          |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"payoutRequestId\": \"uuid\", // original request                    |
|                                                                       |
| \"status\": \"pending_verification\", // original status              |
|                                                                       |
| \"replayed\": true                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **3.4 Initiate --- backend logic**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/payout/payout.service.ts --- initiate()                        |
|                                                                       |
| async initiate(contractorId: string, dto: InitiatePayoutDto):         |
| Promise\<InitiatePayoutResponse\> {                                   |
|                                                                       |
| // 1. Idempotency check --- return existing if same key               |
|                                                                       |
| const existing = await this.payoutRepo.findOne({ where: {             |
| idempotencyKey: dto.idempotencyKey } });                              |
|                                                                       |
| if (existing) return { \...this.toResponse(existing), replayed: true  |
| };                                                                    |
|                                                                       |
| // 2. Re-validate balance from earnings-service (fresh read --- never |
| cached)                                                               |
|                                                                       |
| const balance = await this.earningsClient.getBalance(contractorId);   |
|                                                                       |
| if (!balance \|\| parseFloat(balance.availableBalance) \<             |
| parseFloat(dto.amountUsd)) {                                          |
|                                                                       |
| throw new PayoutError(\'Your available balance is insufficient for    |
| this withdrawal.\',                                                   |
|                                                                       |
| HttpStatus.BAD_REQUEST, \'ERR_PAYOUT_INSUFFICIENT_BALANCE\');         |
|                                                                       |
| }                                                                     |
|                                                                       |
| // 3. Check KYC tier and hold status                                  |
|                                                                       |
| const kyc = await this.kycClient.getStatus(contractorId);             |
|                                                                       |
| if (kyc.firstPayoutHold) {                                            |
|                                                                       |
| const holdRelease = await                                             |
| this.kycClient.getFirstPayoutHoldRelease(contractorId);               |
|                                                                       |
| throw new PayoutError(                                                |
|                                                                       |
| \`Your first payout is on hold until \${holdRelease}. This is a       |
| standard verification step.\`,                                        |
|                                                                       |
| HttpStatus.UNPROCESSABLE_ENTITY, \'ERR_PAYOUT_FIRST_HOLD\');          |
|                                                                       |
| }                                                                     |
|                                                                       |
| if (kyc.suspended) {                                                  |
|                                                                       |
| throw new PayoutError(\'Your account is suspended.\',                 |
|                                                                       |
| HttpStatus.FORBIDDEN, \'ERR_PAYOUT_ACCOUNT_SUSPENDED\');              |
|                                                                       |
| }                                                                     |
|                                                                       |
| // 4. Validate deposit method ownership and verification              |
|                                                                       |
| const method = await this.methodRepo.findOne({                        |
|                                                                       |
| where: { id: dto.depositMethodId, contractorId, isActive: true },     |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (!method) throw new PayoutError(\'Deposit method not found.\',     |
|                                                                       |
| HttpStatus.NOT_FOUND, \'ERR_PAYOUT_METHOD_NOT_FOUND\');               |
|                                                                       |
| if (method.verificationStatus !== VerificationStatus.VERIFIED) {      |
|                                                                       |
| throw new PayoutError(\'This deposit method has not been verified     |
| yet.\',                                                               |
|                                                                       |
| HttpStatus.UNPROCESSABLE_ENTITY, \'ERR_PAYOUT_METHOD_UNVERIFIED\');   |
|                                                                       |
| }                                                                     |
|                                                                       |
| if (method.methodType === MethodType.TEQ_COIN &&                      |
|                                                                       |
| !this.config.get(\'FEATURE_TEQ_COIN_ENABLED\')) {                     |
|                                                                       |
| throw new PayoutError(\'This payout method is not currently           |
| available.\',                                                         |
|                                                                       |
| HttpStatus.BAD_REQUEST, \'ERR_PAYOUT_METHOD_UNAVAILABLE\');           |
|                                                                       |
| }                                                                     |
|                                                                       |
| // 5. Calculate fee                                                   |
|                                                                       |
| const feeUsd = dto.speed === \'instant\' ? INSTANT_FEE : \'0.00\';    |
|                                                                       |
| const netAmountUsd = (parseFloat(dto.amountUsd) -                     |
| parseFloat(feeUsd)).toFixed(8);                                       |
|                                                                       |
| if (parseFloat(netAmountUsd) \<= 0) {                                 |
|                                                                       |
| throw new PayoutError(\'The instant withdrawal fee exceeds the        |
| requested amount.\',                                                  |
|                                                                       |
| HttpStatus.BAD_REQUEST, \'ERR_PAYOUT_FEE_EXCEEDS_AMOUNT\');           |
|                                                                       |
| }                                                                     |
|                                                                       |
| // 6. Create payout_request and magic_link_token in a transaction     |
|                                                                       |
| return this.dataSource.transaction(async (em) =\> {                   |
|                                                                       |
| const rawToken = randomUUID();                                        |
|                                                                       |
| const tokenHash =                                                     |
| createHash(\'sha256\').update(rawToken).digest(\'hex\');              |
|                                                                       |
| const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);           |
|                                                                       |
| const mlToken = em.create(MagicLinkToken, {                           |
|                                                                       |
| contractorId, tokenHash, expiresAt,                                   |
|                                                                       |
| payoutAmountUsd: dto.amountUsd,                                       |
|                                                                       |
| depositMethodId: dto.depositMethodId,                                 |
|                                                                       |
| });                                                                   |
|                                                                       |
| await em.save(mlToken);                                               |
|                                                                       |
| const request = em.create(PayoutRequest, {                            |
|                                                                       |
| contractorId, idempotencyKey: dto.idempotencyKey,                     |
|                                                                       |
| depositMethodId: dto.depositMethodId,                                 |
|                                                                       |
| trigger: PayoutTrigger.MANUAL,                                        |
|                                                                       |
| status: PayoutStatus.PENDING_VERIFICATION,                            |
|                                                                       |
| amountUsd: dto.amountUsd,                                             |
|                                                                       |
| feeUsd, netAmountUsd,                                                 |
|                                                                       |
| magicLinkTokenId: mlToken.id,                                         |
|                                                                       |
| });                                                                   |
|                                                                       |
| await em.save(request);                                               |
|                                                                       |
| await this.auditService.log({                                         |
|                                                                       |
| contractorId, payoutRequestId: request.id,                            |
|                                                                       |
| actorType:\'contractor\', actorId: contractorId,                      |
|                                                                       |
| action:\'withdrawal.initiated\', newStatus:                           |
| PayoutStatus.PENDING_VERIFICATION,                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Send magic link email --- fire and forget (failure does not fail   |
| the request)                                                          |
|                                                                       |
| this.magicLinkService.send(contractorId, rawToken,                    |
| dto.amountUsd).catch(err =\>                                          |
|                                                                       |
| this.logger.error(\'Magic link send failed\', err.message)            |
|                                                                       |
| );                                                                    |
|                                                                       |
| return this.toInitiateResponse(request, mlToken);                     |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **3.5 GET /v1/payouts/verify?token={rawToken} --- Step 5**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| async verifyMagicLink(rawToken: string): Promise\<VerifyResponse\> {  |
|                                                                       |
| const tokenHash =                                                     |
| createHash(\'sha256\').update(rawToken).digest(\'hex\');              |
|                                                                       |
| const mlToken = await this.mlTokenRepo.findOne({                      |
|                                                                       |
| where: { tokenHash, isUsed: false },                                  |
|                                                                       |
| relations: \[\'payoutRequest\'\],                                     |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (!mlToken) throw new PayoutError(\'This link is invalid.\',        |
|                                                                       |
| HttpStatus.BAD_REQUEST, \'ERR_PAYOUT_MAGIC_LINK_INVALID\');           |
|                                                                       |
| if (mlToken.expiresAt \< new Date()) throw new PayoutError(\'This     |
| link has expired. Please initiate a new withdrawal.\',                |
|                                                                       |
| HttpStatus.BAD_REQUEST, \'ERR_PAYOUT_MAGIC_LINK_EXPIRED\');           |
|                                                                       |
| const request = mlToken.payoutRequest;                                |
|                                                                       |
| if (request.status !== PayoutStatus.PENDING_VERIFICATION) {           |
|                                                                       |
| // Already verified or cancelled --- idempotent success               |
|                                                                       |
| return { payoutRequestId: request.id, status: request.status };       |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Transition: pending_verification → queued                          |
|                                                                       |
| await this.dataSource.transaction(async (em) =\> {                    |
|                                                                       |
| await em.update(MagicLinkToken, mlToken.id, { isUsed: true, usedAt:   |
| new Date() });                                                        |
|                                                                       |
| await em.update(PayoutRequest, request.id, {                          |
|                                                                       |
| status: PayoutStatus.QUEUED,                                          |
|                                                                       |
| verifiedAt: new Date(),                                               |
|                                                                       |
| queuedAt: new Date(),                                                 |
|                                                                       |
| });                                                                   |
|                                                                       |
| await this.auditService.log({ contractorId: request.contractorId,     |
|                                                                       |
| payoutRequestId: request.id, actorType:\'contractor\',                |
|                                                                       |
| actorId: request.contractorId, action:\'magic_link.verified\',        |
|                                                                       |
| previousStatus: PayoutStatus.PENDING_VERIFICATION,                    |
|                                                                       |
| newStatus: PayoutStatus.QUEUED });                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Enqueue Bull job for async execution                               |
|                                                                       |
| await this.queue.add(\'process-payout\', { payoutRequestId:           |
| request.id }, {                                                       |
|                                                                       |
| attempts: 3,                                                          |
|                                                                       |
| backoff: { type:\'exponential\', delay:2000 },                        |
|                                                                       |
| removeOnComplete: false,                                              |
|                                                                       |
| });                                                                   |
|                                                                       |
| return { payoutRequestId: request.id, status: PayoutStatus.QUEUED,    |
|                                                                       |
| message: \'Your withdrawal has been confirmed and is being            |
| processed.\' };                                                       |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **4. Fee Deduction Calculation**

  ---------------------------------------------------------------------------
  **Speed**      **Fee**   **Deduction point**    **What earns-service is
                                                  debited**
  -------------- --------- ---------------------- ---------------------------
  **Standard**   \$0.00    No fee deduction       Full amountUsd debited from
                                                  balance

  **Instant**    \$1.75    Deducted from amount   Full amountUsd debited from
                 USD flat  before transfer        balance (fee stays with
                                                  Marketeq)
  ---------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Fee accounting**                                                    |
|                                                                       |
| The fee is deducted from the payout amount --- not from the balance   |
| separately.                                                           |
|                                                                       |
| If contractor requests \$200 instant: amountUsd=\$200, feeUsd=\$1.75, |
| netAmountUsd=\$198.25.                                                |
|                                                                       |
| earnings-service is debited \$200 (the full amountUsd) via            |
| payout.completed event.                                               |
|                                                                       |
| The contractor receives \$198.25. Marketeq retains \$1.75.            |
|                                                                       |
| The \$1.75 is never separately recorded in earnings-service --- only  |
| in payout_requests.fee_usd.                                           |
+=======================================================================+

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| const INSTANT_FEE = \'1.75\';                                         |
|                                                                       |
| const PAYOUT_MINIMUM_USD = parseFloat(process.env.PAYOUT_MINIMUM_USD  |
| ?? \'50\');                                                           |
|                                                                       |
| function calculateFee(amountUsd: string, speed:                       |
| \'instant\'\|\'standard\'): FeeResult {                               |
|                                                                       |
| const amount = parseFloat(amountUsd);                                 |
|                                                                       |
| const fee = speed === \'instant\' ? 1.75 : 0;                         |
|                                                                       |
| const net = amount - fee;                                             |
|                                                                       |
| return {                                                              |
|                                                                       |
| amountUsd: amount.toFixed(2),                                         |
|                                                                       |
| feeUsd: fee.toFixed(2),                                               |
|                                                                       |
| netAmountUsd: net.toFixed(2), // 2 dp for display; stored as 8 dp in  |
| DB                                                                    |
|                                                                       |
| valid: net \> 0,                                                      |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **5. Edge Case --- Fee Leaves \$0 or Negative Balance**

If a contractor requests an instant withdrawal where the fee equals or
exceeds the requested amount, the transaction is rejected before the
payout_request is created.

  ---------------------------------------------------------------------------------------
  **Scenario**          **Amount**   **Fee**   **Net**    **Outcome**
  --------------------- ------------ --------- ---------- -------------------------------
  **Normal instant**    \$200.00     \$1.75    \$198.25   Allowed

  **Tiny instant        \$1.75       \$1.75    \$0.00     Rejected ---
  withdrawal**                                            ERR_PAYOUT_FEE_EXCEEDS_AMOUNT

  **Below-fee instant** \$1.00       \$1.75    -\$0.75    Rejected --- also caught by
                                                          ERR_PAYOUT_BELOW_MINIMUM (\$50
                                                          min)

  **Standard --- any    \$50.00      \$0.00    \$50.00    Allowed
  amount ≥ \$50**                                         
  ---------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **ERR_PAYOUT_FEE_EXCEEDS_AMOUNT --- display rule**                    |
|                                                                       |
| User-facing message: \"The instant withdrawal fee (\$1.75) cannot be  |
| deducted from this amount.                                            |
|                                                                       |
| Use Standard speed (free) or enter an amount greater than \$1.75.\"   |
|                                                                       |
| This error should only be possible in theory --- the \$50 minimum     |
| ensures the fee is always                                             |
|                                                                       |
| less than 4% of the amount. But the check is required for correctness |
| and tested explicitly.                                                |
+=======================================================================+

# **6. Minimum Withdrawal Rules**

  -------------------------------------------------------------------------------------------
  **Context**        **Minimum**                       **Enforced where**
  ------------------ --------------------------------- --------------------------------------
  **Manual           \$50.00 USD                       POST /v1/payouts/validate-amount and
  withdrawal (UI)**                                    POST /v1/payouts/initiate
                                                       (double-checked)

  **Scheduled        Configurable threshold            PayoutScheduleEngine before initiating
  payout**           (\$50--\$1,000+) in               scheduled payout
                     payout_schedules.threshold_usd.   
                     Default \$50.                     

  **Instant          \$50.00 USD (same as manual ---   Same as manual
  withdrawal         fee is deducted after minimum     
  minimum**          check)                            

  **Split payout     No per-leg minimum --- total      PayoutService.validateSplitAmounts()
  per-leg minimum**  split amount must be ≥ \$50       
  -------------------------------------------------------------------------------------------

# **7. Idempotency Key Requirements**

  -----------------------------------------------------------------------
  **Rule**              **Detail**
  --------------------- -------------------------------------------------
  **Key format**        UUID v4 --- generated by the frontend before
                        calling POST /v1/payouts/initiate

  **Key scope**         One key per withdrawal attempt. A new attempt
                        (after cancellation or failure) requires a new
                        key.

  **Replay behaviour**  Sending the same key always returns the original
                        payout_request --- no re-processing. The
                        replayed:true flag is set on the response.

  **Key storage**       Stored in payout_requests.idempotency_key with
                        UNIQUE constraint. Duplicate inserts throw a DB
                        constraint error, caught and converted to a
                        replay response.

  **Key expiry**        No expiry --- idempotency keys are permanent.
                        This prevents late-arriving retries from creating
                        duplicates days later.

  **Collision risk**    UUID v4: 2\^122 possible values. Collision
                        probability is negligible. No additional
                        collision handling required.
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Frontend responsibility: generate idempotency key before showing   |
| the Review step.                                                      |
|                                                                       |
| // Do not generate a new key on each render --- generate once and     |
| store in component state.                                             |
|                                                                       |
| const idempotencyKey = crypto.randomUUID(); // generate on \'Review\' |
| step mount                                                            |
|                                                                       |
| // Backend idempotency catch pattern:                                 |
|                                                                       |
| try {                                                                 |
|                                                                       |
| await payoutRepo.save(newRequest);                                    |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| if (err.code === \'23505\') { // PostgreSQL unique violation          |
|                                                                       |
| const existing = await payoutRepo.findOne({ where: { idempotencyKey } |
| });                                                                   |
|                                                                       |
| return { \...toResponse(existing), replayed: true };                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| throw err;                                                            |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **8. DELETE /v1/payouts/:id --- Cancel Withdrawal**

  --------------------------------------------------------------------------------
  **Current status**         **Cancel      **Outcome**
                             allowed?**    
  -------------------------- ------------- ---------------------------------------
  **pending_verification**   Yes           Status → cancelled. Magic link token
                                           marked used. Audit log entry.

  **queued**                 Yes --- if    Status → cancelled. Bull job removed.
                             job not yet   Audit log entry.
                             picked up by  
                             processor     

  **processing**             No            409 ERR_PAYOUT_ALREADY_PROCESSING.
                                           Cannot cancel once provider API is
                                           called.

  **completed**              No            409 ERR_PAYOUT_ALREADY_COMPLETED.

  **failed**                 No            409 ERR_PAYOUT_ALREADY_FAILED. Start a
                                           new request instead.

  **cancelled**              No-op         200 returned --- already cancelled.
                                           Idempotent.
  --------------------------------------------------------------------------------

# **9. References**

  -----------------------------------------------------------------------
  **Document**           **Relevant to**
  ---------------------- ------------------------------------------------
  **PS-01 --- Database   payout_requests, magic_link_tokens,
  Schema**               deposit_methods tables

  **PS-03 --- Magic Link Full magic link generation, delivery, and
  Flow**                 validation implementation

  **PS-16 --- Instant    Fee recording, Marketeq revenue tracking, refund
  Withdrawal Fee**       policy

  **PS-17 --- KYC Tier   KYC checks in step 4 of initiate flow
  Enforcement**          

  **PS-18 --- First      firstPayoutHold flag check in initiate flow
  Payout Hold**          

  **PS-25 --- Error      All ERR_PAYOUT\_\* codes referenced in this
  Catalog**              document
  -----------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
payout-service PS-02 \| v1.0
