PS-03

**Data Models & DTOs**

Service: pricing-service

Marketeq Backend --- marketeq-projects-nestjs

# **1. Purpose**

This document defines every entity, enum, and DTO used by
pricing-service. All entities use TypeORM decorators with synchronize:
false. All entity table names are prefixed ps\_ to avoid collisions with
other services in the shared Supabase database. All DTOs use
class-validator for input validation.

Module wiring is in PS-02. API endpoints that consume these DTOs are in
PS-04. The cache strategy and scheduled refresh jobs that write to these
entities are in PS-05.

> *Important: All monetary values in pricing-service are stored as
> integers in USD cents. This applies to PlatformRateAverage --- the
> rate columns store cents, not dollars. The exception is
> CurrencyRate.rate which is a decimal exchange rate multiplier, not a
> monetary amount.*

# **2. Entities**

## **2.1 PlatformRateAverage**

The core data store for pricing-service. Each record represents the
statistical distribution of hourly rates for a specific combination of
role, region, experience level, and work schedule, computed from
completed transaction data on the Marketeq platform.

Records are upserted (not inserted fresh) by the daily refresh scheduled
job. The composite unique constraint on (role, region, experience_level,
schedule) ensures one record per combination. last_updated tracks when
the record was last refreshed and drives the stale data indicator.

