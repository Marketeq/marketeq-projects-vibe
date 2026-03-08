**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**payout-service**

PS-08 --- Micro-Deposit Verification Flow

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        PS-08 --- Micro-Deposit Verification Flow

  **Version**         1.0

  **Applies to**      BANK_MANUAL (Marketeq-managed) and BANK_STRIPE
                      fallback path

  **Deposit amounts** \$0.01--\$0.99 each. Two amounts. Order-independent
                      confirmation.

  **Arrival time**    1--2 business days. Statement descriptor: MRKTEQ.

  **Attempt limit**   3 attempts. 24-hour lock after 3rd failure. 10-day
                      expiry window.

  **Prerequisites**   PS-01, PS-04, PS-05, PS-06
  -----------------------------------------------------------------------

# **1. Overview**

Micro-deposit verification proves the contractor owns the bank account.
Two small ACH credits are sent to the account. The contractor sees the
amounts on their bank statement and enters them in the UI. A successful
match sets verificationStatus=verified and enables the method for
payouts.

  ---------------------------------------------------------------------------------------------------------
  **Step**      **Actor**    **Action**                                      **DB state after**
  ------------- ------------ ----------------------------------------------- ------------------------------
  **1 ---       Contractor / POST /v1/deposit-methods with BANK_MANUAL or    deposit_methods:
  Method        Backend      BANK_STRIPE fallback path                       verificationStatus=pending.
  added**                                                                    deposit_method_verification:
                                                                             status=pending, expiresAt=+10
                                                                             days.

  **2 ---       Backend      Stripe ACH transfer created for two randomised  deposit_method_verification:
  Deposits                   amounts                                         amount_1_cents and
  initiated**                                                                amount_2_cents stored.

  **3 --- Await ---          1--2 business days. No action required.         No change.
  arrival**                                                                  

  **4 ---       Contractor   POST                                            On success:
  Contractor                 /v1/deposit-methods/:id/verify-micro-deposits   verificationStatus=verified.
  enters                                                                     On failure: attempt_count++.
  amounts**                                                                  

  **5a ---      Backend      Amounts matched. Method enabled for payouts.    deposit_methods:
  Success**                                                                  verificationStatus=verified.
                                                                             deposit_method_verification:
                                                                             status=verified.

  **5b --- 3rd  Backend      Attempt limit reached. 24h lock applied.        deposit_methods:
  failure**                                                                  verificationStatus=locked.
                                                                             deposit_method_verification:
                                                                             status=locked,
                                                                             lockedUntil=+24h.

  **5c ---      Cleanup cron Verification window elapsed without success.    deposit_methods:
  10-day                                                                     verificationStatus=expired.
  expiry**                                                                   deposit_method_verification:
                                                                             status=expired.

  **6 ---       Contractor   Must deactivate expired method and add a new    New deposit_methods row. Old
  Re-add on                  one.                                            row: is_active=false.
  expiry**                                                                   
  ---------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Two micro-deposit implementations --- key distinction**             |
|                                                                       |
| BANK_STRIPE fallback: Stripe sends the deposits and validates the     |
| amounts server-side via                                               |
|                                                                       |
| setupIntents.verifyMicrodeposits(). payout-service calls Stripe with  |
| the contractor-entered                                                |
|                                                                       |
| amounts. Stripe returns success or error.                             |
|                                                                       |
| BANK_MANUAL: payout-service sends the deposits via Stripe ACH, but    |
| stores the expected                                                   |
|                                                                       |
| amounts internally and validates locally. Stripe is only the transfer |
| mechanism --- not the                                                 |
|                                                                       |
| validation mechanism.                                                 |
|                                                                       |
| The contractor experience is identical for both paths.                |
+=======================================================================+

