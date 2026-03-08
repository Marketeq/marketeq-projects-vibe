**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**payout-service**

PS-05 --- Stripe Financial Connections Integration

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        PS-05 --- Stripe Financial Connections Integration

  **Version**         1.0

  **Provider**        Stripe Financial Connections (US bank accounts
                      only)

  **Verification      Instant (OAuth bank login) + Fallback
  paths**             (Stripe-native micro-deposits)

  **No Plaid**        Plaid is not used anywhere in this platform

  **Session TTL**     30-minute idle timeout on Financial Connections
                      session

  **Prerequisites**   PS-00, PS-01, PS-04
  -----------------------------------------------------------------------

# **1. Overview**

Stripe Financial Connections lets contractors link a US bank account by
logging into their bank directly in a Stripe-hosted modal. Marketeq
never sees bank credentials. The contractor does not need a Stripe
account. For banks that do not support the OAuth login path, Stripe
falls back to its own micro-deposit verification flow --- not Plaid, not
any third-party outside Stripe.

  ---------------------------------------------------------------------------
  **Path**        **How it works**          **Settlement after **When used**
                                            verification**     
  --------------- ------------------------- ------------------ --------------
  **Instant       Contractor logs into      Instant --- method Bank supports
  OAuth**         their bank inside the     available for      Stripe
                  Stripe modal. Stripe      payouts            Financial
                  returns a verified        immediately        Connections
                  Financial Connections                        instant
                  Account immediately.                         verification

  **Stripe        Stripe sends two small    1--2 business days Bank not
  micro-deposit   deposits to the account.  for deposits to    supported for
  fallback**      Contractor confirms       arrive             instant OAuth
                  amounts.                                     verification
  ---------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **No Plaid**                                                          |
|                                                                       |
| Plaid is not integrated anywhere on this platform.                    |
|                                                                       |
| If Plaid appears in any prior designs or documents it was removed     |
| from the architecture.                                                |
|                                                                       |
| All US bank linking is via Stripe Financial Connections exclusively.  |
+=======================================================================+

# **2. Setup & Environment**

  --------------------------------------------------------------------------------------------------------------
  **Variable**                         **Required**   **Description**
  ------------------------------------ -------------- ----------------------------------------------------------
  **STRIPE_SECRET_KEY**                Yes            sk_live\_\* in production. sk_test\_\* for all other
                                                      environments.

  **STRIPE_WEBHOOK_SECRET**            Yes            whsec\_\* --- Stripe signing secret for webhook signature
                                                      validation

  **STRIPE_FC_RETURN_URL**             Yes            URL Stripe redirects to after OAuth bank login. e.g.
                                                      https://app.marketeq.com/deposit-methods/stripe/callback

  **STRIPE_FC_SESSION_IDLE_TIMEOUT**   No             Seconds. Default 1800 (30 min). Stripe enforces this
                                                      server-side.
  --------------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/providers/stripe.provider.ts --- initialisation                |
