**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**earnings-service**

**ES-03 --- REST API: Internal Service-to-Service Endpoints**

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Service**         earnings-service

  **Document**        ES-03 --- REST API: Internal Service-to-Service
                      Endpoints

  **Version**         1.0

  **Status**          Draft --- Awaiting Engineering Review

  **Base Path**       /v1/internal/earnings

  **Auth**            X-Service-Token header --- shared secret, NOT a
                      contractor JWT

  **Callers**         payout-service, kyc-identity-service only

  **Network           Internal Docker/VPC network only --- never via
  exposure**          public API Gateway

  **Prerequisites**   ES-00, ES-01, ES-02

  **Next**            ES-04 --- RabbitMQ Consumer Implementation
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Purpose**                                                           |
|                                                                       |
| Defines the two internal REST endpoints in earnings-service consumed  |
| by other backend services.                                            |
|                                                                       |
| Endpoint 1 GET /v1/internal/earnings/balance/:userId                  |
|                                                                       |
| Called by payout-service before every withdrawal and scheduled        |
| deposit.                                                              |
|                                                                       |
| Returns available balance, reserve amount, and pending hold.          |
|                                                                       |
| Endpoint 2 GET /v1/internal/earnings/ytd/:userId                      |
|                                                                       |
| Called by kyc-identity-service for IRS \$600 YTD threshold            |
| monitoring.                                                           |
|                                                                       |
| Triggers W-9 / W-8BEN collection when threshold is crossed.           |
|                                                                       |
| Both endpoints authenticate via X-Service-Token (shared secret, not a |
| JWT).                                                                 |
|                                                                       |
| Both have independent per-IP rate limits enforced via Redis sliding   |
| window.                                                               |
|                                                                       |
| Not covered here: contractor-facing endpoints (ES-02), RabbitMQ       |
| events (ES-04/05),                                                    |
|                                                                       |
| KYC gating logic (kyc-identity-service owns that).                    |
+=======================================================================+

# **1. Prerequisites**

  ------------------------------------------------------------------------
  **Requirement**        **What it provides**             **Reference**
  ---------------------- -------------------------------- ----------------
  **ES-00**              Folder structure, full env var   Read first
                         list, service dependency map     

  **ES-01**              balance_snapshots and            Must be migrated
                         earnings_cache tables queried    
                         here                             

  **ES-02**              BalanceService.getBalanceRaw()   Implement first
                         and EarningsService used without 
                         modification                     
  ------------------------------------------------------------------------

# **2. Repo & Folder Placement**

+-----------------------------------------------------------------------+
| plaintext                                                             |
+-----------------------------------------------------------------------+
| apps/earnings-service/src/                                            |
|                                                                       |
| ├─ app.module.ts updated §8.5 --- adds InternalModule                 |
|                                                                       |
| ├─ guards/                                                            |
|                                                                       |
| │ ├─ jwt-auth.guard.ts ES-02                                          |
|                                                                       |
| │ └─ service-auth.guard.ts ← ES-03 NEW                                |
|                                                                       |
| ├─ internal/                                                          |
|                                                                       |
| │ ├─ internal.module.ts ← ES-03 NEW                                   |
|                                                                       |
| │ ├─ internal.controller.ts ← ES-03 NEW                               |
|                                                                       |
| │ └─ rate-limit.middleware.ts ← ES-03 NEW                             |
|                                                                       |
| ├─ balance/balance.service.ts ES-02 --- getBalanceRaw() added §8.2    |
|                                                                       |
| └─ earnings/earnings.service.ts ES-02 --- getYtd() added §8.3         |
+=======================================================================+

# **3. Environment Variables**

  --------------------------------------------------------------------------------------------------
  **Variable**                      **Required**   **Default**   **Description**
  --------------------------------- -------------- ------------- -----------------------------------
  **INTERNAL_SERVICE_TOKEN**        Yes            ---           Shared secret. Sent as
                                                                 X-Service-Token by all callers. Min
                                                                 64 chars. Rotate every 90 days.
                                                                 Must match the value set in
                                                                 payout-service and
                                                                 kyc-identity-service.

  **INTERNAL_RATE_LIMIT_BALANCE**   No             120           Max requests per minute to the
                                                                 balance endpoint, per caller IP.
                                                                 120 = 2 req/sec --- enough for
                                                                 concurrent withdrawal threads plus
                                                                 headroom.

  **INTERNAL_RATE_LIMIT_YTD**       No             60            Max requests per minute to the ytd
                                                                 endpoint, per caller IP.
                                                                 kyc-identity-service calls this
                                                                 infrequently; 60/min is generous.
  --------------------------------------------------------------------------------------------------

# **4. Service Authentication**