# **2. Amount Generation**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/methods/micro-deposit.service.ts                               |
|                                                                       |
| // Generate two distinct random amounts between \$0.01 and \$0.99     |
|                                                                       |
| // Amounts must be different --- do not allow amount1 === amount2     |
|                                                                       |
| function generateMicroDepositAmounts(): { amount1Cents: number;       |
| amount2Cents: number } {                                              |
|                                                                       |
| const amount1 = Math.floor(Math.random() \* 99) + 1; // 1--99 cents   |
|                                                                       |
| let amount2: number;                                                  |
|                                                                       |
| do {                                                                  |
|                                                                       |
| amount2 = Math.floor(Math.random() \* 99) + 1;                        |
|                                                                       |
| } while (amount2 === amount1); // ensure distinct                     |
|                                                                       |
| return { amount1Cents: amount1, amount2Cents: amount2 };              |
|                                                                       |
| }                                                                     |
|                                                                       |
| // NEVER log the generated amounts --- they are sensitive             |
| verification data.                                                    |
|                                                                       |
| // Amounts are stored in deposit_method_verification, not in          |
| application logs.                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Amounts are sensitive --- never log**                               |
|                                                                       |
| amount_1_cents and amount_2_cents must never appear in application    |
| logs or error messages.                                               |
|                                                                       |
| They are stored in the deposit_method_verification table only.        |
|                                                                       |
| The only time amounts are used outside the DB is during Stripe ACH    |
| transfer creation and                                                 |
|                                                                       |
| during contractor confirmation. Never include them in API responses   |
| or error payloads.                                                    |
+=======================================================================+

