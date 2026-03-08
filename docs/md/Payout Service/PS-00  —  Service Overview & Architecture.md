**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**payout-service**

PS-00 --- Service Overview & Architecture

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Service**         payout-service

  **Document**        PS-00 --- Service Overview & Architecture

  **Version**         1.0

  **Single            Move contractor balance to their chosen destination
  responsibility**    --- nothing else

  **Payout methods**  Bank (Stripe Financial Connections), PayPal, Wise,
                      Payoneer, Crypto (9 providers), TEQ Coin
                      (feature-flagged OFF)

  **Minimum payout**  \$50.00 USD

  **Instant           \$1.75 USD flat
  withdrawal fee**    

  **Total PS          PS-00 through PS-32
  documents**         
  -----------------------------------------------------------------------

# **1. Purpose & Single Responsibility**

payout-service has one job: move a contractor\'s available balance to
their chosen destination. It does not calculate earnings, does not
manage contracts, does not handle KYC, and does not store earnings
history. It reads a balance from earnings-service, initiates a transfer
via the appropriate payment provider, and records the result.

+-----------------------------------------------------------------------+
| **What payout-service does**                                          |
|                                                                       |
| • Validates that the contractor has sufficient available balance (via |
| earnings-service internal API)                                        |
|                                                                       |
| • Validates that the payout method is active, verified, and owned by  |
| the contractor                                                        |
|                                                                       |
| • Initiates the transfer via Stripe (bank), PayPal, Wise, Payoneer,   |
| or crypto provider                                                    |
|                                                                       |
| • Records the payout attempt and outcome in its own database          |
|                                                                       |
| • Publishes payout.completed or payout.failed events to RabbitMQ      |
|                                                                       |
| • Manages payout schedules (daily/weekly/bi-weekly/monthly/custom)    |
|                                                                       |
| • Sends magic link verification for withdrawal confirmation           |
+=======================================================================+

+-----------------------------------------------------------------------+
| **What payout-service does NOT do**                                   |
|                                                                       |
| • Does not calculate or store contractor earnings --- that is         |
| earnings-service                                                      |
|                                                                       |
| • Does not perform KYC verification --- that is kyc-identity-service  |
|                                                                       |
| • Does not send emails or in-app notifications --- that is            |
| notification-service                                                  |
|                                                                       |
| • Does not manage contracts or billing rates --- that is              |
| contract-service                                                      |
|                                                                       |
| • Does not custody funds --- Marketeq corporate Stripe account holds  |
| all balances                                                          |
|                                                                       |
| • Does not decide when earnings are confirmed --- that is             |
| earnings-service + billing-service                                    |
+=======================================================================+

# **2. Service Boundaries**

  -----------------------------------------------------------------------
  **Boundary**       **Rule**
  ------------------ ----------------------------------------------------
  **Owns**           payout_requests, payout_methods, payout_schedules,
                     magic_link_tokens tables

  **Reads (via       Contractor available balance --- GET
  API)**             /v1/internal/earnings/balance/:userId
                     (earnings-service)

  **Reads (via       Contractor KYC tier and hold status --- GET
  API)**             /v1/internal/kyc/status/:userId
                     (kyc-identity-service)

  **Writes (via      payout.completed, payout.failed --- consumed by
  events)**          earnings-service, notification-service

  **Writes (via      Stripe payout API, PayPal Payouts API, Wise
  API)**             Transfers API, Payoneer API, crypto provider APIs

  **Does not read**  earnings_cache, contract tables, user profile
                     (beyond what is in the JWT)

  **Does not write** earnings_cache, balance_snapshots, any other
                     service\'s tables
  -----------------------------------------------------------------------

# **3. Full Dependency Map**

