**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**earnings-service**

**ES-02 --- REST API: Contractor-Facing Endpoints**

  ------------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ----------------------------------------------------
  **Service**         earnings-service

  **Document**        ES-02 --- REST API: Contractor-Facing Endpoints

  **Version**         1.0

  **Status**          Draft --- Awaiting Engineering Review

  **Base Path**       /v1/earnings

  **Auth**            JWT Bearer --- contractor role only

  **Prerequisites**   ES-00 (Overview), ES-01 (Database Schema)

  **Next Document**   ES-03 --- Internal Service-to-Service Endpoints
  ------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Purpose**                                                           |
|                                                                       |
| This document defines every contractor-facing REST API endpoint in    |
| earnings-service.                                                     |
|                                                                       |
| Four endpoints are covered:                                           |
|                                                                       |
| • GET /v1/earnings/balance --- available balance in display currency  |
|                                                                       |
| • GET /v1/earnings --- paginated, filtered, sorted earnings history   |
|                                                                       |
| • GET /v1/earnings/summary --- aggregated Today / This Week / This    |
| Month / All Time cards                                                |
|                                                                       |
| • GET /v1/earnings/:id --- single earnings entry detail               |
|                                                                       |
| Every endpoint includes: full URL, auth requirements, all query       |
| parameters with validation                                            |
|                                                                       |
| rules, complete request and response schemas, all error responses,    |
| and full production                                                   |
|                                                                       |
| NestJS controller + service + DTO code. Nothing is left incomplete.   |
|                                                                       |
| This document does NOT cover: internal endpoints (ES-03), RabbitMQ    |
| consumers (ES-04),                                                    |
|                                                                       |
| currency conversion implementation (ES-06), Redis caching (ES-07), or |
| export (ES-09).                                                       |
+=======================================================================+

# **1. Prerequisites**

  ------------------------------------------------------------------------------
  **Requirement**        **What it provides**            **Reference**
  ---------------------- ------------------------------- -----------------------
  **ES-00 --- Service    Folder structure, env           Read first
  Overview**             variables, service boundaries   

  **ES-01 --- Database   All entities and tables these   Must be migrated
  Schema**               endpoints query                 

  **PostgreSQL + Redis   Live DB and cache connections   See ES-01 §3
  running**              required                        

  **npm install          All NestJS dependencies         cd
  complete**             installed                       apps/earnings-service
                                                         && npm install
  ------------------------------------------------------------------------------

# **2. Repo & Folder Placement**

All files introduced in this document live under
apps/earnings-service/src/. Files marked ← ES-02 are new here.

+-----------------------------------------------------------------------+
| plaintext                                                             |
+-----------------------------------------------------------------------+
| apps/earnings-service/src/                                            |
|                                                                       |
| ├─ app.module.ts ← ES-02                                              |
|                                                                       |
| ├─ main.ts ← ES-02                                                    |
|                                                                       |
| ├─ guards/                                                            |
|                                                                       |
| │ └─ jwt-auth.guard.ts ← ES-02                                        |
|                                                                       |
| ├─ balance/                                                           |
|                                                                       |
| │ ├─ balance.module.ts ← ES-02                                        |
|                                                                       |
| │ ├─ balance.controller.ts ← ES-02                                    |
|                                                                       |
| │ ├─ balance.service.ts ← ES-02                                       |
|                                                                       |
| │ └─ dto/balance-response.dto.ts ← ES-02                              |
|                                                                       |
| ├─ earnings/                                                          |
|                                                                       |
| │ ├─ earnings.module.ts ← ES-02                                       |
|                                                                       |
| │ ├─ earnings.controller.ts ← ES-02                                   |
|                                                                       |
| │ ├─ earnings.service.ts ← ES-02                                      |
|                                                                       |
| │ └─ dto/                                                             |
|                                                                       |
| │ ├─ earnings-query.dto.ts ← ES-02                                    |
|                                                                       |
| │ ├─ earnings-list.dto.ts ← ES-02                                     |
|                                                                       |
| │ ├─ earnings-summary.dto.ts ← ES-02                                  |
|                                                                       |
| │ └─ earnings-detail.dto.ts ← ES-02                                   |
|                                                                       |
| ├─ database/ (ES-01)                                                  |
|                                                                       |
| └─ entities/ (ES-01)                                                  |
+=======================================================================+

# **3. Docker & Runtime**

+-----------------------------------------------------------------------+
| **Note**                                                              |
|                                                                       |
| Dockerfile, tsconfig.json, package.json, and docker-compose.yml are   |
| defined in ES-01 §3. This section adds main.ts and app.module.ts      |
| only.                                                                 |
+=======================================================================+