> //
> apps/pricing-service/src/rates/entities/platform-rate-average.entity.ts
>
> import { Entity, PrimaryGeneratedColumn, Column, Index,
> UpdateDateColumn } from \'typeorm\';
>
> // Composite unique constraint enforces one record per
> role-region-experience-schedule.
>
> // The daily refresh job upserts into this constraint.
>
> \@Entity({ name: \'ps_platform_rate_averages\' })
>
> \@Index(\[\'role\', \'region\', \'experienceLevel\', \'schedule\'\], {
> unique: true })
>
> export class PlatformRateAverage {
>
> \@PrimaryGeneratedColumn(\'uuid\')
>
> id: string;
>
> // ── COMPOSITE KEY DIMENSIONS ───────────────────────────────────
>
> // Role title as it appears in Marketeq listings.
>
> // Examples: \"UX Designer\", \"Backend Engineer\", \"DevOps
> Engineer\".
>
> // Max 100 characters --- same limit as JobListingTask.roleTitle.
>
> \@Column({ type: \'varchar\', length: 100 })
>
> role: string;
>
> // Geographic region as defined in the platform taxonomy.
>
> // Must match one of the eight regions used by listings-service.
>
> // Values: United States \| Canada \| United Kingdom \| Western Europe
> \|
>
> // Eastern Europe \| Latin America \| South Asia \| Southeast Asia.
>
> \@Column({ type: \'varchar\', length: 100 })
>
> region: string;
>
> // Experience level.
>
> // Values: junior \| mid \| senior.
>
> \@Column({ name: \'experience_level\', type: \'varchar\', length: 20
> })
>
> experienceLevel: string;
>
> // Work schedule.
>
> // Values: full_time \| part_time.
>
> // Custom schedules are normalised to the nearest standard schedule
>
> // before rate lookup --- custom hours between 1-20 map to part_time,
>
> // custom hours above 20 map to full_time.
>
> \@Column({ type: \'varchar\', length: 20 })
>
> schedule: string;
>
> // ── RATE DISTRIBUTION ─────────────────────────────────────────
>
> // All rate columns store USD cents (integer).
>
> // 10th percentile of the rate distribution from historical payouts.
>
> // Displayed as the \"Low\" tier in the price guide hover modal.
>
> \@Column({ name: \'hourly_rate_low_usd_cents\', type: \'int\' })
>
> hourlyRateLowUsdCents: number;
>
> // 50th percentile (median). Used for budget calculator default.
>
> // Displayed as the \"Median\" tier in the price guide hover modal.
>
> \@Column({ name: \'hourly_rate_median_usd_cents\', type: \'int\' })
>
> hourlyRateMedianUsdCents: number;
>
> // 90th percentile. Displayed as the \"High\" tier in the price guide
> hover modal.
>
> \@Column({ name: \'hourly_rate_high_usd_cents\', type: \'int\' })
>
> hourlyRateHighUsdCents: number;
>
> // ── DATA QUALITY ───────────────────────────────────────────────
>
> // Number of completed transactions used to compute this record.
>
> // Used to assess statistical reliability. Low sample sizes
>
> // (\< 5) indicate the rate may not be representative.
>
> \@Column({ name: \'sample_size\', type: \'int\', default: 0 })
>
> sampleSize: number;
>
> // UTC timestamp of the last successful refresh of this record.
>
> // Compared against RATE_STALE_THRESHOLD_HOURS to determine
>
> // whether to return is_stale: true in the API response.
>
> \@UpdateDateColumn({ name: \'last_updated\', type: \'timestamptz\' })
>
> lastUpdated: Date;
>
> \@Column({ name: \'created_at\', type: \'timestamptz\', default: ()
> =\> \'CURRENT_TIMESTAMP\' })
>
> createdAt: Date;
>
> }

## **2.2 PlatformRateAverage --- Field Reference**

  -----------------------------------------------------------------------------------
  **Column**                     **DB Type**    **Notes**
  ------------------------------ -------------- -------------------------------------
  id                             uuid           Primary key. Generated by PostgreSQL.

  role                           varchar(100)   Part of composite unique index.
                                                Case-sensitive. Must match listing
                                                role titles exactly.

  region                         varchar(100)   Part of composite unique index. One
                                                of eight platform-defined regions.

  experience_level               varchar(20)    Part of composite unique index.
                                                Values: junior \| mid \| senior.

  schedule                       varchar(20)    Part of composite unique index.
                                                Values: full_time \| part_time.

  hourly_rate_low_usd_cents      int            10th percentile. USD cents. Min 0.

  hourly_rate_median_usd_cents   int            50th percentile. USD cents. Used for
                                                budget calculator default.

  hourly_rate_high_usd_cents     int            90th percentile. USD cents.

  sample_size                    int            Count of transactions. Defaults to 0
                                                on seed records.

  last_updated                   timestamptz    Auto-updated by TypeORM
                                                \@UpdateDateColumn on every upsert.

  created_at                     timestamptz    Set on first insert. Never updated.
  -----------------------------------------------------------------------------------

## **2.3 CurrencyRate**

Stores the most recently fetched exchange rate between two currencies.
Updated every hour by the FX rate refresh scheduled job. Each record
represents a single currency pair (from_currency → to_currency). The
base currency is always USD. All rates are stored relative to USD.

> // apps/pricing-service/src/currency/entities/currency-rate.entity.ts
>
> import { Entity, PrimaryGeneratedColumn, Column, Index,
> UpdateDateColumn } from \'typeorm\';
>
> \@Entity({ name: \'ps_currency_rates\' })
>
> // Composite unique index ensures one record per currency pair.
>
> \@Index(\[\'fromCurrency\', \'toCurrency\'\], { unique: true })
>
> export class CurrencyRate {
>
> \@PrimaryGeneratedColumn(\'uuid\')
>
> id: string;
>
> // ISO 4217 currency code. Always USD for the platform base currency.
>
> \@Column({ name: \'from_currency\', type: \'varchar\', length: 3 })
>
> fromCurrency: string;
>
> // ISO 4217 currency code of the target currency.
>
> // Examples: EUR, GBP, CAD, INR, AUD, BRL, MXN.
>
> \@Column({ name: \'to_currency\', type: \'varchar\', length: 3 })
>
> toCurrency: string;
>
> // The exchange rate: 1 unit of fromCurrency = rate units of
> toCurrency.
>
> // Example: fromCurrency=USD, toCurrency=EUR, rate=0.9231
>
> // means 1 USD = 0.9231 EUR.
>
> // Stored as decimal with 6 decimal places for precision.
>
> \@Column({ type: \'decimal\', precision: 14, scale: 6 })
>
> rate: number;
>
> // UTC timestamp when this rate was last fetched from the FX API.
>
> // Used to compute cache age and show stale indicators.
>
> \@UpdateDateColumn({ name: \'fetched_at\', type: \'timestamptz\' })
>
> fetchedAt: Date;
>
> \@Column({ name: \'created_at\', type: \'timestamptz\', default: ()
> =\> \'CURRENT_TIMESTAMP\' })
>
> createdAt: Date;
>
> }

# **3. DTOs**

## **3.1 GetRatesQueryDto**

Query parameters for GET /v1/rates and GET /v1/rates/price-guide. All
parameters are optional --- omitting any dimension broadens the query to
a platform-wide average across that dimension.

> // apps/pricing-service/src/rates/dto/get-rates-query.dto.ts
>
> import { IsIn, IsOptional, IsString, MaxLength } from
> \'class-validator\';
>
> export class GetRatesQueryDto {
>
> // Role title. Case-insensitive lookup against
> ps_platform_rate_averages.role.
>
> // If not provided, returns rates aggregated across all roles.
>
> \@IsString()
>
> \@MaxLength(100)
>
> \@IsOptional()
>
> role?: string;
>
> // Geographic region. Must match one of the eight platform regions.
>
> \@IsIn(\[
>
> \'United States\', \'Canada\', \'United Kingdom\',
>
> \'Western Europe\', \'Eastern Europe\', \'Latin America\',
>
> \'South Asia\', \'Southeast Asia\',
>
> \])
>
> \@IsOptional()
>
> location?: string;
>
> // Experience level.
>
> \@IsIn(\[\'junior\', \'mid\', \'senior\'\])
>
> \@IsOptional()
>
> experience?: string;
>
> // Work schedule. Custom schedules are normalised before lookup.
>
> \@IsIn(\[\'full_time\', \'part_time\'\])
>
> \@IsOptional()
>
> schedule?: string;
>
> }

## **3.2 RatesResponseDto**

Response shape for GET /v1/rates. Returned by RatesService for both the
budget calculator and the price guide hover modal. The same DTO serves
both use cases --- the frontend differentiates display based on context.

> // apps/pricing-service/src/rates/dto/rates-response.dto.ts
>
> export class RatesResponseDto {
>
> // The queried role. Null if no role was specified (cross-role
> average).
>
> role: string \| null;
>
> // The queried region. Null if no region was specified.
>
> location: string \| null;
>
> // The queried experience level. Null if none specified.
>
> experience: string \| null;
>
> // The queried schedule. Null if none specified.
>
> schedule: string \| null;
>
> // ── RATE DATA ──────────────────────────────────────────────────
>
> // All rate values are in USD cents (integer).
>
> // Null when no_data is true (no records match the query dimensions).
>
> hourlyRateLowUsdCents: number \| null;
>
> hourlyRateMedianUsdCents: number \| null;
>
> hourlyRateHighUsdCents: number \| null;
>
> // Number of transactions the rate is based on.
>
> // Null when no_data is true.
>
> sampleSize: number \| null;
>
> // ── DATA QUALITY FLAGS ─────────────────────────────────────────
>
> // True when rate data exists but is older than
> RATE_STALE_THRESHOLD_HOURS.
>
> // The frontend shows a stale indicator and Refresh button when true.
>
> isStale: boolean;
>
> // Timestamp of last successful rate refresh. Null when no_data is
> true.
>
> lastUpdated: string \| null;
>
> // True when no matching rate record exists in the database.
>
> // All rate values are null when this is true.
>
> // The frontend shows a dash (---) in the budget calculator.
>
> noData: boolean;
>
> }

## **3.3 CalculateBudgetDto**

Request body for POST /v1/budget/calculate. Accepts a list of role input
objects and returns the aggregated total budget in USD cents. Used by
listings-service for the real-time budget auto-update in Step 4.

> // apps/pricing-service/src/budget/dto/calculate-budget.dto.ts
>
> import { IsArray, IsIn, IsInt, IsOptional, IsString, ArrayMinSize,
>
> MaxLength, Min, ValidateNested } from \'class-validator\';
>
> import { Type } from \'class-transformer\';
>
> // Represents one role in the budget calculation.
>
> // Maps to either a JobListingTask (scope table) or a TeamMemberRow
> (team table).
>
> export class BudgetRoleInputDto {
>
> \@IsString()
>
> \@MaxLength(100)
>
> roleTitle: string;
>
> \@IsString()
>
> \@MaxLength(100)
>
> \@IsOptional()
>
> location?: string;
>
> \@IsIn(\[\'junior\', \'mid\', \'senior\'\])
>
> \@IsOptional()
>
> experienceLevel?: string;
>
> \@IsIn(\[\'full_time\', \'part_time\'\])
>
> \@IsOptional()
>
> schedule?: string;
>
> // Estimated hours for this role (from JobListingTask.estimatedHours
>
> // or derived from TeamMemberRow.workSchedule and
> contractLengthMonths).
>
> // Must be a positive integer. Decimal hours are rounded to the
> nearest integer.
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
> // At least one role must be provided.
>
> \@IsArray()
>
> \@ArrayMinSize(1)
>
> \@ValidateNested({ each: true })
>
> \@Type(() =\> BudgetRoleInputDto)
>
> roles: BudgetRoleInputDto\[\];
>
> }

## **3.4 BudgetResponseDto**

Response shape for POST /v1/budget/calculate. Returns the total budget
and a per-role breakdown so listings-service can update individual task
rows in the scope table as well as the overall total.

> // apps/pricing-service/src/budget/dto/budget-response.dto.ts
>
> // Per-role breakdown returned alongside the total.
>
> export class BudgetRoleResultDto {
>
> roleTitle: string;
>
> location: string \| null;
>
> experienceLevel: string \| null;
>
> schedule: string \| null;
>
> estimatedHours: number;
>
> hourlyRateUsdCents: number \| null; // Median rate used for
> calculation.
>
> roleTotalUsdCents: number \| null; // estimatedHours \*
> hourlyRateUsdCents.
>
> isStale: boolean; // True if rate data is stale.
>
> noData: boolean; // True if no rate data found.
>
> }
>
> export class BudgetResponseDto {
>
> // Sum of all roleTotalUsdCents values.
>
> // Roles with noData: true contribute 0 to this total.
>
> totalUsdCents: number;
>
> // True if any role in the calculation used stale rate data.
>
> hasStaleData: boolean;
>
> // True if any role had no rate data and contributed 0 to the total.
>
> hasNoData: boolean;
>
> // Per-role breakdown. One entry per BudgetRoleInputDto in the
> request.
>
> roles: BudgetRoleResultDto\[\];
>
> }

## **3.5 ConvertCurrencyQueryDto**

Query parameters for GET /v1/currency/convert. Converts a USD amount to
the target currency using the cached exchange rate.

> // apps/pricing-service/src/currency/dto/convert-currency.dto.ts
>
> import { IsIn, IsNumber, IsString, Max, MaxLength, Min } from
> \'class-validator\';
>
> import { Type } from \'class-transformer\';
>
> export class ConvertCurrencyQueryDto {
>
> // Amount in the from currency. Must be a positive number.
>
> // Submitted as a float (e.g. 5000.00).
>
> \@Type(() =\> Number)
>
> \@IsNumber()
>
> \@Min(0)
>
> \@Max(1_000_000_000)
>
> amount: number;
>
> // Source currency code. Defaults to USD.
>
> // Only USD is supported as a source currency in this sprint.
>
> \@IsIn(\[\'USD\'\])
>
> from: string;
>
> // Target currency ISO 4217 code.
>
> \@IsString()
>
> \@MaxLength(3)
>
> to: string;
>
> }

## **3.6 CurrencyResponseDto**

Response shape for GET /v1/currency/convert.

> // apps/pricing-service/src/currency/dto/currency-response.dto.ts
>
> export class CurrencyResponseDto {
>
> // Original amount in the from currency.
>
> amount: number;
>
> // Converted amount in the to currency.
>
> // Rounded to 2 decimal places.
>
> converted: number;
>
> // The exchange rate applied: 1 from = rate to.
>
> rate: number;
>
> // ISO 4217 codes.
>
> from: string;
>
> to: string;
>
> // UTC timestamp when this rate was last fetched from the FX API.
>
> fetchedAt: string;
>
> // True if the rate is older than FX_CACHE_TTL_SECONDS.
>
> isStale: boolean;
>
> }

## **3.7 GetAllRatesResponseDto**

Response shape for GET /v1/currency/rates. Returns all cached exchange
rates relative to USD. Used by the frontend to build a currency selector
or to perform client-side approximate conversions.

> // apps/pricing-service/src/currency/dto/currency-response.dto.ts
>
> // (added to the same file as CurrencyResponseDto)
>
> export class AllRatesResponseDto {
>
> // Base currency. Always \"USD\".
>
> base: string;
>
> // Map of ISO 4217 code to exchange rate.
>
> // Example: { \"EUR\": 0.9231, \"GBP\": 0.7845, \"CAD\": 1.3612 }
>
> rates: Record\<string, number\>;
>
> // UTC timestamp of the most recent successful FX refresh.
>
> fetchedAt: string;
>
> // True if the rates are older than FX_CACHE_TTL_SECONDS.
>
> isStale: boolean;
>
> }

# **4. Field Constraints Summary**

  --------------------------------------------------------------------------------------
  **Field**                             **Constraint**   **Enforcement**
  ------------------------------------- ---------------- -------------------------------
  PlatformRateAverage.role              100 chars        varchar(100) on DB column.
                                                         Matches
                                                         JobListingTask.roleTitle max
                                                         length.

  PlatformRateAverage.region            100 chars        varchar(100). Must be one of
                                                         the eight platform regions.
                                                         Validated in refresh job before
                                                         upsert.

  PlatformRateAverage.experienceLevel   20 chars         varchar(20). Values: junior \|
                                                         mid \| senior.

  PlatformRateAverage.schedule          20 chars         varchar(20). Values: full_time
                                                         \| part_time.

  PlatformRateAverage.hourly_rate\_\*   int \>= 0        All rate columns are
                                                         non-negative integers. Zero is
                                                         a valid value for a role with
                                                         no historical data.

  CurrencyRate.fromCurrency             3 chars          varchar(3). ISO 4217 code.
                                                         Always USD in this sprint.

  CurrencyRate.toCurrency               3 chars          varchar(3). ISO 4217 code.

  CurrencyRate.rate                     decimal(14,6)    14 total digits, 6 decimal
                                                         places. Sufficient precision
                                                         for any active currency pair.

  GetRatesQueryDto.location             8 valid values   \@IsIn() validator with the
                                                         eight platform regions. 422 if
                                                         an invalid region is submitted.

  GetRatesQueryDto.experience           3 valid values   \@IsIn(\[junior, mid,
                                                         senior\]). 422 if an invalid
                                                         level is submitted.

  BudgetRoleInputDto.estimatedHours     int \>= 1        \@IsInt() \@Min(1). Decimal
                                                         hours are converted to integers
                                                         before submission by
                                                         listings-service.

  ConvertCurrencyQueryDto.amount        0 to             \@Min(0) \@Max(1_000_000_000).
                                        1,000,000,000    Prevents absurdly large
                                                         conversion requests.

  ConvertCurrencyQueryDto.from          USD only         \@IsIn(\[\"USD\"\]). Only USD
                                                         is supported as source currency
                                                         in this sprint.
  --------------------------------------------------------------------------------------

# **5. Upsert Strategy for PlatformRateAverage**

The daily refresh job does not delete and re-insert rate records. It
uses a PostgreSQL upsert (INSERT \... ON CONFLICT DO UPDATE) against the
composite unique index on (role, region, experience_level, schedule).
This ensures the last_updated timestamp updates on every successful
refresh and the record is never absent between refreshes.

> // apps/pricing-service/src/rates/services/rates-refresh.service.ts
>
> // Upsert implementation using TypeORM query builder.
>
> async upsertRate(data: {
>
> role: string;
>
> region: string;
>
> experienceLevel: string;
>
> schedule: string;
>
> hourlyRateLowUsdCents: number;
>
> hourlyRateMedianUsdCents: number;
>
> hourlyRateHighUsdCents: number;
>
> sampleSize: number;
>
> }): Promise\<void\> {
>
> await this.rateRepo
>
> .createQueryBuilder()
>
> .insert()
>
> .into(PlatformRateAverage)
>
> .values({
>
> role: data.role,
>
> region: data.region,
>
> experienceLevel: data.experienceLevel,
>
> schedule: data.schedule,
>
> hourlyRateLowUsdCents: data.hourlyRateLowUsdCents,
>
> hourlyRateMedianUsdCents: data.hourlyRateMedianUsdCents,
>
> hourlyRateHighUsdCents: data.hourlyRateHighUsdCents,
>
> sampleSize: data.sampleSize,
>
> })
>
> .orUpdate(
>
> \[
>
> \'hourly_rate_low_usd_cents\',
>
> \'hourly_rate_median_usd_cents\',
>
> \'hourly_rate_high_usd_cents\',
>
> \'sample_size\',
>
> \'last_updated\',
>
> \],
>
> \[\'role\', \'region\', \'experience_level\', \'schedule\'\],
>
> )
>
> .execute();
>
> }
>
> *Important: The last_updated column is set automatically by TypeORM
> \@UpdateDateColumn on every upsert. It is not included in the orUpdate
> list because TypeORM handles it via the entity decorator. If TypeORM
> is bypassed for a raw upsert, add last_updated = NOW() explicitly to
> the ON CONFLICT DO UPDATE clause.*

# **6. References**

- PS-02 --- Folder Structure & Bootstrapping --- module wiring that
  imports these entities

- PS-04 --- API Endpoints --- controllers and services that consume
  these DTOs

- PS-05 --- Integrations & Events --- the daily refresh job that upserts
  PlatformRateAverage and the hourly FX refresh that upserts
  CurrencyRate

- JL-07 --- Scope Table Business Logic --- how listings-service uses
  PlatformRateAverage data for real-time budget calculation

- SD-07 --- Currency and Budget Display Rules --- display rules that
  drive the response DTO field design
