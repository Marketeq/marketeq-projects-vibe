**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**Earnings Service**

**Doc 00 --- Service Overview & Architecture**

  -----------------------------------------------------------------------
  **Property**       **Value**
  ------------------ ----------------------------------------------------
  **Service Name**   earnings-service

  **Document**       Doc 00 --- Overview & Architecture

  **Version**        1.0

  **Status**         Draft --- Awaiting Engineering Review

  **Monorepo Path**  apps/earnings-service/src/

  **Port**           3010 (suggested --- confirm with DevOps)

  **Primary          TypeScript / NestJS
  Language**         

  **Database**       PostgreSQL (host via DATABASE_URL env var)

  **Cache**          Redis

  **Message Broker** RabbitMQ

  **Related          transaction-service, payout-service, user-service,
  Services**         contracts-service, kyc-identity-service,
                     notification-service, time-tracking-service
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Document Scope**                                                    |
|                                                                       |
| This document covers the complete service overview, architectural     |
| role, service boundaries, dependency map, folder structure,           |
|                                                                       |
| environment variables, and cross-service event contracts for          |
| earnings-service.                                                     |
|                                                                       |
| It is the starting point for all engineers working on this service.   |
| Read this before opening any other earnings-service document.         |
|                                                                       |
| What this document does NOT cover: database schema (Doc 01), API      |
| endpoints (Doc 02), RabbitMQ consumers (Doc 03),                      |
|                                                                       |
| currency conversion implementation (Doc 04), or deployment            |
| configuration (Doc 05).                                               |
+=======================================================================+

# **1. Purpose & Responsibility**

earnings-service is the contractor-facing financial display layer. It is
responsible for one thing: showing contractors accurate, up-to-date
information about what they have earned, what is available for
withdrawal, and their full earnings history --- all in their chosen
display currency.

+-----------------------------------------------------------------------+
| **Core Responsibility --- One Sentence**                              |
|                                                                       |
| earnings-service reads financial records, converts them for display,  |
| and serves the Earnings tab UI.                                       |
|                                                                       |
| It never writes to the ledger. It never moves money. It never         |
| initiates a payout.                                                   |
|                                                                       |
| All writes and money movement belong exclusively to payout-service    |
| and transaction-service.                                              |
+=======================================================================+

## **1.1 What earnings-service owns**

- Available balance calculation --- the contractor\'s current spendable
  balance (ledger credits minus debits minus reserve minus pending
  holds)

- Earnings history display --- paginated list of all earnings events
  with amounts, dates, project/task labels, and status

- Currency conversion display --- converting stored amounts to the
  contractor\'s displayCurrency using live fawazahmed0 FX rates

- Earnings aggregation --- daily, weekly, monthly, and all-time totals
  for the Overview tab cards

- Export --- CSV and PDF generation of contractor earnings history

- Redis caching --- contractor balance cached for fast Overview tab
  load, invalidated on new earnings or payout events

## **1.2 What earnings-service does NOT own**

+-----------------------------------------------------------------------+
| **Hard Boundaries --- Do Not Cross These in Code**                    |
|                                                                       |
| ✗ No ledger writes --- earnings-service never writes to the           |
| transactions table in transaction-service.                            |
|                                                                       |
| ✗ No payout initiation --- all withdrawal and transfer logic belongs  |
| to payout-service.                                                    |
|                                                                       |
| ✗ No deposit method management --- payout-service owns all connected  |
| bank accounts, wallets, and OAuth tokens.                             |
|                                                                       |
| ✗ No KYC gating logic --- kyc-identity-service owns all payout        |
| eligibility checks.                                                   |
|                                                                       |
| ✗ No contract data --- contracts-service owns all contract records.   |
| earnings-service reads contractId from events only.                   |
|                                                                       |
| ✗ No time entry management --- time-tracking-service owns all hours   |
| and screenshot records.                                               |
|                                                                       |
| ✗ No billing of clients --- billing-service and checkout-service own  |
| all client-side financial flows.                                      |
+=======================================================================+

# **2. Architectural Role**

earnings-service sits between the transaction ledger and the
contractor-facing UI. It is a read-optimised projection layer --- it
does not own source-of-truth financial data but maintains a fast,
display-ready view of it.

