PS-00

**Service Overview & Repo Placement**

Service: pricing-service

Marketeq Backend --- marketeq-projects-nestjs

# **1. Purpose**

pricing-service is a new microservice introduced in the job listing
sprint. It is the single authoritative source for all rate and pricing
data on the Marketeq platform. Every service that needs to know what a
role costs, what the budget calculator should display, or what the price
guide hover modal should show calls pricing-service.

pricing-service owns four distinct concerns: platform average hourly
rates by role, region, experience level, and work schedule; budget
estimation from scope inputs; price guide range display (low, median,
high) for the Step 4 team table; and currency conversion using the
shared fawazahmed0/exchange-api instance already used by
earnings-service and payout-service.

> *Important: pricing-service is read-heavy. It does not own any write
> operations initiated by clients. The only writes it performs are
> internal --- updating the PlatformRateAverage cache from
> transaction-service data via a daily scheduled job. All client-facing
> operations are reads served from Redis cache.*

# **2. Responsibilities**

  -----------------------------------------------------------------------
  **Responsibility**     **Description**
  ---------------------- ------------------------------------------------
  Platform Rate Averages Store and serve the median, low, and high hourly
                         rates for every role-region-experience-schedule
                         combination on the platform. Rates are derived
                         from transaction-service historical data and
                         updated daily by an internal scheduled job.
                         Served to listings-service for the Step 4 budget
                         calculator.

  Price Guide Data       Serve the three-tier price guide (Low / Median /
                         High) for the hourly estimate hover modal on the
                         Step 4 team member table. The same endpoint that
                         powers the budget calculator also powers the
                         price guide modal --- the difference is in how
                         the frontend renders the response.

  Budget Calculation     Accept a scope or team table input and return
                         the total estimated budget in USD cents. Applies
                         rate data to each role and aggregates.
                         listings-service calls this as part of the
                         real-time budget calculator in Step 4.

  Currency Conversion    Convert amounts between currencies using the
                         shared fawazahmed0/exchange-api self-hosted
                         instance. Returns the converted amount in the
                         target currency. Exchange rates are cached in
                         Redis with a 1-hour TTL. Used when the client\'s
                         display currency is not USD.

  FX Rate Cache          Maintain a Redis cache of all active exchange
                         rates. Refreshed every hour from the primary FX
                         API. Falls back to Frankfurter.app
                         (https://api.frankfurter.app) when the primary
                         is unreachable. Returns a stale-data indicator
                         when serving from cache older than the TTL.

  Rate Cache Refresh     A daily NestJS scheduled task queries
                         transaction-service for the latest completed
                         payout data and updates the PlatformRateAverage
                         records. Rate records older than 24 hours are
                         flagged as stale and served with a stale
                         indicator to the caller.
  -----------------------------------------------------------------------

# **3. What pricing-service Does Not Own**

- Individual talent hourly rates --- user-service or the talent profile
  owns a talent member\'s configured rate. pricing-service only owns
  platform-wide averages derived from completed transaction data.

- Invoice generation or billing logic --- billing-service owns invoices.
  pricing-service provides the rate inputs used in billing calculations
  but does not generate invoices.

- Payment processing --- checkout-service and Stripe own payment.
  pricing-service only provides rate data.

- Platform fee calculation --- the platform fee percentage is a business
  configuration. pricing-service provides gross rates only. Platform
  fees are applied by billing-service. Pricing-service never discloses
  the platform fee to the client.

- Salary data or market benchmarking --- platform averages are derived
  exclusively from Marketeq transaction history. pricing-service does
  not integrate external salary databases.

# **4. Callers**

  -----------------------------------------------------------------------
  **Caller**            **What It Calls pricing-service For**
  --------------------- -------------------------------------------------
  listings-service      GET /v1/rates --- fetch role rate data for the
                        Step 4 budget calculator and price guide hover
                        modal. POST /v1/budget/calculate --- compute the
                        estimated total budget for a scope or team table.
                        GET /v1/currency/convert --- convert budget
                        amounts to the client\'s display currency.

  transaction-service   pricing-service calls transaction-service via its
  (internal, consumed   daily scheduled job to pull historical payout
  by pricing-service)   data for rate average computation. This is a
                        one-way dependency --- transaction-service never
                        calls pricing-service.
  -----------------------------------------------------------------------

> *Important: pricing-service is an internal service. No frontend
> requests reach it directly. All calls come from other backend services
> via internal HTTP. There is no public API gateway route to
> pricing-service.*

# **5. Rate Data Flow**

Understanding how rate data moves through the system is essential before
implementing pricing-service. The flow has two directions:

## **5.1 Inbound --- Rate Refresh (Daily)**

> NestJS \@Cron job (pricing-service)
>
> ↓ calls transaction-service
>
> GET /v1/transactions/rate-averages?sinceDate={90daysAgo}
>
> ↓ receives aggregated payout amounts by role, region, experience,
> schedule
>
> ↓ computes low, median, high percentiles from the distribution
>
> ↓ upserts PlatformRateAverage records in PostgreSQL
>
> ↓ invalidates Redis cache for updated rate keys
>
> ↓ logs completion with count of updated records

## **5.2 Outbound --- Rate Serving (On Request)**

> listings-service (Step 4 budget calculator)
>
> ↓ GET
> /v1/rates?role=UX+Designer&location=United+States&experience=mid&schedule=full_time
>
> ↓ pricing-service checks Redis cache
>
> └ Cache hit → returns cached rate with cache_hit: true
>
> └ Cache miss → queries PostgreSQL, writes to Redis, returns rate
>
> ↓ listings-service uses hourlyMedianUsdCents for budget calculation
>
> ↓ listings-service renders Low/Median/High in price guide hover modal

## **5.3 FX Rate Flow**

> NestJS \@Cron job (pricing-service) --- every hour
>
> ↓ calls fawazahmed0/exchange-api (self-hosted)
>
> └ On failure → calls Frankfurter.app fallback
>
> ↓ receives all active exchange rates against USD
>
> ↓ writes rates to Redis with 3600s TTL
>
> On GET /v1/currency/convert request:
>
> ↓ reads rate from Redis (cache hit expected)
>
> └ Cache miss → fetches from FX API directly
>
> ↓ applies conversion formula: result = amount \* rate
>
> ↓ rounds to 2 decimal places for display
>
> ↓ returns converted amount with source_currency, target_currency,
> rate, fetched_at

# **6. Repo Placement**

pricing-service is a new service added to the monorepo under
apps/pricing-service/. It follows the standard Marketeq microservice
layout.

> marketeq-projects-nestjs/
>
> └─ apps/
>
> └─ pricing-service/
>
> ├─ Dockerfile
>
> ├─ Supabase.yaml
>
> ├─ package.json
>
> └─ src/
>
> ├─ main.ts
>
> ├─ app.module.ts
>
> ├─ data-source.ts
>
> ├─ rates/
>
> │ ├─ rates.module.ts
>
> │ ├─ controllers/
>
> │ │ └─ rates.controller.ts
>
> │ ├─ services/
>
> │ │ ├─ rates.service.ts
>
> │ │ └─ rates-refresh.service.ts
>
> │ ├─ dto/
>
> │ │ ├─ get-rates-query.dto.ts
>
> │ │ └─ rates-response.dto.ts
>
> │ └─ entities/
>
> │ └─ platform-rate-average.entity.ts
>
> ├─ budget/
>
> │ ├─ budget.module.ts
>
> │ ├─ controllers/
>
> │ │ └─ budget.controller.ts
>
> │ ├─ services/
>
> │ │ └─ budget.service.ts
>
> │ └─ dto/
>
> │ ├─ calculate-budget.dto.ts
>
> │ └─ budget-response.dto.ts
>
> ├─ currency/
>
> │ ├─ currency.module.ts
>
> │ ├─ controllers/
>
> │ │ └─ currency.controller.ts
>
> │ ├─ services/
>
> │ │ ├─ currency.service.ts
>
> │ │ └─ fx-cache.service.ts
>
> │ ├─ dto/
>
> │ │ ├─ convert-currency.dto.ts
>
> │ │ └─ currency-response.dto.ts
>
> │ └─ entities/
>
> │ └─ currency-rate.entity.ts
>
> ├─ health/
>
> │ └─ health.controller.ts
>
> └─ config/
>
> └─ redis.config.ts

# **7. Module Overview**

  -----------------------------------------------------------------------
  **Module**      **Owns**
  --------------- -------------------------------------------------------
  rates/          PlatformRateAverage entity, rate query endpoint, Redis
                  cache for rates, daily refresh scheduled job that
                  queries transaction-service. Powers the Step 4 budget
                  calculator and price guide hover modal.

  budget/         Budget calculation endpoint. Accepts a list of
                  role-hour inputs, fetches the rate for each from
                  RatesService, returns the total in USD cents. Used by
                  listings-service for real-time budget auto-update.

  currency/       CurrencyRate entity, exchange rate fetch from
                  fawazahmed0/exchange-api and Frankfurter.app fallback,
                  Redis cache for FX rates (1-hour TTL), convert
                  endpoint. Used when client display currency is not USD.

  health/         GET /health endpoint. Returns { status: \"ok\" }.

  config/         Redis client factory (redis.config.ts). Shared by
                  RatesService and CurrencyService for cache reads and
                  writes.
  -----------------------------------------------------------------------

# **8. Stale Data Handling**

pricing-service is always available even when upstream data sources
(transaction-service and the FX API) are temporarily unreachable. When
serving stale data the response includes indicators the caller uses to
show appropriate UI states.

  -----------------------------------------------------------------------------
  **Scenario**       **Response**            **UI Behaviour in
                                             listings-service**
  ------------------ ----------------------- ----------------------------------
  Rate data fresh    Rate returned normally. Budget calculator shows amount. No
  (\< 24h old)       is_stale: false.        indicator.

  Rate data stale    Rate returned from      Budget calculator shows amount
  (\>= 24h old)      cache. is_stale: true.  with a stale indicator icon and a
                     stale_since timestamp   Refresh button. Clicking Refresh
                     included.               triggers a new GET /v1/rates call.

  No rate data for   hourlyMedianUsdCents:   Budget calculator shows a dash
  role/region        null. is_stale: false.  (---) for that role. Price guide
  combination        no_data: true.          modal shows \"No data available
                                             for this combination.\"

  FX rate fresh (\<  Converted amount        Budget displayed in client
  1h old)            returned normally.      currency with no indicator.

  FX rate stale      Last known rate used.   Budget displayed with stale
  (primary and       is_stale: true.         currency indicator.
  fallback both                              
  failed)                                    
  -----------------------------------------------------------------------------

# **9. Quick Start Links**

  -----------------------------------------------------------------------
  **Doc**      **Title & What It Covers**
  ------------ ----------------------------------------------------------
  PS-00        Service Overview & Repo Placement --- this document.

  PS-01        Docker & Runtime Setup --- Dockerfile, env vars, health
               check, local dev, Supabase deployment.

  PS-02        Folder Structure & Bootstrapping --- main.ts,
               app.module.ts, module wiring, Redis config.

  PS-03        Data Models & DTOs --- PlatformRateAverage entity,
               CurrencyRate entity, all DTOs.

  PS-04        API Endpoints --- GET /v1/rates, POST
               /v1/budget/calculate, GET /v1/currency/convert, GET
               /v1/currency/rates.

  PS-05        Integrations & Events --- fawazahmed0/exchange-api
               integration, Frankfurter.app fallback, transaction-service
               rate data pull, Redis cache strategy.

  PS-06        Observability & Health --- /health endpoint, logging, key
               metrics, alert thresholds.

  PS-07        QA & Test Data --- test cases for rate queries, budget
               calculation, currency conversion, stale data handling.
  -----------------------------------------------------------------------

# **10. References**

- JL-00 --- Sprint Architecture Overview --- pricing-service in the full
  service dependency map

- JL-02 --- listings-service Docker & Runtime Setup ---
  PRICING_SERVICE_URL environment variable

- JL-07 --- Scope Table Business Logic --- how listings-service uses
  pricing-service rate data for budget calculation

- SD-07 --- Currency and Budget Display Rules --- business rules for how
  budgets are displayed and converted

- Marketeq Core Backend --- Technical Architecture Overview &
  Documentation Standards