# **3. Initiation --- BANK_MANUAL Path**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| async initiateMicroDepositsManual(                                    |
|                                                                       |
| method: DepositMethod,                                                |
|                                                                       |
| decryptedAccountNumber: string,                                       |
|                                                                       |
| decryptedRoutingNumber: string,                                       |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| const { amount1Cents, amount2Cents } = generateMicroDepositAmounts(); |
|                                                                       |
| const expiresAt = new Date(Date.now() + 10 \* 24 \* 60 \* 60 \*       |
| 1000); // 10 days                                                     |
|                                                                       |
| // Save verification record BEFORE Stripe call --- if Stripe fails,   |
|                                                                       |
| // record exists and can be retried.                                  |
|                                                                       |
| await this.verificationRepo.save({                                    |
|                                                                       |
| depositMethodId: method.id,                                           |
|                                                                       |
| contractorId: method.contractorId,                                    |
|                                                                       |
| verificationType: \'micro_deposit\',                                  |
|                                                                       |
| amount1Cents,                                                         |
|                                                                       |
| amount2Cents,                                                         |
|                                                                       |
| maxAttempts: 3,                                                       |
|                                                                       |
| attemptCount: 0,                                                      |
|                                                                       |
| expiresAt,                                                            |
|                                                                       |
| status: VerificationStatus.PENDING,                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Send two separate Stripe ACH credit transfers                      |
|                                                                       |
| const stripeCustomerId = await                                        |
| this.getOrCreateStripeCustomer(method.contractorId);                  |
|                                                                       |
| for (const cents of \[amount1Cents, amount2Cents\]) {                 |
|                                                                       |
| await this.stripe.client.transfers.create({                           |
|                                                                       |
| amount: cents,                                                        |
|                                                                       |
| currency: \'usd\',                                                    |
|                                                                       |
| destination: stripeCustomerId,                                        |
|                                                                       |
| description: \'MRKTEQ\', // appears on bank statement                 |
|                                                                       |
| metadata: {                                                           |
|                                                                       |
| depositMethodId: method.id,                                           |
|                                                                       |
| purpose: \'micro_deposit_verification\',                              |
|                                                                       |
| },                                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **4. Initiation --- BANK_STRIPE Fallback Path**

For BANK_STRIPE fallback, the SetupIntent is already created during the
Financial Connections session (PS-05 §4.1). payout-service calls Stripe
to trigger micro-deposit sending, then stores a verification record
pointing to the SetupIntent ID.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| async initiateMicroDepositsStripe(                                    |
|                                                                       |
| method: DepositMethod,                                                |
|                                                                       |
| setupIntentId: string,                                                |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| const expiresAt = new Date(Date.now() + 10 \* 24 \* 60 \* 60 \*       |
| 1000);                                                                |
|                                                                       |
| // For BANK_STRIPE: amounts are generated and validated by Stripe     |
| internally.                                                           |
|                                                                       |
| // We store null for amount fields --- Stripe holds the expected      |
| values.                                                               |
|                                                                       |
| await this.verificationRepo.save({                                    |
|                                                                       |
| depositMethodId: method.id,                                           |
|                                                                       |
| contractorId: method.contractorId,                                    |
|                                                                       |
| verificationType: \'micro_deposit\',                                  |
|                                                                       |
| oauthState: setupIntentId, // SetupIntent ID used at confirmation     |
|                                                                       |
| amount1Cents: null, // Stripe holds these                             |
|                                                                       |
| amount2Cents: null,                                                   |
|                                                                       |
| maxAttempts: 3,                                                       |
|                                                                       |
| attemptCount: 0,                                                      |
|                                                                       |
| expiresAt,                                                            |
|                                                                       |
| status: VerificationStatus.PENDING,                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Trigger Stripe to send micro-deposits                              |
|                                                                       |
| await this.stripe.client.setupIntents.verifyMicrodeposits(            |
|                                                                       |
| setupIntentId,                                                        |
|                                                                       |
| { descriptor_code: \'MRKTEQ\' }                                       |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **5. Confirmation Endpoint**

## **5.1 POST /v1/deposit-methods/:id/verify-micro-deposits**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Request body                                                       |
|                                                                       |
| { \"amount1Cents\": 32, \"amount2Cents\": 67 }                        |
|                                                                       |
| // Response 200 --- success                                           |
|                                                                       |
| { \"verified\": true, \"depositMethodId\": \"uuid\" }                 |
|                                                                       |
| // Response 422 --- wrong amounts                                     |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"errorCode\": \"ERR_VERIFICATION_AMOUNTS_INCORRECT\",                |
|                                                                       |
| \"message\": \"Incorrect amounts. 2 attempt(s) remaining.\",          |
|                                                                       |
| \"attemptsLeft\": 2                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Response 429 --- locked                                            |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"errorCode\": \"ERR_VERIFICATION_LOCKED\",                           |
|                                                                       |
| \"message\": \"Too many failed attempts. You can try again after      |
| \[lockedUntil\].\",                                                   |
|                                                                       |
| \"lockedUntil\": \"2025-06-11T10:00:00Z\"                             |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Response 410 --- expired                                           |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"errorCode\": \"ERR_VERIFICATION_EXPIRED\",                          |
|                                                                       |
| \"message\": \"The verification window for this account has expired.  |
| Please remove this account and add it again.\"                        |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **5.2 Confirmation service logic**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| async confirmMicroDeposits(                                           |
|                                                                       |
| contractorId: string,                                                 |
|                                                                       |
| methodId: string,                                                     |
|                                                                       |
| dto: { amount1Cents: number; amount2Cents: number },                  |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| // 1. Load verification record                                        |
|                                                                       |
| const verification = await this.verificationRepo.findOne({            |
|                                                                       |
| where: { depositMethodId: methodId, contractorId },                   |
|                                                                       |
| order: { createdAt: \'DESC\' },                                       |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (!verification) throw new PayoutError(\'No pending verification    |
| found.\',                                                             |
|                                                                       |
| HttpStatus.NOT_FOUND, \'ERR_VERIFICATION_NOT_FOUND\');                |
|                                                                       |
| // 2. Pre-flight guards                                               |
|                                                                       |
| if (verification.status === VerificationStatus.VERIFIED)              |
|                                                                       |
| return; // idempotent --- already verified                            |
|                                                                       |
| if (verification.status === VerificationStatus.LOCKED \|\|            |
|                                                                       |
| (verification.lockedUntil && verification.lockedUntil \> new Date())) |
|                                                                       |
| throw new PayoutError(                                                |
|                                                                       |
| \`Too many failed attempts. You can try again after                   |
| \${verification.lockedUntil?.toISOString()}.\`,                       |
|                                                                       |
| HttpStatus.TOO_MANY_REQUESTS, \'ERR_VERIFICATION_LOCKED\',            |
|                                                                       |
| { lockedUntil: verification.lockedUntil });                           |
|                                                                       |
| if (verification.expiresAt \< new Date())                             |
|                                                                       |
| throw new PayoutError(                                                |
|                                                                       |
| \'The verification window for this account has expired. Please remove |
| this account and add it again.\',                                     |
|                                                                       |
| HttpStatus.GONE, \'ERR_VERIFICATION_EXPIRED\');                       |
|                                                                       |
| // 3. Validate amounts                                                |
|                                                                       |
| const method = await this.methodRepo.findOne({ where: { id: methodId  |
| } });                                                                 |
|                                                                       |
| if (method!.methodType === MethodType.BANK_STRIPE) {                  |
|                                                                       |
| await this.confirmStripe(verification, dto);                          |
|                                                                       |
| } else {                                                              |
|                                                                       |
| await this.confirmManual(verification, dto);                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Manual path --- compare against stored amounts (order-independent) |
|                                                                       |
| private async confirmManual(                                          |
|                                                                       |
| verification: DepositMethodVerification,                              |
|                                                                       |
| dto: { amount1Cents: number; amount2Cents: number },                  |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| const submitted = \[dto.amount1Cents, dto.amount2Cents\].sort((a,b)   |
| =\> a-b);                                                             |
|                                                                       |
| const expected = \[verification.amount1Cents!,                        |
| verification.amount2Cents!\].sort((a,b) =\> a-b);                     |
|                                                                       |
| const matched = submitted\[0\] === expected\[0\] && submitted\[1\]    |
| === expected\[1\];                                                    |
|                                                                       |
| if (matched) {                                                        |
|                                                                       |
| await this.applySuccess(verification);                                |
|                                                                       |
| } else {                                                              |
|                                                                       |
| await this.applyFailure(verification);                                |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Stripe path --- delegate validation to Stripe                      |
|                                                                       |
| private async confirmStripe(                                          |
|                                                                       |
| verification: DepositMethodVerification,                              |
|                                                                       |
| dto: { amount1Cents: number; amount2Cents: number },                  |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| try {                                                                 |
|                                                                       |
| await this.stripe.client.setupIntents.verifyMicrodeposits(            |
|                                                                       |
| verification.oauthState!, // SetupIntent ID                           |
|                                                                       |
| { amounts: \[dto.amount1Cents, dto.amount2Cents\] },                  |
|                                                                       |
| );                                                                    |
|                                                                       |
| await this.applySuccess(verification);                                |
|                                                                       |
| } catch (err: any) {                                                  |
|                                                                       |
| // Stripe returns invalid_request_error with code                     |
| \'incorrect_amounts\'                                                 |
|                                                                       |
| if (err?.raw?.code === \'incorrect_amounts\') {                       |
|                                                                       |
| await this.applyFailure(verification);                                |
|                                                                       |
| } else {                                                              |
|                                                                       |
| // Unexpected Stripe error --- do not charge attempt_count            |
|                                                                       |
| throw new PayoutError(\'Verification could not be completed. Please   |
| try again.\',                                                         |
|                                                                       |
| HttpStatus.SERVICE_UNAVAILABLE, \'ERR_STRIPE_UNAVAILABLE\');          |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **6. Success & Failure Application**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| private async applySuccess(verification: DepositMethodVerification):  |
| Promise\<void\> {                                                     |
|                                                                       |
| await this.dataSource.transaction(async (em) =\> {                    |
|                                                                       |
| await em.update(DepositMethodVerification, verification.id, {         |
|                                                                       |
| status: VerificationStatus.VERIFIED,                                  |
|                                                                       |
| verifiedAt: new Date(),                                               |
|                                                                       |
| });                                                                   |
|                                                                       |
| await em.update(DepositMethod, verification.depositMethodId, {        |
|                                                                       |
| verificationStatus: VerificationStatus.VERIFIED,                      |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| await this.auditService.log({                                         |
|                                                                       |
| contractorId: verification.contractorId,                              |
|                                                                       |
| actorType: \'contractor\',                                            |
|                                                                       |
| actorId: verification.contractorId,                                   |
|                                                                       |
| action: \'method.verified\',                                          |
|                                                                       |
| metadata: { depositMethodId: verification.depositMethodId,            |
| type:\'micro_deposit\' },                                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| private async applyFailure(verification: DepositMethodVerification):  |
| Promise\<void\> {                                                     |
|                                                                       |
| const newAttemptCount = verification.attemptCount + 1;                |
|                                                                       |
| const isLastAttempt = newAttemptCount \>= verification.maxAttempts;   |
|                                                                       |
| if (isLastAttempt) {                                                  |
|                                                                       |
| const lockedUntil = new Date(Date.now() + 24 \* 60 \* 60 \* 1000);    |
|                                                                       |
| await this.dataSource.transaction(async (em) =\> {                    |
|                                                                       |
| await em.update(DepositMethodVerification, verification.id, {         |
|                                                                       |
| attemptCount: newAttemptCount,                                        |
|                                                                       |
| status: VerificationStatus.LOCKED,                                    |
|                                                                       |
| lockedUntil,                                                          |
|                                                                       |
| });                                                                   |
|                                                                       |
| await em.update(DepositMethod, verification.depositMethodId, {        |
|                                                                       |
| verificationStatus: VerificationStatus.LOCKED,                        |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| throw new PayoutError(                                                |
|                                                                       |
| \`Too many failed attempts. You can try again after                   |
| \${lockedUntil.toISOString()}.\`,                                     |
|                                                                       |
| HttpStatus.TOO_MANY_REQUESTS, \'ERR_VERIFICATION_LOCKED\',            |
|                                                                       |
| { lockedUntil });                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| await this.verificationRepo.update(verification.id, { attemptCount:   |
| newAttemptCount });                                                   |
|                                                                       |
| const attemptsLeft = verification.maxAttempts - newAttemptCount;      |
|                                                                       |
| throw new PayoutError(                                                |
|                                                                       |
| \`Incorrect amounts. \${attemptsLeft} attempt(s) remaining.\`,        |
|                                                                       |
| HttpStatus.UNPROCESSABLE_ENTITY,                                      |
| \'ERR_VERIFICATION_AMOUNTS_INCORRECT\',                               |
|                                                                       |
| { attemptsLeft });                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **7. DB State Transitions**

  -----------------------------------------------------------------------------------------------------
  **From                    **To**     **Trigger**               **deposit_methods.verificationStatus
  (verification.status)**                                        after**
  ------------------------- ---------- ------------------------- --------------------------------------
  **---**                   pending    Method added ---          pending
                                       verification row created  

  **pending**               verified   Amounts matched (manual)  verified
                                       or Stripe confirmed       
                                       (Stripe path)             

  **pending**               locked     3rd failed attempt        locked

  **locked**                pending    lockedUntil has elapsed   pending (lockedUntil cleared)
                                       --- contractor retries    

  **pending**               expired    Cleanup cron ---          expired
                                       expiresAt \< now          

  **locked**                expired    Cleanup cron fires while  expired
                                       still locked --- expiry   
                                       takes precedence          
  -----------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Lock release is contractor-initiated**                              |
|                                                                       |
| When lockedUntil elapses, the status does not automatically revert to |
| pending.                                                              |
|                                                                       |
| The lock is released lazily on the next confirmation attempt.         |
|                                                                       |
| Guard in confirmMicroDeposits():                                      |
|                                                                       |
| if lockedUntil is in the past → clear lockedUntil, set                |
| status=pending, continue                                              |
|                                                                       |
| if lockedUntil is in the future → throw ERR_VERIFICATION_LOCKED       |
+=======================================================================+

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Lazy lock release --- added to the guard block in                  |
| confirmMicroDeposits()                                                |
|                                                                       |
| if (verification.status === VerificationStatus.LOCKED) {              |
|                                                                       |
| if (verification.lockedUntil && verification.lockedUntil \<= new      |
| Date()) {                                                             |
|                                                                       |
| // Lock has elapsed --- release and allow retry                       |
|                                                                       |
| await this.verificationRepo.update(verification.id, {                 |
|                                                                       |
| status: VerificationStatus.PENDING,                                   |
|                                                                       |
| lockedUntil: null,                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| await this.methodRepo.update(verification.depositMethodId, {          |
|                                                                       |
| verificationStatus: VerificationStatus.PENDING,                       |
|                                                                       |
| });                                                                   |
|                                                                       |
| verification.status = VerificationStatus.PENDING;                     |
|                                                                       |
| verification.lockedUntil = null;                                      |
|                                                                       |
| // Fall through to validation                                         |
|                                                                       |
| } else {                                                              |
|                                                                       |
| throw new PayoutError(\...); // still locked                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **8. Expiry Cleanup Cron**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Runs daily at 02:00 UTC                                            |
|                                                                       |
| // Marks all pending/locked verifications past their expiry window as |
| expired                                                               |
|                                                                       |
| \@Cron(\'0 2 \* \* \*\')                                              |
|                                                                       |
| async expireStaleVerifications(): Promise\<void\> {                   |
|                                                                       |
| const now = new Date();                                               |
|                                                                       |
| // Find all expired pending/locked verification rows                  |
|                                                                       |
| const expired = await this.verificationRepo.find({                    |
|                                                                       |
| where: \[                                                             |
|                                                                       |
| { status: VerificationStatus.PENDING, expiresAt: LessThan(now) },     |
|                                                                       |
| { status: VerificationStatus.LOCKED, expiresAt: LessThan(now) },      |
|                                                                       |
| \],                                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| for (const v of expired) {                                            |
|                                                                       |
| await this.dataSource.transaction(async (em) =\> {                    |
|                                                                       |
| await em.update(DepositMethodVerification, v.id, {                    |
|                                                                       |
| status: VerificationStatus.EXPIRED,                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| await em.update(DepositMethod, v.depositMethodId, {                   |
|                                                                       |
| verificationStatus: VerificationStatus.EXPIRED,                       |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| this.logger.info(\'Verification expired\', {                          |
|                                                                       |
| depositMethodId: v.depositMethodId,                                   |
|                                                                       |
| contractorId: v.contractorId,                                         |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Also clean up expired magic link tokens (opportunistic --- not     |
| primary location)                                                     |
|                                                                       |
| await this.mlTokenRepo.update(                                        |
|                                                                       |
| { isUsed: false, expiresAt: LessThan(now) },                          |
|                                                                       |
| { isUsed: true }                                                      |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **9. Stripe Webhook Events for Micro-Deposits**

  -----------------------------------------------------------------------------------
  **Stripe event**                **When fired**        **payout-service action**
  ------------------------------- --------------------- -----------------------------
  **setup_intent.succeeded**      Contractor confirmed  Find verification by
                                  correct amounts via   oauthState=setupIntentId.
                                  Stripe path           Call applySuccess(). Note:
                                                        contractor may have already
                                                        confirmed via API --- check
                                                        status=pending before acting
                                                        (idempotent).

  **setup_intent.setup_failed**   Stripe path:          Find verification by
                                  contractor exhausted  oauthState. If
                                  Stripe-side attempts, status=pending:
                                  or bank rejected      applyFailure() until locked,
                                  setup                 or set expired if failure
                                                        reason is terminal. Notify
                                                        contractor.

  **setup_intent.canceled**       SetupIntent cancelled Find verification by
                                  (contractor abandoned oauthState. Set
                                  flow or Stripe        status=expired (treat as
                                  timeout)              window closed). Update
                                                        deposit_methods to
                                                        verificationStatus=expired.
  -----------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Webhook vs API confirmation race**                                  |
|                                                                       |
| For BANK_STRIPE path, both the API confirmation endpoint (§5) and the |
| Stripe webhook (§9)                                                   |
|                                                                       |
| may attempt to call applySuccess() for the same verification.         |
|                                                                       |
| Guard: check verification.status === PENDING before calling           |
| applySuccess().                                                       |
|                                                                       |
| If status is already VERIFIED, applySuccess() is a no-op ---          |
| idempotent.                                                           |
|                                                                       |
| The transaction in applySuccess() uses the existing verification.id   |
| as the update target,                                                 |
|                                                                       |
| so concurrent calls will both succeed without duplication.            |
+=======================================================================+

# **10. Re-Add Flow on Expiry**

When a verification expires, the deposit_methods row is marked
verificationStatus=expired but remains is_active=true. The contractor
must explicitly remove it and add a new method. The platform does not
auto-remove expired methods because the contractor may still want to
re-verify the same account.

  -------------------------------------------------------------------------------------------------
  **Step**         **Endpoint**                                  **What happens**
  ---------------- --------------------------------------------- ----------------------------------
  **1 ---          GET                                           Returns
  Contractor sees  /v1/deposit-methods/:id/verification-status   verificationStatus=expired.
  expiry state**                                                 Message: \"The verification window
                                                                 has expired. Please remove this
                                                                 account and add it again.\"

  **2 ---          DELETE /v1/deposit-methods/:id                Method set to is_active=false. If
  Contractor                                                     it was the default: schedule
  removes expired                                                pauses, alert fires (PS-04 §7).
  method**                                                       

  **3 ---          POST /v1/deposit-methods                      New deposit_methods row created.
  Contractor adds                                                New verification row. Fresh 10-day
  same or new                                                    window starts.
  account**                                                      

  **4 --- New      Backend --- automatic                         Deposits sent within minutes of
  micro-deposits                                                 method creation. Contractor waits
  sent**                                                         1--2 business days.
  -------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Contractor cannot re-verify without re-adding**                     |
|                                                                       |
| There is no \"restart verification\" endpoint for an expired method.  |
|                                                                       |
| The contractor must DELETE and re-POST.                               |
|                                                                       |
| This is intentional: a fresh method row provides a clean audit trail  |
| and ensures                                                           |
|                                                                       |
| the bank account details are re-entered and re-encrypted.             |
|                                                                       |
| The 10-day window is generous --- expiry should be rare in practice.  |
+=======================================================================+

# **11. Frontend Polling Contract**

The frontend polls GET /v1/deposit-methods/:id/verification-status every
5 seconds while the contractor is on the verification pending screen.
The poll stops when a terminal status is returned.

  ----------------------------------------------------------------------------------------
  **verificationStatus   **attemptsRemaining**   **lockedUntil**   **Frontend action**
  returned**                                                       
  ---------------------- ----------------------- ----------------- -----------------------
  **pending**            3                       null              Show \"Waiting for
                                                                   deposits to arrive\"
                                                                   state. Continue
                                                                   polling.

  **verified**           null                    null              Stop polling. Show
                                                                   success. Enable
                                                                   \"Done\" CTA.

  **failed (not yet      2 or 1                  null              Show \"Incorrect
  locked)**                                                        amounts\" inline error.
                                                                   Allow retry.

  **locked**             0                       ISO timestamp     Stop polling. Show lock
                                                                   message with countdown
                                                                   timer. Disable form.

  **expired**            null                    null              Stop polling. Show
                                                                   expiry message. Show
                                                                   \"Remove & re-add\"
                                                                   CTA.
  ----------------------------------------------------------------------------------------

+---------------------------------------------------------------------------+
| typescript                                                                |
+---------------------------------------------------------------------------+
| // Frontend polling --- stop conditions                                   |
|                                                                           |
| const TERMINAL_STATUSES = \[\'verified\', \'expired\'\];                  |
|                                                                           |
| const POLL_INTERVAL_MS = 5_000;                                           |
|                                                                           |
| async function pollVerificationStatus(depositMethodId: string) {          |
|                                                                           |
| while (true) {                                                            |
|                                                                           |
| const result = await                                                      |
| api.get(\`/v1/deposit-methods/\${depositMethodId}/verification-status\`); |
|                                                                           |
| onStatusUpdate(result);                                                   |
|                                                                           |
| if (TERMINAL_STATUSES.includes(result.verificationStatus)) break;         |
|                                                                           |
| if (result.verificationStatus === \'locked\') break; // also terminal for |
| polling                                                                   |
|                                                                           |
| await sleep(POLL_INTERVAL_MS);                                            |
|                                                                           |
| }                                                                         |
|                                                                           |
| }                                                                         |
+===========================================================================+

# **12. Error Code Reference**

  -----------------------------------------------------------------------------------------
  **Error code**                           **HTTP     **When thrown**
                                           status**   
  ---------------------------------------- ---------- -------------------------------------
  **ERR_VERIFICATION_NOT_FOUND**           404        No verification record exists for
                                                      this deposit method and contractor

  **ERR_VERIFICATION_AMOUNTS_INCORRECT**   422        Amounts submitted do not match
                                                      expected amounts. attemptsLeft in
                                                      metadata.

  **ERR_VERIFICATION_LOCKED**              429        3rd incorrect attempt reached, or
                                                      lockedUntil still in future.
                                                      lockedUntil in metadata.

  **ERR_VERIFICATION_EXPIRED**             410        expiresAt has elapsed. Contractor
                                                      must re-add the method.

  **ERR_STRIPE_UNAVAILABLE**               503        Stripe API unreachable during
                                                      BANK_STRIPE confirmation. Attempt
                                                      count not incremented.

  **ERR_VERIFICATION_ALREADY_VERIFIED**    200        Confirmation submitted for
                                           (no-op)    already-verified method ---
                                                      idempotent success.
  -----------------------------------------------------------------------------------------

# **13. References**

  ------------------------------------------------------------------------------------------------------------------
  **Document**           **Relevant to**
  ---------------------- -------------------------------------------------------------------------------------------
  **PS-01 --- Database   deposit_method_verification table, amount_1_cents/amount_2_cents, locked_until, expires_at
  Schema**               

  **PS-04 --- Deposit    verificationStatus enum, default method removal on expiry
  Method Management**    

  **PS-05 --- Stripe     BANK_STRIPE fallback --- SetupIntent creation and oauthState field reuse
  Financial              
  Connections**          

  **PS-06 --- Manual     BANK_MANUAL method creation --- triggers initiateMicroDepositsManual()
  Bank Entry**           

  **Stripe               https://stripe.com/docs/payments/ach-debit/accept-a-payment#web-verify-with-microdeposits
  micro-deposits API**   
  ------------------------------------------------------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
payout-service PS-08 \| v1.0