## **2.1 Full Money Flow --- Where earnings-service fits**

+-----------------------------------------------------------------------------+
| CLIENT PAYS                                                                 |
|                                                                             |
| │                                                                           |
|                                                                             |
| ▼                                                                           |
|                                                                             |
| billing-service                                                             |
| ──────────────────────────────────────────────────────────────              |
|                                                                             |
| Charges client via Stripe. Publishes billing.payment.confirmed event.       |
|                                                                             |
| │                                                                           |
|                                                                             |
| ▼                                                                           |
|                                                                             |
| time-tracking-service                                                       |
| ─────────────────────────────────────────────────────────                   |
|                                                                             |
| Aggregates approved hours into billing periods. Captures hourlyRate from    |
|                                                                             |
| contracts-service. Captures FX rate snapshot from fawazahmed0 API.          |
|                                                                             |
| Publishes timetracking.hours.logged event with full financial payload.      |
|                                                                             |
| │                                                                           |
|                                                                             |
| ▼                                                                           |
|                                                                             |
| transaction-service                                                         |
| ────────────────────────────────────────────────────────────                |
|                                                                             |
| SOURCE OF TRUTH. Writes immutable CREDIT ledger entry. Idempotency-safe.    |
|                                                                             |
| Publishes transaction.created event.                                        |
|                                                                             |
| │                                                                           |
|                                                                             |
| ├────────────────────────────────────────────────────────────────────────── |
|                                                                             |
| ▼ ▼                                                                         |
|                                                                             |
| earnings-service (THIS SERVICE) payout-service                              |
|                                                                             |
| Consumes transaction.created. Initiates money movement.                     |
|                                                                             |
| Updates contractor\'s displayed balance. Reads balance from                 |
| earnings-service.                                                           |
|                                                                             |
| Converts amounts to displayCurrency. Publishes payout.completed event.      |
|                                                                             |
| Caches balance in Redis. │                                                  |
|                                                                             |
| Serves Earnings tab via REST API. ▼                                         |
|                                                                             |
| │ earnings-service                                                          |
|                                                                             |
| ▼ Consumes payout.completed.                                                |
|                                                                             |
| CONTRACTOR SEES UPDATED Decrements displayed balance.                       |
|                                                                             |
| EARNINGS DASHBOARD                                                          |
+=============================================================================+

## **2.2 Data flow summary**

  ----------------------------------------------------------------------------------------------
  **Step**   **Source**              **Event / Call**            **What Happens**
  ---------- ----------------------- --------------------------- -------------------------------
  **1**      time-tracking-service   timetracking.hours.logged   Hours are approved, rate is
                                     →transaction-service        locked, FX snapshot captured,
                                                                 event published

  **2**      transaction-service     transaction.created         Immutable ledger entry written,
                                     →earnings-service           downstream event published

  **3**      earnings-service        Consumes                    Balance cache updated,
                                     transaction.created         available balance recalculated

  **4**      Contractor              GET /v1/earnings/balance    Redis cache hit returns balance
                                                                 in displayCurrency in \<10ms

  **5**      Contractor              POST /v1/payouts/withdraw   Withdrawal initiated,
                                     (payout-service)            payout-service reads balance
                                                                 from earnings-service

  **6**      payout-service          payout.completed            earnings-service decrements
                                     →earnings-service           balance cache, shows updated
                                                                 figure
  ----------------------------------------------------------------------------------------------

# **3. Service Dependencies**