## **3.1 Upstream dependencies (payout-service calls these)**

  ---------------------------------------------------------------------------------------------------------
  **Service**                **How called**                          **What fetched**      **Failure
                                                                                           behaviour**
  -------------------------- --------------------------------------- --------------------- ----------------
  **earnings-service**       HTTP GET                                Available balance,    Payout blocked
                             /v1/internal/earnings/balance/:userId   balance updatedAt     if unavailable
                                                                                           or balance
                                                                                           insufficient

  **kyc-identity-service**   HTTP GET                                KYC tier, hold flags, Payout blocked
                             /v1/internal/kyc/status/:userId         first-payout-hold     if tier \<
                                                                     status                required or hold
                                                                                           active

  **Stripe API**             REST --- \@stripe/stripe-node SDK       Bank payout           Retry with
                                                                     initiation, Financial exponential
                                                                     Connections account   backoff --- 3
                                                                     verification          attempts then
                                                                                           fail payout

  **PayPal Payouts API**     REST --- OAuth 2.0 bearer token         PayPal payout batch   Retry 3 attempts
                                                                     item creation         --- then fail
                                                                                           payout

  **Wise Transfers API**     REST --- API key auth                   Transfer creation to  Retry 3 attempts
                                                                     recipient account     --- then fail
                                                                                           payout

  **Payoneer API**           REST --- OAuth 2.0                      Payment to Payoneer   Retry 3 attempts
                                                                     account               --- then fail
                                                                                           payout

  **Crypto provider APIs     REST --- per-provider auth              Crypto withdrawal     Retry 3 attempts
  (9)**                                                              initiation            --- then fail
                                                                                           payout

  **SendGrid**               REST --- API key                        Magic link email      Log failure ---
                                                                     delivery              do not block
                                                                                           payout
                                                                                           initiation
  ---------------------------------------------------------------------------------------------------------

## **3.2 Downstream dependents (these call or consume payout-service)**

  -------------------------------------------------------------------------------
  **Service**                **How it uses payout-service**          **Coupling
                                                                     type**
  -------------------------- --------------------------------------- ------------
  **earnings-service**       Consumes payout.completed and           Event ---
                             payout.failed RabbitMQ events to update loose
                             contractor balance                      coupling

  **notification-service**   Consumes payout.completed and           Event ---
                             payout.failed to send contractor        loose
                             notifications                           coupling

  **kyc-identity-service**   None directly --- payout-service calls  ---
                             kyc, not the other way around           

  **Frontend / API gateway** Calls payout-service REST endpoints for HTTP ---
                             withdrawal UI                           direct
  -------------------------------------------------------------------------------

# **4. Supported Payout Method Types**

  ---------------------------------------------------------------------------------
  **Method type** **Provider**    **Regions**   **Verification      **Settlement
                                                method**            speed**
  --------------- --------------- ------------- ------------------- ---------------
  **Bank account  Stripe          US only       OAuth --- Stripe    1--3 business
  (US)**          Financial                     Link instant        days ACH
                  Connections                   verification or     
                                                micro-deposits (2   
                                                business days)      

  **Bank account  Manual entry    7 regions     Micro-deposits ---  2--5 business
  (global)**                      (see PS-07    two amounts,        days
                                  for full      3-attempt limit,    (SWIFT/local
                                  list)         24h lock, 10-day    rail)
                                                expiry              

  **PayPal**      PayPal Payouts  Global        OAuth 2.0 ---       Minutes to 1
                  API             (PayPal       contractor          business day
                                  supported     authorises Marketeq 
                                  countries)    to send to their    
                                                PayPal account      

  **Wise**        Wise Transfers  Global (Wise  OAuth 2.0 ---       Minutes to 2
                  API             supported     contractor          business days
                                  countries)    authorises Wise     
                                                recipient account   

  **Payoneer**    Payoneer API    Global        OAuth 2.0 ---       Minutes to 1
                                  (Payoneer     contractor          business day
                                  supported     authorises Payoneer 
                                  countries)    account             

  **Crypto        9 providers     Global        Wallet address      Minutes to 1
  wallet**        (see §4.1)                    entry +             hour
                                                confirmation code   (blockchain
                                                --- no OAuth        confirmation)

  **Marketeq      Card issuer TBD US only (MVP) Card issued by      Instant (card
  Debit Card**                                  Marketeq --- no     network)
                                                separate            
                                                verification        

  **TEQ Coin**    Internal ledger Platform only Feature-flagged OFF Instant (ledger
                                                for MVP --- see     transfer)
                                                §4.2                
  ---------------------------------------------------------------------------------

