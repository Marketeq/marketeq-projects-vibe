**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**payout-service**

PS-04 --- Deposit Method Management --- API

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        PS-04 --- Deposit Method Management --- API

  **Version**         1.0

  **Endpoints**       GET, POST, PATCH, DELETE /v1/deposit-methods and
                      sub-routes

  **Method types**    BANK_STRIPE, BANK_MANUAL, PAYPAL, WISE, PAYONEER,
                      CRYPTO, MARKETEQ_DEBIT_CARD, TEQ_COIN

  **Status values**   pending, verified, failed, expired, locked (+
                      reauth_required as derived state)

  **Max methods**     5 total per contractor. Max 2 active as schedule
                      split targets.

  **Prerequisites**   PS-00, PS-01, PS-02, PS-03
  -----------------------------------------------------------------------

# **1. Endpoint Map**

  ------------------------------------------------------------------------------------------------------
  **Method**   **Path**                                      **Purpose**               **Auth**
  ------------ --------------------------------------------- ------------------------- -----------------
  **GET**      /v1/deposit-methods                           List all active deposit   JWT contractor
                                                             methods for contractor    

  **POST**     /v1/deposit-methods                           Add a new deposit method  JWT contractor
                                                             (initiates verification)  

  **GET**      /v1/deposit-methods/:id                       Get single method detail  JWT contractor +
                                                                                       ownership

  **PATCH**    /v1/deposit-methods/:id                       Update nickname or set as JWT contractor +
                                                             default                   ownership

  **DELETE**   /v1/deposit-methods/:id                       Deactivate a deposit      JWT contractor +
                                                             method                    ownership

  **POST**     /v1/deposit-methods/:id/set-default           Set method as default     JWT contractor +
                                                                                       ownership

  **GET**      /v1/deposit-methods/:id/verification-status   Poll verification status  JWT contractor +
                                                                                       ownership
  ------------------------------------------------------------------------------------------------------

# **2. Verification Status Values**

  ----------------------------------------------------------------------------------------
  **Status**            **Stored in DB?**     **Meaning**                  **Can receive
                                                                           payouts?**
  --------------------- --------------------- ---------------------------- ---------------
  **pending**           Yes ---               Method added but             No
                        verification_status   verification not complete    
                        enum                                               

  **verified**          Yes                   Method fully verified and    Yes
                                              active                       

  **failed**            Yes                   Verification attempt failed  No
                                              (wrong micro-deposit         
                                              amounts, OAuth denied, etc.) 

  **expired**           Yes                   Micro-deposit window elapsed No
                                              (10 days) without successful 
                                              verification                 

  **locked**            Yes                   3 failed micro-deposit       No
                                              attempts --- locked for 24   
                                              hours                        

  **reauth_required**   Derived --- not       OAuth token expired          No --- payout
                        stored                (PayPal/Wise/Payoneer).      blocked until
                                              Detected at payout execution re-authorised
                                              time.                        
  ----------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **reauth_required is a derived state**                                |
|                                                                       |
| reauth_required is not stored in verification_status. It is computed  |
| at payout execution time                                              |
|                                                                       |
| when the provider OAuth token refresh fails.                          |
|                                                                       |
| The frontend polls GET /v1/deposit-methods/:id/verification-status    |
| which returns                                                         |
|                                                                       |
| reauth_required as a computed field alongside the stored              |
| verificationStatus.                                                   |
|                                                                       |
| When reauth_required=true, the contractor must re-authorise via the   |
| provider OAuth flow.                                                  |
+=======================================================================+

# **3. GET /v1/deposit-methods**

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
| \"nickname\": null,                                                   |
|                                                                       |
| \"isDefault\": true,                                                  |
|                                                                       |
| \"verificationStatus\": \"verified\",                                 |
|                                                                       |
| \"reauthRequired\": false,                                            |
|                                                                       |
| \"bankCountry\": \"US\",                                              |
|                                                                       |
| \"bankCurrency\": \"USD\",                                            |
|                                                                       |
| \"createdAt\": \"2025-01-15T10:00:00Z\"                               |
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
| \"nickname\": \"Personal PayPal\",                                    |
|                                                                       |
| \"isDefault\": false,                                                 |
|                                                                       |
| \"verificationStatus\": \"verified\",                                 |
|                                                                       |
| \"reauthRequired\": false,                                            |
|                                                                       |
| \"createdAt\": \"2025-03-01T09:00:00Z\"                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| \],                                                                   |
|                                                                       |
| \"totalCount\": 2,                                                    |
|                                                                       |
| \"maxAllowed\": 5,                                                    |
|                                                                       |
| \"canAddMore\": true                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Returns is_active=true methods only. Deactivated methods are not   |
| returned.                                                             |
|                                                                       |
| // Ordered by: isDefault DESC, createdAt ASC                          |
+=======================================================================+