## **3.1 Services earnings-service depends on (reads from)**

  ----------------------------------------------------------------------------------------------------------------
  **Service**                    **What earnings-service     **How it reads it** **Notes**
                                 reads**                                         
  ------------------------------ --------------------------- ------------------- ---------------------------------
  **transaction-service**        Ledger entries              Consumes RabbitMQ   earnings-service NEVER writes to
                                 (CREDIT/DEBIT               events              transaction-service tables
                                 records)Paginated           (primary)Direct DB  
                                 transaction historyEarnings read via shared     
                                 aggregates                  schema (secondary,  
                                                             read-only)          

  **user-service**               displayCurrency             REST API: GET       displayCurrency determines all
                                 (contractor\'s chosen       /v1/users/:idJWT    currency conversion. Must be
                                 display                     sub claim for       fetched on session start and
                                 currency)localCurrency      userId              cached per user.
                                 (auto-detected)hourlyRate                       
                                 (profile rate --- for                           
                                 display only)userId,                            
                                 fullName, role                                  

  **contracts-service**          contractId (to label        REST API: GET       earnings-service reads contract
                                 earnings by                 /v1/contracts/:id   data for display labeling only.
                                 contract)contractStatus                         It does not enforce contract
                                 (active/ended --- for                           rules.
                                 display)rate + rateCurrency                     
                                 (locked contract rate ---                       
                                 for display context)                            

  **fawazahmed0/exchange-api**   Live FX rates for           HTTP GET to         DISPLAY ONLY. The rate used for
                                 displayCurrency conversion  self-hosted         actual earnings calculation was
                                                             instanceCached in   snapshotted at
                                                             Redis (1-hour TTL)  timetracking.hours.logged time
                                                                                 and is stored in the ledger. This
                                                                                 FX rate is only for converting
                                                                                 the displayed balance.

  **Redis**                      Contractor balance cacheFX  Redis GET/SET       Cache keys: balance:{userId},
                                 rate cacheSession-scoped                        fx:{fromCurrency}:{toCurrency},
                                 currency preference                             currency:{userId}
  ----------------------------------------------------------------------------------------------------------------

## **3.2 Services that depend on earnings-service**

  --------------------------------------------------------------------------------------------
  **Service**                **What it reads from               **How**
                             earnings-service**                 
  -------------------------- ---------------------------------- ------------------------------
  **payout-service**         Available balance before           REST API: GET
                             initiating a withdrawalReserve     /v1/earnings/balance/:userId
                             balance amount                     (internal, service-to-service
                                                                auth)

  **kyc-identity-service**   Cumulative earnings total (for     REST API: GET
                             1099 threshold monitoring)         /v1/earnings/ytd/:userId
                                                                (internal)

  **notification-service**   None directly --- earnings-service RabbitMQ event:
                             publishes events that              earnings.balance.updated
                             notification-service consumes      
  --------------------------------------------------------------------------------------------

## **3.3 RabbitMQ events earnings-service consumes**

  ----------------------------------------------------------------------------------------------------
  **Exchange**                **Routing Key**        **Published By**      **Action Taken**
  --------------------------- ---------------------- --------------------- ---------------------------
  **marketeq.transactions**   transaction.created    transaction-service   Increment balance cache.
                                                                           Queue balance
                                                                           recalculation.

  **marketeq.transactions**   transaction.reversed   transaction-service   Decrement balance cache.
                                                                           Publish
                                                                           earnings.balance.updated.

  **marketeq.payouts**        payout.completed       payout-service        Decrement balance by payout
                                                                           amount. Update cache.

  **marketeq.payouts**        payout.failed          payout-service        No balance change. Log
                                                                           warning. Notify contractor
                                                                           via earnings.payout.failed
                                                                           event.

  **marketeq.contracts**      contract.activated     contracts-service     Store contractId → talentId
                                                                           mapping for earnings
                                                                           labeling.

  **marketeq.contracts**      contract.ended         contracts-service     Mark contract as ended in
                                                                           local label cache. No
                                                                           balance impact.
  ----------------------------------------------------------------------------------------------------

## **3.4 RabbitMQ events earnings-service publishes**

  --------------------------------------------------------------------------------------------
  **Exchange**            **Routing Key**              **Consumed By**         **When
                                                                               Published**
  ----------------------- ---------------------------- ----------------------- ---------------
  **marketeq.earnings**   earnings.balance.updated     notification-service,   After any
                                                       payout-service          balance change
                                                                               (credit, debit,
                                                                               payout)

  **marketeq.earnings**   earnings.threshold.reached   kyc-identity-service    When
                                                                               contractor\'s
                                                                               YTD earnings
                                                                               cross \$600 USD
                                                                               equivalent
  --------------------------------------------------------------------------------------------

# **4. Folder Structure**