## **4.1 Supported crypto providers**

  ------------------------------------------------------------------------
  **Provider**    **Networks supported**         **Withdraw currencies**
  --------------- ------------------------------ -------------------------
  **Coinbase**    Bitcoin, Ethereum, Solana,     BTC, ETH, SOL, MATIC,
                  Polygon                        USDC

  **Binance**     Bitcoin, Ethereum, BNB Chain,  BTC, ETH, BNB, USDT, USDC
                  Solana                         

  **Kraken**      Bitcoin, Ethereum, Polkadot,   BTC, ETH, DOT, ATOM
                  Cosmos                         

  **Bitfinex**    Bitcoin, Ethereum, Tether      BTC, ETH, USDT

  **OKX**         Bitcoin, Ethereum, Solana,     BTC, ETH, USDT, USDC,
                  Avalanche                      AVAX

  **Bybit**       Bitcoin, Ethereum, Tether      BTC, ETH, USDT, USDC

  **Gemini**      Bitcoin, Ethereum              BTC, ETH, GUSD

  **KuCoin**      Bitcoin, Ethereum, BNB Chain   BTC, ETH, USDT, KCS

  **Gate.io**     Bitcoin, Ethereum, Solana,     BTC, ETH, USDT, GT
                  multiple                       
  ------------------------------------------------------------------------

## **4.2 TEQ Coin --- feature-flagged placeholder**

+-----------------------------------------------------------------------+
| **TEQ Coin --- OFF for MVP**                                          |
|                                                                       |
| TEQ Coin is Marketeq\'s planned internal token/ledger system. It is   |
| included in the payout method                                         |
|                                                                       |
| type enum and database schema as a placeholder but is feature-flagged |
| OFF for MVP launch.                                                   |
|                                                                       |
| Feature flag: FEATURE_TEQ_COIN_ENABLED=false (default false --- must  |
| be explicitly enabled)                                                |
|                                                                       |
| When OFF:                                                             |
|                                                                       |
| • TEQ Coin does not appear in the payout method selection UI          |
|                                                                       |
| • Any API request with methodType=TEQ_COIN returns 400                |
| ERR_PAYOUT_METHOD_UNAVAILABLE                                         |
|                                                                       |
| • The payout_methods table accepts TEQ_COIN rows but the service      |
| rejects them at processing time                                       |
|                                                                       |
| When ON (future):                                                     |
|                                                                       |
| • Transfers are internal ledger debits/credits --- no external API    |
| call                                                                  |
|                                                                       |
| • Settlement is instant                                               |
|                                                                       |
| • No minimum payout threshold applies                                 |
|                                                                       |
| Do not implement TEQ Coin business logic for MVP. Schema and enum     |
| only.                                                                 |
+=======================================================================+

# **5. Key Design Decisions**

  --------------------------------------------------------------------------
  **Decision**       **Choice**              **Rationale**
  ------------------ ----------------------- -------------------------------
  **Fund custody**   Marketeq corporate      Simplest legal structure for
                     Stripe account          MVP. Legal classification
                                             (money transmitter vs
                                             custodian) TBD. Maximum holding
                                             periods by jurisdiction must be
                                             enforced.

  **Balance read     HTTP call to            Single source of truth for
  strategy**         earnings-service        balance. payout-service never
                     internal API before     caches balance --- reads fresh
                     every payout            every time to prevent
                                             double-spend.

  **Idempotency**    idempotency_key (UUID)  Prevents duplicate payouts if
                     stored on               the client retries after a
                     payout_requests. UNIQUE network failure.
                     constraint. Retry with  
                     same key is safe.       

  **Magic link       Single-use token,       Confirms the contractor
  verification**     15-minute TTL, SendGrid intentionally initiated the
                     delivery, hashed        withdrawal. Prevents CSRF and
                     storage                 session hijacking from
                                             triggering payouts.

  **Payout method    Bank: micro-deposits or Each method type uses the
  verification**     Stripe Financial        strongest verification
                     Connections OAuth.      appropriate for its risk
                     PayPal/Wise/Payoneer:   profile.
                     OAuth 2.0. Crypto:      
                     address + confirmation  
                     code.                   

  **Split payouts**  Max two accounts.       Design constraint from product.
                     Auto-balance            Simplifies the split logic.
                     percentages (must sum   Avoids complex multi-way split
                     to 100%). Primary +     edge cases for MVP.
                     secondary.              

  **Instant          \$1.75 USD flat fee     Covers Stripe instant payout
  withdrawal fee**   deducted from payout    surcharge. Fee is disclosed at
                     amount before transfer  withdrawal initiation. Not
                                             stored on earnings-service.

  **Minimum payout** \$50.00 USD hard        Below this, processing costs
                     minimum for all         exceed payout value for most
                     scheduled payouts       methods. Instant withdrawal has
                                             no minimum beyond fee coverage.

  **First payout     5 business days for     KYC risk mitigation.
  hold**             contractors who have    kyc-identity-service signals
                     never received a payout the hold status. payout-service
                                             enforces it.
  --------------------------------------------------------------------------