# **4. POST /v1/deposit-methods --- Add Method**

Creates a new deposit_methods row with verificationStatus=pending and
returns verification initiation data appropriate for the method type.
Verification is completed via a separate flow (PS-05 through PS-11).

## **4.1 Request bodies by method type**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // BANK_STRIPE --- returns Stripe Financial Connections OAuth URL     |
|                                                                       |
| { \"methodType\": \"BANK_STRIPE\" }                                   |
|                                                                       |
| // BANK_MANUAL --- returns micro-deposit verification instructions    |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"methodType\": \"BANK_MANUAL\",                                      |
|                                                                       |
| \"bankAccountName\": \"Jane Doe\",                                    |
|                                                                       |
| \"bankRoutingNumber\": \"021000021\", // US only --- encrypted at     |
| rest                                                                  |
|                                                                       |
| \"bankAccountNumber\": \"000123456789\", // encrypted, only last4     |
| stored                                                                |
|                                                                       |
| \"bankCountry\": \"US\",                                              |
|                                                                       |
| \"bankCurrency\": \"USD\"                                             |
|                                                                       |
| }                                                                     |
|                                                                       |
| // PAYPAL --- returns PayPal OAuth URL                                |
|                                                                       |
| { \"methodType\": \"PAYPAL\" }                                        |
|                                                                       |
| // WISE --- returns Wise OAuth URL                                    |
|                                                                       |
| { \"methodType\": \"WISE\" }                                          |
|                                                                       |
| // PAYONEER --- returns Payoneer OAuth URL                            |
|                                                                       |
| { \"methodType\": \"PAYONEER\" }                                      |
|                                                                       |
| // CRYPTO --- returns confirmation code challenge                     |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"methodType\": \"CRYPTO\",                                           |
|                                                                       |
| \"cryptoProvider\": \"COINBASE\",                                     |
|                                                                       |
| \"cryptoNetwork\": \"ethereum\",                                      |
|                                                                       |
| \"cryptoCurrency\": \"ETH\",                                          |
|                                                                       |
| \"cryptoAddress\": \"0xabc\...def\" // encrypted at rest              |
|                                                                       |
| }                                                                     |
|                                                                       |
| // MARKETEQ_DEBIT_CARD --- feature-flagged, 400 if disabled           |
|                                                                       |
| { \"methodType\": \"MARKETEQ_DEBIT_CARD\" }                           |
+=======================================================================+

## **4.2 Response shapes by method type**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // All method types --- base response                                 |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"depositMethodId\": \"uuid\",                                        |
|                                                                       |
| \"verificationStatus\": \"pending\",                                  |
|                                                                       |
| \"verification\": { /\* type-specific --- see below \*/ }             |
|                                                                       |
| }                                                                     |
|                                                                       |
| // BANK_STRIPE verification object                                    |
|                                                                       |
| \"verification\": {                                                   |
|                                                                       |
| \"type\": \"stripe_fc\",                                              |
|                                                                       |
| \"oauthUrl\": \"https://connect.stripe.com/oauth/authorize?\...\",    |
|                                                                       |
| \"expiresAt\": \"2025-06-10T15:15:00Z\" // 15 min OAuth state TTL     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // BANK_MANUAL verification object                                    |
|                                                                       |
| \"verification\": {                                                   |
|                                                                       |
| \"type\": \"micro_deposit\",                                          |
|                                                                       |
| \"message\": \"Two small deposits will arrive in your account within  |
| 2 business days.\",                                                   |
|                                                                       |
| \"expiresAt\": \"2025-06-20T00:00:00Z\" // 10 days                    |
|                                                                       |
| \"maxAttempts\": 3                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // PAYPAL / WISE / PAYONEER verification object                       |
|                                                                       |
| \"verification\": {                                                   |
|                                                                       |
| \"type\": \"oauth\",                                                  |
|                                                                       |
| \"oauthUrl\": \"https://www.paypal.com/connect?\...\",                |
|                                                                       |
| \"expiresAt\": \"2025-06-10T15:15:00Z\"                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| // CRYPTO verification object                                         |
|                                                                       |
| \"verification\": {                                                   |
|                                                                       |
| \"type\": \"crypto_confirm\",                                         |
|                                                                       |
| \"message\": \"A 6-digit confirmation code has been sent to your      |
| email.\",                                                             |
|                                                                       |
| \"expiresAt\": \"2025-06-10T14:30:00Z\" // 30 min                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **4.3 Add method validation**

  ------------------------------------------------------------------------------
  **Rule**                             **Error code**
  ------------------------------------ -----------------------------------------
  **Contractor already has 5 active    ERR_DEPOSIT_METHOD_LIMIT_REACHED
  methods**                            

  **methodType = TEQ_COIN or           ERR_DEPOSIT_METHOD_UNAVAILABLE
  MARKETEQ_DEBIT_CARD when feature     
  flag OFF**                           

  **BANK_MANUAL: routingNumber format  ERR_DEPOSIT_BANK_ROUTING_INVALID
  invalid (US: 9 digits)**             

  **CRYPTO: cryptoAddress format       ERR_DEPOSIT_CRYPTO_ADDRESS_INVALID
  invalid for stated network**         

  **CRYPTO: cryptoProvider not in      ERR_DEPOSIT_CRYPTO_PROVIDER_UNSUPPORTED
  supported enum**                     

  **Duplicate method: same provider    ERR_DEPOSIT_METHOD_DUPLICATE
  account already connected (e.g. same 
  PayPal email)**                      
  ------------------------------------------------------------------------------

# **5. PATCH /v1/deposit-methods/:id --- Update**

Only nickname and isDefault can be updated via PATCH. All other fields
are immutable after creation --- to change a bank account the contractor
must deactivate and add a new method.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Request body --- all fields optional                               |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"nickname\": \"My Main Bank\", // max 64 chars                       |
|                                                                       |
| \"isDefault\": true                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Setting isDefault=true:                                            |
|                                                                       |
| // 1. All other methods for this contractor: isDefault → false        |
|                                                                       |
| // 2. This method: isDefault → true                                   |
|                                                                       |
| // 3. If this method replaces a method that was the split primary:    |
|                                                                       |
| // payout_schedules.primaryMethodId updated to this method\'s id      |
|                                                                       |
| // Response 200 --- updated method object (same shape as GET /:id)    |
+=======================================================================+

  -----------------------------------------------------------------------
  **Rule**                             **Error code**
  ------------------------------------ ----------------------------------
  **Method not found or not owned by   ERR_DEPOSIT_METHOD_NOT_FOUND
  contractor**                         

  **Setting default on unverified      ERR_DEPOSIT_METHOD_UNVERIFIED ---
  method**                             cannot set unverified method as
                                       default

  **Nickname exceeds 64 characters**   ERR_DEPOSIT_NICKNAME_TOO_LONG
  -----------------------------------------------------------------------

# **6. POST /v1/deposit-methods/:id/set-default**

Convenience endpoint --- equivalent to PATCH with isDefault:true.
Provided as a dedicated route because the UI has a distinct \"Set as
default\" action separate from general editing.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| async setDefault(contractorId: string, methodId: string):             |
| Promise\<void\> {                                                     |
|                                                                       |
| const method = await this.methodRepo.findOne({                        |
|                                                                       |
| where: { id: methodId, contractorId, isActive: true },                |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (!method) throw new PayoutError(\'Deposit method not found.\',     |
|                                                                       |
| HttpStatus.NOT_FOUND, \'ERR_DEPOSIT_METHOD_NOT_FOUND\');              |
|                                                                       |
| if (method.verificationStatus !== VerificationStatus.VERIFIED)        |
|                                                                       |
| throw new PayoutError(\'Only verified methods can be set as           |
| default.\',                                                           |
|                                                                       |
| HttpStatus.UNPROCESSABLE_ENTITY, \'ERR_DEPOSIT_METHOD_UNVERIFIED\');  |
|                                                                       |
| await this.dataSource.transaction(async (em) =\> {                    |
|                                                                       |
| // Clear existing default                                             |
|                                                                       |
| await em.update(DepositMethod,                                        |
|                                                                       |
| { contractorId, isDefault: true },                                    |
|                                                                       |
| { isDefault: false }                                                  |
|                                                                       |
| );                                                                    |
|                                                                       |
| // Set new default                                                    |
|                                                                       |
| await em.update(DepositMethod, methodId, { isDefault: true });        |
|                                                                       |
| // Update schedule primary method if schedule exists                  |
|                                                                       |
| const schedule = await em.findOne(PayoutSchedule, { where: {          |
| contractorId } });                                                    |
|                                                                       |
| if (schedule && schedule.primaryMethodId !== methodId) {              |
|                                                                       |
| await em.update(PayoutSchedule, schedule.id, { primaryMethodId:       |
| methodId });                                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| await this.auditService.log({ contractorId, actorType:\'contractor\', |
|                                                                       |
| actorId: contractorId, action:\'method.set_default\',                 |
|                                                                       |
| metadata: { methodId, methodType: method.methodType } });             |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **7. DELETE /v1/deposit-methods/:id --- Deactivate**

Soft-delete only --- sets is_active=false and deactivated_at=now. Rows
are never hard-deleted. Historical payout_requests retain their
deposit_method_id reference.

  -----------------------------------------------------------------------
  **Condition**            **Behaviour**
  ------------------------ ----------------------------------------------
  **Method is not the      Deactivated cleanly. No schedule impact.
  default**                

  **Method is the default  Default cleared.
  and NOT in a split**     payout_schedules.primaryMethodId set to null.
                           Schedule payouts pause. Persistent alert
                           fires.

  **Method is the default  Default cleared. primaryMethodId set to null.
  and IS the split         secondaryMethodId set to null.
  primary**                primaryPct/secondaryPct cleared. Full split
                           reset. Payouts pause.

  **Method is the split    secondaryMethodId set to null. secondaryPct
  secondary only (not      cleared. primaryPct set to 100. Schedule
  default)**               continues with 100% to primary.

  **Method has a           Deactivation allowed --- the in-flight payout
  payout_request in        still completes against the now-deactivated
  processing status**      method. Deactivation does not cancel in-flight
                           payouts.

  **Method has a           Deactivation allowed. The pending payout will
  pending_verification     fail at execution with
  payout_request**         ERR_PAYOUT_METHOD_DEACTIVATED.
  -----------------------------------------------------------------------

## **7.1 Default removal --- full side-effect chain**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| async deactivate(contractorId: string, methodId: string):             |
| Promise\<DeactivateResponse\> {                                       |
|                                                                       |
| const method = await this.methodRepo.findOne({                        |
|                                                                       |
| where: { id: methodId, contractorId, isActive: true },                |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (!method) throw new PayoutError(\'Deposit method not found.\',     |
|                                                                       |
| HttpStatus.NOT_FOUND, \'ERR_DEPOSIT_METHOD_NOT_FOUND\');              |
|                                                                       |
| const wasDefault = method.isDefault;                                  |
|                                                                       |
| const schedule = await this.scheduleRepo.findOne({ where: {           |
| contractorId } });                                                    |
|                                                                       |
| const wasPrimary = schedule?.primaryMethodId === methodId;            |
|                                                                       |
| const wasSecondary = schedule?.secondaryMethodId === methodId;        |
|                                                                       |
| await this.dataSource.transaction(async (em) =\> {                    |
|                                                                       |
| // 1. Soft-delete the method                                          |
|                                                                       |
| await em.update(DepositMethod, methodId, {                            |
|                                                                       |
| isActive: false, isDefault: false, deactivatedAt: new Date(),         |
|                                                                       |
| });                                                                   |
|                                                                       |
| // 2. Schedule cleanup                                                |
|                                                                       |
| if (schedule) {                                                       |
|                                                                       |
| const updates: Partial\<PayoutSchedule\> = {};                        |
|                                                                       |
| if (wasPrimary) {                                                     |
|                                                                       |
| // Primary removed --- full split reset                               |
|                                                                       |
| updates.primaryMethodId = null;                                       |
|                                                                       |
| updates.secondaryMethodId = null;                                     |
|                                                                       |
| updates.primaryPct = null;                                            |
|                                                                       |
| updates.secondaryPct = null;                                          |
|                                                                       |
| } else if (wasSecondary) {                                            |
|                                                                       |
| // Secondary removed --- revert to single 100%                        |
|                                                                       |
| updates.secondaryMethodId = null;                                     |
|                                                                       |
| updates.secondaryPct = null;                                          |
|                                                                       |
| updates.primaryPct = \'100.00\';                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| if (Object.keys(updates).length) {                                    |
|                                                                       |
| await em.update(PayoutSchedule, schedule.id, updates);                |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| await this.auditService.log({ contractorId, actorType:\'contractor\', |
|                                                                       |
| actorId: contractorId, action:\'method.removed\',                     |
|                                                                       |
| metadata: { methodId, wasDefault, wasPrimary, wasSecondary } });      |
|                                                                       |
| });                                                                   |
|                                                                       |
| // 3. Publish alert event if default removed --- notification-service |
| fires persistent banner                                               |
|                                                                       |
| if (wasDefault \|\| wasPrimary) {                                     |
|                                                                       |
| await this.publisher.publishPayoutsPaused(contractorId, {             |
|                                                                       |
| reason: \'default_method_removed\',                                   |
|                                                                       |
| methodId, methodType: method.methodType,                              |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| return {                                                              |
|                                                                       |
| deactivated: true,                                                    |
|                                                                       |
| splitReset: wasPrimary,                                               |
|                                                                       |
| payoutsPaused: wasDefault \|\| wasPrimary,                            |
|                                                                       |
| message: wasDefault \|\| wasPrimary                                   |
|                                                                       |
| ? \'Your scheduled payouts have been paused. Please add or select a   |
| new default deposit method.\'                                         |
|                                                                       |
| : \'Deposit method removed.\',                                        |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **8. Max Connected Accounts**

  ----------------------------------------------------------------------------------
  **Limit**             **Value**            **Enforcement**
  --------------------- -------------------- ---------------------------------------
  **Max active methods  5                    POST /v1/deposit-methods returns 400
  per contractor**                           ERR_DEPOSIT_METHOD_LIMIT_REACHED when 5
                                             active methods exist

  **Max schedule split  2                    payout_schedules allows only
  targets**                                  primaryMethodId and secondaryMethodId
                                             --- no third method in split

  **Max default         1                    EXCLUDE constraint in deposit_methods
  methods**                                  table prevents more than one default

  **Methods that count  All is_active=true   Unverified pending methods count toward
  toward the limit**    methods regardless   the 5 limit
                        of                   
                        verificationStatus   

  **Methods that do NOT is_active=false      Deactivating a method frees a slot
  count**               (deactivated)        
                        methods              
  ----------------------------------------------------------------------------------

# **9. GET /v1/deposit-methods/:id/verification-status**

Frontend polls this endpoint while waiting for verification to complete
(micro-deposit confirmation, OAuth callback, crypto code entry). Polling
interval: 5 seconds. Stop polling when status is verified, failed,
expired, or locked.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Response 200                                                       |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"depositMethodId\": \"uuid\",                                        |
|                                                                       |
| \"verificationStatus\": \"pending\", // stored status                 |
|                                                                       |
| \"reauthRequired\": false, // computed from OAuth token freshness     |
|                                                                       |
| \"attemptsRemaining\": 3, // micro-deposit only --- null for other    |
| types                                                                 |
|                                                                       |
| \"lockedUntil\": null, // populated when status=locked                |
|                                                                       |
| \"expiresAt\": \"2025-06-20T00:00:00Z\", // micro-deposit or crypto   |
| confirm                                                               |
|                                                                       |
| \"message\": \"Waiting for micro-deposits to arrive (1--2 business    |
| days).\"                                                              |
|                                                                       |
| }                                                                     |
+=======================================================================+

  ---------------------------------------------------------------------------
  **Status returned**       **Frontend action**
  ------------------------- -------------------------------------------------
  **pending**               Continue polling every 5 seconds

  **verified**              Stop polling. Show success state. Enable method
                            for payouts.

  **failed**                Stop polling. Show failure message. Offer retry
                            or add new method.

  **expired**               Stop polling. Show expiry message. Offer to
                            re-initiate verification.

  **locked**                Stop polling. Show lock message with lockedUntil
                            timestamp. Do not allow retry until lock expires.

  **reauthRequired=true**   Show re-authorise CTA. Send contractor through
                            OAuth flow again.
  ---------------------------------------------------------------------------

# **10. References**

  -----------------------------------------------------------------------
  **Document**           **Relevant to**
  ---------------------- ------------------------------------------------
  **PS-01 --- Database   deposit_methods table, verification_status enum,
  Schema**               EXCLUDE constraint for single default

  **PS-03 --- Deposit    primaryMethodId/secondaryMethodId on
  Schedule**             payout_schedules, split reset on default removal

  **PS-05 --- Stripe     BANK_STRIPE OAuth and Financial Connections
  Bank Integration**     verification flow

  **PS-06 --- Manual     BANK_MANUAL micro-deposit flow, attempt limits,
  Bank Verification**    lock and expiry

  **PS-07 --- PayPal     PAYPAL OAuth verification and reauthRequired
  Integration**          detection

  **PS-25 --- Error      ERR_DEPOSIT\_\* codes referenced in this
  Catalog**              document
  -----------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
payout-service PS-04 \| v1.0
