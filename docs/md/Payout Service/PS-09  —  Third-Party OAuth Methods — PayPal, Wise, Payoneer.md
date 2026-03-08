**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**payout-service**

PS-09 --- Third-Party OAuth Methods --- PayPal, Wise, Payoneer

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        PS-09 --- Third-Party OAuth Methods (PayPal, Wise,
                      Payoneer)

  **Version**         1.0

  **Applies to**      PAYPAL, WISE, PAYONEER method types in
                      deposit_methods

  **Auth pattern**    OAuth 2.0 Authorization Code flow for all three
                      providers

  **Token storage**   Encrypted at rest. Access + refresh token pair per
                      method.

  **Expiry handling** REAUTH_REQUIRED derived state. Contractor notified.
                      Payout blocked until re-auth.

  **Wise note**       Wise is a contractor payout destination only ---
                      not used as Marketeq internal infrastructure.

  **Prerequisites**   PS-01, PS-04
  -----------------------------------------------------------------------

# **1. Overview**

PayPal, Wise, and Payoneer are connected via OAuth 2.0 Authorization
Code flow. The contractor is redirected to the provider\'s authorization
page, authenticates, and grants Marketeq permission to initiate payouts
on their behalf. Marketeq stores the resulting access and refresh tokens
encrypted in the deposit_methods table. Tokens are used at payout
execution time to initiate the transfer.

  ----------------------------------------------------------------------------
  **Provider**   **OAuth         **Token type       **Typical     **Refresh
                 version**       stored**           access token  token TTL**
                                                    TTL**         
  -------------- --------------- ------------------ ------------- ------------
  **PayPal**     OAuth 2.0       access_token +     8 hours       60 days
                 Authorization   refresh_token                    (sliding)
                 Code                                             

  **Wise**       OAuth 2.0       access_token +     12 hours      No expiry
                 Authorization   refresh_token                    (until
                 Code                                             revoked)

  **Payoneer**   OAuth 2.0       access_token +     24 hours      90 days
                 Authorization   refresh_token                    
                 Code                                             
  ----------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Wise is a payout destination --- not internal infrastructure**      |
|                                                                       |
| Wise is used exclusively as a contractor-selected payout method.      |
|                                                                       |
| Marketeq does NOT use Wise for internal treasury operations, fee      |
| collection, or interbank transfers.                                   |
|                                                                       |
| When a contractor selects Wise as their deposit method, Marketeq      |
| initiates a payout to their                                           |
|                                                                       |
| personal Wise account using the Wise Payouts API --- authenticated    |
| with the contractor\'s own                                            |
|                                                                       |
| OAuth token, not a Marketeq platform token.                           |
|                                                                       |
| This is identical to how PayPal and Payoneer work.                    |
+=======================================================================+

# **2. Environment Variables**

  -------------------------------------------------------------------------------------------------------------------
  **Variable**                     **Description**              **Example**
  -------------------------------- ---------------------------- -----------------------------------------------------
  **PAYPAL_CLIENT_ID**             PayPal app client ID         AaBbCcDdEe\...

  **PAYPAL_CLIENT_SECRET**         PayPal app client secret     EeFfGgHh\...

  **PAYPAL_REDIRECT_URI**          OAuth callback URL for       https://api.marketeq.com/v1/oauth/paypal/callback
                                   PayPal                       

  **PAYPAL_SCOPES**                Space-separated PayPal OAuth openid email
                                   scopes                       https://uri.paypal.com/services/paypalhere

  **WISE_CLIENT_ID**               Wise app client ID           wise_client\_\...

  **WISE_CLIENT_SECRET**           Wise app client secret       wsk_live\_\...

  **WISE_REDIRECT_URI**            OAuth callback URL for Wise  https://api.marketeq.com/v1/oauth/wise/callback

  **PAYONEER_CLIENT_ID**           Payoneer app client ID       pn_client\_\...

  **PAYONEER_CLIENT_SECRET**       Payoneer app client secret   pn_secret\_\...

  **PAYONEER_REDIRECT_URI**        OAuth callback URL for       https://api.marketeq.com/v1/oauth/payoneer/callback
                                   Payoneer                     

  **OAUTH_STATE_TTL_SECONDS**      TTL for PKCE state nonce in  600
                                   Redis. Default 600 (10 min)  

  **OAUTH_TOKEN_ENCRYPTION_KEY**   AES-256-GCM key for          32-byte hex
                                   encrypting stored OAuth      
                                   tokens                       
  -------------------------------------------------------------------------------------------------------------------