earnings-service follows the confirmed Marketeq monorepo structure. All
service code lives under apps/earnings-service/src/. No code lives at
the repo root.

+-----------------------------------------------------------------------+
| apps/earnings-service/                                                |
|                                                                       |
| ├─ Dockerfile                                                         |
|                                                                       |
| ├─ package.json                                                       |
|                                                                       |
| └─ src/                                                               |
|                                                                       |
| ├─ app.module.ts ← Root module, registers all sub-modules             |
|                                                                       |
| ├─ main.ts ← Bootstrap, global pipes, guards                          |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├─ balance/ ← Available balance calculation + caching                 |
|                                                                       |
| │ ├─ balance.module.ts                                                |
|                                                                       |
| │ ├─ balance.service.ts                                               |
|                                                                       |
| │ ├─ balance.controller.ts                                            |
|                                                                       |
| │ └─ dto/                                                             |
|                                                                       |
| │ └─ balance-response.dto.ts                                          |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├─ earnings/ ← Earnings history, aggregates, export                   |
|                                                                       |
| │ ├─ earnings.module.ts                                               |
|                                                                       |
| │ ├─ earnings.service.ts                                              |
|                                                                       |
| │ ├─ earnings.controller.ts                                           |
|                                                                       |
| │ ├─ entities/                                                        |
|                                                                       |
| │ │ └─ earnings-cache.entity.ts ← Local read-model (mirrors ledger    |
| subset)                                                               |
|                                                                       |
| │ └─ dto/                                                             |
|                                                                       |
| │ ├─ earnings-list.dto.ts                                             |
|                                                                       |
| │ ├─ earnings-summary.dto.ts                                          |
|                                                                       |
| │ └─ earnings-export.dto.ts                                           |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├─ consumers/ ← RabbitMQ event consumers                              |
|                                                                       |
| │ ├─ consumers.module.ts                                              |
|                                                                       |
| │ ├─ transaction-created.consumer.ts                                  |
|                                                                       |
| │ ├─ transaction-reversed.consumer.ts                                 |
|                                                                       |
| │ ├─ payout-completed.consumer.ts                                     |
|                                                                       |
| │ ├─ payout-failed.consumer.ts                                        |
|                                                                       |
| │ └─ contract-activated.consumer.ts                                   |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├─ currency/ ← FX rate fetching + caching + conversion                |
|                                                                       |
| │ ├─ currency.module.ts                                               |
|                                                                       |
| │ ├─ currency.service.ts                                              |
|                                                                       |
| │ └─ fx-rate-cache.service.ts                                         |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├─ export/ ← CSV and PDF earnings export                              |
|                                                                       |
| │ ├─ export.module.ts                                                 |
|                                                                       |
| │ └─ export.service.ts                                                |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├─ publishers/ ← RabbitMQ event publishers                            |
|                                                                       |
| │ ├─ publishers.module.ts                                             |
|                                                                       |
| │ └─ earnings-events.publisher.ts                                     |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├─ guards/                                                            |
|                                                                       |
| │ ├─ jwt-auth.guard.ts ← Validates JWT from API Gateway               |
|                                                                       |
| │ └─ service-auth.guard.ts ← Service-to-service internal auth         |
|                                                                       |
| │                                                                     |
|                                                                       |
| └─ config/                                                            |
|                                                                       |
| └─ earnings.config.ts ← Typed config from env vars                    |
+=======================================================================+

# **5. Environment Variables**