# **6. Folder Structure**

+-----------------------------------------------------------------------+
| plaintext                                                             |
+-----------------------------------------------------------------------+
| apps/payout-service/src/                                              |
|                                                                       |
| ├─ app.module.ts                                                      |
|                                                                       |
| ├─ main.ts                                                            |
|                                                                       |
| ├─ database/                                                          |
|                                                                       |
| │ └─ database.module.ts                                               |
|                                                                       |
| ├─ entities/                                                          |
|                                                                       |
| │ ├─ payout-request.entity.ts                                         |
|                                                                       |
| │ ├─ payout-method.entity.ts                                          |
|                                                                       |
| │ ├─ payout-schedule.entity.ts                                        |
|                                                                       |
| │ └─ magic-link-token.entity.ts                                       |
|                                                                       |
| ├─ payout/ ← withdrawal initiation and processing                     |
|                                                                       |
| │ ├─ payout.module.ts                                                 |
|                                                                       |
| │ ├─ payout.controller.ts                                             |
|                                                                       |
| │ └─ payout.service.ts                                                |
|                                                                       |
| ├─ methods/ ← payout method CRUD and verification                     |
|                                                                       |
| │ ├─ methods.module.ts                                                |
|                                                                       |
| │ ├─ methods.controller.ts                                            |
|                                                                       |
| │ └─ methods.service.ts                                               |
|                                                                       |
| ├─ schedule/ ← scheduled payout configuration                         |
|                                                                       |
| │ ├─ schedule.module.ts                                               |
|                                                                       |
| │ ├─ schedule.controller.ts                                           |
|                                                                       |
| │ └─ schedule.service.ts                                              |
|                                                                       |
| ├─ providers/ ← one adapter per payment provider                      |
|                                                                       |
| │ ├─ providers.module.ts                                              |
|                                                                       |
| │ ├─ stripe.provider.ts                                               |
|                                                                       |
| │ ├─ paypal.provider.ts                                               |
|                                                                       |
| │ ├─ wise.provider.ts                                                 |
|                                                                       |
| │ ├─ payoneer.provider.ts                                             |
|                                                                       |
| │ ├─ crypto.provider.ts ← routes to 9 sub-providers by providerName   |
|                                                                       |
| │ └─ teq-coin.provider.ts ← stub only --- feature-flagged OFF         |
|                                                                       |
| ├─ magic-link/ ← token generation, delivery, validation               |
|                                                                       |
| │ ├─ magic-link.module.ts                                             |
|                                                                       |
| │ └─ magic-link.service.ts                                            |
|                                                                       |
| ├─ consumers/ ← RabbitMQ consumers (inbound events)                   |
|                                                                       |
| │ ├─ consumers.module.ts                                              |
|                                                                       |
| │ └─ schedule-trigger.consumer.ts                                     |
|                                                                       |
| ├─ publishers/ ← RabbitMQ publishers (outbound events)                |
|                                                                       |
| │ ├─ publishers.module.ts                                             |
|                                                                       |
| │ └─ payout.publisher.ts                                              |
|                                                                       |
| ├─ guards/                                                            |
|                                                                       |
| │ ├─ jwt-auth.guard.ts                                                |
|                                                                       |
| │ └─ roles.guard.ts                                                   |
|                                                                       |
| ├─ filters/                                                           |
|                                                                       |
| │ └─ global-exception.filter.ts                                       |
|                                                                       |
| └─ metrics/                                                           |
|                                                                       |
| ├─ metrics.module.ts                                                  |
|                                                                       |
| └─ metrics.service.ts                                                 |
+=======================================================================+