# **3. Connection Flow --- All Three Providers**

  ---------------------------------------------------------------------------------------------
  **Step**     **Actor**    **Action**                           **DB / cache state after**
  ------------ ------------ ------------------------------------ ------------------------------
  **1 ---      Contractor / POST /v1/deposit-methods with        Redis: state:{nonce} =
  Initiate**   Backend      methodType=PAYPAL\|WISE\|PAYONEER.   {contractorId, methodType,
                            Backend generates OAuth              expiresAt}. deposit_methods
                            authorization URL with PKCE state    row created with
                            nonce.                               verificationStatus=pending.

  **2 ---      Frontend     Opens provider authorization URL in  No change.
  Redirect**                modal or redirect. Contractor logs   
                            in and grants permissions.           

  **3 ---      Provider →   Provider redirects to                Redis: state nonce consumed
  Callback**   Backend      /v1/oauth/{provider}/callback with   (deleted).
                            ?code={code}&state={nonce}.          

  **4 ---      Backend →    Backend POSTs to provider token      deposit_methods:
  Token        Provider     endpoint with code + client          oauthAccessToken (encrypted),
  exchange**                credentials. Receives access_token   oauthRefreshToken (encrypted),
                            and refresh_token.                   oauthTokenExpiresAt,
                                                                 verificationStatus=verified.

  **5 ---      Backend →    Backend calls provider\'s /me or     deposit_methods: accountEmail,
  Account      Provider     /profile endpoint using new          accountIdentifier (for display
  detail                    access_token to retrieve account     label).
  fetch**                   email/identifier.                    

  **6 ---      Backend →    Backend returns 201 with deposit     deposit_methods:
  Complete**   Frontend     method details. Frontend shows       is_active=true,
                            success toast.                       verificationStatus=verified.
  ---------------------------------------------------------------------------------------------

# **4. Initiation --- POST /v1/deposit-methods**