All configuration is injected via environment variables. No secrets are
hardcoded. The service will fail to start if required variables are
missing.

  -------------------------------------------------------------------------------------------------------------------------------
  **Variable**                    **Required**   **Description**                 **Example**
  ------------------------------- -------------- ------------------------------- ------------------------------------------------
  **DATABASE_URL**                ✅ Yes         PostgreSQL connection string.   postgresql://user:pass@localhost:5432/earnings
                                                 Host is not locked --- can be   
                                                 self-hosted Supabase, AWS RDS,  
                                                 or any Postgres-compatible      
                                                 instance.                       

  **REDIS_URL**                   ✅ Yes         Redis connection string for     redis://localhost:6379
                                                 balance and FX rate caching.    

  **RABBITMQ_URL**                ✅ Yes         RabbitMQ connection string.     amqp://guest:guest@localhost:5672

  **JWT_SECRET**                  ✅ Yes         Shared secret for JWT           (secret --- never commit to repo)
                                                 validation. Must match API      
                                                 Gateway and all other services. 

  **INTERNAL_SERVICE_TOKEN**      ✅ Yes         Bearer token for                (secret --- never commit to repo)
                                                 service-to-service calls        
                                                 (payout-service reading         
                                                 balance). Rotate regularly.     

  **FX_API_URL**                  ✅ Yes         Base URL of the self-hosted     https://fx.internal.marketeq.com/v1
                                                 fawazahmed0/exchange-api        
                                                 instance.                       

  **FX_CACHE_TTL_SECONDS**        No             How long to cache FX rates in   3600
                                                 Redis. Default: 3600 (1 hour).  

  **BALANCE_CACHE_TTL_SECONDS**   No             How long to cache contractor    300
                                                 balance in Redis. Default: 300  
                                                 (5 min). Invalidated on events  
                                                 regardless of TTL.              

  **PORT**                        No             HTTP port for the service.      3010
                                                 Default: 3010.                  

  **NODE_ENV**                    No             Runtime environment. Affects    production
                                                 logging verbosity and error     
                                                 detail.                         

  **LOG_LEVEL**                   No             Logging level. Default: info.   info
                                                 Use debug for local dev.        

  **EXPORT_MAX_ROWS_SYNC**        No             Max rows for synchronous        5000
                                                 export. Requests above this are 
                                                 queued async. Default: 5000.    

  **EXPORT_S3_BUCKET**            No             Cloudflare R2 bucket name for   marketeq-exports
                                                 async export file storage.      

  **CLOUDFLARE_R2_ENDPOINT**      No (required   R2 endpoint URL.                https://\<account\>.r2.cloudflarestorage.com
                                  for async                                      
                                  export)                                        

  **CLOUDFLARE_R2_ACCESS_KEY**    No (required   R2 access key.                  (secret)
                                  for async                                      
                                  export)                                        

  **CLOUDFLARE_R2_SECRET_KEY**    No (required   R2 secret key.                  (secret)
                                  for async                                      
                                  export)                                        
  -------------------------------------------------------------------------------------------------------------------------------

# **6. Currency Architecture**

+-----------------------------------------------------------------------+
| **This is one of the most important things to understand about        |
| earnings-service**                                                    |
|                                                                       |
| There are TWO separate currency concepts in this system. Confusing    |
| them causes billing errors.                                           |
|                                                                       |
| 1\. STORED CURRENCY (in the ledger, in contracts-service) --- set at  |
| transaction time, NEVER changes.                                      |
|                                                                       |
| 2\. DISPLAY CURRENCY (in earnings-service responses) --- converts     |
| stored amounts for presentation, changes based on user settings.      |
+=======================================================================+

## **6.1 The two currency fields on user-service**

  --------------------------------------------------------------------------------
  **Field**             **Set By**       **Meaning**           **Used For**
  --------------------- ---------------- --------------------- -------------------
  **localCurrency**     Auto-detected    The ISO 4217 currency Default value for
                        from geolocation code for the          displayCurrency at
                        (MaxMind) at     contractor\'s         signup. Shown as
                        signup. Stored   physical location.    \'Your local
                        on user entity.  E.g. \'INR\' for      currency\' in
                                         India, \'NGN\' for    Settings.
                                         Nigeria.              

  **displayCurrency**   Contractor sets  The currency the      ALL display amounts
                        manually in      contractor wants to   in
                        Settings.        SEE their balance and earnings-service.
                        Defaults to      earnings displayed    The balance,
                        localCurrency.   in. Can differ from   history amounts,
                                         localCurrency.        and cards all
                                                               convert to this
                                                               currency.
  --------------------------------------------------------------------------------