|                                                                       |
| import Stripe from \'stripe\';                                        |
|                                                                       |
| import { Injectable } from \'@nestjs/common\';                        |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class StripeProvider {                                         |
|                                                                       |
| readonly client: Stripe;                                              |
|                                                                       |
| constructor(private config: ConfigService) {                          |
|                                                                       |
| this.client = new                                                     |
| Stripe(this.config.getOrThrow(\'STRIPE_SECRET_KEY\'), {               |
|                                                                       |
| apiVersion: \'2024-06-20\',                                           |
|                                                                       |
| typescript: true,                                                     |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **3. Hosted Financial Connections Flow**

The flow is initiated from the backend when a contractor adds a
BANK_STRIPE method. The frontend receives a client_secret and opens the
Stripe Financial Connections modal using the Stripe.js SDK.

## **3.1 Step 1 --- Create Financial Connections Session (backend)**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Called by MethodsService when methodType=BANK_STRIPE is submitted  |
|                                                                       |
| async initiateBankStripe(contractorId: string):                       |
| Promise\<BankStripeInitResponse\> {                                   |
|                                                                       |
| // Create a Stripe Customer if one does not already exist for this    |
| contractor.                                                           |
|                                                                       |
| // Customer ID is stored in contractor profile (user-service) ---     |
| fetched via internal API.                                             |
|                                                                       |
| const stripeCustomerId = await                                        |
| this.getOrCreateStripeCustomer(contractorId);                         |
|                                                                       |
| // Create a Financial Connections Session.                            |
|                                                                       |
| const session = await                                                 |
| this.stripe.client.financialConnections.sessions.create({             |
|                                                                       |
| account_holder: {                                                     |
|                                                                       |
| type: \'customer\',                                                   |
|                                                                       |
| customer: stripeCustomerId,                                           |
|                                                                       |
| },                                                                    |
|                                                                       |
| permissions: \[\'payment_method\', \'balances\'\],                    |
|                                                                       |
| filters: { countries: \[\'US\'\] },                                   |
|                                                                       |
| return_url: this.config.get(\'STRIPE_FC_RETURN_URL\'),                |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Store verification row                                             |
|                                                                       |
| await this.verificationRepo.save({                                    |
|                                                                       |
| depositMethodId: null, // method not yet created --- created after    |
| OAuth completes                                                       |
|                                                                       |
| contractorId,                                                         |
|                                                                       |
| verificationType: \'stripe_fc\',                                      |
|                                                                       |
| oauthState: session.id, // used to correlate callback                 |
|                                                                       |
| expiresAt: new Date(Date.now() + 30 \* 60 \* 1000), // 30 min session |
| TTL                                                                   |
|                                                                       |
| status: \'pending\',                                                  |
|                                                                       |
| });                                                                   |
|                                                                       |
| return {                                                              |
|                                                                       |
| clientSecret: session.client_secret,                                  |
|                                                                       |
| sessionId: session.id,                                                |
|                                                                       |
| expiresAt: new Date(Date.now() + 30 \* 60 \* 1000).toISOString(),     |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **3.2 Step 2 --- Frontend opens Stripe modal**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Frontend --- open Stripe Financial Connections modal               |
|                                                                       |
| // Must load \@stripe/stripe-js. Never initialise Stripe with secret  |
| key on frontend.                                                      |
|                                                                       |
| import { loadStripe } from \'@stripe/stripe-js\';                     |
|                                                                       |
| const stripe = await                                                  |
| loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);           |
|                                                                       |
| const { financialConnectionsSession, error } =                        |
|                                                                       |
| await stripe.collectBankAccountForSetup({                             |
|                                                                       |
| clientSecret: clientSecret, // from backend Step 1                    |
|                                                                       |
| params: {                                                             |
|                                                                       |
| payment_method_type: \'us_bank_account\',                             |
|                                                                       |
| payment_method_data: { billing_details: { name: contractorDisplayName |
| } },                                                                  |
|                                                                       |
| },                                                                    |
|                                                                       |
| expand: \[\'payment_method\'\],                                       |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (error) {                                                          |
|                                                                       |
| // User closed modal or bank login failed                             |
|                                                                       |
| // POST /v1/deposit-methods/:id/verification-cancel                   |
|                                                                       |
| } else {                                                              |
|                                                                       |
| // Modal completed --- POST result to backend for finalisation        |
|                                                                       |
| await api.post(\'/v1/deposit-methods/stripe/finalise\', {             |
|                                                                       |
| sessionId: clientSecret.split(\'\_secret\')\[0\],                     |
|                                                                       |
| linkedAccountId: financialConnectionsSession.accounts\[0\]?.id,       |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **3.3 Step 3 --- Backend finalises account link**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // POST /v1/deposit-methods/stripe/finalise                           |
|                                                                       |
| async finaliseBankStripe(                                             |
|                                                                       |
| contractorId: string,                                                 |
|                                                                       |
| sessionId: string,                                                    |
|                                                                       |
| linkedAccountId: string,                                              |
|                                                                       |
| ): Promise\<DepositMethod\> {                                         |
|                                                                       |
| // 1. Retrieve the Financial Connections Account from Stripe          |
|                                                                       |
| const account = await                                                 |
| this.stripe.client.financialConnections.accounts.retrieve(            |
|                                                                       |
| linkedAccountId                                                       |
|                                                                       |
| );                                                                    |
|                                                                       |
| if (account.status !== \'active\') {                                  |
|                                                                       |
| throw new PayoutError(\'Bank account could not be verified. Please    |
| try again.\',                                                         |
|                                                                       |
| HttpStatus.UNPROCESSABLE_ENTITY, \'ERR_STRIPE_FC_ACCOUNT_INACTIVE\'); |
|                                                                       |
| }                                                                     |
|                                                                       |
| // 2. Determine verification path --- instant or micro-deposit        |
| fallback                                                              |
|                                                                       |
| const isInstant = account.subcategory !== \'manually_entered\';       |
|                                                                       |
| // 3. Create deposit_methods row                                      |
|                                                                       |
| const method = await this.methodRepo.save({                           |
|                                                                       |
| contractorId,                                                         |
|                                                                       |
| methodType: MethodType.BANK_STRIPE,                                   |
|                                                                       |
| stripeAccountId: account.id,                                          |
|                                                                       |
| bankAccountName: account.display_name ?? account.institution_name,    |
|                                                                       |
| bankAccountLast4: account.last4,                                      |
|                                                                       |
| bankCountry: \'US\',                                                  |
|                                                                       |
| bankCurrency: \'USD\',                                                |
|                                                                       |
| displayLabel: \`\${account.institution_name} ••••\${account.last4}\`, |
|                                                                       |
| verificationStatus: isInstant                                         |
|                                                                       |
| ? VerificationStatus.VERIFIED                                         |
|                                                                       |
| : VerificationStatus.PENDING,                                         |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (!isInstant) {                                                     |
|                                                                       |
| // 4a. Fallback: initiate Stripe micro-deposits                       |
|                                                                       |
| await this.initiateStripeMicroDeposits(method, account);              |
|                                                                       |
| } else {                                                              |
|                                                                       |
| // 4b. Instant: create Stripe PaymentMethod from FC account for       |
| payouts                                                               |
|                                                                       |
| await this.attachStripePaymentMethod(method, account);                |
|                                                                       |
| }                                                                     |
|                                                                       |
| await this.auditService.log({                                         |
|                                                                       |
| contractorId, actorType:\'contractor\', actorId: contractorId,        |
|                                                                       |
| action:\'method.added\',                                              |
|                                                                       |
| metadata: { methodId: method.id, methodType:\'BANK_STRIPE\',          |
| isInstant },                                                          |
|                                                                       |
| });                                                                   |
|                                                                       |
| return method;                                                        |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **4. Stripe Micro-Deposit Fallback**

When a bank does not support instant OAuth verification, Stripe
initiates its own micro-deposit flow. This is entirely within Stripe ---
no third-party service is involved.

## **4.1 Initiate micro-deposits**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| private async initiateStripeMicroDeposits(                            |
|                                                                       |
| method: DepositMethod,                                                |
|                                                                       |
| account: Stripe.FinancialConnections.Account,                         |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| // Create a SetupIntent for ACH debit on the linked account           |
|                                                                       |
| const setupIntent = await this.stripe.client.setupIntents.create({    |
|                                                                       |
| payment_method_types: \[\'us_bank_account\'\],                        |
|                                                                       |
| customer: await this.getStripeCustomerId(method.contractorId),        |
|                                                                       |
| payment_method_data: {                                                |
|                                                                       |
| type: \'us_bank_account\',                                            |
|                                                                       |
| us_bank_account: {                                                    |
|                                                                       |
| financial_connections_account: account.id,                            |
|                                                                       |
| },                                                                    |
|                                                                       |
| },                                                                    |
|                                                                       |
| mandate_data: {                                                       |
|                                                                       |
| customer_acceptance: {                                                |
|                                                                       |
| type: \'online\',                                                     |
|                                                                       |
| online: { ip_address: \'0.0.0.0\', user_agent: \'payout-service\' },  |
|                                                                       |
| },                                                                    |
|                                                                       |
| },                                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Trigger micro-deposit sending                                      |
|                                                                       |
| await this.stripe.client.setupIntents.verifyMicrodeposits(            |
|                                                                       |
| setupIntent.id,                                                       |
|                                                                       |
| { descriptor_code: \'MRKTEQ\' } // appears on bank statement          |
|                                                                       |
| );                                                                    |
|                                                                       |
| // Record verification row                                            |
|                                                                       |
| const expiresAt = new Date(Date.now() + 10 \* 24 \* 60 \* 60 \*       |
| 1000); // 10 days                                                     |
|                                                                       |
| await this.verificationRepo.save({                                    |
|                                                                       |
| depositMethodId: method.id,                                           |
|                                                                       |
| contractorId: method.contractorId,                                    |
|                                                                       |
| verificationType: \'micro_deposit\',                                  |
|                                                                       |
| oauthState: setupIntent.id, // reused field --- stores setupIntent ID |
| for confirmation                                                      |
|                                                                       |
| maxAttempts: 3,                                                       |
|                                                                       |
| expiresAt,                                                            |
|                                                                       |
| status: \'pending\',                                                  |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **4.2 Confirm micro-deposit amounts**

The contractor receives two deposits labelled MRKTEQ on their bank
statement. They enter both amounts in the UI, which POSTs to the
confirmation endpoint.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // POST /v1/deposit-methods/:id/verify-micro-deposits                 |
|                                                                       |
| // Request: { amount1Cents: 32, amount2Cents: 67 }                    |
|                                                                       |
| async confirmMicroDeposits(                                           |
|                                                                       |
| contractorId: string,                                                 |
|                                                                       |
| methodId: string,                                                     |
|                                                                       |
| amount1: number,                                                      |
|                                                                       |
| amount2: number,                                                      |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| const verification = await this.verificationRepo.findOne({            |
|                                                                       |
| where: { depositMethodId: methodId, contractorId, status: \'pending\' |
| },                                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (!verification) throw new PayoutError(\'No pending verification    |
| found.\',                                                             |
|                                                                       |
| HttpStatus.NOT_FOUND, \'ERR_VERIFICATION_NOT_FOUND\');                |
|                                                                       |
| if (verification.lockedUntil && verification.lockedUntil \> new       |
| Date())                                                               |
|                                                                       |
| throw new PayoutError(\'Too many failed attempts. Please try again    |
| later.\',                                                             |
|                                                                       |
| HttpStatus.TOO_MANY_REQUESTS, \'ERR_VERIFICATION_LOCKED\');           |
|                                                                       |
| if (verification.expiresAt \< new Date())                             |
|                                                                       |
| throw new PayoutError(\'Verification window has expired. Please       |
| re-link your bank.\',                                                 |
|                                                                       |
| HttpStatus.UNPROCESSABLE_ENTITY, \'ERR_VERIFICATION_EXPIRED\');       |
|                                                                       |
| try {                                                                 |
|                                                                       |
| // Confirm with Stripe                                                |
|                                                                       |
| await this.stripe.client.setupIntents.verifyMicrodeposits(            |
|                                                                       |
| verification.oauthState!, // setupIntent ID                           |
|                                                                       |
| { amounts: \[amount1, amount2\] }                                     |
|                                                                       |
| );                                                                    |
|                                                                       |
| // Success                                                            |
|                                                                       |
| await this.methodRepo.update(methodId, {                              |
|                                                                       |
| verificationStatus: VerificationStatus.VERIFIED,                      |
|                                                                       |
| });                                                                   |
|                                                                       |
| await this.verificationRepo.update(verification.id, {                 |
|                                                                       |
| status: \'verified\', verifiedAt: new Date(),                         |
|                                                                       |
| });                                                                   |
|                                                                       |
| } catch (err: any) {                                                  |
|                                                                       |
| verification.attemptCount += 1;                                       |
|                                                                       |
| if (verification.attemptCount \>= verification.maxAttempts) {         |
|                                                                       |
| // Lock for 24 hours                                                  |
|                                                                       |
| await this.verificationRepo.update(verification.id, {                 |
|                                                                       |
| attemptCount: verification.attemptCount,                              |
|                                                                       |
| lockedUntil: new Date(Date.now() + 24 \* 60 \* 60 \* 1000),           |
|                                                                       |
| status: \'locked\',                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| await this.methodRepo.update(methodId, {                              |
|                                                                       |
| verificationStatus: VerificationStatus.LOCKED,                        |
|                                                                       |
| });                                                                   |
|                                                                       |
| throw new PayoutError(\'Too many failed attempts. Try again in 24     |
| hours.\',                                                             |
|                                                                       |
| HttpStatus.TOO_MANY_REQUESTS, \'ERR_VERIFICATION_LOCKED\');           |
|                                                                       |
| }                                                                     |
|                                                                       |
| await this.verificationRepo.update(verification.id, {                 |
|                                                                       |
| attemptCount: verification.attemptCount,                              |
|                                                                       |
| });                                                                   |
|                                                                       |
| throw new PayoutError(                                                |
|                                                                       |
| \`Incorrect amounts. \${verification.maxAttempts -                    |
| verification.attemptCount} attempt(s) remaining.\`,                   |
|                                                                       |
| HttpStatus.UNPROCESSABLE_ENTITY,                                      |
| \'ERR_VERIFICATION_AMOUNTS_INCORRECT\');                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **5. Stripe Webhook Handling**

Stripe sends webhook events to POST /v1/webhooks/stripe. All events are
signature-validated before processing. The endpoint returns 200
immediately and processes asynchronously via a Bull queue to prevent
Stripe retries on slow processing.

## **5.1 Relevant event types**

  -----------------------------------------------------------------------------------------------------
  **Stripe event**                                 **Trigger**           **payout-service action**
  ------------------------------------------------ --------------------- ------------------------------
  **financial_connections.account.created**        Contractor linked a   Log --- no action needed,
                                                   new FC account        finalise endpoint handles this

  **financial_connections.account.disconnected**   Bank revoked access   Set verificationStatus=failed.
                                                   to FC account         Pause payouts. Notify
                                                                         contractor.

  **financial_connections.account.reactivated**    Bank restored access  Set
                                                                         verificationStatus=verified.
                                                                         Resume payouts.

  **setup_intent.succeeded**                       Micro-deposit setup   Set
                                                   completed             verificationStatus=verified on
                                                                         the associated deposit_method

  **setup_intent.setup_failed**                    Micro-deposit setup   Set verificationStatus=failed.
                                                   failed                Notify contractor.

  **payout.paid**                                  Stripe payout to bank Update payout_request status →
                                                   completed             completed. Publish
                                                                         payout.completed.

  **payout.failed**                                Stripe payout to bank Increment retry_count. If
                                                   failed                retries exhausted: status →
                                                                         failed. Publish payout.failed.

  **payout.canceled**                              Stripe payout         Update payout_request status →
                                                   cancelled             cancelled.
  -----------------------------------------------------------------------------------------------------

## **5.2 Webhook controller**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // POST /v1/webhooks/stripe --- raw body required for signature       |
| validation                                                            |
|                                                                       |
| \@Controller(\'v1/webhooks\')                                         |
|                                                                       |
| export class WebhookController {                                      |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| private readonly stripe: StripeProvider,                              |
|                                                                       |
| private readonly queue: Queue,                                        |
|                                                                       |
| private readonly config: ConfigService,                               |
|                                                                       |
| ) {}                                                                  |
|                                                                       |
| \@Post(\'stripe\')                                                    |
|                                                                       |
| \@HttpCode(200)                                                       |
|                                                                       |
| async handleStripe(                                                   |
|                                                                       |
| \@RawBody() rawBody: Buffer,                                          |
|                                                                       |
| \@Headers(\'stripe-signature\') sig: string,                          |
|                                                                       |
| \@Res() res: Response,                                                |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| let event: Stripe.Event;                                              |
|                                                                       |
| try {                                                                 |
|                                                                       |
| event = this.stripe.client.webhooks.constructEvent(                   |
|                                                                       |
| rawBody,                                                              |
|                                                                       |
| sig,                                                                  |
|                                                                       |
| this.config.getOrThrow(\'STRIPE_WEBHOOK_SECRET\'),                    |
|                                                                       |
| );                                                                    |
|                                                                       |
| } catch {                                                             |
|                                                                       |
| throw new BadRequestException(\'Invalid Stripe webhook signature\');  |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Enqueue for async processing --- return 200 immediately            |
|                                                                       |
| await this.queue.add(\'stripe-webhook\', { event }, { attempts: 3 }); |
|                                                                       |
| res.sendStatus(200);                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // NestJS raw body middleware --- required for Stripe signature       |
| validation                                                            |
|                                                                       |
| // In main.ts:                                                        |
|                                                                       |
| app.use(\'/v1/webhooks/stripe\',                                      |
|                                                                       |
| express.raw({ type: \'application/json\' })                           |
|                                                                       |
| );                                                                    |
+=======================================================================+

## **5.3 Webhook processor**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| \@Processor(\'stripe-webhooks\')                                      |
|                                                                       |
| export class StripeWebhookProcessor {                                 |
|                                                                       |
| \@Process(\'stripe-webhook\')                                         |
|                                                                       |
| async process(job: Job\<{ event: Stripe.Event }\>): Promise\<void\> { |
|                                                                       |
| const { event } = job.data;                                           |
|                                                                       |
| switch (event.type) {                                                 |
|                                                                       |
| case \'financial_connections.account.disconnected\':                  |
|                                                                       |
| await this.handleFCDisconnected(event.data.object as                  |
| Stripe.FinancialConnections.Account);                                 |
|                                                                       |
| break;                                                                |
|                                                                       |
| case \'payout.paid\':                                                 |
|                                                                       |
| await this.handlePayoutPaid(event.data.object as Stripe.Payout);      |
|                                                                       |
| break;                                                                |
|                                                                       |
| case \'payout.failed\':                                               |
|                                                                       |
| await this.handlePayoutFailed(event.data.object as Stripe.Payout);    |
|                                                                       |
| break;                                                                |
|                                                                       |
| default:                                                              |
|                                                                       |
| this.logger.debug(\`Unhandled Stripe event: \${event.type}\`);        |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| private async handleFCDisconnected(account:                           |
| Stripe.FinancialConnections.Account) {                                |
|                                                                       |
| const method = await this.methodRepo.findOne({                        |
|                                                                       |
| where: { stripeAccountId: account.id, isActive: true },               |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (!method) return;                                                  |
|                                                                       |
| await this.methodRepo.update(method.id, {                             |
|                                                                       |
| verificationStatus: VerificationStatus.FAILED,                        |
|                                                                       |
| });                                                                   |
|                                                                       |
| await this.publisher.publishPayoutsPaused(method.contractorId, {      |
|                                                                       |
| reason: \'bank_disconnected\', methodId: method.id,                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| private async handlePayoutPaid(stripePayout: Stripe.Payout) {         |
|                                                                       |
| const request = await this.payoutRepo.findOne({                       |
|                                                                       |
| where: { providerReference: stripePayout.id },                        |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (!request \|\| request.status === PayoutStatus.COMPLETED) return;  |
|                                                                       |
| await this.payoutRepo.update(request.id, {                            |
|                                                                       |
| status: PayoutStatus.COMPLETED,                                       |
|                                                                       |
| completedAt: new Date(stripePayout.arrival_date \* 1000),             |
|                                                                       |
| });                                                                   |
|                                                                       |
| await this.publisher.publishPayoutCompleted(request);                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **6. Session Expiry --- 30-Minute Idle Timeout**

  -----------------------------------------------------------------------
  **Event**             **Behaviour**
  --------------------- -------------------------------------------------
  **Contractor opens    Financial Connections Session created with 30-min
  Stripe modal**        TTL. Stored in
                        deposit_method_verification.expiresAt.

  **Contractor          Session valid. Finalise endpoint processes
  completes modal       normally.
  within 30 min**       

  **Contractor idles \> Stripe invalidates the session server-side.
  30 min in modal**     collectBankAccountForSetup() returns an error.

  **Frontend receives   Frontend calls POST
  session-expired       /v1/deposit-methods/stripe/restart --- generates
  error**               a new session and client_secret.

  **Cleanup cron**      Nightly cron marks deposit_method_verification
                        rows with expiresAt \< now AND status=pending as
                        expired. Associated deposit_methods row also set
                        to verificationStatus=expired.
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // POST /v1/deposit-methods/stripe/restart                            |
|                                                                       |
| // Called by frontend when session expires mid-flow                   |
|                                                                       |
| async restartStripeFC(contractorId: string, oldMethodId?: string):    |
| Promise\<BankStripeInitResponse\> {                                   |
|                                                                       |
| // Clean up the incomplete method row if it was created               |
|                                                                       |
| if (oldMethodId) {                                                    |
|                                                                       |
| await this.methodRepo.update(                                         |
|                                                                       |
| { id: oldMethodId, contractorId },                                    |
|                                                                       |
| { isActive: false, deactivatedAt: new Date() }                        |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Start fresh                                                        |
|                                                                       |
| return this.initiateBankStripe(contractorId);                         |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **7. Bank Ownership Verification**

Stripe Financial Connections verifies bank ownership by requiring the
contractor to authenticate with their bank credentials inside the Stripe
modal. Marketeq receives only a Financial Connections Account object ---
never credentials or account numbers.

  -------------------------------------------------------------------------
  **Verification      **What Stripe confirms**       **What Marketeq
  method**                                           stores**
  ------------------- ------------------------------ ----------------------
  **Instant OAuth**   Contractor authenticated with  stripeAccountId,
                      the bank directly. Account     institution_name,
                      belongs to the logged-in user. last4 --- no account
                                                     number

  **Micro-deposit**   Contractor confirmed receipt   last4 only --- amounts
                      of two specific amounts in the are never stored after
                      account --- proves access.     confirmation
  -------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **No bank credentials stored**                                        |
|                                                                       |
| Marketeq never stores bank login credentials, full account numbers,   |
| or routing numbers for                                                |
|                                                                       |
| BANK_STRIPE methods. Stripe holds all sensitive data. Marketeq holds  |
| only:                                                                 |
|                                                                       |
| • stripeAccountId (Stripe Financial Connections Account ID)           |
|                                                                       |
| • bankAccountLast4 (last 4 digits --- display only)                   |
|                                                                       |
| • institutionName (display name)                                      |
|                                                                       |
| For BANK_MANUAL (non-Stripe path), routing numbers and account        |
| numbers are encrypted at                                              |
|                                                                       |
| rest using AES-256. See PS-06 for BANK_MANUAL implementation.         |
+=======================================================================+

# **8. References**

  -----------------------------------------------------------------------
  **Document**           **Relevant to**
  ---------------------- ------------------------------------------------
  **PS-01 --- Database   deposit_method_verification table,
  Schema**               stripeAccountId/stripeBankAccountId columns

  **PS-04 --- Deposit    verificationStatus transitions, reauthRequired
  Method Management**    computed state

  **PS-06 --- Manual     BANK_MANUAL micro-deposit flow --- different
  Bank Verification**    from Stripe-native micro-deposits in §4

  **Stripe Financial     https://stripe.com/docs/financial-connections
  Connections docs**     

  **Stripe Payout        https://stripe.com/docs/webhooks/payout
  webhooks**             
  -----------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
payout-service PS-05 \| v1.0