### **src/main.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/main.ts                                                        |
|                                                                       |
| import { NestFactory } from \'@nestjs/core\';                         |
|                                                                       |
| import { ValidationPipe } from \'@nestjs/common\';                    |
|                                                                       |
| import { AppModule } from \'./app.module\';                           |
|                                                                       |
| async function bootstrap() {                                          |
|                                                                       |
| const app = await NestFactory.create(AppModule);                      |
|                                                                       |
| app.useGlobalPipes(new ValidationPipe({                               |
|                                                                       |
| whitelist: true,                                                      |
|                                                                       |
| forbidNonWhitelisted: false,                                          |
|                                                                       |
| transform: true,                                                      |
|                                                                       |
| transformOptions: { enableImplicitConversion: true },                 |
|                                                                       |
| }));                                                                  |
|                                                                       |
| const port = process.env.PORT \|\| 3010;                              |
|                                                                       |
| await app.listen(port);                                               |
|                                                                       |
| console.log(\`earnings-service listening on port \${port}\`);         |
|                                                                       |
| }                                                                     |
|                                                                       |
| bootstrap();                                                          |
+=======================================================================+

### **src/app.module.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/app.module.ts                                                  |
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
| \@Module({                                                            |
|                                                                       |
| imports: \[                                                           |
|                                                                       |
| ConfigModule.forRoot({ isGlobal: true }),                             |
|                                                                       |
| DatabaseModule,                                                       |
|                                                                       |
| BalanceModule,                                                        |
|                                                                       |
| EarningsModule,                                                       |
|                                                                       |
| \],                                                                   |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class AppModule {}                                             |
+=======================================================================+

# **4. Environment Variables**

  -------------------------------------------------------------------------------------------------------------------
  **Variable**                    **Required**   **Description**                **Example**
  ------------------------------- -------------- ------------------------------ -------------------------------------
  **BALANCE_CACHE_TTL_SECONDS**   Optional       Redis TTL for contractor       300
                                                 balance cache. Defaults to     
                                                 300. Invalidated on RabbitMQ   
                                                 events regardless of TTL.      

  **FX_API_URL**                  Yes            Base URL of self-hosted        https://fx.internal.marketeq.com/v1
                                                 fawazahmed0/exchange-api.      
                                                 Converts balance to            
                                                 displayCurrency.               

  **JWT_SECRET**                  Yes            Shared JWT signing secret.     (use secrets manager)
                                                 Must match auth-service        
                                                 exactly.                       

  **PORT**                        Optional       HTTP port. Defaults to 3010.   3010

  **REDIS_URL**                   Yes            Redis connection string.       redis://redis:6379
                                                 Required for balance cache.    
  -------------------------------------------------------------------------------------------------------------------

# **5. Authentication & Authorisation**

Every endpoint requires a valid JWT Bearer token in the Authorization
header. The token is issued by auth-service. The sub claim carries the
contractorId. All data is scoped to that contractorId --- a contractor
can never read another contractor\'s data.

  ------------------------------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ----------------------------------------------------------------------
  **Header**          Authorization: Bearer \<token\>

  **Algorithm**       HS256 --- signed with JWT_SECRET

  **Required claim:   Contractor userId (UUID). All queries scoped to this value.
  sub**               

  **Required claim:   \"contractor\" --- other roles receive 403 Forbidden
  role**              

  **Missing token**   401 ---
                      {\"statusCode\":401,\"error\":\"Unauthorized\",\"message\":\"No auth
                      token\"}

  **Expired token**   401 ---
                      {\"statusCode\":401,\"error\":\"Unauthorized\",\"message\":\"Invalid
                      token\"}

  **Wrong role**      403 ---
                      {\"statusCode\":403,\"error\":\"Forbidden\",\"message\":\"Contractor
                      access only\"}
  ------------------------------------------------------------------------------------------

### **src/guards/jwt-auth.guard.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/guards/jwt-auth.guard.ts                                       |
|                                                                       |
| import { Injectable, CanActivate, ExecutionContext,                   |
|                                                                       |
| UnauthorizedException, ForbiddenException } from \'@nestjs/common\';  |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import \* as jwt from \'jsonwebtoken\';                               |
|                                                                       |
| export interface JwtPayload {                                         |
|                                                                       |
| sub: string; // contractor userId                                     |
|                                                                       |
| role: string; // must be \"contractor\"                               |
|                                                                       |
| iat: number;                                                          |
|                                                                       |
| exp: number;                                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class JwtAuthGuard implements CanActivate {                    |
|                                                                       |
| constructor(private readonly config: ConfigService) {}                |
|                                                                       |
| canActivate(ctx: ExecutionContext): boolean {                         |
|                                                                       |
| const req = ctx.switchToHttp().getRequest();                          |
|                                                                       |
| const header: string \| undefined = req.headers\[\'authorization\'\]; |
|                                                                       |
| if (!header?.startsWith(\'Bearer \')) throw new                       |
| UnauthorizedException(\'No auth token\');                             |
|                                                                       |
| let payload: JwtPayload;                                              |
|                                                                       |
| try {                                                                 |
|                                                                       |
| payload = jwt.verify(header.split(\' \')\[1\],                        |
| this.config.get\<string\>(\'JWT_SECRET\')) as JwtPayload;             |
|                                                                       |
| } catch {                                                             |
|                                                                       |
| throw new UnauthorizedException(\'Invalid token\');                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| if (payload.role !== \'contractor\') throw new                        |
| ForbiddenException(\'Contractor access only\');                       |
|                                                                       |
| req.user = payload;                                                   |
|                                                                       |
| return true;                                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **6. Endpoint 1 --- Get Available Balance**

  -------------------------------------------------------------------------
  **GET**   **/v1/earnings/balance**                     JWT Bearer ---
                                                         contractor role
  --------- -------------------------------------------- ------------------

  -------------------------------------------------------------------------

Returns the contractor\'s available balance in their displayCurrency.
Powers the Available for Withdrawal panel on the Overview tab and the
amount display in the Withdraw Funds modal.

## **6.1 Request**

No query parameters. The contractorId is read from the JWT sub claim
only.

  ------------------------------------------------------------------------------
  **Header**          **Required**   **Value**
  ------------------- -------------- -------------------------------------------
  **Authorization**   Yes            Bearer \<JWT\>

  ------------------------------------------------------------------------------

## **6.2 Response --- 200 OK**

+-----------------------------------------------------------------------+
| json                                                                  |
+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"availableBalance\": \"567.00\", // USD --- internal value           |
|                                                                       |
| \"availableBalanceDisplay\": \"567.00\", // converted to              |
| displayCurrency, rounded to whole unit                                |
|                                                                       |
| \"displayCurrency\": \"USD\",                                         |
|                                                                       |
| \"availableBalanceLocal\": \"47238.00\", // in contractor\'s          |
| geo-detected localCurrency                                            |
|                                                                       |
| \"localCurrency\": \"INR\",                                           |
|                                                                       |
| \"reserveBalance\": \"150.00\", // \$0.00 if reserve is off (default) |
|                                                                       |
| \"pendingHoldUsd\": \"0.00\", // first-payout hold or compliance hold |
|                                                                       |
| \"totalEarnedUsd\": \"4820.50\", // lifetime --- never decremented    |
|                                                                       |
| \"totalPaidOutUsd\": \"4253.50\",                                     |
|                                                                       |
| \"displayLabel\": \"After reserve & threshold deductions\",           |
|                                                                       |
| \"lastUpdatedAt\": \"2025-06-10T14:32:00Z\",                          |
|                                                                       |
| \"cachedAt\": \"2025-06-10T14:30:00Z\"                                |
|                                                                       |
| }                                                                     |
+=======================================================================+

  ---------------------------------------------------------------------------------
  **Field**                     **Type**   **Description**
  ----------------------------- ---------- ----------------------------------------
  **availableBalance**          string     Available balance in USD. Never show
                                           this to contractors --- use
                                           availableBalanceDisplay.

  **availableBalanceDisplay**   string     Balance in displayCurrency. Rounded to
                                           nearest whole unit. This is what the UI
                                           shows.

  **displayCurrency**           string     ISO 4217 code. Set by contractor in
                                           Settings. Defaults to localCurrency.

  **availableBalanceLocal**     string     Balance in geo-detected localCurrency.
                                           Shown when displayCurrency differs from
                                           localCurrency.

  **localCurrency**             string     ISO 4217 code auto-detected from IP on
                                           every login. Immutable within a session.

  **reserveBalance**            string     Amount held as reserve. \$0.00 when
                                           reserve is off (default). Shown in the
                                           tooltip: \"Your \$150 reserve
                                           balance\...\"

  **pendingHoldUsd**            string     Amount on hold. First-payout
                                           5-business-day hold or compliance hold.
                                           Not withdrawable.

  **totalEarnedUsd**            string     Lifetime total earned USD. Used for IRS
                                           \$600 YTD threshold monitoring.

  **totalPaidOutUsd**           string     Lifetime total paid out USD.

  **displayLabel**              string     Fixed string: \"After reserve &
                                           threshold deductions\". Shown below
                                           balance amount in UI.

  **lastUpdatedAt**             ISO 8601   When balance last changed via an
                                           earnings or payout event.

  **cachedAt**                  ISO 8601   When this response was last refreshed.
                                           May be up to BALANCE_CACHE_TTL_SECONDS
                                           old.
  ---------------------------------------------------------------------------------

## **6.3 Error Responses**

  ----------------------------------------------------------------------------------
  **Status**   **Code**            **Message**           **Cause**
  ------------ ------------------- --------------------- ---------------------------
  **401**      UNAUTHORIZED        No auth token         Missing or malformed
                                                         Authorization header

  **401**      INVALID_TOKEN       Invalid token         JWT expired or signature
                                                         invalid

  **403**      FORBIDDEN           Contractor access     JWT role is not
                                   only                  \"contractor\"

  **404**      BALANCE_NOT_FOUND   No balance record     Contractor has never
                                   found for this        earned. UI shows \$0.00
                                   contractor            first-time empty state.

  **429**      RATE_LIMITED        Too many requests     Polling faster than 1
                                                         req/sec

  **500**      INTERNAL_ERROR      An unexpected error   DB or Redis unreachable
                                   occurred              
  ----------------------------------------------------------------------------------

## **6.4 Full Code**

### **src/balance/balance.module.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/balance/balance.module.ts                                      |
|                                                                       |
| import { Module } from \'@nestjs/common\';                            |
|                                                                       |
| import { TypeOrmModule } from \'@nestjs/typeorm\';                    |
|                                                                       |
| import { BalanceController } from \'./balance.controller\';           |
|                                                                       |
| import { BalanceService } from \'./balance.service\';                 |
|                                                                       |
| import { BalanceSnapshot } from                                       |
| \'../entities/balance-snapshot.entity\';                              |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[TypeOrmModule.forFeature(\[BalanceSnapshot\])\],           |
|                                                                       |
| controllers: \[BalanceController\],                                   |
|                                                                       |
| providers: \[BalanceService\],                                        |
|                                                                       |
| exports: \[BalanceService\], // exported for ES-03 internal           |
| controller                                                            |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class BalanceModule {}                                         |
+=======================================================================+

### **src/balance/dto/balance-response.dto.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/balance/dto/balance-response.dto.ts                            |
|                                                                       |
| export class BalanceResponseDto {                                     |
|                                                                       |
| availableBalance: string;                                             |
|                                                                       |
| availableBalanceDisplay: string;                                      |
|                                                                       |
| displayCurrency: string;                                              |
|                                                                       |
| availableBalanceLocal: string;                                        |
|                                                                       |
| localCurrency: string;                                                |
|                                                                       |
| reserveBalance: string;                                               |
|                                                                       |
| pendingHoldUsd: string;                                               |
|                                                                       |
| totalEarnedUsd: string;                                               |
|                                                                       |
| totalPaidOutUsd: string;                                              |
|                                                                       |
| displayLabel: string;                                                 |
|                                                                       |
| lastUpdatedAt: string;                                                |
|                                                                       |
| cachedAt: string;                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

### **src/balance/balance.service.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/balance/balance.service.ts                                     |
|                                                                       |
| // NOTE: Full Redis cache read/write/invalidation is implemented in   |
| ES-07.                                                                |
|                                                                       |
| // This service has the complete DB read path. Replace the cache      |
| stubs with ES-07 implementation.                                      |
|                                                                       |
| import { Injectable, NotFoundException } from \'@nestjs/common\';     |
|                                                                       |
| import { InjectRepository } from \'@nestjs/typeorm\';                 |
|                                                                       |
| import { Repository } from \'typeorm\';                               |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import { BalanceSnapshot } from                                       |
| \'../entities/balance-snapshot.entity\';                              |
|                                                                       |
| import { BalanceResponseDto } from \'./dto/balance-response.dto\';    |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class BalanceService {                                         |
|                                                                       |
| private readonly DISPLAY_LABEL = \'After reserve & threshold          |
| deductions\';                                                         |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| \@InjectRepository(BalanceSnapshot)                                   |
|                                                                       |
| private readonly repo: Repository\<BalanceSnapshot\>,                 |
|                                                                       |
| private readonly config: ConfigService,                               |
|                                                                       |
| ) {}                                                                  |
|                                                                       |
| async getBalance(contractorId: string): Promise\<BalanceResponseDto\> |
| {                                                                     |
|                                                                       |
| // Step 1: Check Redis cache --- key: balance:{contractorId}          |
|                                                                       |
| // Cache hit: parse JSON and return. (Full implementation: ES-07)     |
|                                                                       |
| // Step 2: Read from balance_snapshots.                               |
|                                                                       |
| const snap = await this.repo.findOne({ where: { contractorId } });    |
|                                                                       |
| if (!snap) throw new NotFoundException(\'No balance record found for  |
| this contractor\');                                                   |
|                                                                       |
| // Step 3: Build DTO.                                                 |
|                                                                       |
| const dto = new BalanceResponseDto();                                 |
|                                                                       |
| dto.availableBalance = snap.availableBalance;                         |
|                                                                       |
| dto.availableBalanceDisplay = snap.availableBalanceDisplay;           |
|                                                                       |
| dto.displayCurrency = snap.displayCurrency;                           |
|                                                                       |
| dto.availableBalanceLocal = snap.availableBalanceLocal;               |
|                                                                       |
| dto.localCurrency = snap.localCurrency;                               |
|                                                                       |
| dto.reserveBalance = \'0\'; // updated by payout.schedule.updated     |
| consumer in ES-04                                                     |
|                                                                       |
| dto.pendingHoldUsd = snap.pendingHoldUsd;                             |
|                                                                       |
| dto.totalEarnedUsd = snap.totalEarnedUsd;                             |
|                                                                       |
| dto.totalPaidOutUsd = snap.totalPaidOutUsd;                           |
|                                                                       |
| dto.displayLabel = this.DISPLAY_LABEL;                                |
|                                                                       |
| dto.lastUpdatedAt = snap.updatedAt.toISOString();                     |
|                                                                       |
| dto.cachedAt = new Date().toISOString();                              |
|                                                                       |
| // Step 4: Write to Redis cache --- TTL: BALANCE_CACHE_TTL_SECONDS.   |
| (ES-07)                                                               |
|                                                                       |
| return dto;                                                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Used by ES-03 internal endpoint (payout-service balance check).    |
|                                                                       |
| async getBalanceRaw(contractorId: string): Promise\<BalanceSnapshot   |
| \| null\> {                                                           |
|                                                                       |
| return this.repo.findOne({ where: { contractorId } });                |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

### **src/balance/balance.controller.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/balance/balance.controller.ts                                  |
|                                                                       |
| import { Controller, Get, UseGuards, Request, HttpCode } from         |
| \'@nestjs/common\';                                                   |
|                                                                       |
| import { BalanceService } from \'./balance.service\';                 |
|                                                                       |
| import { JwtAuthGuard } from \'../guards/jwt-auth.guard\';            |
|                                                                       |
| import { BalanceResponseDto } from \'./dto/balance-response.dto\';    |
|                                                                       |
| \@Controller(\'v1/earnings\')                                         |
|                                                                       |
| \@UseGuards(JwtAuthGuard)                                             |
|                                                                       |
| export class BalanceController {                                      |
|                                                                       |
| constructor(private readonly svc: BalanceService) {}                  |
|                                                                       |
| // GET /v1/earnings/balance                                           |
|                                                                       |
| // contractorId always from JWT sub --- never from URL or query       |
| string.                                                               |
|                                                                       |
| \@Get(\'balance\')                                                    |
|                                                                       |
| \@HttpCode(200)                                                       |
|                                                                       |
| async getBalance(@Request() req): Promise\<BalanceResponseDto\> {     |
|                                                                       |
| return this.svc.getBalance(req.user.sub);                             |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **7. Endpoint 2 --- Get Earnings History**

  -------------------------------------------------------------------------
  **GET**   **/v1/earnings**                             JWT Bearer ---
                                                         contractor role
  --------- -------------------------------------------- ------------------

  -------------------------------------------------------------------------

Returns a paginated, filtered, sorted list of earnings entries. Powers
the Earnings tab table in Daily, Weekly, and Monthly views. All filter
options exactly match the design dropdowns.

## **7.1 Query Parameters**

  ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Parameter**   **Type**   **Default**   **Allowed Values**                                                                                                                               **Description**
  --------------- ---------- ------------- ------------------------------------------------------------------------------------------------------------------------------------------------ ------------------------
  **view**        string     daily         \"daily\"\|\"weekly\"\|\"monthly\"                                                                                                               Controls result
                                                                                                                                                                                            grouping. Matches the
                                                                                                                                                                                            Daily/Weekly/Monthly
                                                                                                                                                                                            toggle in the UI.

  **dateRange**   string     all_time      \"today\"\|\"yesterday\"\|\"this_week\"\|\"last_week\"\|\"this_month\"\|\"last_month\"\|\"this_year\"\|\"last_year\"\|\"all_time\"\|\"custom\"   Preset date filter. When
                                                                                                                                                                                            \"custom\", startDate
                                                                                                                                                                                            and endDate are
                                                                                                                                                                                            required.

  **startDate**   string     ---           YYYY-MM-DD                                                                                                                                       Required when
                                                                                                                                                                                            dateRange=custom. Start
                                                                                                                                                                                            of range (inclusive).
                                                                                                                                                                                            Cannot be after endDate
                                                                                                                                                                                            or in the future.

  **endDate**     string     ---           YYYY-MM-DD                                                                                                                                       Required when
                                                                                                                                                                                            dateRange=custom. End of
                                                                                                                                                                                            range (inclusive). Max
                                                                                                                                                                                            span: 3 years.

  **projectId**   uuid       ---           Valid UUID                                                                                                                                       Filter to one project.
                                                                                                                                                                                            Matches All Projects
                                                                                                                                                                                            dropdown.

  **clientId**    uuid       ---           Valid UUID                                                                                                                                       Filter to one client
                                                                                                                                                                                            across all projects.
                                                                                                                                                                                            Matches All Clients
                                                                                                                                                                                            dropdown.

  **entryType**   string     ---           \"manual\"\|\"automated\"                                                                                                                        Entry type filter.
                                                                                                                                                                                            \"automated\" =
                                                                                                                                                                                            screenshot-tracked time.
                                                                                                                                                                                            Matches All Entry Types
                                                                                                                                                                                            dropdown.

  **status**      string     ---           \"paid\"\|\"unpaid\"\|\"failed\"                                                                                                                 Payment status filter.
                                                                                                                                                                                            Matches All Statuses
                                                                                                                                                                                            dropdown.

  **search**      string     ---           Free text, min 2 chars                                                                                                                           Searches project name,
                                                                                                                                                                                            task name, client name.
                                                                                                                                                                                            Matches Find
                                                                                                                                                                                            transactions field.

  **page**        integer    1             ≥ 1                                                                                                                                              Page number. 10
                                                                                                                                                                                            rows/page matches design
                                                                                                                                                                                            default.

  **limit**       integer    10            10\|25\|50\|100                                                                                                                                  Results per page.

  **sortBy**      string     workStartAt   \"workStartAt\"\|\"netAmount\"\|\"durationMinutes\"                                                                                              Sort field.

  **sortOrder**   string     desc          \"asc\"\|\"desc\"                                                                                                                                Sort direction.
  ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Date filter validation rules**                                      |
|                                                                       |
| dateRange=custom requires both startDate and endDate --- missing      |
| either → 400                                                          |
|                                                                       |
| startDate after endDate → 400                                         |
|                                                                       |
| startDate in the future → 400                                         |
|                                                                       |
| Custom range over 3 years → 400                                       |
|                                                                       |
| When dateRange is a preset, startDate and endDate are ignored.        |
+=======================================================================+

## **7.2 Response --- 200 OK**

+----------------------------------------------------------------------------------------+
| json                                                                                   |
+----------------------------------------------------------------------------------------+
| // HTTP 200 OK --- example: view=daily                                                 |
|                                                                                        |
| {                                                                                      |
|                                                                                        |
| \"view\": \"daily\",                                                                   |
|                                                                                        |
| \"page\": 1, \"limit\": 10, \"total\": 47, \"totalPages\": 5,                          |
|                                                                                        |
| \"columns\":                                                                           |
| \[\"date\",\"project\",\"task\",\"startTime\",\"endTime\",\"duration\",\"earnings\"\], |
|                                                                                        |
| \"manualTimeMinutes\": 140,                                                            |
|                                                                                        |
| \"manualTimeLabel\": \"This timesheet includes 2h 20m of manual time\",                |
|                                                                                        |
| \"data\": \[                                                                           |
|                                                                                        |
| {                                                                                      |
|                                                                                        |
| \"id\": \"uuid\",                                                                      |
|                                                                                        |
| \"date\": \"Jun 10, 2025\", // daily only                                              |
|                                                                                        |
| \"weekRange\": null, // weekly only                                                    |
|                                                                                        |
| \"month\": null, // monthly only                                                       |
|                                                                                        |
| \"project\": { \"id\": \"uuid\", \"name\": \"Website Redesign\", \"clientHandle\":     |
| \"@referrizerllc\" },                                                                  |
|                                                                                        |
| \"task\": { \"id\": \"uuid\", \"name\": \"Homepage layout\" }, // daily only           |
|                                                                                        |
| \"startTime\": \"09:00 AM\", // daily only                                             |
|                                                                                        |
| \"endTime\": \"11:00 AM\", // daily only                                               |
|                                                                                        |
| \"durationMinutes\": 120,                                                              |
|                                                                                        |
| \"durationLabel\": \"2h 00m\",                                                         |
|                                                                                        |
| \"grossAmount\": \"160.00\",                                                           |
|                                                                                        |
| \"feeAmount\": \"32.00\",                                                              |
|                                                                                        |
| \"netAmount\": \"128.00\",                                                             |
|                                                                                        |
| \"netAmountDisplay\": \"128.00\", // in displayCurrency, whole units only              |
|                                                                                        |
| \"displayCurrency\": \"USD\",                                                          |
|                                                                                        |
| \"entryType\": \"automated\", // \"automated\"\|\"manual\"                             |
|                                                                                        |
| \"status\": \"paid\", // \"paid\"\|\"unpaid\"\|\"failed\"                              |
|                                                                                        |
| \"avgKeyboardPct\": 72, // daily only, null for manual                                 |
|                                                                                        |
| \"avgMousePct\": 45, // daily only, null for manual                                    |
|                                                                                        |
| \"weeklyHours\": null, \"weeklyEarnings\": null, \"budget\": null,                     |
|                                                                                        |
| \"totalHours\": null, \"totalEarnings\": null                                          |
|                                                                                        |
| }                                                                                      |
|                                                                                        |
| \],                                                                                    |
|                                                                                        |
| \"appliedFilters\": {                                                                  |
|                                                                                        |
| \"view\": \"daily\", \"dateRange\": \"this_week\",                                     |
|                                                                                        |
| \"startDate\": \"2025-06-09\", \"endDate\": \"2025-06-15\",                            |
|                                                                                        |
| \"projectId\": null, \"clientId\": null, \"entryType\": null, \"status\": null,        |
| \"search\": null                                                                       |
|                                                                                        |
| }                                                                                      |
|                                                                                        |
| }                                                                                      |
+========================================================================================+

+---------------------------------------------------------------------------------------+
| **columns field --- view-specific column sets**                                       |
|                                                                                       |
| daily:                                                                                |
| \[\"date\",\"project\",\"task\",\"startTime\",\"endTime\",\"duration\",\"earnings\"\] |
|                                                                                       |
| weekly: \[\"weekRange\",\"project\",\"weeklyHours\",\"weeklyEarnings\",\"budget\"\]   |
|                                                                                       |
| monthly: \[\"month\",\"project\",\"totalHours\",\"totalEarnings\"\]                   |
|                                                                                       |
| The frontend renders exactly these columns in this order. The backend is the source   |
| of truth for column definitions.                                                      |
+=======================================================================================+

## **7.3 Error Responses**

  -------------------------------------------------------------------------------------
  **Status**   **Code**               **Message**           **Cause**
  ------------ ---------------------- --------------------- ---------------------------
  **400**      INVALID_DATE_RANGE     startDate must not be Custom range where start \>
                                      after endDate         end

  **400**      MISSING_DATE_RANGE     startDate and endDate dateRange=custom, dates
                                      required for custom   missing
                                      range                 

  **400**      FUTURE_START_DATE      startDate cannot be   startDate after today
                                      in the future         

  **400**      DATE_RANGE_TOO_LARGE   Date range cannot     Custom span \> 3 years
                                      exceed 3 years        

  **400**      INVALID_VIEW           view must be daily,   Unrecognised view value
                                      weekly, or monthly    

  **400**      SEARCH_TOO_SHORT       Search term must be   search param is 1 char
                                      at least 2 characters 

  **401**      UNAUTHORIZED           No auth token         Missing or malformed header

  **401**      INVALID_TOKEN          Invalid token         JWT expired or signature
                                                            invalid

  **403**      FORBIDDEN              Contractor access     JWT role ≠ contractor
                                      only                  

  **500**      INTERNAL_ERROR         An unexpected error   DB unreachable
                                      occurred              
  -------------------------------------------------------------------------------------

## **7.4 Full Code**

### **src/earnings/earnings.module.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/earnings/earnings.module.ts                                    |
|                                                                       |
| import { Module } from \'@nestjs/common\';                            |
|                                                                       |
| import { TypeOrmModule } from \'@nestjs/typeorm\';                    |
|                                                                       |
| import { EarningsController } from \'./earnings.controller\';         |
|                                                                       |
| import { EarningsService } from \'./earnings.service\';               |
|                                                                       |
| import { EarningsCache } from \'../entities/earnings-cache.entity\';  |
|                                                                       |
| import { ContractLabelCache } from                                    |
| \'../entities/contract-label-cache.entity\';                          |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[TypeOrmModule.forFeature(\[EarningsCache,                  |
| ContractLabelCache\])\],                                              |
|                                                                       |
| controllers: \[EarningsController\],                                  |
|                                                                       |
| providers: \[EarningsService\],                                       |
|                                                                       |
| exports: \[EarningsService\],                                         |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class EarningsModule {}                                        |
+=======================================================================+

### **src/earnings/dto/earnings-query.dto.ts**

+------------------------------------------------------------------------------+
| typescript                                                                   |
+------------------------------------------------------------------------------+
| // src/earnings/dto/earnings-query.dto.ts                                    |
|                                                                              |
| import { IsOptional, IsString, IsIn, IsDateString, IsInt, Min, IsUUID } from |
| \'class-validator\';                                                         |
|                                                                              |
| import { Type } from \'class-transformer\';                                  |
|                                                                              |
| export class EarningsQueryDto {                                              |
|                                                                              |
| \@IsOptional() \@IsIn(\[\'daily\',\'weekly\',\'monthly\'\])                  |
|                                                                              |
| view?: string = \'daily\';                                                   |
|                                                                              |
| \@IsOptional()                                                               |
| \@IsIn(\[\'today\',\'yesterday\',\'this_week\',\'last_week\',\'this_month\', |
|                                                                              |
| \'last_month\',\'this_year\',\'last_year\',\'all_time\',\'custom\'\])        |
|                                                                              |
| dateRange?: string = \'all_time\';                                           |
|                                                                              |
| \@IsOptional() \@IsDateString() startDate?: string;                          |
|                                                                              |
| \@IsOptional() \@IsDateString() endDate?: string;                            |
|                                                                              |
| \@IsOptional() \@IsUUID() projectId?: string;                                |
|                                                                              |
| \@IsOptional() \@IsUUID() clientId?: string;                                 |
|                                                                              |
| \@IsOptional() \@IsIn(\[\'manual\',\'automated\'\])                          |
|                                                                              |
| entryType?: string;                                                          |
|                                                                              |
| \@IsOptional() \@IsIn(\[\'paid\',\'unpaid\',\'failed\'\])                    |
|                                                                              |
| status?: string;                                                             |
|                                                                              |
| \@IsOptional() \@IsString() search?: string;                                 |
|                                                                              |
| \@IsOptional() \@Type(()=\>Number) \@IsInt() \@Min(1)                        |
|                                                                              |
| page?: number = 1;                                                           |
|                                                                              |
| \@IsOptional() \@Type(()=\>Number) \@IsInt() \@IsIn(\[10,25,50,100\])        |
|                                                                              |
| limit?: number = 10;                                                         |
|                                                                              |
| \@IsOptional() \@IsIn(\[\'workStartAt\',\'netAmount\',\'durationMinutes\'\]) |
|                                                                              |
| sortBy?: string = \'workStartAt\';                                           |
|                                                                              |
| \@IsOptional() \@IsIn(\[\'asc\',\'desc\'\])                                  |
|                                                                              |
| sortOrder?: string = \'desc\';                                               |
|                                                                              |
| }                                                                            |
+==============================================================================+

### **src/earnings/earnings.service.ts**

+----------------------------------------------------------------------------------------------------------------+
| typescript                                                                                                     |
+----------------------------------------------------------------------------------------------------------------+
| // src/earnings/earnings.service.ts                                                                            |
|                                                                                                                |
| import { Injectable, BadRequestException } from \'@nestjs/common\';                                            |
|                                                                                                                |
| import { InjectRepository } from \'@nestjs/typeorm\';                                                          |
|                                                                                                                |
| import { Repository } from \'typeorm\';                                                                        |
|                                                                                                                |
| import { EarningsCache } from \'../entities/earnings-cache.entity\';                                           |
|                                                                                                                |
| import { ContractLabelCache } from \'../entities/contract-label-cache.entity\';                                |
|                                                                                                                |
| import { EarningsQueryDto } from \'./dto/earnings-query.dto\';                                                 |
|                                                                                                                |
| \@Injectable()                                                                                                 |
|                                                                                                                |
| export class EarningsService {                                                                                 |
|                                                                                                                |
| constructor(                                                                                                   |
|                                                                                                                |
| \@InjectRepository(EarningsCache)                                                                              |
|                                                                                                                |
| private readonly earningsRepo: Repository\<EarningsCache\>,                                                    |
|                                                                                                                |
| \@InjectRepository(ContractLabelCache)                                                                         |
|                                                                                                                |
| private readonly labelRepo: Repository\<ContractLabelCache\>,                                                  |
|                                                                                                                |
| ) {}                                                                                                           |
|                                                                                                                |
| async getEarnings(contractorId: string, q: EarningsQueryDto) {                                                 |
|                                                                                                                |
| const { startDate, endDate } = this.resolveDateRange(q);                                                       |
|                                                                                                                |
| const qb = this.earningsRepo.createQueryBuilder(\'ec\')                                                        |
|                                                                                                                |
| .where(\'ec.contractorId = :cid\', { cid: contractorId });                                                     |
|                                                                                                                |
| // Exclude reversed entries unless the caller filters for \"failed\"                                           |
|                                                                                                                |
| if (q.status !== \'failed\') {                                                                                 |
|                                                                                                                |
| qb.andWhere(\'ec.status != :rev\', { rev: \'reversed\' });                                                     |
|                                                                                                                |
| }                                                                                                              |
|                                                                                                                |
| if (startDate) qb.andWhere(\'ec.workStartAt \>= :s\', { s: startDate });                                       |
|                                                                                                                |
| if (endDate) qb.andWhere(\'ec.workStartAt \<= :e\', { e: endDate + \'T23:59:59Z\' });                          |
|                                                                                                                |
| if (q.projectId) qb.andWhere(\'ec.projectId = :pid\', { pid: q.projectId });                                   |
|                                                                                                                |
| if (q.clientId) {                                                                                              |
|                                                                                                                |
| qb.innerJoin(ContractLabelCache,\'clc\',\'clc.contractId = ec.contractId\')                                    |
|                                                                                                                |
| .andWhere(\'clc.clientId = :cliid\', { cliid: q.clientId });                                                   |
|                                                                                                                |
| }                                                                                                              |
|                                                                                                                |
| if (q.entryType) {                                                                                             |
|                                                                                                                |
| const dbType = q.entryType === \'automated\' ? \'screenshot\' : \'manual\';                                    |
|                                                                                                                |
| qb.andWhere(\'ec.entryType = :et\', { et: dbType });                                                           |
|                                                                                                                |
| }                                                                                                              |
|                                                                                                                |
| if (q.status === \'failed\') {                                                                                 |
|                                                                                                                |
| qb.andWhere(\'ec.status = :rev\', { rev: \'reversed\' });                                                      |
|                                                                                                                |
| }                                                                                                              |
|                                                                                                                |
| if (q.search && q.search.length \>= 2) {                                                                       |
|                                                                                                                |
| const term = \`%\${q.search.toLowerCase()}%\`;                                                                 |
|                                                                                                                |
| qb.leftJoin(ContractLabelCache,\'clcs\',\'clcs.contractId = ec.contractId\')                                   |
|                                                                                                                |
| .andWhere(\'(LOWER(clcs.projectName) LIKE :t OR LOWER(clcs.clientDisplayName) LIKE :t)\',{ t: term });         |
|                                                                                                                |
| }                                                                                                              |
|                                                                                                                |
| const col =                                                                                                    |
| {workStartAt:\'ec.workStartAt\',netAmount:\'ec.netAmount\',durationMinutes:\'ec.durationMinutes\'}\[q.sortBy\] |
| \|\| \'ec.workStartAt\';                                                                                       |
|                                                                                                                |
| qb.orderBy(col, q.sortOrder.toUpperCase() as \'ASC\'\|\'DESC\')                                                |
|                                                                                                                |
| .skip((q.page-1)\*q.limit).take(q.limit);                                                                      |
|                                                                                                                |
| const \[rows, total\] = await qb.getManyAndCount();                                                            |
|                                                                                                                |
| // Load contract labels for display                                                                            |
|                                                                                                                |
| const ids = \[\...new Set(rows.map(r=\>r.contractId).filter(Boolean))\];                                       |
|                                                                                                                |
| const labels = ids.length ? await this.labelRepo.findBy(ids.map(id=\>({contractId:id}))) : \[\];               |
|                                                                                                                |
| const lmap = new Map(labels.map(l=\>\[l.contractId,l\]));                                                      |
|                                                                                                                |
| const manualMins = rows.filter(r=\>r.entryType===\'manual\').reduce((s,r)=\>s+r.durationMinutes,0);            |
|                                                                                                                |
| return {                                                                                                       |
|                                                                                                                |
| view: q.view, page: q.page, limit: q.limit, total,                                                             |
|                                                                                                                |
| totalPages: Math.ceil(total/q.limit),                                                                          |
|                                                                                                                |
| columns: this.cols(q.view),                                                                                    |
|                                                                                                                |
| manualTimeMinutes: manualMins,                                                                                 |
|                                                                                                                |
| manualTimeLabel: manualMins \> 0                                                                               |
|                                                                                                                |
| ? \`This timesheet includes \${this.fmtMins(manualMins)} of manual time\`                                      |
|                                                                                                                |
| : \'This timesheet contains no manual time entries.\',                                                         |
|                                                                                                                |
| data: rows.map(r=\>this.mapRow(r,lmap,q.view)),                                                                |
|                                                                                                                |
| appliedFilters: { view:q.view, dateRange:q.dateRange, startDate:startDate\|\|null,                             |
|                                                                                                                |
| endDate:endDate\|\|null, projectId:q.projectId\|\|null, clientId:q.clientId\|\|null,                           |
|                                                                                                                |
| entryType:q.entryType\|\|null, status:q.status\|\|null, search:q.search\|\|null },                             |
|                                                                                                                |
| };                                                                                                             |
|                                                                                                                |
| }                                                                                                              |
|                                                                                                                |
| private resolveDateRange(q: EarningsQueryDto): {startDate:string\|null;endDate:string\|null} {                 |
|                                                                                                                |
| const today = new Date();                                                                                      |
|                                                                                                                |
| const fmt = (d:Date) =\> d.toISOString().split(\'T\')\[0\];                                                    |
|                                                                                                                |
| if (q.dateRange === \'custom\') {                                                                              |
|                                                                                                                |
| if (!q.startDate \|\| !q.endDate) throw new BadRequestException(\'startDate and endDate required for custom    |
| range\');                                                                                                      |
|                                                                                                                |
| if (new Date(q.startDate) \> new Date(q.endDate)) throw new BadRequestException(\'startDate must not be after  |
| endDate\');                                                                                                    |
|                                                                                                                |
| if (new Date(q.startDate) \> today) throw new BadRequestException(\'startDate cannot be in the future\');      |
|                                                                                                                |
| if ((new Date(q.endDate).getTime()-new Date(q.startDate).getTime()) \> 3\*365\*24\*60\*60\*1000)               |
|                                                                                                                |
| throw new BadRequestException(\'Date range cannot exceed 3 years\');                                           |
|                                                                                                                |
| return { startDate: q.startDate, endDate: q.endDate };                                                         |
|                                                                                                                |
| }                                                                                                              |
|                                                                                                                |
| const presets: Record\<string,()=\>{startDate:string;endDate:string}\> = {                                     |
|                                                                                                                |
| today: ()=\>({ startDate:fmt(today), endDate:fmt(today) }),                                                    |
|                                                                                                                |
| yesterday: ()=\>{ const d=new Date(today); d.setDate(d.getDate()-1); return {startDate:fmt(d),endDate:fmt(d)}; |
| },                                                                                                             |
|                                                                                                                |
| this_week: ()=\>{ const d=new Date(today); const mon=new Date(d); mon.setDate(d.getDate()-((d.getDay()+6)%7)); |
| const sun=new Date(mon); sun.setDate(mon.getDate()+6); return {startDate:fmt(mon),endDate:fmt(sun)}; },        |
|                                                                                                                |
| last_week: ()=\>{ const d=new Date(today); const mon=new Date(d);                                              |
| mon.setDate(d.getDate()-((d.getDay()+6)%7)-7); const sun=new Date(mon); sun.setDate(mon.getDate()+6); return   |
| {startDate:fmt(mon),endDate:fmt(sun)}; },                                                                      |
|                                                                                                                |
| this_month: ()=\>({ startDate:fmt(new Date(today.getFullYear(),today.getMonth(),1)), endDate:fmt(today) }),    |
|                                                                                                                |
| last_month: ()=\>({ startDate:fmt(new Date(today.getFullYear(),today.getMonth()-1,1)), endDate:fmt(new         |
| Date(today.getFullYear(),today.getMonth(),0)) }),                                                              |
|                                                                                                                |
| this_year: ()=\>({ startDate:fmt(new Date(today.getFullYear(),0,1)), endDate:fmt(today) }),                    |
|                                                                                                                |
| last_year: ()=\>({ startDate:fmt(new Date(today.getFullYear()-1,0,1)), endDate:fmt(new                         |
| Date(today.getFullYear()-1,11,31)) }),                                                                         |
|                                                                                                                |
| all_time: ()=\>({ startDate:null, endDate:null }),                                                             |
|                                                                                                                |
| };                                                                                                             |
|                                                                                                                |
| return presets\[q.dateRange\]?.() ?? { startDate:null, endDate:null };                                         |
|                                                                                                                |
| }                                                                                                              |
|                                                                                                                |
| private cols(view:string):string\[\] {                                                                         |
|                                                                                                                |
| return {daily:\[\'date\',\'project\',\'task\',\'startTime\',\'endTime\',\'duration\',\'earnings\'\],           |
|                                                                                                                |
| weekly:\[\'weekRange\',\'project\',\'weeklyHours\',\'weeklyEarnings\',\'budget\'\],                            |
|                                                                                                                |
| monthly:\[\'month\',\'project\',\'totalHours\',\'totalEarnings\'\]}\[view\]                                    |
|                                                                                                                |
| \|\| \[\'date\',\'project\',\'task\',\'startTime\',\'endTime\',\'duration\',\'earnings\'\];                    |
|                                                                                                                |
| }                                                                                                              |
|                                                                                                                |
| private mapRow(row:EarningsCache, lmap:Map\<string,ContractLabelCache\>, view:string):object {                 |
|                                                                                                                |
| const lbl = row.contractId ? lmap.get(row.contractId) : null;                                                  |
|                                                                                                                |
| return {                                                                                                       |
|                                                                                                                |
| id: row.id,                                                                                                    |
|                                                                                                                |
| date: view===\'daily\' ? this.fmtDate(row.workStartAt) : null,                                                 |
|                                                                                                                |
| weekRange: view===\'weekly\' ? this.fmtWeek(row.workStartAt) : null,                                           |
|                                                                                                                |
| month: view===\'monthly\' ? this.fmtMonth(row.workStartAt): null,                                              |
|                                                                                                                |
| project: lbl ? {id:row.projectId,name:lbl.projectName,clientHandle:\'@\'+lbl.clientDisplayName} : null,        |
|                                                                                                                |
| task: view===\'daily\' ? {id:row.taskId,name:null} : null,                                                     |
|                                                                                                                |
| startTime: view===\'daily\' ? this.fmtTime(row.workStartAt) : null,                                            |
|                                                                                                                |
| endTime: view===\'daily\' ? this.fmtTime(row.workEndAt) : null,                                                |
|                                                                                                                |
| durationMinutes: row.durationMinutes,                                                                          |
|                                                                                                                |
| durationLabel: this.fmtMins(row.durationMinutes),                                                              |
|                                                                                                                |
| grossAmount: row.grossAmount,                                                                                  |
|                                                                                                                |
| feeAmount: row.feeAmount,                                                                                      |
|                                                                                                                |
| netAmount: row.netAmount,                                                                                      |
|                                                                                                                |
| netAmountDisplay:row.netAmountUsd, // currency conversion applied in ES-06                                     |
|                                                                                                                |
| displayCurrency: \'USD\',                                                                                      |
|                                                                                                                |
| entryType: row.entryType===\'screenshot\' ? \'automated\' : \'manual\',                                        |
|                                                                                                                |
| status: row.status===\'reversed\' ? \'failed\' : \'paid\',                                                     |
|                                                                                                                |
| avgKeyboardPct: view===\'daily\' ? row.avgKeyboardPct : null,                                                  |
|                                                                                                                |
| avgMousePct: view===\'daily\' ? row.avgMousePct : null,                                                        |
|                                                                                                                |
| weeklyHours: view===\'weekly\' ? this.fmtMins(row.durationMinutes) : null,                                     |
|                                                                                                                |
| weeklyEarnings: view===\'weekly\' ? row.netAmountUsd : null,                                                   |
|                                                                                                                |
| budget: null, // from contract budget --- populated via ES-04 consumer                                         |
|                                                                                                                |
| totalHours: view===\'monthly\' ? this.fmtMins(row.durationMinutes) : null,                                     |
|                                                                                                                |
| totalEarnings: view===\'monthly\' ? row.netAmountUsd : null,                                                   |
|                                                                                                                |
| };                                                                                                             |
|                                                                                                                |
| }                                                                                                              |
|                                                                                                                |
| private fmtDate(d:Date):string { return                                                                        |
| d.toLocaleDateString(\'en-US\',{month:\'short\',day:\'numeric\',year:\'numeric\'}); }                          |
|                                                                                                                |
| private fmtTime(d:Date):string { return                                                                        |
| d.toLocaleTimeString(\'en-US\',{hour:\'2-digit\',minute:\'2-digit\',hour12:true}); }                           |
|                                                                                                                |
| private fmtMonth(d:Date):string { return d.toLocaleDateString(\'en-US\',{month:\'long\',year:\'numeric\'}); }  |
|                                                                                                                |
| private fmtMins(m:number):string { return \`\${Math.floor(m/60)}h \${String(m%60).padStart(2,\'0\')}m\`; }     |
|                                                                                                                |
| private fmtWeek(d:Date):string {                                                                               |
|                                                                                                                |
| const mon=new Date(d); mon.setDate(d.getDate()-((d.getDay()+6)%7));                                            |
|                                                                                                                |
| const sun=new Date(mon); sun.setDate(mon.getDate()+6);                                                         |
|                                                                                                                |
| const f=(x:Date)=\>x.toLocaleDateString(\'en-US\',{month:\'short\',day:\'numeric\'});                          |
|                                                                                                                |
| return \`\${f(mon)} -- \${f(sun)}, \${sun.getFullYear()}\`;                                                    |
|                                                                                                                |
| }                                                                                                              |
|                                                                                                                |
| }                                                                                                              |
+================================================================================================================+

# **8. Endpoint 3 --- Get Earnings Summary Cards**

  -------------------------------------------------------------------------
  **GET**   **/v1/earnings/summary**                     JWT Bearer ---
                                                         contractor role
  --------- -------------------------------------------- ------------------

  -------------------------------------------------------------------------

Returns aggregated Today, This Week, This Month, and All Time card
values. Powers the summary cards on the Overview tab and the top of the
Earnings tab. Each card includes amount in displayCurrency, hours
logged, and percentage change vs. the prior period.

## **8.1 Query Parameters**

  ---------------------------------------------------------------------------------
  **Parameter**   **Type**   **Default**   **Description**
  --------------- ---------- ------------- ----------------------------------------
  **timezone**    string     UTC           IANA timezone name (e.g.
                                           \"America/New_York\"). Determines the
                                           boundaries of Today, This Week, This
                                           Month in the contractor\'s local time.

  ---------------------------------------------------------------------------------

## **8.2 Response --- 200 OK**

+-----------------------------------------------------------------------+
| json                                                                  |
+-----------------------------------------------------------------------+
| // HTTP 200 OK                                                        |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"today\": {                                                          |
|                                                                       |
| \"amount\": \"128.00\",                                               |
|                                                                       |
| \"displayCurrency\": \"USD\",                                         |
|                                                                       |
| \"hoursLogged\": 120,                                                 |
|                                                                       |
| \"hoursLabel\": \"2h 00m\",                                           |
|                                                                       |
| \"changePercent\": 5.2,                                               |
|                                                                       |
| \"changeLabel\": \"5.2% since yesterday\",                            |
|                                                                       |
| \"changeDirection\": \"up\", // \"up\" \| \"down\" \| \"unchanged\"   |
|                                                                       |
| \"periodLabel\": \"Earnings logged since 12:00 AM local time          |
| today.\",                                                             |
|                                                                       |
| \"dateRangeLabel\": \"Jun 10, 2025\"                                  |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"thisWeek\": {                                                       |
|                                                                       |
| \"amount\": \"640.00\",                                               |
|                                                                       |
| \"displayCurrency\": \"USD\",                                         |
|                                                                       |
| \"hoursLogged\": 480,                                                 |
|                                                                       |
| \"hoursLabel\": \"8h 00m\",                                           |
|                                                                       |
| \"changePercent\": -2.1,                                              |
|                                                                       |
| \"changeLabel\": \"2.1% since last week\",                            |
|                                                                       |
| \"changeDirection\": \"down\",                                        |
|                                                                       |
| \"periodLabel\": \"June 3rd - June 9th, 2025\",                       |
|                                                                       |
| \"dateRangeLabel\": \"Jun 3 -- Jun 9, 2025\"                          |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"thisMonth\": {                                                      |
|                                                                       |
| \"amount\": \"2560.00\",                                              |
|                                                                       |
| \"displayCurrency\": \"USD\",                                         |
|                                                                       |
| \"hoursLogged\": 1920,                                                |
|                                                                       |
| \"hoursLabel\": \"32h 00m\",                                          |
|                                                                       |
| \"changePercent\": 12.4,                                              |
|                                                                       |
| \"changeLabel\": \"12.4% since last month\",                          |
|                                                                       |
| \"changeDirection\": \"up\",                                          |
|                                                                       |
| \"periodLabel\": \"June 1st - June 9th, 2025\",                       |
|                                                                       |
| \"dateRangeLabel\": \"Jun 1 -- Jun 9, 2025\"                          |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"allTime\": {                                                        |
|                                                                       |
| \"amount\": \"4820.50\",                                              |
|                                                                       |
| \"displayCurrency\": \"USD\",                                         |
|                                                                       |
| \"hoursLogged\": 36480,                                               |
|                                                                       |
| \"hoursLabel\": \"608h 00m\",                                         |
|                                                                       |
| \"changePercent\": null,                                              |
|                                                                       |
| \"changeLabel\": null,                                                |
|                                                                       |
| \"changeDirection\": \"unchanged\",                                   |
|                                                                       |
| \"periodLabel\": \"All time earnings\",                               |
|                                                                       |
| \"dateRangeLabel\": \"All time\"                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

  -------------------------------------------------------------------------------
  **Field**             **Type**       **Description**
  --------------------- -------------- ------------------------------------------
  **amount**            string         Total earnings for the period in
                                       displayCurrency. Rounded to whole units.

  **displayCurrency**   string         ISO 4217 --- the contractor\'s
                                       displayCurrency.

  **hoursLogged**       integer        Total duration in minutes for the period.

  **hoursLabel**        string         Human-readable duration: \"2h 00m\".

  **changePercent**     number\|null   Percentage change vs. prior period.
                                       Positive = increase, negative = decrease.
                                       Null for allTime.

  **changeLabel**       string\|null   Pre-formatted label: \"5.2% since
                                       yesterday\". Null for allTime.

  **changeDirection**   string         \"up\" \| \"down\" \| \"unchanged\".
                                       \"unchanged\" when changePercent is 0 or
                                       null.

  **periodLabel**       string         Tooltip text shown when hovering the card
                                       info icon. Matches exact text from
                                       designs.

  **dateRangeLabel**    string         Short date range shown on the card: \"Jun
                                       3 -- Jun 9, 2025\".
  -------------------------------------------------------------------------------

## **8.3 Error Responses**

  ---------------------------------------------------------------------------------
  **Status**   **Code**           **Message**           **Cause**
  ------------ ------------------ --------------------- ---------------------------
  **400**      INVALID_TIMEZONE   Invalid IANA timezone timezone param is not a
                                                        valid IANA zone name

  **401**      UNAUTHORIZED       No auth token         Missing Authorization
                                                        header

  **401**      INVALID_TOKEN      Invalid token         JWT expired or invalid

  **403**      FORBIDDEN          Contractor access     JWT role ≠ contractor
                                  only                  

  **500**      INTERNAL_ERROR     An unexpected error   DB unreachable
                                  occurred              
  ---------------------------------------------------------------------------------

## **8.4 Summary Service & Controller Code**

### **src/earnings/dto/earnings-summary.dto.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/earnings/dto/earnings-summary.dto.ts                           |
|                                                                       |
| export class SummaryCardDto {                                         |
|                                                                       |
| amount: string;                                                       |
|                                                                       |
| displayCurrency: string;                                              |
|                                                                       |
| hoursLogged: number;                                                  |
|                                                                       |
| hoursLabel: string;                                                   |
|                                                                       |
| changePercent: number \| null;                                        |
|                                                                       |
| changeLabel: string \| null;                                          |
|                                                                       |
| changeDirection: \'up\' \| \'down\' \| \'unchanged\';                 |
|                                                                       |
| periodLabel: string;                                                  |
|                                                                       |
| dateRangeLabel: string;                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| export class EarningsSummaryDto {                                     |
|                                                                       |
| today: SummaryCardDto;                                                |
|                                                                       |
| thisWeek: SummaryCardDto;                                             |
|                                                                       |
| thisMonth: SummaryCardDto;                                            |
|                                                                       |
| allTime: SummaryCardDto;                                              |
|                                                                       |
| }                                                                     |
+=======================================================================+

### **Summary methods added to earnings.service.ts**

+-------------------------------------------------------------------------------------+
| typescript                                                                          |
+-------------------------------------------------------------------------------------+
| // Add these methods to EarningsService in src/earnings/earnings.service.ts         |
|                                                                                     |
| async getSummary(contractorId: string, timezone = \'UTC\'):                         |
| Promise\<EarningsSummaryDto\> {                                                     |
|                                                                                     |
| // Validate timezone                                                                |
|                                                                                     |
| try { Intl.DateTimeFormat(undefined, { timeZone: timezone }); }                     |
|                                                                                     |
| catch { throw new BadRequestException(\'Invalid IANA timezone\'); }                 |
|                                                                                     |
| const now = new Date();                                                             |
|                                                                                     |
| // Resolve period boundaries in the contractor\'s local timezone                    |
|                                                                                     |
| const todayStart = this.startOfDay(now, timezone);                                  |
|                                                                                     |
| const weekStart = this.startOfWeek(now, timezone);                                  |
|                                                                                     |
| const monthStart = this.startOfMonth(now, timezone);                                |
|                                                                                     |
| const ydayStart = new Date(todayStart); ydayStart.setDate(ydayStart.getDate()-1);   |
|                                                                                     |
| const lastWeekStart = new Date(weekStart);                                          |
| lastWeekStart.setDate(weekStart.getDate()-7);                                       |
|                                                                                     |
| const lastWeekEnd = new Date(weekStart); lastWeekEnd.setMilliseconds(-1);           |
|                                                                                     |
| const lastMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth()-1,  |
| 1);                                                                                 |
|                                                                                     |
| const lastMonthEnd = new Date(monthStart); lastMonthEnd.setMilliseconds(-1);        |
|                                                                                     |
| // Run all aggregation queries in parallel for performance                          |
|                                                                                     |
| const \[todayAgg, ydayAgg, weekAgg, lastWeekAgg, monthAgg, lastMonthAgg, allAgg\] = |
|                                                                                     |
| await Promise.all(\[                                                                |
|                                                                                     |
| this.agg(contractorId, todayStart, now),                                            |
|                                                                                     |
| this.agg(contractorId, ydayStart, todayStart),                                      |
|                                                                                     |
| this.agg(contractorId, weekStart, now),                                             |
|                                                                                     |
| this.agg(contractorId, lastWeekStart, lastWeekEnd),                                 |
|                                                                                     |
| this.agg(contractorId, monthStart, now),                                            |
|                                                                                     |
| this.agg(contractorId, lastMonthStart, lastMonthEnd),                               |
|                                                                                     |
| this.agg(contractorId, null, null),                                                 |
|                                                                                     |
| \]);                                                                                |
|                                                                                     |
| return {                                                                            |
|                                                                                     |
| today: this.buildCard(todayAgg, ydayAgg, \'since yesterday\', \`Earnings logged     |
| since 12:00 AM local time today.\`, this.fmtDateShort(todayStart)),                 |
|                                                                                     |
| thisWeek: this.buildCard(weekAgg, lastWeekAgg, \'since last week\',                 |
| this.periodLabelWeek(weekStart, now), this.fmtWeek(weekStart)),                     |
|                                                                                     |
| thisMonth: this.buildCard(monthAgg, lastMonthAgg, \'since last month\',             |
| this.periodLabelMonth(monthStart, now), this.fmtDateRange(monthStart, now)),        |
|                                                                                     |
| allTime: this.buildCard(allAgg, null, null, \'All time earnings\', \'All time\'),   |
|                                                                                     |
| };                                                                                  |
|                                                                                     |
| }                                                                                   |
|                                                                                     |
| private async agg(contractorId:string, from:Date\|null, to:Date\|null):             |
|                                                                                     |
| Promise\<{totalUsd:string;durationMinutes:number}\> {                               |
|                                                                                     |
| const qb = this.earningsRepo.createQueryBuilder(\'ec\')                             |
|                                                                                     |
| .select(\'COALESCE(SUM(ec.netAmountUsd),0)\', \'totalUsd\')                         |
|                                                                                     |
| .addSelect(\'COALESCE(SUM(ec.durationMinutes),0)\', \'durationMinutes\')            |
|                                                                                     |
| .where(\'ec.contractorId = :cid\', { cid: contractorId })                           |
|                                                                                     |
| .andWhere(\'ec.status = :status\', { status: \'confirmed\' });                      |
|                                                                                     |
| if (from) qb.andWhere(\'ec.workStartAt \>= :from\', { from });                      |
|                                                                                     |
| if (to) qb.andWhere(\'ec.workStartAt \< :to\', { to });                             |
|                                                                                     |
| const r = await qb.getRawOne();                                                     |
|                                                                                     |
| return { totalUsd: r.totalUsd, durationMinutes: parseInt(r.durationMinutes, 10) };  |
|                                                                                     |
| }                                                                                   |
|                                                                                     |
| private buildCard(                                                                  |
|                                                                                     |
| curr: {totalUsd:string;durationMinutes:number},                                     |
|                                                                                     |
| prev: {totalUsd:string;durationMinutes:number}\|null,                               |
|                                                                                     |
| sinceLabel: string\|null,                                                           |
|                                                                                     |
| periodLabel: string,                                                                |
|                                                                                     |
| dateRangeLabel: string,                                                             |
|                                                                                     |
| ): SummaryCardDto {                                                                 |
|                                                                                     |
| const amount = parseFloat(curr.totalUsd);                                           |
|                                                                                     |
| let changePercent: number\|null = null;                                             |
|                                                                                     |
| let changeDirection: \'up\'\|\'down\'\|\'unchanged\' = \'unchanged\';               |
|                                                                                     |
| let changeLabel: string\|null = null;                                               |
|                                                                                     |
| if (prev !== null) {                                                                |
|                                                                                     |
| const prevAmount = parseFloat(prev.totalUsd);                                       |
|                                                                                     |
| if (prevAmount \> 0) {                                                              |
|                                                                                     |
| changePercent = Math.round(((amount - prevAmount) / prevAmount) \* 1000) / 10;      |
|                                                                                     |
| changeDirection = changePercent \> 0 ? \'up\' : changePercent \< 0 ? \'down\' :     |
| \'unchanged\';                                                                      |
|                                                                                     |
| changeLabel = \`\${Math.abs(changePercent)}% \${sinceLabel}\`;                      |
|                                                                                     |
| }                                                                                   |
|                                                                                     |
| }                                                                                   |
|                                                                                     |
| return {                                                                            |
|                                                                                     |
| amount: amount.toFixed(2),                                                          |
|                                                                                     |
| displayCurrency: \'USD\', // currency conversion applied in ES-06                   |
|                                                                                     |
| hoursLogged: curr.durationMinutes,                                                  |
|                                                                                     |
| hoursLabel: this.fmtMins(curr.durationMinutes),                                     |
|                                                                                     |
| changePercent,                                                                      |
|                                                                                     |
| changeLabel,                                                                        |
|                                                                                     |
| changeDirection,                                                                    |
|                                                                                     |
| periodLabel,                                                                        |
|                                                                                     |
| dateRangeLabel,                                                                     |
|                                                                                     |
| };                                                                                  |
|                                                                                     |
| }                                                                                   |
|                                                                                     |
| private startOfDay(d:Date, tz:string):Date {                                        |
|                                                                                     |
| const s = new Date(d.toLocaleDateString(\'en-US\',{timeZone:tz}));                  |
|                                                                                     |
| return s;                                                                           |
|                                                                                     |
| }                                                                                   |
|                                                                                     |
| private startOfWeek(d:Date, tz:string):Date {                                       |
|                                                                                     |
| const s = this.startOfDay(d, tz);                                                   |
|                                                                                     |
| s.setDate(s.getDate() - ((s.getDay()+6)%7));                                        |
|                                                                                     |
| return s;                                                                           |
|                                                                                     |
| }                                                                                   |
|                                                                                     |
| private startOfMonth(d:Date, tz:string):Date {                                      |
|                                                                                     |
| const s = this.startOfDay(d, tz);                                                   |
|                                                                                     |
| s.setDate(1);                                                                       |
|                                                                                     |
| return s;                                                                           |
|                                                                                     |
| }                                                                                   |
|                                                                                     |
| private fmtDateShort(d:Date):string { return                                        |
| d.toLocaleDateString(\'en-US\',{month:\'short\',day:\'numeric\',year:\'numeric\'}); |
| }                                                                                   |
|                                                                                     |
| private fmtDateRange(from:Date,to:Date):string { return                             |
| \`\${this.fmtDateShort(from)} -- \${this.fmtDateShort(to)}\`; }                     |
|                                                                                     |
| private periodLabelWeek(start:Date,now:Date):string {                               |
|                                                                                     |
| const                                                                               |
| fmt=(d:Date)=\>d.toLocaleDateString(\'en-US\',{month:\'long\',day:\'numeric\'});    |
|                                                                                     |
| return \`\${fmt(start)} - \${fmt(now)}, \${now.getFullYear()}\`;                    |
|                                                                                     |
| }                                                                                   |
|                                                                                     |
| private periodLabelMonth(start:Date,now:Date):string {                              |
|                                                                                     |
| const                                                                               |
| fmt=(d:Date)=\>d.toLocaleDateString(\'en-US\',{month:\'long\',day:\'numeric\'});    |
|                                                                                     |
| return \`\${fmt(start)} - \${fmt(now)}, \${now.getFullYear()}\`;                    |
|                                                                                     |
| }                                                                                   |
+=====================================================================================+

### **GET /v1/earnings/summary --- controller method (add to earnings.controller.ts)**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // GET /v1/earnings/summary                                           |
|                                                                       |
| \@Get(\'summary\')                                                    |
|                                                                       |
| \@HttpCode(200)                                                       |
|                                                                       |
| async getSummary(                                                     |
|                                                                       |
| \@Request() req,                                                      |
|                                                                       |
| \@Query(\'timezone\') timezone?: string,                              |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| return this.earningsService.getSummary(req.user.sub, timezone \|\|    |
| \'UTC\');                                                             |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **9. Endpoint 4 --- Get Single Earnings Entry Detail**

  -------------------------------------------------------------------------
  **GET**   **/v1/earnings/:id**                         JWT Bearer ---
                                                         contractor role
  --------- -------------------------------------------- ------------------

  -------------------------------------------------------------------------

Returns the full detail for a single earnings entry. Triggered when a
contractor clicks a row in the Earnings tab table. Returns all fields
including the gross/fee/net breakdown, activity metrics, and
contract/project label data.

## **9.1 Path Parameter**

  ----------------------------------------------------------------------------------
  **Parameter**   **Type**   **Required**   **Description**
  --------------- ---------- -------------- ----------------------------------------
  **:id**         UUID       Yes            The id of the earnings_cache row. Taken
                                            from the id field in the earnings list
                                            response.

  ----------------------------------------------------------------------------------

## **9.2 Response --- 200 OK**

+-----------------------------------------------------------------------+
| json                                                                  |
+-----------------------------------------------------------------------+
| // HTTP 200 OK                                                        |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"id\": \"uuid\",                                                     |
|                                                                       |
| \"transactionId\": \"uuid\", // ledger entry ID in                    |
| transaction-service                                                   |
|                                                                       |
| \"contractorId\": \"uuid\",                                           |
|                                                                       |
| \"contractId\": \"uuid\",                                             |
|                                                                       |
| \"projectId\": \"uuid\",                                              |
|                                                                       |
| \"taskId\": \"uuid\",                                                 |
|                                                                       |
| \"entryType\": \"automated\", // \"automated\" \| \"manual\"          |
|                                                                       |
| \"status\": \"paid\", // \"paid\" \| \"unpaid\" \| \"failed\"         |
|                                                                       |
| \"grossAmount\": \"160.00\",                                          |
|                                                                       |
| \"feeAmount\": \"32.00\",                                             |
|                                                                       |
| \"netAmount\": \"128.00\",                                            |
|                                                                       |
| \"netAmountDisplay\":\"128.00\", // in displayCurrency                |
|                                                                       |
| \"currency\": \"USD\", // original rateCurrency from contract         |
|                                                                       |
| \"displayCurrency\": \"USD\",                                         |
|                                                                       |
| \"fxRateToUsd\": \"1.00000000\", // FX snapshot captured at billing   |
| time --- immutable                                                    |
|                                                                       |
| \"netAmountUsd\": \"128.00\",                                         |
|                                                                       |
| \"workStartAt\": \"2025-06-10T09:00:00Z\",                            |
|                                                                       |
| \"workEndAt\": \"2025-06-10T11:00:00Z\",                              |
|                                                                       |
| \"durationMinutes\": 120,                                             |
|                                                                       |
| \"durationLabel\": \"2h 00m\",                                        |
|                                                                       |
| \"avgKeyboardPct\": 72,                                               |
|                                                                       |
| \"avgMousePct\": 45,                                                  |
|                                                                       |
| \"idempotencyKey\": \"billing-period-uuid:1\",                        |
|                                                                       |
| \"createdAt\": \"2025-06-10T11:05:00Z\",                              |
|                                                                       |
| \"reversedAt\": null,                                                 |
|                                                                       |
| \"contract\": {                                                       |
|                                                                       |
| \"id\": \"uuid\",                                                     |
|                                                                       |
| \"title\": \"Website Redesign\",                                      |
|                                                                       |
| \"status\": \"active\"                                                |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"project\": {                                                        |
|                                                                       |
| \"id\": \"uuid\",                                                     |
|                                                                       |
| \"name\": \"Website Redesign\",                                       |
|                                                                       |
| \"clientHandle\": \"@referrizerllc\",                                 |
|                                                                       |
| \"clientName\": \"Referrizer LLC\"                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **9.3 Error Responses**

  --------------------------------------------------------------------------------
  **Status**   **Code**          **Message**           **Cause**
  ------------ ----------------- --------------------- ---------------------------
  **401**      UNAUTHORIZED      No auth token         Missing header

  **401**      INVALID_TOKEN     Invalid token         JWT expired

  **403**      FORBIDDEN         Contractor access     JWT role ≠ contractor
                                 only                  

  **403**      FORBIDDEN         Access denied         The requested entry belongs
                                                       to a different contractor
                                                       --- contractor isolation
                                                       violation

  **404**      ENTRY_NOT_FOUND   Earnings entry not    No earnings_cache row with
                                 found                 this id

  **500**      INTERNAL_ERROR    An unexpected error   DB unreachable
                                 occurred              
  --------------------------------------------------------------------------------

## **9.4 Full Code**

### **src/earnings/dto/earnings-detail.dto.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/earnings/dto/earnings-detail.dto.ts                            |
|                                                                       |
| export class EarningsDetailDto {                                      |
|                                                                       |
| id: string;                                                           |
|                                                                       |
| transactionId: string;                                                |
|                                                                       |
| contractorId: string;                                                 |
|                                                                       |
| contractId: string \| null;                                           |
|                                                                       |
| projectId: string \| null;                                            |
|                                                                       |
| taskId: string \| null;                                               |
|                                                                       |
| entryType: string;                                                    |
|                                                                       |
| status: string;                                                       |
|                                                                       |
| grossAmount: string;                                                  |
|                                                                       |
| feeAmount: string;                                                    |
|                                                                       |
| netAmount: string;                                                    |
|                                                                       |
| netAmountDisplay:string;                                              |
|                                                                       |
| currency: string;                                                     |
|                                                                       |
| displayCurrency: string;                                              |
|                                                                       |
| fxRateToUsd: string;                                                  |
|                                                                       |
| netAmountUsd: string;                                                 |
|                                                                       |
| workStartAt: string;                                                  |
|                                                                       |
| workEndAt: string;                                                    |
|                                                                       |
| durationMinutes: number;                                              |
|                                                                       |
| durationLabel: string;                                                |
|                                                                       |
| avgKeyboardPct: number \| null;                                       |
|                                                                       |
| avgMousePct: number \| null;                                          |
|                                                                       |
| idempotencyKey: string;                                               |
|                                                                       |
| createdAt: string;                                                    |
|                                                                       |
| reversedAt: string \| null;                                           |
|                                                                       |
| contract: { id:string; title:string\|null; status:string } \| null;   |
|                                                                       |
| project: { id:string\|null; name:string\|null;                        |
| clientHandle:string\|null; clientName:string\|null } \| null;         |
|                                                                       |
| }                                                                     |
+=======================================================================+

### **Detail method added to earnings.service.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Add to EarningsService in src/earnings/earnings.service.ts         |
|                                                                       |
| async getDetail(contractorId: string, id: string):                    |
| Promise\<EarningsDetailDto\> {                                        |
|                                                                       |
| const row = await this.earningsRepo.findOne({ where: { id } });       |
|                                                                       |
| if (!row) throw new NotFoundException(\'Earnings entry not found\');  |
|                                                                       |
| // Contractor isolation --- a contractor may never see another        |
| contractor\'s entry.                                                  |
|                                                                       |
| if (row.contractorId !== contractorId) throw new                      |
| ForbiddenException(\'Access denied\');                                |
|                                                                       |
| const lbl = row.contractId ? await                                    |
| this.labelRepo.findOne({where:{contractId:row.contractId}}) : null;   |
|                                                                       |
| const dto = new EarningsDetailDto();                                  |
|                                                                       |
| dto.id = row.id;                                                      |
|                                                                       |
| dto.transactionId = row.transactionId;                                |
|                                                                       |
| dto.contractorId = row.contractorId;                                  |
|                                                                       |
| dto.contractId = row.contractId;                                      |
|                                                                       |
| dto.projectId = row.projectId;                                        |
|                                                                       |
| dto.taskId = row.taskId;                                              |
|                                                                       |
| dto.entryType = row.entryType === \'screenshot\' ? \'automated\' :    |
| \'manual\';                                                           |
|                                                                       |
| dto.status = row.status === \'reversed\' ? \'failed\' : \'paid\';     |
|                                                                       |
| dto.grossAmount = row.grossAmount;                                    |
|                                                                       |
| dto.feeAmount = row.feeAmount;                                        |
|                                                                       |
| dto.netAmount = row.netAmount;                                        |
|                                                                       |
| dto.netAmountDisplay= row.netAmountUsd; // currency conversion in     |
| ES-06                                                                 |
|                                                                       |
| dto.currency = row.currency;                                          |
|                                                                       |
| dto.displayCurrency = \'USD\';                                        |
|                                                                       |
| dto.fxRateToUsd = row.fxRateToUsd;                                    |
|                                                                       |
| dto.netAmountUsd = row.netAmountUsd;                                  |
|                                                                       |
| dto.workStartAt = row.workStartAt.toISOString();                      |
|                                                                       |
| dto.workEndAt = row.workEndAt.toISOString();                          |
|                                                                       |
| dto.durationMinutes = row.durationMinutes;                            |
|                                                                       |
| dto.durationLabel = this.fmtMins(row.durationMinutes);                |
|                                                                       |
| dto.avgKeyboardPct = row.avgKeyboardPct;                              |
|                                                                       |
| dto.avgMousePct = row.avgMousePct;                                    |
|                                                                       |
| dto.idempotencyKey = row.idempotencyKey;                              |
|                                                                       |
| dto.createdAt = row.createdAt.toISOString();                          |
|                                                                       |
| dto.reversedAt = row.reversedAt?.toISOString() \|\| null;             |
|                                                                       |
| dto.contract = lbl ? { id:lbl.contractId, title:lbl.contractTitle,    |
| status:lbl.status } : null;                                           |
|                                                                       |
| dto.project = lbl ? { id:lbl.projectId, name:lbl.projectName,         |
| clientHandle:lbl.clientDisplayName?\'@\'+lbl.clientDisplayName:null,  |
| clientName:lbl.clientDisplayName } : null;                            |
|                                                                       |
| return dto;                                                           |
|                                                                       |
| }                                                                     |
+=======================================================================+

### **GET /v1/earnings/:id --- controller method (add to earnings.controller.ts)**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // GET /v1/earnings/:id                                               |
|                                                                       |
| \@Get(\':id\')                                                        |
|                                                                       |
| \@HttpCode(200)                                                       |
|                                                                       |
| async getDetail(                                                      |
|                                                                       |
| \@Request() req,                                                      |
|                                                                       |
| \@Param(\'id\', ParseUUIDPipe) id: string,                            |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| return this.earningsService.getDetail(req.user.sub, id);              |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **10. Complete earnings.controller.ts**

The full controller file consolidating all four endpoints. Place at
src/earnings/earnings.controller.ts.

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/earnings/earnings.controller.ts                                |
|                                                                       |
| import {                                                              |
|                                                                       |
| Controller, Get, Query, Param,                                        |
|                                                                       |
| UseGuards, Request, HttpCode, ParseUUIDPipe,                          |
|                                                                       |
| } from \'@nestjs/common\';                                            |
|                                                                       |
| import { EarningsService } from \'./earnings.service\';               |
|                                                                       |
| import { EarningsQueryDto } from \'./dto/earnings-query.dto\';        |
|                                                                       |
| import { JwtAuthGuard } from \'../guards/jwt-auth.guard\';            |
|                                                                       |
| // All routes under /v1/earnings.                                     |
|                                                                       |
| // All routes require a valid contractor-role JWT.                    |
|                                                                       |
| // contractorId is always taken from req.user.sub --- never from URL  |
| or query.                                                             |
|                                                                       |
| \@Controller(\'v1/earnings\')                                         |
|                                                                       |
| \@UseGuards(JwtAuthGuard)                                             |
|                                                                       |
| export class EarningsController {                                     |
|                                                                       |
| constructor(private readonly svc: EarningsService) {}                 |
|                                                                       |
| // GET /v1/earnings/balance                                           |
|                                                                       |
| // Note: this route is handled by BalanceController in the balance    |
| module.                                                               |
|                                                                       |
| // It is shown here for documentation completeness only.              |
|                                                                       |
| // GET /v1/earnings/summary                                           |
|                                                                       |
| // Must be declared BEFORE :id route or NestJS will treat \"summary\" |
| as an id param.                                                       |
|                                                                       |
| \@Get(\'summary\')                                                    |
|                                                                       |
| \@HttpCode(200)                                                       |
|                                                                       |
| async getSummary(                                                     |
|                                                                       |
| \@Request() req,                                                      |
|                                                                       |
| \@Query(\'timezone\') timezone?: string,                              |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| return this.svc.getSummary(req.user.sub, timezone \|\| \'UTC\');      |
|                                                                       |
| }                                                                     |
|                                                                       |
| // GET /v1/earnings                                                   |
|                                                                       |
| \@Get()                                                               |
|                                                                       |
| \@HttpCode(200)                                                       |
|                                                                       |
| async getEarnings(                                                    |
|                                                                       |
| \@Request() req,                                                      |
|                                                                       |
| \@Query() query: EarningsQueryDto,                                    |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| return this.svc.getEarnings(req.user.sub, query);                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // GET /v1/earnings/:id                                               |
|                                                                       |
| // Must be declared AFTER /summary to avoid route collision.          |
|                                                                       |
| \@Get(\':id\')                                                        |
|                                                                       |
| \@HttpCode(200)                                                       |
|                                                                       |
| async getDetail(                                                      |
|                                                                       |
| \@Request() req,                                                      |
|                                                                       |
| \@Param(\'id\', ParseUUIDPipe) id: string,                            |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| return this.svc.getDetail(req.user.sub, id);                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **11. Verification**

Run these curl commands after starting the service to confirm all four
endpoints work end-to-end. Replace TOKEN with a real contractor JWT from
auth-service.

## **Start the service**

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| cd apps/earnings-service                                              |
|                                                                       |
| npm run start:dev                                                     |
|                                                                       |
| \# Expected: earnings-service listening on port 3010                  |
+=======================================================================+

## **GET /v1/earnings/balance**

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| curl -s -H \"Authorization: Bearer TOKEN\"                            |
| http://localhost:3010/v1/earnings/balance \| jq .                     |
|                                                                       |
| \# Expected: 200 with availableBalance, displayCurrency,              |
| reserveBalance fields                                                 |
|                                                                       |
| \# If contractor has never earned: 404 BALANCE_NOT_FOUND (UI shows    |
| \$0.00 empty state)                                                   |
+=======================================================================+

## **GET /v1/earnings (default filters)**

+--------------------------------------------------------------------------------------+
| bash                                                                                 |
+--------------------------------------------------------------------------------------+
| curl -s -H \"Authorization: Bearer TOKEN\" \\                                        |
|                                                                                      |
| \"http://localhost:3010/v1/earnings?view=daily&dateRange=this_week&page=1&limit=10\" |
| \| jq .                                                                              |
|                                                                                      |
| \# Expected: 200 with view, columns, data array, total, totalPages, appliedFilters   |
+======================================================================================+

## **GET /v1/earnings (custom date range)**

+------------------------------------------------------------------------------------------------+
| bash                                                                                           |
+------------------------------------------------------------------------------------------------+
| curl -s -H \"Authorization: Bearer TOKEN\" \\                                                  |
|                                                                                                |
| \"http://localhost:3010/v1/earnings?dateRange=custom&startDate=2025-01-01&endDate=2025-06-30\" |
| \| jq .                                                                                        |
|                                                                                                |
| \# Expected: 200 with results for the custom range                                             |
|                                                                                                |
| \# Test validation --- start after end:                                                        |
|                                                                                                |
| curl -s -H \"Authorization: Bearer TOKEN\" \\                                                  |
|                                                                                                |
| \"http://localhost:3010/v1/earnings?dateRange=custom&startDate=2025-06-30&endDate=2025-01-01\" |
| \| jq .                                                                                        |
|                                                                                                |
| \# Expected: 400 INVALID_DATE_RANGE                                                            |
+================================================================================================+

## **GET /v1/earnings/summary**

+-------------------------------------------------------------------------+
| bash                                                                    |
+-------------------------------------------------------------------------+
| curl -s -H \"Authorization: Bearer TOKEN\" \\                           |
|                                                                         |
| \"http://localhost:3010/v1/earnings/summary?timezone=America/New_York\" |
| \| jq .                                                                 |
|                                                                         |
| \# Expected: 200 with today, thisWeek, thisMonth, allTime cards         |
|                                                                         |
| \# Each card has amount, hoursLabel, changePercent, changeDirection     |
+=========================================================================+

## **GET /v1/earnings/:id**

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| \# First get an id from the list endpoint, then:                      |
|                                                                       |
| curl -s -H \"Authorization: Bearer TOKEN\" \\                         |
|                                                                       |
| http://localhost:3010/v1/earnings/ENTRY_UUID_HERE \| jq .             |
|                                                                       |
| \# Expected: 200 with full entry detail including grossAmount,        |
| feeAmount, contract object                                            |
|                                                                       |
| \# Test contractor isolation --- use a valid id belonging to a        |
| different contractor:                                                 |
|                                                                       |
| \# Expected: 403 FORBIDDEN \"Access denied\"                          |
+=======================================================================+

## **Test auth failures**

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| \# No token:                                                          |
|                                                                       |
| curl -s http://localhost:3010/v1/earnings/balance \| jq .             |
|                                                                       |
| \# Expected: 401 {\"message\":\"No auth token\"}                      |
|                                                                       |
| \# Wrong role (client JWT):                                           |
|                                                                       |
| curl -s -H \"Authorization: Bearer CLIENT_TOKEN\"                     |
| http://localhost:3010/v1/earnings/balance \| jq .                     |
|                                                                       |
| \# Expected: 403 {\"message\":\"Contractor access only\"}             |
+=======================================================================+

# **12. References**

  -----------------------------------------------------------------------
  **Document**           **Relationship to ES-02**
  ---------------------- ------------------------------------------------
  **ES-00 --- Service    Defines service boundaries, folder structure,
  Overview &             environment variables. Read first.
  Architecture**         

  **ES-01 --- Database   Defines all tables and entities these endpoints
  Schema & Entities**    query. Must be migrated before ES-02 works.

  **ES-03 --- Internal   Internal service-to-service endpoints (balance
  Endpoints**            read for payout-service, YTD for KYC). Separate
                         from contractor-facing endpoints in this
                         document.

  **ES-04 --- RabbitMQ   Consumers that write the data these endpoints
  Consumers**            return. ES-02 reads what ES-04 writes.

  **ES-06 --- Currency   Replaces the raw USD values in this document
  Conversion**           with displayCurrency-converted values.

  **ES-07 --- Redis      Adds Redis cache layer in front of the balance
  Caching**              endpoint. Replaces the cache stubs in
                         BalanceService.

  **ES-09 --- Export**   Adds GET /v1/earnings/export endpoint. Separate
                         from the endpoints in this document.
  -----------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
earnings-service ES-02 \| v1.0
