**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**earnings-service**

ES-17 --- Security & Permissions

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        ES-17 --- Security & Permissions

  **Version**         1.0

  **Auth model**      JWT (contractor-facing) + X-Service-Token (internal
                      service-to-service)

  **Data isolation**  contractorId always from JWT sub --- never from
                      query params or body

  **Rate limiting**   Redis sliding window per endpoint per caller

  **Audit log**       Every admin access to contractor earnings data
                      logged to audit_log table

  **Prerequisites**   ES-02, ES-03, ES-10, ES-15
  -----------------------------------------------------------------------

# **1. Contractor Data Isolation Rules**

Every query against earnings_cache and balance_snapshots is scoped to a
single contractorId. That contractorId is sourced exclusively from the
JWT sub claim --- never from a URL parameter, query string, or request
body. This is enforced at the service layer, not the controller layer.

  ------------------------------------------------------------------------------------------
  **Rule**             **Implementation**                      **Where enforced**
  -------------------- --------------------------------------- -----------------------------
  **contractorId       JwtAuthGuard extracts sub and attaches  BalanceService,
  always from JWT**    to request.user. Service methods        EarningsService --- method
                       receive contractorId as a parameter     signatures accept
                       from the controller, which reads it     contractorId: string, never
                       from req.user.sub.                      read from context

  **Never trust URL    GET /v1/earnings/:id --- entry is       EarningsService.getDetail()
  param for            fetched by id AND contractorId. A match --- WHERE id = :id AND
  isolation**          on id alone is not sufficient.          contractor_id = :contractorId

  **Cross-contractor   If the entry exists but belongs to a    EarningsService.getDetail()
  access returns 403** different contractor, throw 403         --- explicit contractorId
                       ERR_EARNINGS_ENTRY_ACCESS_DENIED ---    ownership check before
                       not 404. 404 would leak existence       returning data
                       information.                            

  **Internal endpoints GET                                     ServiceAuthGuard validates
  use userId path      /v1/internal/earnings/balance/:userId   token before any userId is
  param**              --- userId is trusted only after        read
                       X-Service-Token validation. The calling 
                       service is responsible for supplying    
                       the correct userId.                     

  **No contractor can  Even with a valid JWT, a contractor     Enforced by service layer ---
  query another        cannot pass another contractorId        no public endpoint accepts
  contractor**         anywhere in the request. The            contractorId as input
                       contractorId is injected from the token 
                       only.                                   
  ------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Isolation regression test requirement**                             |
|                                                                       |
| Every PR touching BalanceService or EarningsService must include a    |
| test that:                                                            |
|                                                                       |
| 1\. Creates earnings for contractor A                                 |
|                                                                       |
| 2\. Authenticates as contractor B                                     |
|                                                                       |
| 3\. Asserts 403 (not 200, not 404) when contractor B attempts to      |
| access contractor A\'s entry ID                                       |
|                                                                       |
| This test must be in the integration test suite, not just unit tests. |
+=======================================================================+

# **2. JWT Claim Validation Per Endpoint**

JwtAuthGuard validates the token and extracts claims. RolesGuard checks
the role claim. Both must pass before any service method is called.
Guards are applied at the controller level.

## **2.1 Required JWT claims**

  --------------------------------------------------------------------------------------------
  **Claim**             **Type**    **Required value**       **Behaviour if missing or
                                                             invalid**
  --------------------- ----------- ------------------------ ---------------------------------
  **sub**               UUID string Any valid UUID ---       401
                                    becomes contractorId     ERR_EARNINGS_AUTH_MISSING_TOKEN
                                                             if header absent;
                                                             ERR_EARNINGS_AUTH_INVALID_TOKEN
                                                             if malformed

  **role**              string      \"contractor\" for all   403 ERR_EARNINGS_WRONG_ROLE
                                    /v1/earnings/\*          
                                    endpoints                

  **exp**               Unix        Must be in the future    401
                        timestamp                            ERR_EARNINGS_AUTH_TOKEN_EXPIRED

  **iat**               Unix        Must be in the past      401
                        timestamp   (clock skew tolerance:   ERR_EARNINGS_AUTH_INVALID_TOKEN
                                    30s)                     

  **displayCurrency**   ISO 4217    Any valid 3-letter code  Falls back to \"USD\" if absent
                        string      --- used as default      or invalid --- no rejection
                                    currency param           

  **localCurrency**     ISO 4217    Any valid 3-letter code  Falls back to displayCurrency if
                        string      --- used for             absent --- no rejection
                                    availableBalanceLocal    
  --------------------------------------------------------------------------------------------