## **6.2 How rates interact with currency**

  ---------------------------------------------------------------------------------------
  **Rate Type**      **Where Stored**       **Currency**                **Changes?**
  ------------------ ---------------------- --------------------------- -----------------
  **Profile hourly   user-service:          displayCurrency at time of  Yes ---
  rate**             hourlyRate             profile edit                contractor can
                                                                        update their
                                                                        profile rate
                                                                        anytime

  **Contract rate**  contracts-service:     displayCurrency at time of  No --- LOCKED
                     rate + rateCurrency    contract creation           forever. Changing
                                                                        profile rate does
                                                                        not affect
                                                                        existing
                                                                        contracts.

  **Ledger credit    transaction-service:   Currency from the           No --- immutable
  amount**           amount + currency      timetracking.hours.logged   ledger entry
                                            event (always the           
                                            contract\'s rateCurrency)   

  **Display amount** earnings-service       Converted to contractor\'s  Yes --- changes
                     response               current displayCurrency     as contractor
                                            using live FX rate          switches
                                                                        displayCurrency
  ---------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Gap to Resolve in contracts-service Before Doc 01**                 |
|                                                                       |
| The current contracts-service data model stores rate (a number) but   |
| has no rateCurrency field.                                            |
|                                                                       |
| This means the contract amount has no currency denomination --- which |
| makes earnings calculation ambiguous.                                 |
|                                                                       |
| RECOMMENDATION: Add rateCurrency (varchar, ISO 4217) to the contracts |
| table.                                                                |
|                                                                       |
| This field should be captured from the talent\'s displayCurrency at   |
| the time the contract is created.                                     |
|                                                                       |
| It is immutable after contract activation --- just like the rate      |
| itself.                                                               |
|                                                                       |
| This addition must be made to contracts-service documentation before  |
| earnings-service Doc 01 is written.                                   |
+=======================================================================+

## **6.3 FX rate usage --- display vs billing**

  -----------------------------------------------------------------------------------------
  **Use Case**         **Rate Source**             **Rate Timing** **Who Uses It**
  -------------------- --------------------------- --------------- ------------------------
  **Billing the        Rate snapshotted from       At transaction  time-tracking-service,
  client**             fawazahmed0 API at the      time --- stored billing-service
                       exact moment                in ledger       
                       timetracking.hours.logged   permanently     
                       event fires                                 

  **Displaying balance Live rate fetched from      At display time earnings-service only
  in                   self-hosted fawazahmed0 API --- refreshed   
  earnings-service**   instance, cached in Redis   hourly          
                       for 1 hour                                  

  **Export PDF/CSV**   Same as display --- current At export time  earnings-service export
                       live rate at export time                    module

  **Historical         Live rate at time of API    At API call     earnings-service
  earnings list        call (approximate)          time            
  amounts**                                                        
  -----------------------------------------------------------------------------------------

# **7. Authentication & Authorization**

## **7.1 JWT validation**

All public-facing endpoints require a valid JWT issued by auth-service
and validated at the API Gateway. earnings-service re-validates the JWT
on every request.

+-----------------------------------------------------------------------+
| // JWT payload structure (from auth-service)                          |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"sub\": \"user-uuid\", // userId --- matches users.id in             |
| user-service                                                          |
|                                                                       |
| \"role\": \"contractor\", // \"contractor\" \| \"client\" \|          |
| \"admin\"                                                             |
|                                                                       |
| \"email\": \"user@email.com\",                                        |
|                                                                       |
| \"iat\": 1696159200,                                                  |
|                                                                       |
| \"exp\": 1696166400                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // earnings-service guard checks:                                     |
|                                                                       |
| // 1. Token is valid and not expired                                  |
|                                                                       |
| // 2. role === \'contractor\' for all contractor-facing endpoints     |
|                                                                       |
| // 3. sub matches the :userId param (contractors can only see their   |
| own data)                                                             |
+=======================================================================+

## **7.2 Service-to-service authentication**