Internal endpoints do not use contractor JWTs. Every request must carry
a static shared secret in the X-Service-Token header. The guard uses
timing-safe comparison to prevent token enumeration attacks.

  -----------------------------------------------------------------------
  **Property**          **Value**
  --------------------- -------------------------------------------------
  **Header**            X-Service-Token: \<value of
                        INTERNAL_SERVICE_TOKEN\>

  **No \"Bearer\"       The value is sent raw --- not \"Bearer
  prefix**              \<token\>\"

  **Validation method** crypto.timingSafeEqual --- constant-time
                        comparison prevents timing attacks

  **Missing header**    401 {\"message\":\"Missing service token\"}

  **Wrong value**       401 {\"message\":\"Invalid service token\"}

  **Contractor JWT sent 401 --- length mismatch causes timingSafeEqual to
  by mistake**          short-circuit, fails

  **Rotation policy**   Every 90 days. Update all calling services
                        simultaneously.
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Network requirement --- this is the primary defence**               |
|                                                                       |
| Block /v1/internal/\* at the API Gateway / reverse proxy layer.       |
|                                                                       |
| The X-Service-Token check is a second line of defence, not the first. |
|                                                                       |
| If an external request reaches these endpoints, the network config is |
| wrong regardless of auth.                                             |
+=======================================================================+

### **src/guards/service-auth.guard.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/guards/service-auth.guard.ts                                   |
|                                                                       |
| import { Injectable, CanActivate, ExecutionContext,                   |
|                                                                       |
| UnauthorizedException } from \'@nestjs/common\';                      |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import { timingSafeEqual } from \'crypto\';                           |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class ServiceAuthGuard implements CanActivate {                |
|                                                                       |
| constructor(private readonly config: ConfigService) {}                |
|                                                                       |
| canActivate(ctx: ExecutionContext): boolean {                         |
|                                                                       |
| const req = ctx.switchToHttp().getRequest();                          |
|                                                                       |
| const token = req.headers\[\'x-service-token\'\] as string \|         |
| undefined;                                                            |
|                                                                       |
| if (!token) throw new UnauthorizedException(\'Missing service         |
| token\');                                                             |
|                                                                       |
| const expected =                                                      |
| this.config.get\<string\>(\'INTERNAL_SERVICE_TOKEN\');                |
|                                                                       |
| const a = Buffer.from(token, \'utf8\');                               |
|                                                                       |
| const b = Buffer.from(expected, \'utf8\');                            |
|                                                                       |
| // timingSafeEqual requires equal-length buffers.                     |
|                                                                       |
| const valid = a.length === b.length && timingSafeEqual(a, b);         |
|                                                                       |
| if (!valid) throw new UnauthorizedException(\'Invalid service         |
| token\');                                                             |
|                                                                       |
| return true;                                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **5. Rate Limiting**

Both endpoints use a Redis sliding-window rate limiter applied as NestJS
middleware. Limits are per caller IP. Exceeding the limit returns 429
with a Retry-After header.

  ----------------------------------------------------------------------------------------
  **Endpoint**          **Env var**                   **Default**   **Rationale**
  --------------------- ----------------------------- ------------- ----------------------
  **GET                 INTERNAL_RATE_LIMIT_BALANCE   120 req/min   Covers concurrent
  /balance/:userId**                                                withdrawal threads
                                                                    from payout-service
                                                                    batch jobs with
                                                                    headroom.

  **GET /ytd/:userId**  INTERNAL_RATE_LIMIT_YTD       60 req/min    kyc-identity-service
                                                                    calls this at most
                                                                    once per contractor
                                                                    per year crossing.
                                                                    60/min is generous.
  ----------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **429 response format**                                               |
|                                                                       |
| HTTP 429 Retry-After: \<seconds\>                                     |
|                                                                       |
| Body: {\"statusCode\":429,\"error\":\"Too Many                        |
| Requests\",\"message\":\"Rate limit exceeded. Retry after N           |
| seconds.\"}                                                           |
|                                                                       |
| Window: sliding (not fixed) --- prevents burst exploitation at window |
| boundaries.                                                           |
|                                                                       |
| Redis key: rate_limit:internal:{endpoint}:{ip} e.g.                   |
| rate_limit:internal:balance:10.0.0.5                                  |
+=======================================================================+

### **src/internal/rate-limit.middleware.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/internal/rate-limit.middleware.ts                              |
|                                                                       |
| // Sliding-window rate limiter backed by Redis sorted sets.           |
|                                                                       |
| import { Injectable, NestMiddleware, HttpException, HttpStatus } from |
| \'@nestjs/common\';                                                   |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import { Request, Response, NextFunction } from \'express\';          |
|                                                                       |
| import Redis from \'ioredis\';                                        |
|                                                                       |
| // Factory --- call forEndpoint(\'balance\', 120) or                  |
| forEndpoint(\'ytd\', 60).                                             |
|                                                                       |
| // Returns a class that can be applied with consumer.apply() in       |
| InternalModule.                                                       |
|                                                                       |
| export function buildRateLimitMiddleware(endpointKey: string,         |
| defaultLimit: number) {                                               |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| class RateLimitMiddleware implements NestMiddleware {                 |
|                                                                       |
| private redis: Redis;                                                 |
|                                                                       |
| constructor(private readonly config: ConfigService) {                 |
|                                                                       |
| this.redis = new Redis(this.config.get\<string\>(\'REDIS_URL\'));     |
|                                                                       |
| }                                                                     |
|                                                                       |
| async use(req: Request, res: Response, next: NextFunction) {          |
|                                                                       |
| const envKey =                                                        |
| \`INTERNAL_RATE_LIMIT\_\${endpointKey.toUpperCase()}\`;               |
|                                                                       |
| const limit = parseInt(this.config.get(envKey, String(defaultLimit)), |
| 10);                                                                  |
|                                                                       |
| const ip = (req.ip \|\| \'unknown\').replace(/\[\^\\w.:-\]/g,         |
| \'\_\');                                                              |
|                                                                       |
| const key = \`rate_limit:internal:\${endpointKey}:\${ip}\`;           |
|                                                                       |
| const now = Date.now();                                               |
|                                                                       |
| const window = 60_000; // 1 minute                                    |
|                                                                       |
| // Atomic pipeline: remove stale entries, add current, count, set     |
| TTL.                                                                  |
|                                                                       |
| const \[\[,\],\[,\],\[,count\]\] = await this.redis.pipeline()        |
|                                                                       |
| .zremrangebyscore(key, 0, now - window)                               |
|                                                                       |
| .zadd(key, now, \`\${now}:\${Math.random()}\`)                        |
|                                                                       |
| .zcard(key)                                                           |
|                                                                       |
| .expire(key, 60)                                                      |
|                                                                       |
| .exec() as any;                                                       |
|                                                                       |
| if (count \> limit) {                                                 |
|                                                                       |
| const retryAfter = Math.ceil(window / 1000);                          |
|                                                                       |
| res.setHeader(\'Retry-After\', retryAfter);                           |
|                                                                       |
| throw new HttpException(                                              |
|                                                                       |
| { statusCode: 429, error: \'Too Many Requests\',                      |
|                                                                       |
| message: \`Rate limit exceeded. Retry after \${retryAfter} seconds.\` |
| },                                                                    |
|                                                                       |
| HttpStatus.TOO_MANY_REQUESTS,                                         |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| next();                                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| return RateLimitMiddleware;                                           |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **6. Endpoint 1 --- GET /v1/internal/earnings/balance/:userId**

  -------------------------------------------------------------------------
  **GET**   **/v1/internal/earnings/balance/:userId**    X-Service-Token
  --------- -------------------------------------------- ------------------

  -------------------------------------------------------------------------

Called by payout-service before every withdrawal attempt and every
scheduled deposit execution. Returns available balance, reserve amount,
and pending hold. payout-service uses these values to determine whether
the requested withdrawal amount is fundable before writing any payout
record.

+-----------------------------------------------------------------------+
| **Call sequence --- manual withdrawal**                               |
|                                                                       |
| 1\. Contractor submits withdrawal → payout-service receives it        |
|                                                                       |
| 2\. payout-service calls GET /v1/internal/earnings/balance/:userId    |
|                                                                       |
| 3\. earnings-service returns availableBalance, reserveBalance,        |
| pendingHoldUsd                                                        |
|                                                                       |
| 4\. payout-service checks: requestedAmount + instantFee \<=           |
| availableBalance                                                      |
|                                                                       |
| 5\. Pass → payout-service writes payout record and fires ledger debit |
|                                                                       |
| 6\. Fail → payout-service returns INSUFFICIENT_FUNDS or               |
| RESERVE_BLOCKS_WITHDRAWAL                                             |
+=======================================================================+

## **6.1 Path Parameter**

  ---------------------------------------------------------------------------------------
  **Parameter**   **Type**   **Required**   **Description**
  --------------- ---------- -------------- ---------------------------------------------
  **:userId**     UUID       Yes            The contractorId. Supplied by payout-service
                                            from its own withdrawal request payload.
                                            Validated as UUID --- returns 400 if
                                            malformed.

  ---------------------------------------------------------------------------------------

## **6.2 Request Headers**

  --------------------------------------------------------------------------------
  **Header**             **Required**   **Value**
  ---------------------- -------------- ------------------------------------------
  **X-Service-Token**    Yes            Value of INTERNAL_SERVICE_TOKEN env var
                                        --- raw, no prefix

  **X-Caller-Service**   Recommended    \"payout-service\" --- logged for
                                        debugging and alerting
  --------------------------------------------------------------------------------

## **6.3 Response --- 200 OK**

+-----------------------------------------------------------------------+
| json                                                                  |
+-----------------------------------------------------------------------+
| // HTTP 200 OK                                                        |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"userId\": \"uuid\",                                                 |
|                                                                       |
| \"availableBalance\": \"567.00\", // USD --- withdrawable; already    |
| net of reserve & holds                                                |
|                                                                       |
| \"reserveBalance\": \"150.00\", // USD --- locked reserve; \$0.00     |
| when reserve is off                                                   |
|                                                                       |
| \"pendingHoldUsd\": \"0.00\", // USD --- first-payout hold or         |
| compliance hold                                                       |
|                                                                       |
| \"totalEarnedUsd\": \"4820.50\", // USD --- lifetime; convenience     |
| field for payout-service                                              |
|                                                                       |
| \"displayCurrency\": \"USD\", // contractor\'s chosen display         |
| currency                                                              |
|                                                                       |
| \"localCurrency\": \"INR\", // contractor\'s geo-detected local       |
| currency                                                              |
|                                                                       |
| \"lastUpdatedAt\": \"2025-06-10T14:32:00Z\"                           |
|                                                                       |
| }                                                                     |
+=======================================================================+

  --------------------------------------------------------------------------
  **Field**              **Type**   **Description**
  ---------------------- ---------- ----------------------------------------
  **userId**             UUID       Echoed from path --- confirms which
                         string     contractor this balance belongs to.

  **availableBalance**   numeric    Withdrawable balance in USD, already net
                         string     of reserve and pending holds.
                                    payout-service compares
                                    requestedAmount + fee against this
                                    value.

  **reserveBalance**     numeric    Amount locked as the contractor\'s
                         string     reserve. \$0.00 if reserve is off (the
                                    default). When non-zero, payout-service
                                    enforces: requestedAmount ≤
                                    availableBalance − reserveBalance,
                                    unless the contractor chose \"Ignore
                                    Reserve Balance\" for this transfer.

  **pendingHoldUsd**     numeric    Amount frozen and not withdrawable.
                         string     Includes the first-payout 5-business-day
                                    hold and any compliance holds. Already
                                    excluded from availableBalance ---
                                    included here so payout-service can
                                    surface an informative message.

  **totalEarnedUsd**     numeric    Lifetime total earned in USD.
                         string     Convenience field --- payout-service can
                                    skip calling the ytd endpoint for
                                    withdrawal pre-checks.
                                    kyc-identity-service uses the dedicated
                                    ytd endpoint for its own threshold
                                    monitoring.

  **displayCurrency**    string     ISO 4217. The contractor\'s
                                    displayCurrency from Settings.
                                    payout-service uses this when building
                                    withdrawal confirmation copy.

  **localCurrency**      string     ISO 4217. Geo-detected on each login.

  **lastUpdatedAt**      ISO 8601   When the balance last changed.
                                    payout-service should log a warning if
                                    this is more than 5 minutes old --- may
                                    indicate a stale cache or dead consumer.
  --------------------------------------------------------------------------

## **6.4 Zero-balance behaviour (new contractor)**

+-----------------------------------------------------------------------+
| **No balance_snapshots row exists**                                   |
|                                                                       |
| Returns 200 with all monetary fields as \"0.00\" --- NOT a 404.       |
|                                                                       |
| payout-service treats availableBalance \"0.00\" as                    |
| INSUFFICIENT_FUNDS.                                                   |
|                                                                       |
| Returning 200 avoids two success-path handling in the caller.         |
+=======================================================================+

## **6.5 Error Responses**

  -----------------------------------------------------------------------------------
  **Status**   **Code**           **Message**           **Cause**
  ------------ ------------------ --------------------- -----------------------------
  **400**      VALIDATION_ERROR   userId must be a      Path param is not a valid
                                  valid UUID            UUID

  **401**      UNAUTHORIZED       Missing service token X-Service-Token header absent

  **401**      UNAUTHORIZED       Invalid service token Token does not match
                                                        INTERNAL_SERVICE_TOKEN

  **429**      RATE_LIMITED       Rate limit exceeded.  Exceeded
                                  Retry after N         INTERNAL_RATE_LIMIT_BALANCE
                                  seconds.              req/min. Retry-After header
                                                        included.

  **500**      INTERNAL_ERROR     An unexpected error   Database unreachable
                                  occurred              
  -----------------------------------------------------------------------------------

# **7. Endpoint 2 --- GET /v1/internal/earnings/ytd/:userId**

  -------------------------------------------------------------------------
  **GET**   **/v1/internal/earnings/ytd/:userId**        X-Service-Token
  --------- -------------------------------------------- ------------------

  -------------------------------------------------------------------------

Called by kyc-identity-service to monitor year-to-date earnings for IRS
1099-NEC reporting. When a contractor\'s cumulative YTD earnings reach
or exceed \$600 USD in a calendar year, kyc-identity-service triggers
the tax identity verification flow --- W-9 for US contractors, W-8BEN
for international.

+-----------------------------------------------------------------------+
| **Call sequence --- IRS threshold monitoring**                        |
|                                                                       |
| 1\. earnings-service processes transaction.created, updates balance   |
|                                                                       |
| 2\. earnings-service checks if cumulative YTD \>= \$600 (logic in     |
| ES-05 publisher)                                                      |
|                                                                       |
| 3\. If crossed: earnings-service publishes earnings.threshold.reached |
| event                                                                 |
|                                                                       |
| 4\. kyc-identity-service consumes event, calls GET                    |
| /v1/internal/earnings/ytd/:userId                                     |
|                                                                       |
| to get precise current total before deciding what verification to     |
| trigger                                                               |
|                                                                       |
| 5\. kyc-identity-service initiates W-9 (US) or W-8BEN (international) |
| flow                                                                  |
+=======================================================================+

## **7.1 Path Parameter**

  ---------------------------------------------------------------------------------------
  **Parameter**   **Type**   **Required**   **Description**
  --------------- ---------- -------------- ---------------------------------------------
  **:userId**     UUID       Yes            The contractorId.

  ---------------------------------------------------------------------------------------

## **7.2 Query Parameter**

  ---------------------------------------------------------------------------------
  **Parameter**   **Type**   **Default**   **Validation**   **Description**
  --------------- ---------- ------------- ---------------- -----------------------
  **year**        integer    Current UTC   2000 ≤ year ≤    Calendar year to sum
                             year          current year + 1 earnings for (YYYY).
                                                            kyc-identity-service
                                                            may query prior years
                                                            for amended 1099
                                                            filings.

  ---------------------------------------------------------------------------------

## **7.3 Request Headers**

  --------------------------------------------------------------------------------
  **Header**             **Required**   **Value**
  ---------------------- -------------- ------------------------------------------
  **X-Service-Token**    Yes            Value of INTERNAL_SERVICE_TOKEN

  **X-Caller-Service**   Recommended    \"kyc-identity-service\"
  --------------------------------------------------------------------------------

## **7.4 Response --- 200 OK**

+-----------------------------------------------------------------------+
| json                                                                  |
+-----------------------------------------------------------------------+
| // HTTP 200 OK                                                        |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"userId\": \"uuid\",                                                 |
|                                                                       |
| \"year\": 2025,                                                       |
|                                                                       |
| \"ytdTotalUsd\": \"647.50\", // sum of confirmed net_amount_usd       |
| within this calendar year                                             |
|                                                                       |
| \"thresholdUsd\": 600.00, // IRS 1099-NEC threshold --- always \$600, |
| never varies                                                          |
|                                                                       |
| \"thresholdReached\": true, // true when ytdTotalUsd \>= 600.00       |
|                                                                       |
| \"lastEarningAt\": \"2025-06-10T11:05:00Z\" // most recent earnings   |
| entry in this year; null if none                                      |
|                                                                       |
| }                                                                     |
+=======================================================================+

  --------------------------------------------------------------------------
  **Field**              **Type**   **Description**
  ---------------------- ---------- ----------------------------------------
  **userId**             UUID       Echoed from path.
                         string     

  **year**               integer    Calendar year being reported. Echoed
                                    from query param.

  **ytdTotalUsd**        numeric    Sum of all confirmed net_amount_usd
                         string     where workStartAt falls in the requested
                                    year. Reversed entries excluded.

  **thresholdUsd**       number     Always 600.00. IRS 1099-NEC reporting
                                    threshold. Hard-coded --- does not vary
                                    per contractor, year, or jurisdiction.

  **thresholdReached**   boolean    true when parseFloat(ytdTotalUsd) \>=
                                    600.00. kyc-identity-service uses this
                                    to decide whether to trigger tax
                                    verification.

  **lastEarningAt**      ISO 8601   Timestamp of the most recent confirmed
                         \| null    earnings entry in the requested year.
                                    null when there are no earnings.
  --------------------------------------------------------------------------

## **7.5 Zero-earnings behaviour**

+-----------------------------------------------------------------------+
| **No earnings for the requested year**                                |
|                                                                       |
| Returns 200 with ytdTotalUsd: \"0.00\" and thresholdReached: false    |
| --- NOT a 404.                                                        |
|                                                                       |
| lastEarningAt will be null.                                           |
|                                                                       |
| kyc-identity-service should take no action.                           |
+=======================================================================+

## **7.6 Error Responses**

  ----------------------------------------------------------------------------------
  **Status**   **Code**           **Message**           **Cause**
  ------------ ------------------ --------------------- ----------------------------
  **400**      INVALID_YEAR       year must be an       year param out of range or
                                  integer between 2000  not an integer
                                  and current year + 1  

  **400**      VALIDATION_ERROR   userId must be a      Path param malformed
                                  valid UUID            

  **401**      UNAUTHORIZED       Missing service token Header absent

  **401**      UNAUTHORIZED       Invalid service token Token mismatch

  **429**      RATE_LIMITED       Rate limit exceeded.  Exceeded
                                  Retry after N         INTERNAL_RATE_LIMIT_YTD
                                  seconds.              req/min

  **500**      INTERNAL_ERROR     An unexpected error   Database unreachable
                                  occurred              
  ----------------------------------------------------------------------------------

# **8. Full Implementation Code**

## **8.1 src/balance/balance.service.ts --- add getBalanceRaw()**

Add this method to the existing BalanceService class from ES-02. No
other changes needed.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Add to BalanceService in src/balance/balance.service.ts            |
|                                                                       |
| async getBalanceRaw(userId: string): Promise\<BalanceSnapshot \|      |
| null\> {                                                              |
|                                                                       |
| return this.repo.findOne({ where: { contractorId: userId } });        |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **8.2 src/earnings/earnings.service.ts --- add getYtd()**

Add this method to the existing EarningsService class from ES-02. Ensure
BadRequestException is imported from \@nestjs/common.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Add to EarningsService in src/earnings/earnings.service.ts         |
|                                                                       |
| async getYtd(userId: string, year: number) {                          |
|                                                                       |
| const currentYear = new Date().getUTCFullYear();                      |
|                                                                       |
| if (!Number.isInteger(year) \|\| year \< 2000 \|\| year \>            |
| currentYear + 1) {                                                    |
|                                                                       |
| throw new BadRequestException(\'year must be an integer between 2000  |
| and current year + 1\');                                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| const from = new Date(\`\${year}-01-01T00:00:00Z\`);                  |
|                                                                       |
| const to = new Date(\`\${year}-12-31T23:59:59.999Z\`);                |
|                                                                       |
| const row = await this.earningsRepo                                   |
|                                                                       |
| .createQueryBuilder(\'ec\')                                           |
|                                                                       |
| .select(\'COALESCE(SUM(CAST(ec.netAmountUsd AS numeric)), 0)\',       |
| \'ytd\')                                                              |
|                                                                       |
| .addSelect(\'MAX(ec.createdAt)\', \'lastEarning\')                    |
|                                                                       |
| .where(\'ec.contractorId = :uid\', { uid: userId })                   |
|                                                                       |
| .andWhere(\'ec.status = :s\', { s: \'confirmed\' })                   |
|                                                                       |
| .andWhere(\'ec.workStartAt \>= :from\', { from })                     |
|                                                                       |
| .andWhere(\'ec.workStartAt \<= :to\', { to })                         |
|                                                                       |
| .getRawOne();                                                         |
|                                                                       |
| const ytd = parseFloat(row?.ytd ?? \'0\');                            |
|                                                                       |
| return {                                                              |
|                                                                       |
| userId,                                                               |
|                                                                       |
| year,                                                                 |
|                                                                       |
| ytdTotalUsd: ytd.toFixed(2),                                          |
|                                                                       |
| thresholdUsd: 600.00,                                                 |
|                                                                       |
| thresholdReached: ytd \>= 600.00,                                     |
|                                                                       |
| lastEarningAt: row?.lastEarning ? new                                 |
| Date(row.lastEarning).toISOString() : null,                           |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **8.3 src/internal/internal.module.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/internal/internal.module.ts                                    |
|                                                                       |
| import { Module, MiddlewareConsumer, RequestMethod } from             |
| \'@nestjs/common\';                                                   |
|                                                                       |
| import { ConfigModule } from \'@nestjs/config\';                      |
|                                                                       |
| import { InternalController } from \'./internal.controller\';         |
|                                                                       |
| import { buildRateLimitMiddleware } from \'./rate-limit.middleware\'; |
|                                                                       |
| import { BalanceModule } from \'../balance/balance.module\';          |
|                                                                       |
| import { EarningsModule } from \'../earnings/earnings.module\';       |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[ConfigModule, BalanceModule, EarningsModule\],             |
|                                                                       |
| controllers: \[InternalController\],                                  |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class InternalModule {                                         |
|                                                                       |
| configure(consumer: MiddlewareConsumer) {                             |
|                                                                       |
| consumer                                                              |
|                                                                       |
| .apply(buildRateLimitMiddleware(\'balance\', 120))                    |
|                                                                       |
| .forRoutes({ path: \'v1/internal/earnings/balance/\*\', method:       |
| RequestMethod.GET });                                                 |
|                                                                       |
| consumer                                                              |
|                                                                       |
| .apply(buildRateLimitMiddleware(\'ytd\', 60))                         |
|                                                                       |
| .forRoutes({ path: \'v1/internal/earnings/ytd/\*\', method:           |
| RequestMethod.GET });                                                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **8.4 src/internal/internal.controller.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/internal/internal.controller.ts                                |
|                                                                       |
| import {                                                              |
|                                                                       |
| Controller, Get, Param, Query, UseGuards, HttpCode,                   |
|                                                                       |
| ParseUUIDPipe, ParseIntPipe, DefaultValuePipe,                        |
|                                                                       |
| } from \'@nestjs/common\';                                            |
|                                                                       |
| import { ServiceAuthGuard } from \'../guards/service-auth.guard\';    |
|                                                                       |
| import { BalanceService } from \'../balance/balance.service\';        |
|                                                                       |
| import { EarningsService } from \'../earnings/earnings.service\';     |
|                                                                       |
| // /v1/internal/earnings/\* --- internal callers only.                |
|                                                                       |
| // X-Service-Token required on every route (ServiceAuthGuard).        |
|                                                                       |
| // Rate limiting applied via middleware in InternalModule.            |
|                                                                       |
| // These routes MUST NOT be reachable via the public API Gateway.     |
|                                                                       |
| \@Controller(\'v1/internal/earnings\')                                |
|                                                                       |
| \@UseGuards(ServiceAuthGuard)                                         |
|                                                                       |
| export class InternalController {                                     |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| private readonly balanceSvc: BalanceService,                          |
|                                                                       |
| private readonly earningsSvc: EarningsService,                        |
|                                                                       |
| ) {}                                                                  |
|                                                                       |
| // GET /v1/internal/earnings/balance/:userId                          |
|                                                                       |
| // Called by payout-service before every withdrawal / scheduled       |
| deposit.                                                              |
|                                                                       |
| \@Get(\'balance/:userId\')                                            |
|                                                                       |
| \@HttpCode(200)                                                       |
|                                                                       |
| async getBalance(@Param(\'userId\', ParseUUIDPipe) userId: string) {  |
|                                                                       |
| const snap = await this.balanceSvc.getBalanceRaw(userId);             |
|                                                                       |
| if (!snap) {                                                          |
|                                                                       |
| // New contractor --- no earnings yet. Return zeros.                  |
|                                                                       |
| // payout-service must treat availableBalance \'0.00\' as             |
| INSUFFICIENT_FUNDS.                                                   |
|                                                                       |
| return {                                                              |
|                                                                       |
| userId,                                                               |
|                                                                       |
| availableBalance: \'0.00\', reserveBalance: \'0.00\',                 |
|                                                                       |
| pendingHoldUsd: \'0.00\', totalEarnedUsd: \'0.00\',                   |
|                                                                       |
| displayCurrency: \'USD\', localCurrency: \'USD\',                     |
|                                                                       |
| lastUpdatedAt: new Date().toISOString(),                              |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| return {                                                              |
|                                                                       |
| userId,                                                               |
|                                                                       |
| availableBalance: snap.availableBalance,                              |
|                                                                       |
| // reserveBalance synced via payout.schedule.updated event --- ES-04. |
|                                                                       |
| // Until that consumer is live this returns \'0.00\'.                 |
|                                                                       |
| reserveBalance: \'0.00\',                                             |
|                                                                       |
| pendingHoldUsd: snap.pendingHoldUsd,                                  |
|                                                                       |
| totalEarnedUsd: snap.totalEarnedUsd,                                  |
|                                                                       |
| displayCurrency: snap.displayCurrency,                                |
|                                                                       |
| localCurrency: snap.localCurrency,                                    |
|                                                                       |
| lastUpdatedAt: snap.updatedAt.toISOString(),                          |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // GET /v1/internal/earnings/ytd/:userId?year=YYYY                    |
|                                                                       |
| // Called by kyc-identity-service for IRS \$600 threshold monitoring. |
|                                                                       |
| \@Get(\'ytd/:userId\')                                                |
|                                                                       |
| \@HttpCode(200)                                                       |
|                                                                       |
| async getYtd(                                                         |
|                                                                       |
| \@Param(\'userId\', ParseUUIDPipe) userId: string,                    |
|                                                                       |
| \@Query(\'year\', new DefaultValuePipe(new Date().getUTCFullYear()),  |
| ParseIntPipe)                                                         |
|                                                                       |
| year: number,                                                         |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| return this.earningsSvc.getYtd(userId, year);                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **8.5 src/app.module.ts --- add InternalModule**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/app.module.ts --- updated (add InternalModule import)          |
|                                                                       |
| import { Module } from \'@nestjs/common\';                            |
|                                                                       |
| import { ConfigModule } from \'@nestjs/config\';                      |
|                                                                       |
| import { DatabaseModule } from \'./database/database.module\';        |
|                                                                       |
| import { BalanceModule } from \'./balance/balance.module\';           |
|                                                                       |
| import { EarningsModule } from \'./earnings/earnings.module\';        |
|                                                                       |
| import { InternalModule } from \'./internal/internal.module\'; // ←   |
| added                                                                 |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[                                                           |
|                                                                       |
| ConfigModule.forRoot({ isGlobal: true }),                             |
|                                                                       |
| DatabaseModule, BalanceModule, EarningsModule,                        |
|                                                                       |
| InternalModule, // ← added                                            |
|                                                                       |
| \],                                                                   |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class AppModule {}                                             |
+=======================================================================+

# **9. Verification**

Run after starting the service. Replace TOKEN with the actual
INTERNAL_SERVICE_TOKEN value and USER_ID with a real contractor UUID.

## **Balance endpoint --- happy path**

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| curl -s \\                                                            |
|                                                                       |
| -H \'X-Service-Token: YOUR_TOKEN\' \\                                 |
|                                                                       |
| -H \'X-Caller-Service: payout-service\' \\                            |
|                                                                       |
| http://localhost:3010/v1/internal/earnings/balance/CONTRACTOR_UUID \| |
| jq .                                                                  |
|                                                                       |
| \# 200 --- availableBalance, reserveBalance, pendingHoldUsd,          |
| lastUpdatedAt present                                                 |
|                                                                       |
| \# New contractor (no balance record):                                |
|                                                                       |
| \# 200 --- all monetary fields are \'0.00\'                           |
+=======================================================================+

## **YTD endpoint --- happy path**

+------------------------------------------------------------------------------+
| bash                                                                         |
+------------------------------------------------------------------------------+
| \# Default year (current):                                                   |
|                                                                              |
| curl -s -H \'X-Service-Token: YOUR_TOKEN\' \\                                |
|                                                                              |
| http://localhost:3010/v1/internal/earnings/ytd/CONTRACTOR_UUID \| jq .       |
|                                                                              |
| \# 200 --- ytdTotalUsd, thresholdReached, lastEarningAt present              |
|                                                                              |
| \# Specific year:                                                            |
|                                                                              |
| curl -s -H \'X-Service-Token: YOUR_TOKEN\' \\                                |
|                                                                              |
| \'http://localhost:3010/v1/internal/earnings/ytd/CONTRACTOR_UUID?year=2024\' |
| \| jq .                                                                      |
|                                                                              |
| \# 200 --- year: 2024 in response                                            |
|                                                                              |
| \# Invalid year:                                                             |
|                                                                              |
| curl -s -H \'X-Service-Token: YOUR_TOKEN\' \\                                |
|                                                                              |
| \'http://localhost:3010/v1/internal/earnings/ytd/CONTRACTOR_UUID?year=1999\' |
| \| jq .                                                                      |
|                                                                              |
| \# 400 INVALID_YEAR                                                          |
+==============================================================================+

## **Auth failure cases**

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| \# Missing token:                                                     |
|                                                                       |
| curl -s http://localhost:3010/v1/internal/earnings/balance/UUID \| jq |
| .                                                                     |
|                                                                       |
| \# 401 {\"message\":\"Missing service token\"}                        |
|                                                                       |
| \# Wrong token:                                                       |
|                                                                       |
| curl -s -H \'X-Service-Token: wrong\' \\                              |
|                                                                       |
| http://localhost:3010/v1/internal/earnings/balance/UUID \| jq .       |
|                                                                       |
| \# 401 {\"message\":\"Invalid service token\"}                        |
|                                                                       |
| \# Contractor JWT sent by mistake (should also fail):                 |
|                                                                       |
| curl -s -H \'X-Service-Token: eyJhbGci\...\' \\                       |
|                                                                       |
| http://localhost:3010/v1/internal/earnings/balance/UUID \| jq .       |
|                                                                       |
| \# 401 {\"message\":\"Invalid service token\"}                        |
+=======================================================================+

## **Rate limit verification**

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| \# Fire 130 requests --- first 120 should be 200, 121+ should be 429: |
|                                                                       |
| for i in \$(seq 1 130); do                                            |
|                                                                       |
| curl -s -o /dev/null -w \'%{http_code}\\n\' \\                        |
|                                                                       |
| -H \'X-Service-Token: YOUR_TOKEN\' \\                                 |
|                                                                       |
| http://localhost:3010/v1/internal/earnings/balance/UUID               |
|                                                                       |
| done                                                                  |
|                                                                       |
| \# Confirm Retry-After header is present on 429 responses:            |
|                                                                       |
| curl -v -H \'X-Service-Token: YOUR_TOKEN\' \\                         |
|                                                                       |
| http://localhost:3010/v1/internal/earnings/balance/UUID 2\>&1 \| grep |
| -i retry                                                              |
+=======================================================================+

## **Confirm endpoint is NOT reachable via API Gateway**

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| \# This must fail at the network layer --- must NOT reach             |
| earnings-service:                                                     |
|                                                                       |
| curl -s https://api.marketeq.com/v1/internal/earnings/balance/UUID    |
|                                                                       |
| \# Expected: 404 from gateway or connection refused                   |
|                                                                       |
| \# If this returns 401 from earnings-service, the Gateway is          |
| misconfigured.                                                        |
+=======================================================================+

# **10. References**

  ---------------------------------------------------------------------------
  **Document**               **Relationship to ES-03**
  -------------------------- ------------------------------------------------
  **ES-00 --- Service        Dependency map showing payout-service and
  Overview**                 kyc-identity-service as consumers of internal
                             endpoints

  **ES-01 --- Database       balance_snapshots and earnings_cache tables
  Schema**                   queried by both endpoints

  **ES-02 --- Contractor     BalanceService and EarningsService first defined
  Endpoints**                here; ES-03 adds two methods to each, no other
                             changes

  **ES-04 --- RabbitMQ       payout.schedule.updated consumer will sync
  Consumers**                reserveBalance to earnings-service, making the
                             balance endpoint\'s reserveBalance field
                             accurate

  **ES-05 --- RabbitMQ       earnings.threshold.reached event published at
  Publishers**               \$600 YTD crossing; triggers
                             kyc-identity-service to call the ytd endpoint

  **ES-07 --- Redis          Balance endpoint can optionally be fronted by
  Caching**                  Redis cache; implementation in ES-07

  **payout-service PS-02**   Withdrawal flow that calls GET
                             /v1/internal/earnings/balance/:userId

  **kyc-identity-service**   IRS threshold monitoring that calls GET
                             /v1/internal/earnings/ytd/:userId
  ---------------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
earnings-service ES-03 \| v1.0
