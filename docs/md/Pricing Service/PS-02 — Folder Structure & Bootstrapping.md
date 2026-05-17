PS-02

**Folder Structure & Bootstrapping**

Service: pricing-service

Marketeq Backend --- marketeq-projects-nestjs

# **1. Purpose**

This document covers the complete file layout for pricing-service, the
NestJS application entry point, the root module wiring, configuration
loading, and the Redis client factory. It does not cover API endpoints,
entities, or external integrations --- those are in PS-03 through PS-05.
The goal is to give a developer everything they need to bootstrap the
service from a blank apps/pricing-service/ directory.

> *Important: See PS-01 for Dockerfile and environment variable setup.
> This document assumes those steps are complete and the service can
> start. Run npm run start:dev \-- \--projects pricing-service after
> completing the files in this document and confirm the service starts
> with all six routes registered.*

# **2. Complete File Layout**

Every file that must exist in apps/pricing-service/ is listed below.
Files marked with an asterisk (\*) are defined in full in this document.
All other files are defined in subsequent PS-series documents.

> apps/pricing-service/
>
> ├─ Dockerfile (PS-01)
>
> ├─ Supabase.yaml (PS-01)
>
> ├─ package.json (PS-01)
>
> └─ src/
>
> ├─ main.ts \* (Section 3)
>
> ├─ app.module.ts \* (Section 4)
>
> ├─ data-source.ts \* (Section 5)
>
> ├─ rates/
>
> │ ├─ rates.module.ts \* (Section 6)
>
> │ ├─ controllers/
>
> │ │ └─ rates.controller.ts (PS-04)
>
> │ ├─ services/
>
> │ │ ├─ rates.service.ts (PS-04)
>
> │ │ └─ rates-refresh.service.ts (PS-05)
>
> │ ├─ dto/
>
> │ │ ├─ get-rates-query.dto.ts (PS-03)
>
> │ │ └─ rates-response.dto.ts (PS-03)
>
> │ └─ entities/
>
> │ └─ platform-rate-average.entity.ts (PS-03)
>
> ├─ budget/
>
> │ ├─ budget.module.ts \* (Section 7)
>
> │ ├─ controllers/
>
> │ │ └─ budget.controller.ts (PS-04)
>
> │ ├─ services/
>
> │ │ └─ budget.service.ts (PS-04)
>
> │ └─ dto/
>
> │ ├─ calculate-budget.dto.ts (PS-03)
>
> │ └─ budget-response.dto.ts (PS-03)
>
> ├─ currency/
>
> │ ├─ currency.module.ts \* (Section 8)
>
> │ ├─ controllers/
>
> │ │ └─ currency.controller.ts (PS-04)
>
> │ ├─ services/
>
> │ │ ├─ currency.service.ts (PS-04)
>
> │ │ └─ fx-cache.service.ts (PS-05)
>
> │ ├─ dto/
>
> │ │ ├─ convert-currency.dto.ts (PS-03)
>
> │ │ └─ currency-response.dto.ts (PS-03)
>
> │ └─ entities/
>
> │ └─ currency-rate.entity.ts (PS-03)
>
> ├─ health/
>
> │ └─ health.controller.ts \* (Section 9)
>
> └─ config/
>
> └─ redis.config.ts \* (Section 10)

# **3. main.ts**

The application entry point. Bootstraps the NestJS application, applies
the global ValidationPipe, and starts the HTTP server on the PORT
environment variable.

