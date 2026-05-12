PS-04

**API Endpoints**

Service: pricing-service

Marketeq Backend --- marketeq-projects-nestjs

# **1. Purpose**

This document defines every HTTP endpoint exposed by pricing-service.
Each entry includes the full NestJS controller, query parameter DTOs,
request and response shapes, and all error codes. Fallback behaviour for
stale data, missing rate data, and dependency failures is defined in
Section 9.

Entity definitions and DTOs are in PS-03. Redis caching and FX API
integration are in PS-05. This document covers only the HTTP surface.

> *Important: pricing-service is an internal service called only by
> other backend services. All endpoints use InternalJwtGuard. They are
> not accessible from the public API gateway. listings-service is the
> only caller during the job listing sprint.*

# **2. Auth Guard**

All endpoints except GET /health use InternalJwtGuard. The guard
validates the JWT issued by auth-service and confirms a valid internal
service caller.

> // apps/pricing-service/src/guards/internal-jwt.guard.ts
>
> import { CanActivate, ExecutionContext, Injectable,
> UnauthorizedException } from \'@nestjs/common\';
>
> import { ConfigService } from \'@nestjs/config\';
>
> import \* as jwt from \'jsonwebtoken\';
>
> \@Injectable()
>
> export class InternalJwtGuard implements CanActivate {
>
> constructor(private readonly config: ConfigService) {}
>
> canActivate(context: ExecutionContext): boolean {
>
> const request = context.switchToHttp().getRequest();
>
> const auth = request.headers\[\'authorization\'\] ?? \'\';
>
> const token = auth.startsWith(\'Bearer \') ? auth.slice(7) : null;
>
> if (!token) {
>
> throw new UnauthorizedException({ code: \'PS_UNAUTHORIZED\', message:
> \'Missing token.\' });
>
> }
>
> try {
>
> jwt.verify(token, this.config.get\<string\>(\'JWT_SECRET\'));
>
> return true;
>
> } catch {
>
> throw new UnauthorizedException({ code: \'PS_UNAUTHORIZED\', message:
> \'Invalid token.\' });
>
> }
>
> }
>
> }

# **3. Standard Error Shape**

> { \"code\": \"PS_VALIDATION_ERROR\", \"message\": \"Human-readable
> message\", \"details\": {} }

  ---------------------------------------------------------------------------
  **HTTP**   **Code**              **When**
  ---------- --------------------- ------------------------------------------
  400        PS_BAD_REQUEST        Malformed request or missing required
                                   query parameter.

  401        PS_UNAUTHORIZED       Missing or invalid JWT.

  422        PS_VALIDATION_ERROR   class-validator failure on DTO. details
                                   contains per-field errors.

  503        PS_DEPENDENCY_ERROR   All upstream dependencies unreachable and
                                   no stale fallback available.

  500        PS_INTERNAL_ERROR     Unexpected server error. Full stack trace
                                   logged internally only.
  ---------------------------------------------------------------------------

# **4. GET /v1/rates**

Returns the low, median, and high hourly rates in USD cents for a
role/region/experience/schedule combination. Used by listings-service
for the Step 4 budget calculator. All parameters are optional except
role.

## **4.1 Query Parameter DTO**

> // apps/pricing-service/src/rates/dto/get-rates-query.dto.ts
>
> import { IsIn, IsOptional, IsString, MinLength } from
> \'class-validator\';
>
> export class GetRatesQueryDto {
>
> // Role title matched case-insensitively against
> ps_platform_rate_averages.role_title.
>
> \@IsString()
>
> \@MinLength(1)
>
> role: string;
>
> // Region / location. Omit to get global average.
>
> \@IsString()
>
> \@IsOptional()
>
> location?: string;
>
> // Omit to return average across all experience levels.
>
> \@IsIn(\[\'junior\', \'mid\', \'senior\'\])
>
> \@IsOptional()
>
> experience?: string;
>
> // Omit to return full_time equivalent.
>
> \@IsIn(\[\'full_time\', \'part_time\', \'custom\'\])
>
> \@IsOptional()
>
> schedule?: string;
>
> }

## **4.2 Controller**

> // apps/pricing-service/src/rates/controllers/rates.controller.ts
>
> import { Controller, Get, Query, UseGuards } from \'@nestjs/common\';
>
> import { InternalJwtGuard } from \'../../guards/internal-jwt.guard\';
>
> import { RatesService } from \'../services/rates.service\';
>
> import { GetRatesQueryDto } from \'../dto/get-rates-query.dto\';
>
> \@UseGuards(InternalJwtGuard)
>
> \@Controller(\'v1/rates\')
>
> export class RatesController {
>
> constructor(private readonly ratesService: RatesService) {}
>
> \@Get()
>
> getRates(@Query() query: GetRatesQueryDto) {
>
> return this.ratesService.getRates(query);
>
> }
>
> \@Get(\'price-guide\')
>
> getPriceGuide(@Query() query: GetRatesQueryDto) {
>
> return this.ratesService.getPriceGuide(query);
>
> }
>
> }

## **4.3 Service**

> // apps/pricing-service/src/rates/services/rates.service.ts
>
> import { Injectable, Logger } from \'@nestjs/common\';
>
> import { InjectRepository } from \'@nestjs/typeorm\';
>
> import { Repository, ILike } from \'typeorm\';
>
> import { ConfigService } from \'@nestjs/config\';
>
> import { InjectRedis } from \'@nestjs-modules/ioredis\';
>
> import Redis from \'ioredis\';
>
> import { PlatformRateAverage } from
> \'../entities/platform-rate-average.entity\';
>
> import { GetRatesQueryDto } from \'../dto/get-rates-query.dto\';
>
> \@Injectable()
>
> export class RatesService {
>
> private readonly logger = new Logger(RatesService.name);
>
> constructor(
>
> \@InjectRepository(PlatformRateAverage)
>
> private readonly rateRepo: Repository\<PlatformRateAverage\>,
>
> \@InjectRedis() private readonly redis: Redis,
>
> private readonly config: ConfigService,
>
> ) {}
>
> async getRates(query: GetRatesQueryDto): Promise\<RatesResponse\> {
>
> const cacheKey = this.buildCacheKey(\'rates\', query);
>
> const cached = await this.redis.get(cacheKey);
>
> if (cached) return { \...JSON.parse(cached), cache_hit: true };
>
> const rate = await this.findRate(query);
>
> if (!rate) {
>
> return { hourlyMedianUsdCents: null, hourlyLowUsdCents: null,
>
> hourlyHighUsdCents: null, is_stale: false, no_data: true, cache_hit:
> false };
>
> }
>
> const staleHours =
> this.config.get\<number\>(\'RATE_STALE_THRESHOLD_HOURS\') ?? 24;
>
> const ageHours = (Date.now() - rate.updatedAt.getTime()) / 3_600_000;
>
> const isStale = ageHours \>= staleHours;
>
> const response: RatesResponse = {
>
> hourlyMedianUsdCents: rate.hourlyMedianUsdCents,
>
> hourlyLowUsdCents: rate.hourlyLowUsdCents,
>
> hourlyHighUsdCents: rate.hourlyHighUsdCents,
>
> is_stale: isStale,
>
> stale_since: isStale ? rate.updatedAt.toISOString() : undefined,
>
> no_data: false,
>
> cache_hit: false,
>
> sampleSize: rate.sampleSize,
>
> updatedAt: rate.updatedAt.toISOString(),
>
> };
>
> const ttl = this.config.get\<number\>(\'RATE_CACHE_TTL_SECONDS\') ??
> 86400;
>
> await this.redis.setex(cacheKey, ttl, JSON.stringify(response));
>
> return response;
>
> }
>
> async getPriceGuide(query: GetRatesQueryDto):
> Promise\<PriceGuideResponse\> {
>
> const rates = await this.getRates(query);
>
> return {
>
> low: rates.hourlyLowUsdCents,
>
> median: rates.hourlyMedianUsdCents,
>
> high: rates.hourlyHighUsdCents,
>
> is_stale: rates.is_stale,
>
> no_data: rates.no_data,
>
> role: query.role,
>
> location: query.location ?? null,
>
> experience: query.experience ?? null,
>
> schedule: query.schedule ?? null,
>
> };
>
> }
>
> private buildCacheKey(prefix: string, q: GetRatesQueryDto): string {
>
> const slug = (s: string) =\> s.toLowerCase().replace(/\\s+/g, \'\_\');
>
> return \[
>
> \'ps\', prefix,
>
> slug(q.role),
>
> q.location ? slug(q.location) : \'all\',
>
> q.experience ?? \'all\',
>
> q.schedule ?? \'all\',
>
> \].join(\':\');
>
> }
>
> private async findRate(q: GetRatesQueryDto):
> Promise\<PlatformRateAverage \| null\> {
>
> return this.rateRepo.findOne({
>
> where: {
>
> roleTitle: ILike(q.role),
>
> \...(q.location ? { region: ILike(q.location) } : {}),
>
> \...(q.experience ? { experienceLevel: q.experience } : {}),
>
> \...(q.schedule ? { workSchedule: q.schedule } : {}),
>
> },
>
> });
>
> }
>
> }

## **4.4 Responses**

> // Normal response --- data fresh
>
> // GET
> /v1/rates?role=UX+Designer&location=United+States&experience=mid&schedule=full_time
>
> {
>
> \"hourlyMedianUsdCents\": 10000,
>
> \"hourlyLowUsdCents\": 7500,
>
> \"hourlyHighUsdCents\": 13500,
>
> \"is_stale\": false,
>
> \"no_data\": false,
>
> \"cache_hit\": true,
>
> \"sampleSize\": 142,
>
> \"updatedAt\": \"2025-01-15T02:00:00.000Z\"
>
> }
>
> // Stale response --- data older than RATE_STALE_THRESHOLD_HOURS
>
> {
>
> \"hourlyMedianUsdCents\": 9800,
>
> \"hourlyLowUsdCents\": 7200,
>
> \"hourlyHighUsdCents\": 13000,
>
> \"is_stale\": true,
>
> \"stale_since\": \"2025-01-13T02:00:00.000Z\",
>
> \"no_data\": false,
>
> \"cache_hit\": false,
>
> \"sampleSize\": 130,
>
> \"updatedAt\": \"2025-01-13T02:00:00.000Z\"
>
> }
>
> // No data --- role/region combination has no transaction history
>
> {
>
> \"hourlyMedianUsdCents\": null,
>
> \"hourlyLowUsdCents\": null,
>
> \"hourlyHighUsdCents\": null,
>
> \"is_stale\": false,
>
> \"no_data\": true,
>
> \"cache_hit\": false
>
> }

# **5. GET /v1/rates/price-guide**

Returns the same rate data as GET /v1/rates formatted for the price
guide hover modal on the Hourly Est. cell in the Step 4 team member
table. The Low / Median / High labels used in the UI map directly to the
three rate tiers in the response. Accepts the same query parameters as
GET /v1/rates.

## **5.1 Responses**

> // GET
> /v1/rates/price-guide?role=Backend+Developer&location=Eastern+Europe&experience=senior
>
> {
>
> \"low\": 5000,
>
> \"median\": 7000,
>
> \"high\": 9500,
>
> \"is_stale\": false,
>
> \"no_data\": false,
>
> \"role\": \"Backend Developer\",
>
> \"location\": \"Eastern Europe\",
>
> \"experience\": \"senior\",
>
> \"schedule\": null
>
> }
>
> // No data --- all three tiers show dash in the price guide modal
>
> {
>
> \"low\": null,
>
> \"median\": null,
>
> \"high\": null,
>
> \"is_stale\": false,
>
> \"no_data\": true,
>
> \"role\": \"Niche Specialist\",
>
> \"location\": null,
>
> \"experience\": null,
>
> \"schedule\": null
>
> }
>
> *Important: When no_data is true all three tiers show a dash in the
> price guide modal. When is_stale is true all three values show
> alongside a stale indicator icon. The frontend must treat no_data and
> is_stale as independent flags --- a stale response always has a value
> to show, a no_data response never does.*

# **6. POST /v1/budget/calculate**

Accepts a list of role inputs and returns the total estimated budget in
USD cents alongside a per-role breakdown. listings-service calls this
endpoint after any scope table change that triggers a budget
recalculation.

## **6.1 Request Body DTO**

> // apps/pricing-service/src/budget/dto/calculate-budget.dto.ts
>
> import { IsArray, IsIn, IsInt, IsOptional, IsString,
>
> MaxLength, Min, ValidateNested } from \'class-validator\';
>
> import { Type } from \'class-transformer\';
>
> export class BudgetRoleInput {
>
> \@IsString()
>
> \@MaxLength(100)
>
> roleTitle: string;
>
> \@IsString()
>
> \@IsOptional()
>
> location?: string;
>
> \@IsIn(\[\'junior\', \'mid\', \'senior\'\])
>
> \@IsOptional()
>
> experience?: string;
>
> \@IsIn(\[\'full_time\', \'part_time\', \'custom\'\])
>
> workSchedule: string;
>
> // Estimated hours. Multiplied by the median hourly rate to produce
> the subtotal.
>
> \@IsInt()
>
> \@Min(1)
>
> estimatedHours: number;
>
> }
>
> export class CalculateBudgetDto {
>
> \@IsArray()
>
> \@ValidateNested({ each: true })
>
> \@Type(() =\> BudgetRoleInput)
>
> roles: BudgetRoleInput\[\];
>
> }

## **6.2 Controller**

> // apps/pricing-service/src/budget/controllers/budget.controller.ts
>
> import { Body, Controller, Post, UseGuards } from \'@nestjs/common\';
>
> import { InternalJwtGuard } from \'../../guards/internal-jwt.guard\';
>
> import { BudgetService } from \'../services/budget.service\';
>
> import { CalculateBudgetDto } from \'../dto/calculate-budget.dto\';
>
> \@UseGuards(InternalJwtGuard)
>
> \@Controller(\'v1/budget\')
>
> export class BudgetController {
>
> constructor(private readonly budgetService: BudgetService) {}
>
> \@Post(\'calculate\')
>
> calculate(@Body() dto: CalculateBudgetDto) {
>
> return this.budgetService.calculate(dto);
>
> }
>
> }

## **6.3 Service**

> // apps/pricing-service/src/budget/services/budget.service.ts
>
> import { Injectable } from \'@nestjs/common\';
>
> import { RatesService } from \'../../rates/services/rates.service\';
>
> import { CalculateBudgetDto } from \'../dto/calculate-budget.dto\';
>
> \@Injectable()
>
> export class BudgetService {
>
> constructor(private readonly ratesService: RatesService) {}
>
> async calculate(dto: CalculateBudgetDto): Promise\<BudgetResponse\> {
>
> const breakdown: RoleBreakdown\[\] = \[\];
>
> let totalUsdCents = 0;
>
> let hasStale = false;
>
> let hasNoData = false;
>
> for (const role of dto.roles) {
>
> const rates = await this.ratesService.getRates({
>
> role: role.roleTitle,
>
> location: role.location,
>
> experience: role.experience,
>
> schedule: role.workSchedule,
>
> });
>
> const hourlyRate = rates.hourlyMedianUsdCents;
>
> const subtotal = hourlyRate != null
>
> ? Math.round(hourlyRate \* role.estimatedHours)
>
> : null;
>
> if (rates.is_stale) hasStale = true;
>
> if (rates.no_data) hasNoData = true;
>
> if (subtotal != null) totalUsdCents += subtotal;
>
> breakdown.push({
>
> roleTitle: role.roleTitle,
>
> estimatedHours: role.estimatedHours,
>
> hourlyRateUsdCents: hourlyRate,
>
> subtotalUsdCents: subtotal,
>
> is_stale: rates.is_stale,
>
> no_data: rates.no_data,
>
> });
>
> }
>
> return { totalUsdCents, breakdown, has_stale_data: hasStale,
> has_missing_data: hasNoData };
>
> }
>
> }

## **6.4 Request and Response**

> // POST /v1/budget/calculate
>
> // Request:
>
> {
>
> \"roles\": \[
>
> { \"roleTitle\": \"UX Designer\", \"location\": \"United States\",
>
> \"experience\": \"mid\", \"workSchedule\": \"full_time\",
> \"estimatedHours\": 160 },
>
> { \"roleTitle\": \"Backend Developer\", \"location\": \"Eastern
> Europe\",
>
> \"experience\": \"senior\", \"workSchedule\": \"full_time\",
> \"estimatedHours\": 320 }
>
> \]
>
> }
>
> // Response:
>
> {
>
> \"totalUsdCents\": 384000,
>
> \"has_stale_data\": false,
>
> \"has_missing_data\": false,
>
> \"breakdown\": \[
>
> {
>
> \"roleTitle\": \"UX Designer\",
>
> \"estimatedHours\": 160,
>
> \"hourlyRateUsdCents\": 10000,
>
> \"subtotalUsdCents\": 160000,
>
> \"is_stale\": false,
>
> \"no_data\": false
>
> },
>
> {
>
> \"roleTitle\": \"Backend Developer\",
>
> \"estimatedHours\": 320,
>
> \"hourlyRateUsdCents\": 7000,
>
> \"subtotalUsdCents\": 224000,
>
> \"is_stale\": false,
>
> \"no_data\": false
>
> }
>
> \]
>
> }

# **7. GET /v1/currency/convert**

Converts a monetary amount from one currency to another using the cached
FX rate. Used by listings-service to display budget amounts in the
client\'s preferred display currency.

## **7.1 Query Parameter DTO**

> // apps/pricing-service/src/currency/dto/convert-currency.dto.ts
>
> import { IsNumber, IsString, Length, Min } from \'class-validator\';
>
> import { Type } from \'class-transformer\';
>
> export class ConvertCurrencyDto {
>
> // Amount in whole units of the source currency (not cents).
>
> \@Type(() =\> Number)
>
> \@IsNumber()
>
> \@Min(0)
>
> amount: number;
>
> // ISO 4217 source currency code.
>
> \@IsString()
>
> \@Length(3, 3)
>
> from: string;
>
> // ISO 4217 target currency code.
>
> \@IsString()
>
> \@Length(3, 3)
>
> to: string;
>
> }

## **7.2 Controller**

> //
> apps/pricing-service/src/currency/controllers/currency.controller.ts
>
> import { Controller, Get, Query, UseGuards } from \'@nestjs/common\';
>
> import { InternalJwtGuard } from \'../../guards/internal-jwt.guard\';
>
> import { CurrencyService } from \'../services/currency.service\';
>
> import { ConvertCurrencyDto } from \'../dto/convert-currency.dto\';
>
> \@UseGuards(InternalJwtGuard)
>
> \@Controller(\'v1/currency\')
>
> export class CurrencyController {
>
> constructor(private readonly currencyService: CurrencyService) {}
>
> \@Get(\'convert\')
>
> convert(@Query() query: ConvertCurrencyDto) {
>
> return this.currencyService.convert(query);
>
> }
>
> \@Get(\'rates\')
>
> getRates() {
>
> return this.currencyService.getAllRates();
>
> }
>
> }

## **7.3 Service**

> // apps/pricing-service/src/currency/services/currency.service.ts
>
> import { Injectable, Logger, ServiceUnavailableException } from
> \'@nestjs/common\';
>
> import { InjectRedis } from \'@nestjs-modules/ioredis\';
>
> import { ConfigService } from \'@nestjs/config\';
>
> import { HttpService } from \'@nestjs/axios\';
>
> import { firstValueFrom } from \'rxjs\';
>
> import Redis from \'ioredis\';
>
> import { ConvertCurrencyDto } from \'../dto/convert-currency.dto\';
>
> \@Injectable()
>
> export class CurrencyService {
>
> private readonly logger = new Logger(CurrencyService.name);
>
> constructor(
>
> \@InjectRedis() private readonly redis: Redis,
>
> private readonly config: ConfigService,
>
> private readonly http: HttpService,
>
> ) {}
>
> async convert(dto: ConvertCurrencyDto): Promise\<ConvertResponse\> {
>
> const from = dto.from.toUpperCase();
>
> const to = dto.to.toUpperCase();
>
> if (from === to) return { amount: dto.amount, converted: dto.amount,
> rate: 1, from, to, is_stale: false };
>
> const { rate, isStale } = await this.getRate(from, to);
>
> const converted = Math.round(dto.amount \* rate \* 100) / 100;
>
> return { amount: dto.amount, converted, rate, from, to, is_stale:
> isStale };
>
> }
>
> async getAllRates(): Promise\<AllRatesResponse\> {
>
> const cacheKey = \'ps:fx:all\';
>
> const cached = await this.redis.get(cacheKey);
>
> if (cached) return { \...JSON.parse(cached), cache_hit: true };
>
> const rates = await this.fetchFreshRates();
>
> const ttl = this.config.get\<number\>(\'FX_CACHE_TTL_SECONDS\') ??
> 3600;
>
> const payload = JSON.stringify({ rates, base: \'USD\', fetched_at: new
> Date().toISOString() });
>
> await this.redis.setex(cacheKey, ttl, payload);
>
> return { rates, base: \'USD\', fetched_at: new Date().toISOString(),
> cache_hit: false };
>
> }
>
> private async getRate(from: string, to: string): Promise\<{ rate:
> number; isStale: boolean }\> {
>
> const cacheKey = \`ps:fx:\${from}:\${to}\`;
>
> const cached = await this.redis.get(cacheKey);
>
> if (cached) return { rate: parseFloat(cached), isStale: false };
>
> const fxUrl = this.config.get\<string\>(\'FX_API_URL\');
>
> const fbUrl = this.config.get\<string\>(\'FX_API_FALLBACK_URL\');
>
> const ttl = this.config.get\<number\>(\'FX_CACHE_TTL_SECONDS\') ??
> 3600;
>
> const tryFetch = async (baseUrl: string): Promise\<number\> =\> {
>
> const res = await
> firstValueFrom(this.http.get(\`\${baseUrl}/latest?from=\${from}&to=\${to}\`));
>
> const rate = res.data.rates\[to\] as number;
>
> await this.redis.setex(cacheKey, ttl, rate.toString());
>
> await this.redis.set(\`\${cacheKey}:stale\`, rate.toString());
>
> return rate;
>
> };
>
> try {
>
> return { rate: await tryFetch(fxUrl), isStale: false };
>
> } catch (primaryErr) {
>
> this.logger.warn(\`Primary FX API failed: \${primaryErr.message}.
> Trying fallback.\`);
>
> try {
>
> return { rate: await tryFetch(fbUrl), isStale: false };
>
> } catch (fallbackErr) {
>
> this.logger.error(\`Both FX APIs failed for \${from}:\${to}\`);
>
> const stale = await this.redis.get(\`\${cacheKey}:stale\`);
>
> if (stale) return { rate: parseFloat(stale), isStale: true };
>
> throw new ServiceUnavailableException({ code: \'PS_DEPENDENCY_ERROR\',
>
> message: \'Exchange rate service unavailable.\' });
>
> }
>
> }
>
> }
>
> private async fetchFreshRates(): Promise\<Record\<string, number\>\> {
>
> const fxUrl = this.config.get\<string\>(\'FX_API_URL\');
>
> const res = await
> firstValueFrom(this.http.get(\`\${fxUrl}/latest?from=USD\`));
>
> return res.data.rates as Record\<string, number\>;
>
> }
>
> }

## **7.4 Responses**

> // GET /v1/currency/convert?amount=1000&from=USD&to=EUR
>
> {
>
> \"amount\": 1000,
>
> \"converted\": 921.50,
>
> \"rate\": 0.9215,
>
> \"from\": \"USD\",
>
> \"to\": \"EUR\",
>
> \"is_stale\": false
>
> }
>
> // Stale response --- both FX APIs unreachable, last known rate used
>
> {
>
> \"amount\": 1000,
>
> \"converted\": 918.20,
>
> \"rate\": 0.9182,
>
> \"from\": \"USD\",
>
> \"to\": \"EUR\",
>
> \"is_stale\": true
>
> }
>
> // Error responses
>
> 422 --- amount, from, or to fails DTO validation
>
> 503 --- PS_DEPENDENCY_ERROR --- no cached rate and both FX APIs
> unreachable

# **8. GET /v1/currency/rates**

Returns all currently cached exchange rates against USD. Used by
listings-service to pre-populate the display currency list for the
budget frequency dropdown.

## **8.1 Response**

> // GET /v1/currency/rates
>
> {
>
> \"base\": \"USD\",
>
> \"fetched_at\": \"2025-01-15T10:00:00.000Z\",
>
> \"cache_hit\": true,
>
> \"rates\": {
>
> \"EUR\": 0.9215,
>
> \"GBP\": 0.7890,
>
> \"CAD\": 1.3650,
>
> \"AUD\": 1.5340,
>
> \"INR\": 83.21,
>
> \"BRL\": 4.972,
>
> \"MXN\": 17.05
>
> }
>
> }
>
> // Error responses
>
> 503 --- PS_DEPENDENCY_ERROR --- no rates cached and both FX APIs
> unreachable

# **9. Fallback Behaviour**

## **9.1 Rate Data Fallback**

  ----------------------------------------------------------------------------------
  **Condition**                **Flags**          **UI Behaviour**
  ---------------------------- ------------------ ----------------------------------
  Data fresh and available     is_stale: false,   Budget shows amount. Price guide
                               no_data: false     shows Low / Median / High. No
                                                  indicator.

  Data stale (\>               is_stale: true,    Budget shows amount with a stale
  RATE_STALE_THRESHOLD_HOURS   stale_since set    indicator icon. A Refresh button
  old)                                            triggers a fresh GET /v1/rates
                                                  call.

  No data for combination      no_data: true, all Budget shows dash (---) for that
                               rate fields null   role. Price guide modal shows
                                                  \"Rate estimate unavailable\".
                                                  Listing can still be published.
  ----------------------------------------------------------------------------------

## **9.2 Currency Conversion Fallback**

  ---------------------------------------------------------------------------
  **Condition**      **Flags**             **UI Behaviour**
  ------------------ --------------------- ----------------------------------
  FX rate fresh      is_stale: false       Budget displayed in client
                                           currency. No indicator.

  FX rate stale      is_stale: true        Budget displayed in client
  (last known rate                         currency with a stale currency
  used)                                    indicator.

  Both FX APIs down, 503                   Budget shown in USD only.
  no cached rate     PS_DEPENDENCY_ERROR   \"Currency conversion
                                           unavailable\" indicator shown.
                                           Budget is never hidden.
  ---------------------------------------------------------------------------

## **9.3 Budget Calculation Partial Results**

When POST /v1/budget/calculate returns has_missing_data: true,
listings-service must display a note that the total is partial. The
total only reflects roles with available rate data. The breakdown shows
no_data: true for affected roles. The listing can still be saved and
published.

> // Partial result --- one role has data, one does not
>
> // has_missing_data: true → listings-service shows \"Estimate is
> partial\" note
>
> {
>
> \"totalUsdCents\": 160000,
>
> \"has_stale_data\": false,
>
> \"has_missing_data\": true,
>
> \"breakdown\": \[
>
> {
>
> \"roleTitle\": \"UX Designer\",
>
> \"estimatedHours\": 160,
>
> \"hourlyRateUsdCents\": 10000,
>
> \"subtotalUsdCents\": 160000,
>
> \"is_stale\": false,
>
> \"no_data\": false
>
> },
>
> {
>
> \"roleTitle\": \"Niche Specialist\",
>
> \"estimatedHours\": 80,
>
> \"hourlyRateUsdCents\": null,
>
> \"subtotalUsdCents\": null,
>
> \"is_stale\": false,
>
> \"no_data\": true
>
> }
>
> \]
>
> }

# **10. Route Summary**

  -------------------------------------------------------------------------------
  **Method**   **Path**                 **Auth**           **Primary Caller**
  ------------ ------------------------ ------------------ ----------------------
  GET          /health                  None               Supabase health check

  GET          /v1/rates                InternalJwtGuard   listings-service
                                                           (budget calculator)

  GET          /v1/rates/price-guide    InternalJwtGuard   listings-service
                                                           (hover modal)

  POST         /v1/budget/calculate     InternalJwtGuard   listings-service
                                                           (scope table changes)

  GET          /v1/currency/convert     InternalJwtGuard   listings-service
                                                           (display currency)

  GET          /v1/currency/rates       InternalJwtGuard   listings-service
                                                           (currency list)
  -------------------------------------------------------------------------------

# **11. References**

- PS-00 --- Service Overview & Repo Placement --- stale data handling
  overview and rate data flow

- PS-03 --- Data Models & DTOs --- PlatformRateAverage and CurrencyRate
  entity definitions

- PS-05 --- Integrations & Events --- Redis cache strategy, FX API
  integration, and rate refresh job

- PS-07 --- QA & Test Data --- test cases for all endpoints and fallback
  scenarios

- JL-07 --- Scope Table Business Logic --- how listings-service uses
  budget calculator response