# **7. Environment Variables**

  ---------------------------------------------------------------------------------------------------------------
  **Variable**                     **Required**   **Default**   **Description**
  -------------------------------- -------------- ------------- -------------------------------------------------
  **DATABASE_URL**                 Yes            ---           PostgreSQL connection string. Format:
                                                                postgresql://user:pass@host:5432/payout_service

  **DATABASE_SSL**                 No             true          Set to false for local development only.

  **REDIS_URL**                    Yes            ---           Redis connection string. Shared with
                                                                earnings-service cluster or dedicated instance.

  **RABBITMQ_URL**                 Yes            ---           RabbitMQ AMQP URL. e.g.
                                                                amqp://guest:guest@rabbitmq:5672

  **JWT_SECRET**                   Yes            ---           Shared with auth-service. Used to verify
                                                                contractor JWTs.

  **INTERNAL_SERVICE_TOKEN**       Yes            ---           X-Service-Token for calls to earnings-service and
                                                                kyc-identity-service internal APIs.

  **EARNINGS_SERVICE_URL**         Yes            ---           Base URL for earnings-service internal API. e.g.
                                                                http://earnings-service:3010

  **KYC_SERVICE_URL**              Yes            ---           Base URL for kyc-identity-service internal API.
                                                                e.g. http://kyc-service:3020

  **STRIPE_SECRET_KEY**            Yes            ---           Stripe secret key. Use sk_test\_\* for
                                                                non-production environments.

  **STRIPE_WEBHOOK_SECRET**        Yes            ---           Stripe webhook signing secret for validating
                                                                inbound Stripe events.

  **PAYPAL_CLIENT_ID**             Yes (if PayPal ---           PayPal REST app client ID.
                                   enabled)                     

  **PAYPAL_CLIENT_SECRET**         Yes (if PayPal ---           PayPal REST app secret.
                                   enabled)                     

  **PAYPAL_MODE**                  No             sandbox       live or sandbox.

  **WISE_API_KEY**                 Yes (if Wise   ---           Wise API key. Sandbox key for non-production.
                                   enabled)                     

  **PAYONEER_PARTNER_ID**          Yes (if        ---           Payoneer partner account ID.
                                   Payoneer                     
                                   enabled)                     

  **PAYONEER_API_KEY**             Yes (if        ---           Payoneer API key.
                                   Payoneer                     
                                   enabled)                     

  **SENDGRID_API_KEY**             Yes            ---           SendGrid API key for magic link emails.

  **MAGIC_LINK_TTL_SECONDS**       No             900           Magic link token TTL. Default 15 minutes.

  **MAGIC_LINK_BASE_URL**          Yes            ---           Base URL for magic link redirect. e.g.
                                                                https://app.marketeq.com/verify-withdrawal

  **PAYOUT_MINIMUM_USD**           No             50            Minimum payout amount in USD. Applies to
                                                                scheduled payouts only.

  **PAYOUT_INSTANT_FEE_USD**       No             1.75          Flat fee in USD for instant withdrawals.

  **PAYOUT_FIRST_HOLD_DAYS**       No             5             Business days to hold first payout (KYC risk
                                                                mitigation).

  **FEATURE_TEQ_COIN_ENABLED**     No             false         Enable TEQ Coin payout method. Always false for
                                                                MVP.

  **FEATURE_DEBIT_CARD_ENABLED**   No             false         Enable Marketeq Debit Card. Always false for MVP.
  ---------------------------------------------------------------------------------------------------------------

# **8. RabbitMQ Event Contracts**