## **4.1 Request**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Request body --- identical structure for all three providers       |
|                                                                       |
| { \"methodType\": \"PAYPAL\" } // or \"WISE\" \| \"PAYONEER\"         |
|                                                                       |
| // Response 201 --- OAuth redirect URL returned to frontend           |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"depositMethodId\": \"uuid\", // created in pending state            |
|                                                                       |
| \"redirectUrl\": \"https://www.paypal.com/signin/authorize?\...\",    |
|                                                                       |
| \"provider\": \"PAYPAL\"                                              |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **4.2 Initiation service logic**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| async initiateOAuth(                                                  |
|                                                                       |
| contractorId: string,                                                 |
|                                                                       |
| methodType: MethodType.PAYPAL \| MethodType.WISE \|                   |
| MethodType.PAYONEER,                                                  |
|                                                                       |
| ): Promise\<{ depositMethodId: string; redirectUrl: string }\> {      |
|                                                                       |
| // Enforce 5-method limit before creating row                         |
|                                                                       |
| const activeCount = await this.methodRepo.count({                     |
|                                                                       |
| where: { contractorId, isActive: true },                              |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (activeCount \>= 5)                                                |
|                                                                       |
| throw new PayoutError(\'Maximum 5 active deposit methods allowed.\',  |
|                                                                       |
| HttpStatus.UNPROCESSABLE_ENTITY,                                      |
| \'ERR_DEPOSIT_METHOD_LIMIT_REACHED\');                                |
|                                                                       |
| // Generate PKCE state nonce --- stored in Redis with 10-min TTL      |
|                                                                       |
| const nonce = crypto.randomUUID();                                    |
|                                                                       |
| await this.redis.set(                                                 |
|                                                                       |
| \`state:\${nonce}\`,                                                  |
|                                                                       |
| JSON.stringify({ contractorId, methodType }),                         |
|                                                                       |
| \'EX\', parseInt(process.env.OAUTH_STATE_TTL_SECONDS ?? \'600\'),     |
|                                                                       |
| );                                                                    |
|                                                                       |
| // Create deposit_methods row in pending state                        |
|                                                                       |
| const method = await this.methodRepo.save({                           |
|                                                                       |
| contractorId,                                                         |
|                                                                       |
| methodType,                                                           |
|                                                                       |
| verificationStatus: VerificationStatus.PENDING,                       |
|                                                                       |
| isActive: true,                                                       |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Build provider-specific authorization URL                          |
|                                                                       |
| const redirectUrl = this.oauthService.buildAuthUrl(methodType,        |
| nonce);                                                               |
|                                                                       |
| return { depositMethodId: method.id, redirectUrl };                   |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **5. OAuth Callback --- GET /v1/oauth/:provider/callback**

## **5.1 Route**

+------------------------------------------------------------------------+
| typescript                                                             |
+------------------------------------------------------------------------+
| // Three routes --- one per provider                                   |
|                                                                        |
| GET /v1/oauth/paypal/callback?code={code}&state={nonce}                |
|                                                                        |
| GET /v1/oauth/wise/callback?code={code}&state={nonce}                  |
|                                                                        |
| GET /v1/oauth/payoneer/callback?code={code}&state={nonce}              |
|                                                                        |
| // On success: redirect to frontend with result                        |
|                                                                        |
| // →                                                                   |
| https://app.marketeq.com/settings/payouts?oauth=success&methodId={id}  |
|                                                                        |
| // On failure: redirect to frontend with error                         |
|                                                                        |
| // →                                                                   |
| https://app.marketeq.com/settings/payouts?oauth=error&code={errorCode} |
+========================================================================+

## **5.2 Callback handler**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| async handleOAuthCallback(                                            |
|                                                                       |
| provider: \'paypal\' \| \'wise\' \| \'payoneer\',                     |
|                                                                       |
| code: string,                                                         |
|                                                                       |
| state: string,                                                        |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| // 1. Validate state nonce                                            |
|                                                                       |
| const raw = await this.redis.get(\`state:\${state}\`);                |
|                                                                       |
| if (!raw) throw new PayoutError(\'Invalid or expired OAuth state.\',  |
|                                                                       |
| HttpStatus.BAD_REQUEST, \'ERR_OAUTH_STATE_INVALID\');                 |
|                                                                       |
| const { contractorId, methodType } = JSON.parse(raw);                 |
|                                                                       |
| await this.redis.del(\`state:\${state}\`); // consume --- one-time    |
| use                                                                   |
|                                                                       |
| // 2. Exchange code for tokens                                        |
|                                                                       |
| const tokens = await this.oauthService.exchangeCode(provider, code);  |
|                                                                       |
| // tokens = { accessToken, refreshToken, expiresAt }                  |
|                                                                       |
| // 3. Fetch account details from provider                             |
|                                                                       |
| const profile = await this.oauthService.fetchProfile(provider,        |
| tokens.accessToken);                                                  |
|                                                                       |
| // profile = { email, accountIdentifier, displayName }                |
|                                                                       |
| // 4. Encrypt tokens before storage                                   |
|                                                                       |
| const encryptedAccess = this.encrypt(tokens.accessToken);             |
|                                                                       |
| const encryptedRefresh = this.encrypt(tokens.refreshToken);           |
|                                                                       |
| // 5. Find the pending deposit_methods row for this contractor + type |
|                                                                       |
| const method = await this.methodRepo.findOne({                        |
|                                                                       |
| where: { contractorId, methodType, verificationStatus:                |
| VerificationStatus.PENDING },                                         |
|                                                                       |
| order: { createdAt: \'DESC\' },                                       |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (!method) throw new PayoutError(\'No pending method found.\',      |
|                                                                       |
| HttpStatus.NOT_FOUND, \'ERR_DEPOSIT_METHOD_NOT_FOUND\');              |
|                                                                       |
| // 6. Persist in transaction                                          |
|                                                                       |
| await this.dataSource.transaction(async (em) =\> {                    |
|                                                                       |
| await em.update(DepositMethod, method.id, {                           |
|                                                                       |
| oauthAccessToken: encryptedAccess,                                    |
|                                                                       |
| oauthRefreshToken: encryptedRefresh,                                  |
|                                                                       |
| oauthTokenExpiresAt: tokens.expiresAt,                                |
|                                                                       |
| accountEmail: profile.email,                                          |
|                                                                       |
| accountIdentifier: profile.accountIdentifier,                         |
|                                                                       |
| verificationStatus: VerificationStatus.VERIFIED,                      |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **6. Token Storage & Encryption**

  -----------------------------------------------------------------------------------
  **Field**                 **Stored as**   **Encrypted**   **Notes**
  ------------------------- --------------- --------------- -------------------------
  **oauthAccessToken**      TEXT            Yes ---         iv:tag:ciphertext hex
                                            AES-256-GCM     format. Never logged.

  **oauthRefreshToken**     TEXT            Yes ---         Same format. Longer-lived
                                            AES-256-GCM     --- treat as a secret.

  **oauthTokenExpiresAt**   TIMESTAMPTZ     No              Used to detect expiry
                                                            before payout execution.

  **accountEmail**          VARCHAR(255)    No              Shown in UI as account
                                                            identifier (e.g.
                                                            \"john@email.com\").

  **accountIdentifier**     VARCHAR(255)    No              Provider account ID if
                                                            different from email.
                                                            Used for payout API
                                                            calls.
  -----------------------------------------------------------------------------------

+----------------------------------------------------------------------------------+
| typescript                                                                       |
+----------------------------------------------------------------------------------+
| // Encryption helper --- same pattern as bank account fields in PS-06            |
|                                                                                  |
| private encrypt(plaintext: string): string {                                     |
|                                                                                  |
| const key = Buffer.from(process.env.OAUTH_TOKEN_ENCRYPTION_KEY!, \'hex\');       |
|                                                                                  |
| const iv = crypto.randomBytes(12);                                               |
|                                                                                  |
| const cipher = crypto.createCipheriv(\'aes-256-gcm\', key, iv);                  |
|                                                                                  |
| const ct = Buffer.concat(\[cipher.update(plaintext, \'utf8\'),                   |
| cipher.final()\]);                                                               |
|                                                                                  |
| const tag = cipher.getAuthTag();                                                 |
|                                                                                  |
| return                                                                           |
| \`\${iv.toString(\'hex\')}:\${tag.toString(\'hex\')}:\${ct.toString(\'hex\')}\`; |
|                                                                                  |
| }                                                                                |
|                                                                                  |
| private decrypt(stored: string): string {                                        |
|                                                                                  |
| const \[ivHex, tagHex, ctHex\] = stored.split(\':\');                            |
|                                                                                  |
| const key = Buffer.from(process.env.OAUTH_TOKEN_ENCRYPTION_KEY!, \'hex\');       |
|                                                                                  |
| const decipher = crypto.createDecipheriv(\'aes-256-gcm\',                        |
|                                                                                  |
| key, Buffer.from(ivHex, \'hex\'));                                               |
|                                                                                  |
| decipher.setAuthTag(Buffer.from(tagHex, \'hex\'));                               |
|                                                                                  |
| return decipher.update(Buffer.from(ctHex, \'hex\')).toString(\'utf8\') +         |
|                                                                                  |
| decipher.final(\'utf8\');                                                        |
|                                                                                  |
| }                                                                                |
+==================================================================================+

# **7. Token Refresh Logic**

Access tokens are refreshed proactively before payout execution.
payout-service never attempts a payout with an expired access token. The
refresh happens in the pre-execution guard inside PayoutExecutor.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/execution/token-refresh.service.ts                             |
|                                                                       |
| // Called by PayoutExecutor before every OAuth-based payout           |
|                                                                       |
| async ensureFreshToken(method: DepositMethod): Promise\<string\> {    |
|                                                                       |
| const now = new Date();                                               |
|                                                                       |
| const bufferMs = 5 \* 60 \* 1000; // refresh if expiring within 5     |
| minutes                                                               |
|                                                                       |
| const expiresAt = method.oauthTokenExpiresAt;                         |
|                                                                       |
| if (expiresAt && expiresAt.getTime() - now.getTime() \> bufferMs) {   |
|                                                                       |
| // Token still valid --- decrypt and return                           |
|                                                                       |
| return this.decrypt(method.oauthAccessToken!);                        |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Token expired or expiring soon --- attempt refresh                 |
|                                                                       |
| const refreshToken = this.decrypt(method.oauthRefreshToken!);         |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const refreshed = await this.oauthService.refreshToken(               |
|                                                                       |
| method.methodType, refreshToken                                       |
|                                                                       |
| );                                                                    |
|                                                                       |
| // refreshed = { accessToken, refreshToken?, expiresAt }              |
|                                                                       |
| // Some providers issue a new refresh token on refresh --- store it   |
| if present                                                            |
|                                                                       |
| await this.methodRepo.update(method.id, {                             |
|                                                                       |
| oauthAccessToken: this.encrypt(refreshed.accessToken),                |
|                                                                       |
| oauthRefreshToken: refreshed.refreshToken                             |
|                                                                       |
| ? this.encrypt(refreshed.refreshToken)                                |
|                                                                       |
| : method.oauthRefreshToken, // keep existing if not rotated           |
|                                                                       |
| oauthTokenExpiresAt: refreshed.expiresAt,                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| return refreshed.accessToken;                                         |
|                                                                       |
| } catch (err: any) {                                                  |
|                                                                       |
| // Refresh failed --- token is revoked or expired beyond recovery     |
|                                                                       |
| await this.applyReauthRequired(method);                               |
|                                                                       |
| throw new PayoutError(                                                |
|                                                                       |
| \'Your PayPal/Wise/Payoneer connection needs to be re-authorized.\',  |
|                                                                       |
| HttpStatus.UNAUTHORIZED, \'ERR_OAUTH_REAUTH_REQUIRED\',               |
|                                                                       |
| { depositMethodId: method.id }                                        |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

  ----------------------------------------------------------------------------
  **Provider**   **Refresh token       **Refresh failure     **Recovery**
                 rotation**            reason**              
  -------------- --------------------- --------------------- -----------------
  **PayPal**     No rotation --- same  Contractor revoked    REAUTH_REQUIRED
                 refresh token reused  access in PayPal      --- contractor
                                       settings, or refresh  must reconnect
                                       token expired after   
                                       60 days of inactivity 

  **Wise**       No rotation           Contractor revoked    REAUTH_REQUIRED
                                       access in Wise        --- contractor
                                       settings              must reconnect

  **Payoneer**   May issue new refresh Refresh token expired REAUTH_REQUIRED
                 token on refresh      after 90 days of      --- contractor
                                       inactivity            must reconnect
  ----------------------------------------------------------------------------

# **8. REAUTH_REQUIRED State**

REAUTH_REQUIRED is a derived state --- it is not stored as a
verificationStatus enum value in the DB. It is computed at runtime when
a token refresh fails. When applied, it sets a dedicated boolean flag on
the deposit_methods row, pauses payouts to that method, and triggers a
notification.

## **8.1 applyReauthRequired()**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| private async applyReauthRequired(method: DepositMethod):             |
| Promise\<void\> {                                                     |
|                                                                       |
| await this.dataSource.transaction(async (em) =\> {                    |
|                                                                       |
| await em.update(DepositMethod, method.id, {                           |
|                                                                       |
| reauthRequired: true, // boolean column on deposit_methods            |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Publish notification event                                         |
|                                                                       |
| await this.rabbitMQ.publish(\'payout.method.reauth_required\', {      |
|                                                                       |
| contractorId: method.contractorId,                                    |
|                                                                       |
| depositMethodId: method.id,                                           |
|                                                                       |
| provider: method.methodType, // PAYPAL \| WISE \| PAYONEER            |
|                                                                       |
| accountEmail: method.accountEmail,                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| await this.auditService.log({                                         |
|                                                                       |
| contractorId: method.contractorId,                                    |
|                                                                       |
| actorType: \'system\',                                                |
|                                                                       |
| actorId: \'payout-service\',                                          |
|                                                                       |
| action: \'method.reauth_required\',                                   |
|                                                                       |
| metadata: { depositMethodId: method.id, provider: method.methodType   |
| },                                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **8.2 Effect on payouts**

  -----------------------------------------------------------------------
  **Scenario**              **Behaviour**
  ------------------------- ---------------------------------------------
  **Scheduled payout fires  Payout skipped for this method. If this is
  while                     the only active method: schedule pauses
  reauthRequired=true**     entirely. Contractor receives persistent
                            alert.

  **Manual withdrawal       POST /v1/payouts/initiate returns 422
  attempted to a            ERR_PAYOUT_METHOD_REAUTH_REQUIRED. Contractor
  reauthRequired method**   directed to re-authorize.

  **reauthRequired method   Schedule pauses. secondaryMethodId cleared.
  is the split primary**    Full split reset (same logic as default
                            method removed --- PS-04 §7).

  **reauthRequired method   Schedule continues with 100% to primary.
  is the split secondary    secondaryMethodId cleared.
  only**                    
  -----------------------------------------------------------------------

## **8.3 Re-authorization flow**

  -----------------------------------------------------------------------------------------------
  **Step**       **Endpoint**                                  **What happens**
  -------------- --------------------------------------------- ----------------------------------
  **1 ---        GET                                           Returns reauthRequired=true.
  Contractor     /v1/deposit-methods/:id/verification-status   Message: \"Your \[Provider\]
  sees reauth                                                  connection has expired. Please
  alert**                                                      reconnect your account.\"

  **2 ---        POST /v1/deposit-methods/:id/reauthorize      Generates new OAuth authorization
  Contractor                                                   URL. State nonce stored in Redis.
  initiates                                                    Returns redirectUrl. Does NOT
  re-auth**                                                    create a new deposit_methods row.

  **3 ---        Provider OAuth flow                           Same as initial connection (§3
  Contractor                                                   steps 2--4).
  authorizes**                                                 

  **4 ---        GET /v1/oauth/:provider/callback              New tokens stored. reauthRequired
  Callback                                                     set to false. Payouts resume
  received**                                                   automatically.
  -----------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // POST /v1/deposit-methods/:id/reauthorize                           |
|                                                                       |
| // Re-generates OAuth URL for an existing method without creating a   |
| new row                                                               |
|                                                                       |
| async reauthorize(contractorId: string, methodId: string): Promise\<{ |
| redirectUrl: string }\> {                                             |
|                                                                       |
| const method = await this.methodRepo.findOne({                        |
|                                                                       |
| where: { id: methodId, contractorId, isActive: true },                |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (!method) throw new PayoutError(\'Method not found.\',             |
|                                                                       |
| HttpStatus.NOT_FOUND, \'ERR_DEPOSIT_METHOD_NOT_FOUND\');              |
|                                                                       |
| if (!method.reauthRequired)                                           |
|                                                                       |
| throw new PayoutError(\'Method does not require re-authorization.\',  |
|                                                                       |
| HttpStatus.CONFLICT, \'ERR_REAUTH_NOT_REQUIRED\');                    |
|                                                                       |
| const nonce = crypto.randomUUID();                                    |
|                                                                       |
| await this.redis.set(                                                 |
|                                                                       |
| \`state:\${nonce}\`,                                                  |
|                                                                       |
| JSON.stringify({ contractorId, methodType: method.methodType,         |
| methodId }),                                                          |
|                                                                       |
| \'EX\', parseInt(process.env.OAUTH_STATE_TTL_SECONDS ?? \'600\'),     |
|                                                                       |
| );                                                                    |
|                                                                       |
| // Callback handler detects methodId in state → updates existing row, |
| not new row                                                           |
|                                                                       |
| const redirectUrl = this.oauthService.buildAuthUrl(method.methodType, |
| nonce);                                                               |
|                                                                       |
| return { redirectUrl };                                               |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **9. Notification on Token Expiry**

  -----------------------------------------------------------------------
  **Event published**   **payout.method.reauth_required**
  --------------------- -------------------------------------------------
  **Published when**    Token refresh fails inside ensureFreshToken()

  **Consumed by**       notification-service

  **Notification        In-app persistent alert + email
  channel**             

  **In-app alert        Your \[Provider\] connection for \[accountEmail\]
  message**             has expired and payouts to this account have been
                        paused. Reconnect your account to resume
                        deposits.

  **Email subject**     Action required: Reconnect your \[Provider\]
                        account

  **Email CTA**         Links to
                        /settings/payouts?reauth={depositMethodId}

  **Alert dismissed     Contractor completes re-authorization
  when**                (reauthRequired=false)
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // RabbitMQ event payload --- payout.method.reauth_required           |
|                                                                       |
| {                                                                     |
|                                                                       |
| contractorId: string, // UUID                                         |
|                                                                       |
| depositMethodId: string, // UUID                                      |
|                                                                       |
| provider: string, // \'PAYPAL\' \| \'WISE\' \| \'PAYONEER\'           |
|                                                                       |
| accountEmail: string, // \'john@email.com\'                           |
|                                                                       |
| occurredAt: string, // ISO 8601                                       |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **10. Provider-Specific Implementation Notes**

## **10.1 PayPal**

  ----------------------------------------------------------------------------------------------
  **Detail**            **Value**
  --------------------- ------------------------------------------------------------------------
  **Authorization       https://www.paypal.com/signin/authorize (live) /
  endpoint**            https://www.sandbox.paypal.com/signin/authorize (sandbox)

  **Token endpoint**    https://api-m.paypal.com/v1/oauth2/token

  **Scopes required**   openid email https://uri.paypal.com/services/paypalhere

  **Profile endpoint**  GET
                        https://api-m.paypal.com/v1/identity/oauth2/userinfo?schema=paypalv1.1

  **Payout API used at  POST https://api-m.paypal.com/v1/payments/payouts (Payouts API --- not
  execution**           same as OAuth token)

  **Access token TTL**  \~8 hours (expires_in field in token response)

  **Refresh token TTL** 60 days of inactivity. Sliding --- resets on each use.

  **Revocation          Token refresh returns 401 with error=invalid_grant
  detection**           
  ----------------------------------------------------------------------------------------------

## **10.2 Wise**

  --------------------------------------------------------------------------------------
  **Detail**            **Value**
  --------------------- ----------------------------------------------------------------
  **Authorization       https://api.transferwise.com/oauth/authorize
  endpoint**            

  **Token endpoint**    https://api.transferwise.com/oauth/token

  **Scopes required**   transfers:read transfers:write balances:read

  **Profile endpoint**  GET https://api.transferwise.com/v2/me

  **Payout API used at  POST
  execution**           https://api.transferwise.com/v3/profiles/{profileId}/transfers

  **Access token TTL**  \~12 hours

  **Refresh token TTL** No expiry --- valid until revoked by contractor

  **Revocation          Refresh returns 401 with error=invalid_token
  detection**           

  **SCA note**          Wise requires Strong Customer Authentication for transfers over
                        £1,000 GBP equivalent. Payout may require contractor to approve
                        in the Wise app.
  --------------------------------------------------------------------------------------

## **10.3 Payoneer**

  ---------------------------------------------------------------------------------
  **Detail**            **Value**
  --------------------- -----------------------------------------------------------
  **Authorization       https://api.payoneer.com/v2/oauth2/authorize
  endpoint**            

  **Token endpoint**    https://api.payoneer.com/v2/oauth2/token

  **Scopes required**   read_transactions write_payments

  **Profile endpoint**  GET https://api.payoneer.com/v4/accounts/current

  **Payout API used at  POST
  execution**           https://api.payoneer.com/v4/programs/{programId}/payments

  **Access token TTL**  \~24 hours

  **Refresh token TTL** 90 days. Refresh may return a new refresh token --- always
                        store it.

  **Revocation          Refresh returns 400 with error=invalid_grant
  detection**           
  ---------------------------------------------------------------------------------

# **11. Error Code Reference**

  -------------------------------------------------------------------------------------
  **Error code**                          **HTTP     **When thrown**
                                          status**   
  --------------------------------------- ---------- ----------------------------------
  **ERR_DEPOSIT_METHOD_LIMIT_REACHED**    422        Contractor already has 5 active
                                                     methods. Cannot add another.

  **ERR_OAUTH_STATE_INVALID**             400        State nonce not found in Redis ---
                                                     expired (\>10 min) or already
                                                     consumed.

  **ERR_OAUTH_TOKEN_EXCHANGE_FAILED**     502        Provider returned an error during
                                                     code→token exchange.

  **ERR_OAUTH_PROFILE_FETCH_FAILED**      502        Could not retrieve contractor
                                                     profile from provider after token
                                                     exchange.

  **ERR_OAUTH_REAUTH_REQUIRED**           401        Access token refresh failed.
                                                     reauthRequired=true set. Payout
                                                     blocked.

  **ERR_REAUTH_NOT_REQUIRED**             409        POST /reauthorize called on a
                                                     method that does not have
                                                     reauthRequired=true.

  **ERR_PAYOUT_METHOD_REAUTH_REQUIRED**   422        Payout attempted to a method where
                                                     reauthRequired=true.
  -------------------------------------------------------------------------------------

# **12. References**

  -----------------------------------------------------------------------------------------
  **Document**           **Relevant to**
  ---------------------- ------------------------------------------------------------------
  **PS-01 --- Database   deposit_methods columns: oauthAccessToken, oauthRefreshToken,
  Schema**               oauthTokenExpiresAt, reauthRequired, accountEmail,
                         accountIdentifier

  **PS-04 --- Deposit    verificationStatus enum, default method removal, 5-method limit
  Method Management**    enforcement

  **PS-03 --- Deposit    Schedule pause behaviour when reauthRequired method is schedule
  Schedule**             primary

  **PayPal Payouts API   https://developer.paypal.com/docs/api/payments.payouts-batch/v1/
  docs**                 

  **Wise Payouts API     https://docs.wise.com/api-docs/payouts
  docs**                 

  **Payoneer API docs**  https://developer.payoneer.com/docs/payouts
  -----------------------------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
payout-service PS-09 \| v1.0