## **2.2 JWT validation implementation**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/guards/jwt-auth.guard.ts                                       |
|                                                                       |
| import { CanActivate, ExecutionContext, Injectable,                   |
|                                                                       |
| UnauthorizedException } from \'@nestjs/common\';                      |
|                                                                       |
| import { JwtService } from \'@nestjs/jwt\';                           |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import { EarningsError } from \'../errors/earnings.error\';           |
|                                                                       |
| import { HttpStatus } from \'@nestjs/common\';                        |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class JwtAuthGuard implements CanActivate {                    |
|                                                                       |
| constructor(private jwt: JwtService, private config: ConfigService)   |
| {}                                                                    |
|                                                                       |
| canActivate(ctx: ExecutionContext): boolean {                         |
|                                                                       |
| const req = ctx.switchToHttp().getRequest();                          |
|                                                                       |
| const auth = req.headers\[\'authorization\'\] ?? \'\';                |
|                                                                       |
| if (!auth.startsWith(\'Bearer \')) {                                  |
|                                                                       |
| throw new EarningsError(\'Authentication is required. Please log in   |
| and try again.\',                                                     |
|                                                                       |
| HttpStatus.UNAUTHORIZED, \'ERR_EARNINGS_AUTH_MISSING_TOKEN\');        |
|                                                                       |
| }                                                                     |
|                                                                       |
| const token = auth.slice(7);                                          |
|                                                                       |
| let payload: any;                                                     |
|                                                                       |
| try {                                                                 |
|                                                                       |
| payload = this.jwt.verify(token, {                                    |
|                                                                       |
| secret: this.config.get(\'JWT_SECRET\'),                              |
|                                                                       |
| clockTolerance: 30, // 30s clock skew tolerance                       |
|                                                                       |
| });                                                                   |
|                                                                       |
| } catch (e: any) {                                                    |
|                                                                       |
| const code = e.name === \'TokenExpiredError\'                         |
|                                                                       |
| ? \'ERR_EARNINGS_AUTH_TOKEN_EXPIRED\'                                 |
|                                                                       |
| : \'ERR_EARNINGS_AUTH_INVALID_TOKEN\';                                |
|                                                                       |
| const msg = e.name === \'TokenExpiredError\'                          |
|                                                                       |
| ? \'Your session has expired. Please log in again.\'                  |
|                                                                       |
| : \'Your session token is invalid. Please log in again.\';            |
|                                                                       |
| throw new EarningsError(msg, HttpStatus.UNAUTHORIZED, code);          |
|                                                                       |
| }                                                                     |
|                                                                       |
| req.user = {                                                          |
|                                                                       |
| sub: payload.sub,                                                     |
|                                                                       |
| role: payload.role,                                                   |
|                                                                       |
| displayCurrency: payload.displayCurrency ?? \'USD\',                  |
|                                                                       |
| localCurrency: payload.localCurrency ?? payload.displayCurrency ??    |
| \'USD\',                                                              |
|                                                                       |
| };                                                                    |
|                                                                       |
| return true;                                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // src/guards/roles.guard.ts                                          |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class RolesGuard implements CanActivate {                      |
|                                                                       |
| canActivate(ctx: ExecutionContext): boolean {                         |
|                                                                       |
| const req = ctx.switchToHttp().getRequest();                          |
|                                                                       |
| if (req.user?.role !== \'contractor\') {                              |
|                                                                       |
| throw new EarningsError(\'You do not have permission to access this   |
| resource.\',                                                          |
|                                                                       |
| HttpStatus.FORBIDDEN, \'ERR_EARNINGS_WRONG_ROLE\');                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| return true;                                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **2.3 Endpoint auth matrix**

  --------------------------------------------------------------------------------------------------
  **Endpoint**                              **Guard**          **Role required** **contractorId
                                                                                 source**
  ----------------------------------------- ------------------ ----------------- -------------------
  **GET /v1/earnings/balance**              JwtAuthGuard +     contractor        JWT sub
                                            RolesGuard                           

  **GET /v1/earnings**                      JwtAuthGuard +     contractor        JWT sub
                                            RolesGuard                           

  **GET /v1/earnings/summary**              JwtAuthGuard +     contractor        JWT sub
                                            RolesGuard                           

  **GET /v1/earnings/:id**                  JwtAuthGuard +     contractor        JWT sub --- plus
                                            RolesGuard                           ownership check in
                                                                                 service

  **GET /v1/earnings/export**               JwtAuthGuard +     contractor        JWT sub
                                            RolesGuard                           

  **GET                                     ServiceAuthGuard   X-Service-Token   URL :userId ---
  /v1/internal/earnings/balance/:userId**                                        trusted after token
                                                                                 validation

  **GET /v1/internal/earnings/ytd/:userId** ServiceAuthGuard   X-Service-Token   URL :userId ---
                                                                                 trusted after token
                                                                                 validation

  **GET /health**                           None               ---               ---

  **GET /health/ready**                     None               ---               ---

  **GET /metrics**                          IP allowlist only  ---               ---
  --------------------------------------------------------------------------------------------------

# **3. Internal Service Token Rotation Procedure**

The X-Service-Token is a shared secret validated with
crypto.timingSafeEqual. It is stored as the INTERNAL_SERVICE_TOKEN
environment variable on all services that call or serve internal
earnings endpoints.

## **3.1 Services that hold the token**

  -------------------------------------------------------------------------------------------
  **Service**                **Holds token as**       **Uses token to**
  -------------------------- ------------------------ ---------------------------------------
  **earnings-service**       INTERNAL_SERVICE_TOKEN   Validate X-Service-Token on
                             (server --- validates    /v1/internal/\* endpoints
                             incoming requests)       

  **payout-service**         EARNINGS_SERVICE_TOKEN   Call GET
                             (client --- sends in     /v1/internal/earnings/balance/:userId
                             requests)                

  **kyc-identity-service**   EARNINGS_SERVICE_TOKEN   Call GET
                             (client --- sends in     /v1/internal/earnings/ytd/:userId
                             requests)                
  -------------------------------------------------------------------------------------------

## **3.2 Rotation procedure**

  ----------------------------------------------------------------------
  **Step**     **Action**                              **Owner**
  ------------ --------------------------------------- -----------------
  **1 ---      openssl rand -hex 32 --- generate a     Platform/DevOps
  Generate new 64-character hex string                 
  token**                                              

  **2 ---      Add NEW_INTERNAL_SERVICE_TOKEN env var  Platform/DevOps
  Stage the    to all services alongside the existing  
  new token**  token. earnings-service accepts EITHER  
               token during the transition window.     

  **3 ---      Deploy earnings-service with dual-token Engineering
  Deploy       validation: accept both                 
  transition   INTERNAL_SERVICE_TOKEN and              
  build**      NEW_INTERNAL_SERVICE_TOKEN.             

  **4 --- Roll Update EARNINGS_SERVICE_TOKEN on        Platform/DevOps
  out          payout-service and kyc-identity-service 
  callers**    to the new value. Deploy both.          

  **5 ---      After confirming no requests use the    Platform/DevOps
  Remove old   old token (check logs for 15 minutes),  
  token**      remove the old token and NEW\_ var.     
               Deploy earnings-service with single     
               token again.                            

  **6 ---      Record the rotation in the security     Platform/DevOps
  Audit log**  audit log: timestamp, actor, services   
               affected.                               
  ----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Rotation cadence**                                                  |
|                                                                       |
| Rotate the internal service token every 90 days or immediately after: |
|                                                                       |
| • Any engineer with access to the token leaves the organisation       |
|                                                                       |
| • Any suspected credential exposure                                   |
|                                                                       |
| • Any production incident where the token may have been logged in     |
| plaintext                                                             |
|                                                                       |
| Tokens must never appear in application logs. ServiceAuthGuard logs   |
| only \"token mismatch\" --- never the token value.                    |
+=======================================================================+

## **3.3 Dual-token validation during rotation**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/guards/service-auth.guard.ts                                   |
|                                                                       |
| // Supports dual-token validation during rotation window.             |
|                                                                       |
| import { CanActivate, ExecutionContext, Injectable } from             |
| \'@nestjs/common\';                                                   |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import { timingSafeEqual } from \'crypto\';                           |
|                                                                       |
| import { EarningsError } from \'../errors/earnings.error\';           |
|                                                                       |
| import { HttpStatus } from \'@nestjs/common\';                        |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class ServiceAuthGuard implements CanActivate {                |
|                                                                       |
| constructor(private config: ConfigService) {}                         |
|                                                                       |
| canActivate(ctx: ExecutionContext): boolean {                         |
|                                                                       |
| const req = ctx.switchToHttp().getRequest();                          |
|                                                                       |
| const token = req.headers\[\'x-service-token\'\];                     |
|                                                                       |
| if (!token) throw this.deny();                                        |
|                                                                       |
| const primary = this.config.get\<string\>(\'INTERNAL_SERVICE_TOKEN\', |
| \'\');                                                                |
|                                                                       |
| const next =                                                          |
| this.config.get\<string\>(\'NEW_INTERNAL_SERVICE_TOKEN\', \'\'); //   |
| rotation window only                                                  |
|                                                                       |
| if (this.matches(token, primary)) return true;                        |
|                                                                       |
| if (next && this.matches(token, next)) return true;                   |
|                                                                       |
| throw this.deny();                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| private matches(a: string, b: string): boolean {                      |
|                                                                       |
| try {                                                                 |
|                                                                       |
| return timingSafeEqual(Buffer.from(a), Buffer.from(b));               |
|                                                                       |
| } catch {                                                             |
|                                                                       |
| return false; // length mismatch --- not equal                        |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| private deny() {                                                      |
|                                                                       |
| return new EarningsError(\'Service authentication failed.\',          |
|                                                                       |
| HttpStatus.UNAUTHORIZED, \'ERR_EARNINGS_INTERNAL_AUTH_INVALID\');     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **4. Rate Limiting**

All rate limits use a Redis sliding window counter. The window key
includes endpoint and caller identifier (JWT sub for contractor
endpoints, IP for internal endpoints). Limits are configurable via env
vars.

## **4.1 Limits per endpoint**

  -----------------------------------------------------------------------------------------------------------------
  **Endpoint**                              **Window**   **Limit**   **Env var**                   **Caller key**
  ----------------------------------------- ------------ ----------- ----------------------------- ----------------
  **GET /v1/earnings/balance**              1 min        60 req      RATE_LIMIT_BALANCE            JWT sub
                                                                                                   (contractorId)

  **GET /v1/earnings**                      1 min        30 req      RATE_LIMIT_HISTORY            JWT sub

  **GET /v1/earnings/summary**              1 min        20 req      RATE_LIMIT_SUMMARY            JWT sub

  **GET /v1/earnings/:id**                  1 min        60 req      RATE_LIMIT_DETAIL             JWT sub

  **GET /v1/earnings/export**               5 min        3 req       RATE_LIMIT_EXPORT             JWT sub

  **GET                                     1 min        120 req     RATE_LIMIT_INTERNAL_BALANCE   Caller IP
  /v1/internal/earnings/balance/:userId**                                                          

  **GET /v1/internal/earnings/ytd/:userId** 1 min        60 req      RATE_LIMIT_INTERNAL_YTD       Caller IP
  -----------------------------------------------------------------------------------------------------------------

## **4.2 Rate limit middleware**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/middleware/rate-limit.middleware.ts                            |
|                                                                       |
| // Applied per route via RouteRateLimitGuard. Uses Redis INCR +       |
| EXPIRE.                                                               |
|                                                                       |
| import { Injectable, Logger } from \'@nestjs/common\';                |
|                                                                       |
| import { InjectRedis } from \'../cache/cache.module\';                |
|                                                                       |
| import { EarningsError } from \'../errors/earnings.error\';           |
|                                                                       |
| import { HttpStatus } from \'@nestjs/common\';                        |
|                                                                       |
| import Redis from \'ioredis\';                                        |
|                                                                       |
| export interface RateLimitOptions {                                   |
|                                                                       |
| windowSec: number;                                                    |
|                                                                       |
| max: number;                                                          |
|                                                                       |
| keyPrefix: string;                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class RateLimitService {                                       |
|                                                                       |
| private readonly logger = new Logger(RateLimitService.name);          |
|                                                                       |
| constructor(@InjectRedis() private redis: Redis) {}                   |
|                                                                       |
| async check(callerId: string, opts: RateLimitOptions, res: any):      |
| Promise\<void\> {                                                     |
|                                                                       |
| const key = \`rate_limit:\${opts.keyPrefix}:\${callerId}\`;           |
|                                                                       |
| let count: number;                                                    |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const tx = this.redis.multi();                                        |
|                                                                       |
| tx.incr(key);                                                         |
|                                                                       |
| tx.expire(key, opts.windowSec);                                       |
|                                                                       |
| const results = await tx.exec();                                      |
|                                                                       |
| count = (results?.\[0\]?.\[1\] as number) ?? 0;                       |
|                                                                       |
| } catch {                                                             |
|                                                                       |
| this.logger.warn(\'Rate limit Redis error --- allowing request\');    |
|                                                                       |
| return; // Redis down → fail open (do not block requests)             |
|                                                                       |
| }                                                                     |
|                                                                       |
| const remaining = Math.max(0, opts.max - count);                      |
|                                                                       |
| const resetAt = Math.floor(Date.now() / 1000) + opts.windowSec;       |
|                                                                       |
| res.setHeader(\'X-RateLimit-Limit\', opts.max);                       |
|                                                                       |
| res.setHeader(\'X-RateLimit-Remaining\', remaining);                  |
|                                                                       |
| res.setHeader(\'X-RateLimit-Reset\', resetAt);                        |
|                                                                       |
| if (count \> opts.max) {                                              |
|                                                                       |
| res.setHeader(\'Retry-After\', opts.windowSec);                       |
|                                                                       |
| throw new EarningsError(                                              |
|                                                                       |
| \'Too many requests. Please retry after the indicated delay.\',       |
|                                                                       |
| HttpStatus.TOO_MANY_REQUESTS,                                         |
|                                                                       |
| \'ERR_EARNINGS_INTERNAL_RATE_LIMIT\',                                 |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Rate limiter fails open**                                           |
|                                                                       |
| If Redis is unavailable, the rate limiter allows the request through. |
|                                                                       |
| This is intentional --- Redis unavailability is already alerted       |
| (ES-15 §3).                                                           |
|                                                                       |
| Blocking all requests when Redis is down would compound an            |
| infrastructure incident.                                              |
|                                                                       |
| The trade-off: during a Redis outage, rate limits are unenforced.     |
+=======================================================================+

# **5. Audit Log --- Admin Access to Contractor Earnings**

Every call to the internal service-to-service endpoints is logged to the
audit_log table. These logs are the authoritative record of which
service accessed which contractor\'s data and when.

## **5.1 audit_log table schema**

+-----------------------------------------------------------------------+
| sql                                                                   |
+-----------------------------------------------------------------------+
| CREATE TABLE audit_log (                                              |
|                                                                       |
| id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                        |
|                                                                       |
| actor_type TEXT NOT NULL, \-- \'service\' \| \'admin_user\'           |
|                                                                       |
| actor_id TEXT NOT NULL, \-- service name or admin user UUID           |
|                                                                       |
| action TEXT NOT NULL, \-- \'internal.balance.read\' \|                |
| \'internal.ytd.read\'                                                 |
|                                                                       |
| target_type TEXT NOT NULL, \-- always \'contractor\'                  |
|                                                                       |
| target_id UUID NOT NULL, \-- contractorId                             |
|                                                                       |
| endpoint TEXT NOT NULL, \-- \'/v1/internal/earnings/balance/:userId\' |
|                                                                       |
| caller_ip INET NOT NULL,                                              |
|                                                                       |
| request_id UUID NOT NULL,                                             |
|                                                                       |
| response_status INTEGER NOT NULL,                                     |
|                                                                       |
| metadata JSONB \-- additional context (e.g. { year: 2025 } for YTD)   |
|                                                                       |
| );                                                                    |
|                                                                       |
| CREATE INDEX audit_log_target_id_idx ON audit_log (target_id,         |
| created_at DESC);                                                     |
|                                                                       |
| CREATE INDEX audit_log_actor_id_idx ON audit_log (actor_id,           |
| created_at DESC);                                                     |
|                                                                       |
| CREATE INDEX audit_log_created_at_idx ON audit_log (created_at DESC); |
+=======================================================================+

## **5.2 Audit events logged**

  ------------------------------------------------------------------------------------------------------------------
  **Endpoint called**                       **action value**             **actor_id value**    **metadata**
  ----------------------------------------- ---------------------------- --------------------- ---------------------
  **GET                                     internal.balance.read        Derived from          { requestedAt,
  /v1/internal/earnings/balance/:userId**                                X-Service-Name header responseStatus }
                                                                         (e.g.                 
                                                                         \"payout-service\")   

  **GET /v1/internal/earnings/ytd/:userId** internal.ytd.read            Derived from          { year,
                                                                         X-Service-Name header thresholdReached,
                                                                                               responseStatus }

  **GET /v1/internal/\* --- 401 rejection** internal.auth.failure        \"unknown\" (token    { reason:
                                                                         invalid)              \"token_mismatch\",
                                                                                               callerIp }

  **GET /v1/internal/\* --- 403 network     internal.network.violation   \"unknown\"           { callerIp, reason:
  rejection**                                                                                  \"external_ip\" }
  ------------------------------------------------------------------------------------------------------------------

## **5.3 Audit log service implementation**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/audit/audit.service.ts                                         |
|                                                                       |
| import { Injectable } from \'@nestjs/common\';                        |
|                                                                       |
| import { InjectRepository } from \'@nestjs/typeorm\';                 |
|                                                                       |
| import { Repository } from \'typeorm\';                               |
|                                                                       |
| import { AuditLog } from \'./audit-log.entity\';                      |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class AuditService {                                           |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| \@InjectRepository(AuditLog)                                          |
|                                                                       |
| private readonly repo: Repository\<AuditLog\>,                        |
|                                                                       |
| ) {}                                                                  |
|                                                                       |
| async log(entry: {                                                    |
|                                                                       |
| actorType: string;                                                    |
|                                                                       |
| actorId: string;                                                      |
|                                                                       |
| action: string;                                                       |
|                                                                       |
| targetId: string;                                                     |
|                                                                       |
| endpoint: string;                                                     |
|                                                                       |
| callerIp: string;                                                     |
|                                                                       |
| requestId: string;                                                    |
|                                                                       |
| responseStatus: number;                                               |
|                                                                       |
| metadata?: Record\<string, unknown\>;                                 |
|                                                                       |
| }): Promise\<void\> {                                                 |
|                                                                       |
| // Fire-and-forget --- audit log failure must never fail the request. |
|                                                                       |
| this.repo.save({ \...entry, targetType: \'contractor\' }).catch(err   |
| =\> {                                                                 |
|                                                                       |
| // Log to stderr only --- do not rethrow                              |
|                                                                       |
| console.error(\'AuditService: failed to write audit log\',            |
| err.message);                                                         |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Usage in InternalController:                                       |
|                                                                       |
| // After successful response, before returning:                       |
|                                                                       |
| this.audit.log({                                                      |
|                                                                       |
| actorType: \'service\',                                               |
|                                                                       |
| actorId: req.headers\[\'x-service-name\'\] ?? \'unknown\',            |
|                                                                       |
| action: \'internal.balance.read\',                                    |
|                                                                       |
| targetId: userId,                                                     |
|                                                                       |
| endpoint: \'/v1/internal/earnings/balance/:userId\',                  |
|                                                                       |
| callerIp: req.ip,                                                     |
|                                                                       |
| requestId: req.headers\[\'x-request-id\'\],                           |
|                                                                       |
| responseStatus: 200,                                                  |
|                                                                       |
| });                                                                   |
+=======================================================================+

+-----------------------------------------------------------------------+
| **X-Service-Name header requirement**                                 |
|                                                                       |
| Internal callers must include X-Service-Name: {service-name} on every |
| request.                                                              |
|                                                                       |
| Examples: X-Service-Name: payout-service, X-Service-Name:             |
| kyc-identity-service                                                  |
|                                                                       |
| This header is not validated --- it is trusted for audit logging      |
| only.                                                                 |
|                                                                       |
| If absent, actor_id is recorded as \"unknown\".                       |
|                                                                       |
| The audit log is for human investigation --- not for access control.  |
+=======================================================================+

## **5.4 Audit log retention and access**

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Retention         90 days in PostgreSQL. Archived to cold storage
  period**            (S3/R2) after 90 days. Kept for 7 years total.

  **Who can query**   Compliance and security team only. Direct DB access
                      via read-only audit role. No API endpoint exposed.

  **Alert on volume   If internal.balance.read or internal.ytd.read count
  spike**             exceeds 500/hour per actor_id, alert security team.

  **Alert on auth     If internal.auth.failure count exceeds 10/minute
  failures**          from any single IP, alert security team and
                      consider IP block.
  -----------------------------------------------------------------------

# **6. Geolocation Integration Points & Security Considerations**

## **6.1 Where geolocation is used**

  --------------------------------------------------------------------------------------
  **Integration point**             **What geo data is      **Security consideration**
                                    used**                  
  --------------------------------- ----------------------- ----------------------------
  **JWT issuance (auth-service)**   IP → country code → ISO earnings-service trusts this
                                    4217 currency. Written  claim from the JWT --- it
                                    into JWT as             does not re-derive geo on
                                    localCurrency claim.    every request. Geo
                                                            verification happens once at
                                                            login.

  **BalanceService.getBalance()**   localCurrency claim     If localCurrency is an
                                    from JWT →              unsupported currency code,
                                    availableBalanceLocal   falls back to
                                    conversion.             displayCurrency. No error
                                                            exposed.

  **GeoService.detectCurrency()**   Called by auth-service  Private IP ranges (10.x,
                                    (not earnings-service   172.16-31.x, 192.168.x) →
                                    directly). Returns ISO  return DEFAULT_CURRENCY.
                                    4217 code.              Prevents internal traffic
                                                            from being geolocated
                                                            incorrectly.
  --------------------------------------------------------------------------------------

## **6.2 Private IP guard**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/geo/geo.service.ts --- private IP guard                        |
|                                                                       |
| private isPrivateIp(ip: string): boolean {                            |
|                                                                       |
| const privateRanges = \[                                              |
|                                                                       |
| /\^10\\./,                                                            |
|                                                                       |
| /\^172\\.(1\[6-9\]\|2\[0-9\]\|3\[01\])\\./,                           |
|                                                                       |
| /\^192\\.168\\./,                                                     |
|                                                                       |
| /\^127\\./,                                                           |
|                                                                       |
| /\^::1\$/,                                                            |
|                                                                       |
| /\^fc00:/, // IPv6 unique local                                       |
|                                                                       |
| \];                                                                   |
|                                                                       |
| return privateRanges.some(r =\> r.test(ip));                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| detectCurrency(ip: string): string {                                  |
|                                                                       |
| if (this.isPrivateIp(ip)) {                                           |
|                                                                       |
| return this.config.get(\'DEFAULT_CURRENCY\', \'USD\');                |
|                                                                       |
| }                                                                     |
|                                                                       |
| // \... GeoLite2 lookup                                               |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **6.3 Geolocation security constraints**

  -----------------------------------------------------------------------
  **Constraint**        **Detail**
  --------------------- -------------------------------------------------
  **Geo is              localCurrency from geo is used for display
  display-only**        amounts only. It never affects billing, payout
                        amounts, or contract rates. There is no financial
                        consequence to geo spoofing.

  **VPN / proxy         earnings-service does not attempt to detect VPNs.
  awareness**           A contractor using a VPN will get the geo of the
                        VPN exit node as their localCurrency. This is
                        expected and acceptable.

  **GeoLite2 database   The MaxMind GeoLite2 database must be updated
  freshness**           monthly. A stale DB (\>60 days old) may produce
                        incorrect country codes. Monitor via a cron job
                        that checks the file modification date.

  **No geo-based access Geolocation is never used to block or restrict
  control**             access to earnings data. It is a display
                        preference only. Any geo-based access control is
                        out of scope for earnings-service.
  -----------------------------------------------------------------------

# **7. Network Security**

  -----------------------------------------------------------------------
  **Rule**                 **Implementation**
  ------------------------ ----------------------------------------------
  **/v1/internal/\* must   API gateway routing rules must exclude
  not be exposed           /v1/internal/\* from external routes. If
  externally**             reached from an external IP, return 403
                           ERR_EARNINGS_INTERNAL_NETWORK_EXPOSURE and
                           alert immediately (ES-10 §5).

  **GET /metrics ---       Bind to internal interface only or protect
  internal only**          with IP allowlist. Never expose to the public
                           internet.

  **GET /health and        These endpoints return no sensitive data and
  /health/ready --- may be can be exposed via the API gateway for
  public**                 external monitoring.

  **TLS required on all    All inbound traffic to earnings-service must
  ingress**                be TLS 1.2+. Enforced at the ingress
                           controller level --- not in application code.

  **Database connection    TypeORM connection requires ssl: true in
  --- SSL required**       production (controlled by DATABASE_SSL env
                           var, default true in non-development
                           environments).
  -----------------------------------------------------------------------

# **8. References**

  -----------------------------------------------------------------------
  **Document**           **Relevant sections**
  ---------------------- ------------------------------------------------
  **ES-02 --- Contractor JwtAuthGuard usage, contractorId injection
  Endpoints**            pattern

  **ES-03 --- Internal   ServiceAuthGuard, X-Service-Token validation,
  Endpoints**            rate limiting implementation

  **ES-10 --- Error      ERR_EARNINGS_WRONG_ROLE,
  Catalog**              ERR_EARNINGS_INTERNAL_AUTH_INVALID,
                         ERR_EARNINGS_INTERNAL_NETWORK_EXPOSURE

  **ES-15 ---            Redis down alert --- rate limiter fails open
  Observability**        during Redis outage

  **ES-16 --- Testing    Isolation regression test requirement, auth
  Guide**                matrix test coverage
  -----------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
earnings-service ES-17 \| v1.0