## **8.1 Events published by payout-service**

  ----------------------------------------------------------------------------------------
  **Routing key**               **Exchange**      **Published when**    **Key payload
                                                                        fields**
  ----------------------------- ----------------- --------------------- ------------------
  **payout.completed**          marketeq.events   Payout transfer       contractorId,
                                                  confirmed successful  payoutRequestId,
                                                  by provider           amount, currency,
                                                                        methodType,
                                                                        settledAt

  **payout.failed**             marketeq.events   Payout transfer       contractorId,
                                                  failed after all      payoutRequestId,
                                                  retries or rejected   amount, currency,
                                                  by provider           methodType,
                                                                        reason, failedAt

  **payout.schedule.updated**   marketeq.events   Contractor changes    contractorId,
                                                  their payout schedule schedule (new
                                                  configuration         config), updatedAt
  ----------------------------------------------------------------------------------------

## **8.2 Events consumed by payout-service**

  ------------------------------------------------------------------------------------------
  **Routing key**        **Published by**   **Consumed for**       **Queue**
  ---------------------- ------------------ ---------------------- -------------------------
  **schedule.trigger**   payout-service     Trigger scheduled      payout.schedule.trigger
                         internal cron      payout run for all     
                                            eligible contractors   

  ------------------------------------------------------------------------------------------

## **8.3 Events consumed by others from payout-service**

  ------------------------------------------------------------------------------------
  **Routing key**               **Consumed by**        **Purpose**
  ----------------------------- ---------------------- -------------------------------
  **payout.completed**          earnings-service       Debit contractor available
                                                       balance in balance_snapshots

  **payout.completed**          notification-service   Send \"Payout sent\"
                                                       notification to contractor

  **payout.failed**             earnings-service       Restore contractor available
                                                       balance (reverse the hold)

  **payout.failed**             notification-service   Send \"Payout failed\"
                                                       notification to contractor

  **payout.schedule.updated**   earnings-service       Invalidate balance cache
                                                       (schedule change may affect
                                                       reserve calculation)
  ------------------------------------------------------------------------------------

# **9. PS Document Map**

32 documents cover the full payout-service implementation. This is
PS-00.

  ---------------------------------------------------------------------------
  **Document**   **Title**
  -------------- ------------------------------------------------------------
  **PS-00**      Service Overview & Architecture (this document)

  **PS-01**      Database Schema & Entities

  **PS-02**      Withdrawal Initiation Endpoint

  **PS-03**      Magic Link Verification Flow

  **PS-04**      Payout Method Management Endpoints

  **PS-05**      Payout Schedule Configuration

  **PS-06**      Stripe Bank Payout Integration

  **PS-07**      Global Bank --- Manual Entry & Micro-Deposit Verification

  **PS-08**      PayPal Integration

  **PS-09**      Wise Integration

  **PS-10**      Payoneer Integration

  **PS-11**      Crypto Payout Integration (9 providers)

  **PS-12**      Marketeq Debit Card (feature-flagged placeholder)

  **PS-13**      TEQ Coin (feature-flagged placeholder)

  **PS-14**      Split Payout Logic

  **PS-15**      Scheduled Payout Engine

  **PS-16**      Instant Withdrawal Fee Logic

  **PS-17**      KYC Tier Enforcement

  **PS-18**      First Payout Hold Logic

  **PS-19**      RabbitMQ Consumer Implementation

  **PS-20**      RabbitMQ Publisher Implementation

  **PS-21**      Internal Balance Check Integration

  **PS-22**      Reserve Balance Logic

  **PS-23**      Payout Status & History Endpoints

  **PS-24**      Admin Endpoints & Support Access

  **PS-25**      Error States & HTTP Error Catalog

  **PS-26**      Edge Cases & Data Limitations

  **PS-27**      Currency Handling in Payouts

  **PS-28**      Observability & Monitoring

  **PS-29**      Security & Permissions

  **PS-30**      User Stories & Acceptance Criteria

  **PS-31**      Frontend Integration Guide

  **PS-32**      QA & Testing Guide
  ---------------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
payout-service PS-00 \| v1.0