> apps/pricing-service/src/main.ts
>
> import { NestFactory } from \'@nestjs/core\';
>
> import { ValidationPipe } from \'@nestjs/common\';
>
> import { AppModule } from \'./app.module\';
>
> async function bootstrap(): Promise\<void\> {
>
> const app = await NestFactory.create(AppModule);
>
> app.useGlobalPipes(
>
> new ValidationPipe({
>
> whitelist: true,
>
> forbidNonWhitelisted: true,
>
> transform: true,
>
> }),
>
> );
>
> const port = process.env.PORT ?? \'3016\';
>
> await app.listen(port);
>
> console.log(\`pricing-service running on port \${port}\`);
>
> }
>
> bootstrap();

# **4. app.module.ts**

The root module. Wires together ConfigModule, TypeOrmModule, HttpModule,
ScheduleModule (for the daily rate refresh and hourly FX cron jobs), and
the three feature modules. HealthController is registered at the root so
GET /health has no route prefix.

> apps/pricing-service/src/app.module.ts
>
> import { Module } from \'@nestjs/common\';
>
> import { ConfigModule, ConfigService } from \'@nestjs/config\';
>
> import { TypeOrmModule } from \'@nestjs/typeorm\';
>
> import { HttpModule } from \'@nestjs/axios\';
>
> import { ScheduleModule } from \'@nestjs/schedule\';
>
> import { RatesModule } from \'./rates/rates.module\';
>
> import { BudgetModule } from \'./budget/budget.module\';
>
> import { CurrencyModule } from \'./currency/currency.module\';
>
> import { HealthController } from \'./health/health.controller\';
>
> import { PlatformRateAverage } from
> \'./rates/entities/platform-rate-average.entity\';
>
> import { CurrencyRate } from
> \'./currency/entities/currency-rate.entity\';
>
> \@Module({
>
> imports: \[
>
> // ── Global config ─────────────────────────────────────────────
>
> ConfigModule.forRoot({ isGlobal: true }),
>
> // ── Cron / scheduled jobs ─────────────────────────────────────
>
> // Enables \@Cron decorators in RatesRefreshService and
> FxCacheService.
>
> ScheduleModule.forRoot(),
>
> // ── TypeORM --- shared Supabase PostgreSQL ──────────────────────
>
> TypeOrmModule.forRootAsync({
>
> imports: \[ConfigModule\],
>
> inject: \[ConfigService\],
>
> useFactory: (config: ConfigService) =\> ({
>
> type: \'postgres\',
>
> url: config.get\<string\>(\'DATABASE_URL\'),
>
> entities: \[PlatformRateAverage, CurrencyRate\],
>
> synchronize: false,
>
> ssl: { rejectUnauthorized: false },
>
> }),
>
> }),
>
> // ── HTTP client --- for FX API and transaction-service calls ─────
>
> HttpModule.registerAsync({
>
> imports: \[ConfigModule\],
>
> inject: \[ConfigService\],
>
> useFactory: (\_config: ConfigService) =\> ({
>
> timeout: 10_000,
>
> maxRedirects: 3,
>
> }),
>
> }),
>
> // ── Feature modules ────────────────────────────────────────────
>
> RatesModule,
>
> BudgetModule,
>
> CurrencyModule,
>
> \],
>
> controllers: \[HealthController\],
>
> })
>
> export class AppModule {}
>
> *Important: HttpModule is registered without a baseURL because
> pricing-service makes calls to multiple external hosts: the
> fawazahmed0 FX API, the Frankfurter.app fallback, and
> transaction-service. Each service method constructs the full URL from
> its own environment variable.*

# **5. data-source.ts**

The TypeORM DataSource used by the TypeORM CLI for running migrations.
Used only from the command line --- not part of the NestJS application
runtime.

> apps/pricing-service/src/data-source.ts
>
> import \'reflect-metadata\';
>
> import { DataSource } from \'typeorm\';
>
> import { PlatformRateAverage } from
> \'./rates/entities/platform-rate-average.entity\';
>
> import { CurrencyRate } from
> \'./currency/entities/currency-rate.entity\';
>
> export const AppDataSource = new DataSource({
>
> type: \'postgres\',
>
> url: process.env.DATABASE_URL,
>
> entities: \[PlatformRateAverage, CurrencyRate\],
>
> migrations: \[\"src/migrations/\*.ts\"\],
>
> synchronize: false,
>
> ssl: { rejectUnauthorized: false },
>
> });

# **6. rates.module.ts**

The Rates feature module. Owns the PlatformRateAverage entity, the rate
query endpoint, the Redis cache for rates, and the daily scheduled job
that refreshes rate data from transaction-service. Exports RatesService
so BudgetModule can call it when calculating total budgets.

> apps/pricing-service/src/rates/rates.module.ts
>
> import { Module } from \'@nestjs/common\';
>
> import { TypeOrmModule } from \'@nestjs/typeorm\';
>
> import { ConfigModule } from \'@nestjs/config\';
>
> import { HttpModule } from \'@nestjs/axios\';
>
> import { RatesController } from \'./controllers/rates.controller\';
>
> import { RatesService } from \'./services/rates.service\';
>
> import { RatesRefreshService } from
> \'./services/rates-refresh.service\';
>
> import { PlatformRateAverage } from
> \'./entities/platform-rate-average.entity\';
>
> \@Module({
>
> imports: \[
>
> ConfigModule,
>
> HttpModule,
>
> TypeOrmModule.forFeature(\[PlatformRateAverage\]),
>
> \],
>
> controllers: \[RatesController\],
>
> providers: \[
>
> RatesService,
>
> RatesRefreshService,
>
> \],
>
> // RatesService exported so BudgetModule can fetch per-role rates
>
> // when calculating aggregate budget totals.
>
> exports: \[RatesService\],
>
> })
>
> export class RatesModule {}

# **7. budget.module.ts**

The Budget feature module. Owns the POST /v1/budget/calculate endpoint.
Imports RatesModule to access RatesService for per-role rate lookups
used in the aggregate calculation. BudgetService does not own any
entities --- it is a pure computation service.

> apps/pricing-service/src/budget/budget.module.ts
>
> import { Module } from \'@nestjs/common\';
>
> import { ConfigModule } from \'@nestjs/config\';
>
> import { BudgetController } from \'./controllers/budget.controller\';
>
> import { BudgetService } from \'./services/budget.service\';
>
> import { RatesModule } from \'../rates/rates.module\';
>
> \@Module({
>
> imports: \[
>
> ConfigModule,
>
> RatesModule,
>
> \],
>
> controllers: \[BudgetController\],
>
> providers: \[BudgetService\],
>
> })
>
> export class BudgetModule {}

# **8. currency.module.ts**

The Currency feature module. Owns the CurrencyRate entity (snapshot of
FX rates), the convert and rates endpoints, and the hourly FX rate cache
refresh scheduled job via FxCacheService.

> apps/pricing-service/src/currency/currency.module.ts
>
> import { Module } from \'@nestjs/common\';
>
> import { TypeOrmModule } from \'@nestjs/typeorm\';
>
> import { ConfigModule } from \'@nestjs/config\';
>
> import { HttpModule } from \'@nestjs/axios\';
>
> import { CurrencyController } from
> \'./controllers/currency.controller\';
>
> import { CurrencyService } from \'./services/currency.service\';
>
> import { FxCacheService } from \'./services/fx-cache.service\';
>
> import { CurrencyRate } from \'./entities/currency-rate.entity\';
>
> \@Module({
>
> imports: \[
>
> ConfigModule,
>
> HttpModule,
>
> TypeOrmModule.forFeature(\[CurrencyRate\]),
>
> \],
>
> controllers: \[CurrencyController\],
>
> providers: \[
>
> CurrencyService,
>
> FxCacheService,
>
> \],
>
> // CurrencyService exported so other modules can perform
>
> // currency conversion without duplicating FX cache logic.
>
> exports: \[CurrencyService\],
>
> })
>
> export class CurrencyModule {}

# **9. health.controller.ts**

Registered directly in AppModule so it serves GET /health with no route
prefix.

> apps/pricing-service/src/health/health.controller.ts
>
> import { Controller, Get } from \'@nestjs/common\';
>
> \@Controller()
>
> export class HealthController {
>
> \@Get(\'health\')
>
> health(): { status: string } {
>
> return { status: \'ok\' };
>
> }
>
> }

# **10. redis.config.ts**

Factory function that creates and returns an ioredis client. Injected
into RatesService (for rate cache reads and writes) and FxCacheService
(for FX rate cache reads and writes). A single Redis client instance is
sufficient --- both modules share the same underlying Redis connection.

> apps/pricing-service/src/config/redis.config.ts
>
> import Redis from \'ioredis\';
>
> import { ConfigService } from \'@nestjs/config\';
>
> export function createRedisClient(config: ConfigService): Redis {
>
> const redisUrl = config.get\<string\>(\"REDIS_URL\");
>
> const client = new Redis(redisUrl, {
>
> // Retry with exponential backoff up to 10 seconds between attempts.
>
> retryStrategy: (times: number) =\> Math.min(times \* 200, 10_000),
>
> // Do not crash the process if Redis is temporarily unreachable.
>
> // pricing-service falls back to PostgreSQL reads when Redis is down.
>
> enableReadyCheck: false,
>
> lazyConnect: true,
>
> });
>
> client.on(\'error\', (err) =\> {
>
> console.error(\'Redis client error:\', err.message);
>
> });
>
> return client;
>
> }
>
> // Redis cache key helpers --- used by RatesService and
> FxCacheService.
>
> // Centralising key construction avoids key format drift across
> services.
>
> export const REDIS_KEYS = {
>
> // Rate cache key: includes all four lookup dimensions.
>
> // Example: ps:rate:ux-designer:united-states:mid:full_time
>
> rate: (
>
> role: string,
>
> location: string,
>
> experience: string,
>
> schedule: string,
>
> ) =\>
> \`ps:rate:\${slugify(role)}:\${slugify(location)}:\${experience}:\${schedule}\`,
>
> // FX rate cache key: pair of currencies.
>
> // Example: ps:fx:USD:EUR
>
> fx: (from: string, to: string) =\> \`ps:fx:\${from}:\${to}\`,
>
> // All FX rates for a base currency.
>
> // Example: ps:fx:all:USD
>
> fxAll: (base: string) =\> \`ps:fx:all:\${base}\`,
>
> };
>
> function slugify(value: string): string {
>
> return value.toLowerCase().replace(/\\s+/g,
> \'-\').replace(/\[\^a-z0-9-\]/g, \'\');
>
> }
>
> *Important: The Redis client uses lazyConnect: true so the service
> starts even if Redis is temporarily unreachable. If Redis is down,
> RatesService falls back to a direct PostgreSQL query and
> FxCacheService falls back to a direct FX API call. The stale-data
> indicator is returned in both cases.*

# **11. Module Dependency Map**

  ----------------------------------------------------------------------------
  **Module**         **Imports**      **What It Gets**
  ------------------ ---------------- ----------------------------------------
  AppModule          RatesModule      RatesController registered. RatesService
                                      available for BudgetModule.

  AppModule          BudgetModule     BudgetController registered.

  AppModule          CurrencyModule   CurrencyController registered.
                                      CurrencyService available for future
                                      modules.

  AppModule          ScheduleModule   Enables \@Cron decorators in
                                      RatesRefreshService and FxCacheService.

  BudgetModule       RatesModule      Access to RatesService for per-role rate
                                      lookup during budget calculation.
  ----------------------------------------------------------------------------

# **12. Global ValidationPipe Configuration**

  -------------------------------------------------------------------------
  **Option**              **Behaviour**
  ----------------------- -------------------------------------------------
  whitelist: true         Strips properties from the request body not
                          declared in the DTO. Prevents unknown fields
                          reaching service methods.

  forbidNonWhitelisted:   Returns 422 if any undeclared property is present
  true                    instead of silently stripping it. Helps callers
                          discover incorrect payloads during development.

  transform: true         Transforms plain JSON into DTO class instances.
                          Required for \@Type() decorators used in query
                          string DTOs (e.g. converting string query params
                          to numbers).
  -------------------------------------------------------------------------

> *Important: Query string parameters arrive as strings from the HTTP
> layer. The \@Type(() =\> Number) decorator on numeric query params
> (such as amount in GetRatesQueryDto) only works when transform: true
> is enabled in the ValidationPipe. Without it, class-validator receives
> the string \"100\" instead of the number 100 and numeric validators
> like \@Min() fail unexpectedly.*

# **13. Verification**

After creating all files in this document, start the service and confirm
the following:

> \# Start from monorepo root
>
> npm run start:dev \-- \--projects pricing-service
>
> \# Confirm startup log contains:
>
> \# \[NestApplication\] Nest application successfully started
>
> \# pricing-service running on port 3016
>
> \# Confirm both cron jobs are registered:
>
> \# SchedulerRegistry: CronJob \"refreshPlatformRates\" registered
>
> \# SchedulerRegistry: CronJob \"refreshFxRates\" registered
>
> \# Confirm all routes are registered:
>
> \# Mapped { /health, GET }
>
> \# Mapped { /v1/rates, GET }
>
> \# Mapped { /v1/rates/price-guide, GET }
>
> \# Mapped { /v1/budget/calculate, POST }
>
> \# Mapped { /v1/currency/convert, GET }
>
> \# Mapped { /v1/currency/rates, GET }
>
> \# Health check
>
> curl http://localhost:3016/health
>
> \# Expected: {\"status\":\"ok\"}
>
> \# If any route is missing, confirm the corresponding module
>
> \# is imported in app.module.ts and the controller is declared
>
> \# in its feature module.

# **14. References**

- PS-00 --- Service Overview & Repo Placement --- module descriptions
  and service purpose

- PS-01 --- Docker & Runtime Setup --- Dockerfile, package.json, and
  environment variables

- PS-03 --- Data Models & DTOs --- entity definitions imported into
  modules defined here

- PS-04 --- API Endpoints --- controllers and services declared in the
  modules defined here

- PS-05 --- Integrations & Events --- FX API integration and Redis cache
  strategy implemented in RatesRefreshService and FxCacheService