Internal endpoints (e.g. payout-service reading a contractor\'s balance)
use a shared INTERNAL_SERVICE_TOKEN bearer token, not a user JWT. These
endpoints are not accessible via the API Gateway --- they are
internal-only.

## **7.3 Role rules**

  ----------------------------------------------------------------------------
  **Role**         **Access Level**                   **Notes**
  ---------------- ---------------------------------- ------------------------
  **contractor**   Full access to own earnings data   Most endpoints. Enforced
                   only. Cannot access another        by matching JWT sub to
                   contractor\'s data.                requested userId.

  **client**       No access to earnings-service.     Clients have no
                                                      earnings. All client
                                                      financial data lives in
                                                      billing-service.

  **admin**        Read access to any contractor\'s   Admin endpoints require
                   earnings for support purposes.     role === \'admin\' in
                                                      JWT.

  **service**      Internal endpoints only.           Used by payout-service
                   Identified by                      and
                   INTERNAL_SERVICE_TOKEN.            kyc-identity-service.
  ----------------------------------------------------------------------------

# **8. Key Design Decisions & Rationale**

  ------------------------------------------------------------------------------------
  **Decision**                   **What Was Decided**     **Why**
  ------------------------------ ------------------------ ----------------------------
  **Read-only service**          earnings-service never   Separates display bugs from
                                 writes to                financial integrity bugs. A
                                 transaction-service. It  bad query in
                                 maintains its own        earnings-service cannot
                                 read-model only.         corrupt the ledger.

  **Separate from                earnings-service and     Display logic and money
  payout-service**               payout-service are two   movement have different risk
                                 distinct services.       profiles, scaling needs, and
                                                          deployment cadences. A
                                                          payout-service outage should
                                                          not take down the earnings
                                                          dashboard.

  **Redis balance cache**        Available balance is     The balance query (SUM of
                                 cached in Redis, not     all ledger entries for a
                                 calculated on every      user) is expensive at scale.
                                 request.                 Cache is invalidated on
                                                          every relevant event.

  **Rate snapshot in ledger**    The FX rate used for     Ensures financial accuracy.
                                 billing is stored in the Stored rate = what was
                                 ledger entry, not        actually used for billing.
                                 recalculated at display  Display rate = approximate
                                 time.                    live conversion for UI.

  **fawazahmed0/exchange-api**   Selected over            200+ currencies, fully open
                                 Frankfurter (limited to  source, no rate limits, no
                                 \~33 currencies) and     API key, self-hostable.
                                 paid APIs.               Covers all contractor
                                                          locales globally.

  **Self-hosted FX instance**    FX API is self-hosted,   Eliminates external API
                                 not called from the      dependency for a critical
                                 public internet.         display path. No rate
                                                          limits, no downtime risk
                                                          from public API.

  **Database host agnostic**     DATABASE_URL used --- no Engineering team is
                                 Supabase, AWS, or any    evaluating hosting options.
                                 vendor locked in.        Docs should not need to
                                                          change when the host
                                                          changes.

  **No Plaid**                   Bank account             Plaid and Stripe cannot be
                                 verification uses Stripe used simultaneously. Stripe
                                 Financial Connections    Financial Connections covers
                                 only.                    all required verification
                                                          flows.
  ------------------------------------------------------------------------------------

# **9. Document Series --- What Comes Next**

  ----------------------------------------------------------------------------
  **Doc**   **Title**                **Status**   **Depends On**
  --------- ------------------------ ------------ ----------------------------
  **Doc     Service Overview &       ✅ Complete  ---
  00**      Architecture (this                    
            document)                             

  **Doc     Database Schema &        Ready to     contracts-service
  01**      Entities                 write        rateCurrency gap must be
                                                  resolved first

  **Doc     REST API Endpoints       Ready to     Doc 01 schema
  02**                               write        

  **Doc     RabbitMQ Consumers &     Ready to     time-tracking alignment
  03**      Event Handling           write        analysis (complete)

  **Doc     Currency Conversion      Ready to     fawazahmed0 self-hosted
  04**      Implementation           write        setup

  **Doc     Redis Caching Strategy   Ready to     Doc 01, Doc 03
  05**                               write        

  **Doc     Export (CSV & PDF)       After core   Cloudflare R2 setup
  06**                               docs         

  **Doc     Error Handling & Edge    After core   All endpoints defined
  07**      Cases                    docs         

  **Doc     Security & Permissions   After core   kyc-identity-service Doc 00
  08**      (detailed)               docs         

  **Doc     Deployment & Environment Last         DevOps confirms hosting
  09**      Setup                                 
  ----------------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
earnings-service Doc 00 \| v1.0
