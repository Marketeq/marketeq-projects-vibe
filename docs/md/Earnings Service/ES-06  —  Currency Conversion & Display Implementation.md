**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**earnings-service**

**ES-06 --- Currency Conversion & Display Implementation**

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Service**         earnings-service

  **Document**        ES-06 --- Currency Conversion & Display
                      Implementation

  **Version**         1.0

  **Status**          Draft --- Awaiting Engineering Review

  **Primary FX        Self-hosted fawazahmed0/exchange-api (Docker
  source**            container)

  **Fallback FX       api.frankfurter.app (public API --- used only when
  source**            primary is unreachable)

  **FX cache**        Redis --- 1-hour TTL per currency pair

  **Prerequisites**   ES-00, ES-01, ES-02, ES-03, ES-04, ES-05

  **Next Document**   ES-07 --- Redis Caching Implementation
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Purpose**                                                           |
|                                                                       |
| Defines all currency conversion logic in earnings-service.            |
|                                                                       |
| localCurrency --- geo-detected from the contractor\'s IP on every     |
| login.                                                                |
|                                                                       |
| Stored on the session. Immutable within a session.                    |
|                                                                       |
| displayCurrency --- contractor-chosen in Settings. Defaults to        |
| localCurrency.                                                        |
|                                                                       |
| Persisted to user-service. Can differ from localCurrency.             |
|                                                                       |
| Covered in this document:                                             |
|                                                                       |
| • FX rate fetching from self-hosted fawazahmed0/exchange-api          |
|                                                                       |
| • Redis cache: 1-hour TTL per pair, fx_rate_cache table as persistent |
| backup                                                                |
|                                                                       |
| • Fallback chain when primary FX API is unavailable                   |
|                                                                       |
| • localCurrency detection on login via IP geolocation                 |
|                                                                       |
| • displayCurrency resolution and balance conversion                   |
|                                                                       |
| • Rounding rules: all display amounts rounded to nearest whole unit   |
| --- no decimals                                                       |
|                                                                       |
| • CurrencyService injectable used by BalanceService and               |
| EarningsService (ES-02)                                               |
|                                                                       |
| Not covered: contract-locked FX rates at contract creation            |
| (transaction-service),                                                |
|                                                                       |
| balance snapshot writes (ES-04), Redis balance cache invalidation     |
| (ES-07).                                                              |
+=======================================================================+

# **1. Prerequisites**

  -----------------------------------------------------------------------
  **Requirement**                      **Reference**
  ------------------------------------ ----------------------------------
  **ES-01 --- fx_rate_cache table      Persistent FX rate backup store
  exists and is migrated**             

  **ES-02 --- BalanceService and       CurrencyService is injected into
  EarningsService exist**              both

  **Redis running at REDIS_URL**       FX rate cache primary store

  **fawazahmed0/exchange-api container Primary FX rate source --- see §3
  running at FX_API_URL**              for Docker setup
  -----------------------------------------------------------------------

# **2. Folder Placement**

+-----------------------------------------------------------------------+
| plaintext                                                             |
+-----------------------------------------------------------------------+
| apps/earnings-service/src/                                            |
|                                                                       |
| ├─ currency/                                                          |
|                                                                       |
| │ ├─ currency.module.ts ← ES-06 NEW                                   |
|                                                                       |
| │ └─ currency.service.ts ← ES-06 NEW                                  |
|                                                                       |
| ├─ geo/                                                               |
|                                                                       |
| │ ├─ geo.module.ts ← ES-06 NEW                                        |
|                                                                       |
| │ └─ geo.service.ts ← ES-06 NEW                                       |
|                                                                       |
| ├─ balance/                                                           |
|                                                                       |
| │ └─ balance.service.ts ES-02 --- updated §9.1 to inject              |
| CurrencyService                                                       |
|                                                                       |
| ├─ earnings/                                                          |
|                                                                       |
| │ └─ earnings.service.ts ES-02 --- updated §9.2 to inject             |
| CurrencyService                                                       |
|                                                                       |
| └─ app.module.ts updated §9.3 --- adds CurrencyModule, GeoModule      |
+=======================================================================+

# **3. Environment Variables & Docker Setup**

## **3.1 Environment Variables**

  -----------------------------------------------------------------------------------------------------
  **Variable**               **Required**   **Default**                   **Description**
  -------------------------- -------------- ----------------------------- -----------------------------
  **FX_API_URL**             Yes            ---                           Base URL of the self-hosted
                                                                          fawazahmed0/exchange-api
                                                                          container. e.g.
                                                                          http://fx-api:8080

  **FX_API_FALLBACK_URL**    No             https://api.frankfurter.app   Fallback FX API when primary
                                                                          is unreachable. Frankfurter
                                                                          is a public free API --- rate
                                                                          limited, not for production
                                                                          primary use.

  **FX_CACHE_TTL_SECONDS**   No             3600                          Redis TTL for each currency
                                                                          pair rate. Default 1 hour.
                                                                          Rates do not need sub-hour
                                                                          precision for display
                                                                          purposes.

  **FX_STALE_MAX_SECONDS**   No             86400                         Maximum age of a rate from
                                                                          fx_rate_cache DB table before
                                                                          it is considered too stale to
                                                                          use as a fallback. Default 24
                                                                          hours.

  **GEOIP_DB_PATH**          No             /data/GeoLite2-City.mmdb      Path to MaxMind GeoLite2-City
                                                                          database file inside the
                                                                          container. Used for
                                                                          IP-to-currency mapping.

  **DEFAULT_CURRENCY**       No             USD                           Currency returned when
                                                                          geolocation fails entirely or
                                                                          IP is unrecognised.
  -----------------------------------------------------------------------------------------------------

## **3.2 Docker --- fawazahmed0/exchange-api**

Add the FX API container to docker-compose.yml. earnings-service calls
it over the internal Docker network --- it never makes external HTTP
calls for live rates in production.

+-----------------------------------------------------------------------+
| yaml                                                                  |
+-----------------------------------------------------------------------+
| \# docker-compose.yml --- add this service                            |
|                                                                       |
| services:                                                             |
|                                                                       |
| fx-api:                                                               |
|                                                                       |
| image: fawazahmed0/exchange-api:latest                                |
|                                                                       |
| container_name: marketeq-fx-api                                       |
|                                                                       |
| restart: unless-stopped                                               |
|                                                                       |
| ports:                                                                |
|                                                                       |
| \- \"8080:8080\" \# internal only --- do not expose externally        |
|                                                                       |
| networks:                                                             |
|                                                                       |
| \- marketeq-internal                                                  |
|                                                                       |
| healthcheck:                                                          |
|                                                                       |
| test: \[\"CMD\", \"curl\", \"-f\",                                    |
| \"http://localhost:8080/v1/currencies/usd.json\"\]                    |
|                                                                       |
| interval: 30s                                                         |
|                                                                       |
| timeout: 5s                                                           |
|                                                                       |
| retries: 3                                                            |
|                                                                       |
| earnings-service:                                                     |
|                                                                       |
| \# \... existing config \...                                          |
|                                                                       |
| environment:                                                          |
|                                                                       |
| FX_API_URL: http://fx-api:8080                                        |
|                                                                       |
| depends_on:                                                           |
|                                                                       |
| fx-api:                                                               |
|                                                                       |
| condition: service_healthy                                            |
+=======================================================================+

# **4. Currency Concepts & Rules**

## **4.1 localCurrency vs displayCurrency**

  ------------------------------------------------------------------------
  **Property**       **localCurrency**         **displayCurrency**
  ------------------ ------------------------- ---------------------------
  **What it is**     Currency of the           Currency the contractor has
                     contractor\'s country,    chosen to see amounts in
                     auto-detected from IP     

  **How it is set**  GeoService detects on     Contractor sets in
                     every login from the      Settings. Defaults to
                     incoming IP address       localCurrency on first
                                               login.

  **Where it is      Session only ---          Persisted to user-service.
  stored**           re-detected on every      Synced to
                     login, not persisted      balance_snapshots.

  **Can it change    No --- immutable for the  No --- requires a Settings
  mid-session?**     life of the session       save and re-login to take
                                               effect

  **Used for**       availableBalanceLocal     availableBalanceDisplay and
                     field in balance response all UI amounts
                     (ES-02)                   

  **Example**        Contractor in India: INR  Contractor in India who
                                               prefers USD: USD
  ------------------------------------------------------------------------

## **4.2 Contract-locked rates vs display rates**

  ----------------------------------------------------------------------------------------------------------
  **Rate type**     **Purpose**                       **Where stored**                **Mutable?**
  ----------------- --------------------------------- ------------------------------- ----------------------
  **Contract rate   Used when billing --- locked at   earnings_cache.fx_rate_to_usd   Never --- immutable
  (fxRateToUsd)**   contract creation. Determines the per row                         for the lifetime of
                    USD value of a work entry.                                        the entry

  **Display rate**  Used only to convert USD balances Redis fx:{from}:{to} +          Updated every hour via
                    and earnings totals for UI        fx_rate_cache table backup      FX_CACHE_TTL_SECONDS
                    display. Never used for billing.                                  
  ----------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Critical separation**                                               |
|                                                                       |
| Display rates and contract rates are completely independent.          |
|                                                                       |
| A rate change on fawazahmed0/exchange-api has ZERO effect on past     |
| earnings amounts.                                                     |
|                                                                       |
| All earnings_cache.net_amount_usd values are immutable once written.  |
|                                                                       |
| Display conversion is a presentation layer only --- it never touches  |
| the ledger.                                                           |
+=======================================================================+

## **4.3 Rounding rules**

  -----------------------------------------------------------------------------
  **Scenario**          **Rule**                 **Example**
  --------------------- ------------------------ ------------------------------
  **Display to          Round to nearest whole   \$567.8312 → \$567 \|
  contractor**          unit --- no decimals, no ₹47238.77 → ₹47239
                        cents shown              

  **Internal            Full NUMERIC(18,8)       567.83120000 stored in
  calculations**        precision maintained in  balance_snapshots
                        DB and all intermediate  
                        calculations             

  **Rounding method**   Math.round() ---         \$567.50 → \$568 \| \$567.49 →
                        standard half-up         \$567
                        rounding                 

  **Currency-specific   JPY, KRW, IDR, VND       ¥47238.77 → ¥47239
  note**                already have no sub-unit 
                        --- rounding to whole    
                        unit is always correct   
                        for these.               

  **Never display**     Decimal places, cents,   Never show \"\$567.83\" ---
                        fractional units to end  show \"\$567\"
                        users in any currency    
  -----------------------------------------------------------------------------

# **5. FX Rate Fetching & Cache Architecture**

## **5.1 Request flow**

+-----------------------------------------------------------------------+
| **Rate resolution order for every getRate(from, to) call**            |
|                                                                       |
| 1\. Check Redis key fx:{from}:{to}                                    |
|                                                                       |
| Hit → return rate immediately. TTL reset is NOT applied --- let it    |
| expire naturally.                                                     |
|                                                                       |
| Miss → continue to step 2.                                            |
|                                                                       |
| 2\. Fetch from fawazahmed0/exchange-api (FX_API_URL)                  |
|                                                                       |
| Success → write to Redis (TTL: FX_CACHE_TTL_SECONDS) + upsert         |
| fx_rate_cache table → return.                                         |
|                                                                       |
| Failure (timeout, non-200, network error) → continue to step 3.       |
|                                                                       |
| 3\. Fetch from Frankfurter fallback (FX_API_FALLBACK_URL)             |
|                                                                       |
| Success → write to Redis + upsert fx_rate_cache → return.             |
|                                                                       |
| Failure → continue to step 4.                                         |
|                                                                       |
| 4\. Read from fx_rate_cache DB table (last known good rate)           |
|                                                                       |
| Row found AND age \<= FX_STALE_MAX_SECONDS (24h) → return rate with   |
| stale=true flag.                                                      |
|                                                                       |
| Row found but too old → continue to step 5.                           |
|                                                                       |
| 5\. All sources exhausted --- return hardcoded emergency rate of 1.0  |
| with stale=true.                                                      |
|                                                                       |
| Log ERROR with full context. This should never happen in production.  |
+=======================================================================+

## **5.2 fawazahmed0 API contract**

The self-hosted fawazahmed0/exchange-api exposes a simple JSON file
format. earnings-service calls one endpoint per currency pair lookup.

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| \# Endpoint pattern:                                                  |
|                                                                       |
| GET {FX_API_URL}/v1/currencies/{from_currency_lowercase}.json         |
|                                                                       |
| \# Example --- get all rates relative to USD:                         |
|                                                                       |
| GET http://fx-api:8080/v1/currencies/usd.json                         |
|                                                                       |
| \# Response shape:                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"date\": \"2025-06-10\",                                             |
|                                                                       |
| \"usd\": {                                                            |
|                                                                       |
| \"inr\": 83.42,                                                       |
|                                                                       |
| \"eur\": 0.9234,                                                      |
|                                                                       |
| \"gbp\": 0.7891,                                                      |
|                                                                       |
| \"jpy\": 157.23,                                                      |
|                                                                       |
| // \... all \~170 currencies                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| \# earnings-service always fetches USD as the base and derives from → |
| to rates.                                                             |
|                                                                       |
| \# If from != USD: rate(from → to) = rate(USD → to) / rate(USD →      |
| from)                                                                 |
+=======================================================================+

## **5.3 Frankfurter fallback API contract**

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| \# Endpoint:                                                          |
|                                                                       |
| GET https://api.frankfurter.app/latest?from={FROM}&to={TO}            |
|                                                                       |
| \# Example:                                                           |
|                                                                       |
| GET https://api.frankfurter.app/latest?from=USD&to=INR                |
|                                                                       |
| \# Response:                                                          |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"amount\": 1,                                                        |
|                                                                       |
| \"base\": \"USD\",                                                    |
|                                                                       |
| \"date\": \"2025-06-10\",                                             |
|                                                                       |
| \"rates\": { \"INR\": 83.39 }                                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| \# Note: Frankfurter does not support all currencies (e.g. VND, MMK). |
|                                                                       |
| \# If Frankfurter also returns 404 for the currency, step 4 (DB stale |
| rate) is used.                                                        |
+=======================================================================+

## **5.4 Redis cache key format**

  -------------------------------------------------------------------------------------
  **Key**              **Value**         **TTL**                **Description**
  -------------------- ----------------- ---------------------- -----------------------
  **fx:{FROM}:{TO}**   Rate as string    FX_CACHE_TTL_SECONDS   Current exchange rate
                       e.g. \"83.42\"    (3600s)                from FROM to TO. Both
                                                                currency codes
                                                                uppercase.

  **fx:usd:inr**       83.42             3600s                  Example: USD → INR

  **fx:inr:usd**       0.01198           3600s                  Inverse stored
                                                                separately --- computed
                                                                and cached at same time
  -------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Inverse rate caching**                                              |
|                                                                       |
| When the service fetches the USD→INR rate, it immediately computes    |
| and caches the INR→USD                                                |
|                                                                       |
| inverse (1 / rate) in the same Redis pipeline. This halves future     |
| lookups for reverse                                                   |
|                                                                       |
| conversions without any additional API calls.                         |
+=======================================================================+

# **6. GeoService --- localCurrency Detection**

GeoService detects the contractor\'s localCurrency from their IP address
on every login. It uses the MaxMind GeoLite2-City database (local file,
no external call). The detected currency is attached to the session and
used for the availableBalanceLocal field in balance responses.

## **6.1 IP-to-currency mapping**

GeoLite2 returns a country code. GeoService maps country code → ISO 4217
currency using a hardcoded lookup table. The full lookup table for all
249 ISO 3166-1 countries is included in the service code.

+-----------------------------------------------------------------------+
| **GeoLite2 database update schedule**                                 |
|                                                                       |
| MaxMind releases updated GeoLite2-City databases on the first Tuesday |
| of each month.                                                        |
|                                                                       |
| Download via: https://dev.maxmind.com/geoip/geoipupdate               |
|                                                                       |
| The database file is volume-mounted into the earnings-service         |
| container at GEOIP_DB_PATH.                                           |
|                                                                       |
| A monthly cron job should update it. Using a stale file returns an    |
| incorrect localCurrency                                               |
|                                                                       |
| only --- it never affects billing or balance amounts.                 |
+=======================================================================+

### **src/geo/geo.service.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/geo/geo.service.ts                                             |
|                                                                       |
| import { Injectable, Logger } from \'@nestjs/common\';                |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import \* as maxmind from \'maxmind\';                                |
|                                                                       |
| import \* as path from \'path\';                                      |
|                                                                       |
| // Country code → ISO 4217 currency code.                             |
|                                                                       |
| // Covers all 249 ISO 3166-1 alpha-2 country codes.                   |
|                                                                       |
| // Entries shown here are illustrative --- full map included in the   |
| deployed service.                                                     |
|                                                                       |
| const COUNTRY_CURRENCY: Record\<string, string\> = {                  |
|                                                                       |
| US:\'USD\', GB:\'GBP\', EU:\'EUR\', IN:\'INR\', AU:\'AUD\',           |
| CA:\'CAD\',                                                           |
|                                                                       |
| JP:\'JPY\', CN:\'CNY\', SG:\'SGD\', AE:\'AED\', PK:\'PKR\',           |
| NG:\'NGN\',                                                           |
|                                                                       |
| PH:\'PHP\', BD:\'BDT\', ID:\'IDR\', VN:\'VND\', MX:\'MXN\',           |
| BR:\'BRL\',                                                           |
|                                                                       |
| DE:\'EUR\', FR:\'EUR\', ES:\'EUR\', IT:\'EUR\', NL:\'EUR\',           |
| BE:\'EUR\',                                                           |
|                                                                       |
| PL:\'PLN\', UA:\'UAH\', RO:\'RON\', HU:\'HUF\', CZ:\'CZK\',           |
| SE:\'SEK\',                                                           |
|                                                                       |
| NO:\'NOK\', DK:\'DKK\', CH:\'CHF\', NZ:\'NZD\', ZA:\'ZAR\',           |
| KE:\'KES\',                                                           |
|                                                                       |
| GH:\'GHS\', EG:\'EGP\', MA:\'MAD\', TZ:\'TZS\', ET:\'ETB\',           |
| UG:\'UGX\',                                                           |
|                                                                       |
| KR:\'KRW\', TW:\'TWD\', HK:\'HKD\', TH:\'THB\', MY:\'MYR\',           |
| TR:\'TRY\',                                                           |
|                                                                       |
| IL:\'ILS\', SA:\'SAR\', QA:\'QAR\', KW:\'KWD\', BH:\'BHD\',           |
| OM:\'OMR\',                                                           |
|                                                                       |
| AR:\'ARS\', CL:\'CLP\', CO:\'COP\', PE:\'PEN\', VE:\'VES\',           |
|                                                                       |
| RU:\'RUB\', KZ:\'KZT\', UZ:\'UZS\', AZ:\'AZN\', GE:\'GEL\',           |
|                                                                       |
| // \... full 249-entry map in deployed service                        |
|                                                                       |
| };                                                                    |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class GeoService {                                             |
|                                                                       |
| private readonly logger = new Logger(GeoService.name);                |
|                                                                       |
| private reader: maxmind.Reader\<maxmind.CityResponse\> \| null =      |
| null;                                                                 |
|                                                                       |
| private readonly defaultCurrency: string;                             |
|                                                                       |
| constructor(private readonly config: ConfigService) {                 |
|                                                                       |
| this.defaultCurrency = this.config.get(\'DEFAULT_CURRENCY\',          |
| \'USD\');                                                             |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Lazy-load the MaxMind DB on first call.                            |
|                                                                       |
| private async getReader():                                            |
| Promise\<maxmind.Reader\<maxmind.CityResponse\>\> {                   |
|                                                                       |
| if (!this.reader) {                                                   |
|                                                                       |
| const dbPath = this.config.get(\'GEOIP_DB_PATH\',                     |
| \'/data/GeoLite2-City.mmdb\');                                        |
|                                                                       |
| this.reader = await maxmind.open\<maxmind.CityResponse\>(dbPath);     |
|                                                                       |
| }                                                                     |
|                                                                       |
| return this.reader;                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Detect the ISO 4217 currency for a given IP address.               |
|                                                                       |
| // Returns DEFAULT_CURRENCY if detection fails for any reason.        |
|                                                                       |
| async detectCurrency(ip: string): Promise\<string\> {                 |
|                                                                       |
| // Loopback / private IPs in dev --- return default.                  |
|                                                                       |
| if (!ip \|\| ip === \'127.0.0.1\' \|\| ip === \'::1\' \|\|            |
| ip.startsWith(\'10.\'))                                               |
|                                                                       |
| return this.defaultCurrency;                                          |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const reader = await this.getReader();                                |
|                                                                       |
| const result = reader.get(ip);                                        |
|                                                                       |
| const country = result?.country?.iso_code ??                          |
| result?.registered_country?.iso_code;                                 |
|                                                                       |
| if (!country) return this.defaultCurrency;                            |
|                                                                       |
| const currency = COUNTRY_CURRENCY\[country\] ?? this.defaultCurrency; |
|                                                                       |
| this.logger.debug(\`GeoService: \${ip} → \${country} →                |
| \${currency}\`);                                                      |
|                                                                       |
| return currency;                                                      |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| this.logger.warn(\`GeoService: detection failed for \${ip}:           |
| \${err.message}\`);                                                   |
|                                                                       |
| return this.defaultCurrency;                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

### **src/geo/geo.module.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/geo/geo.module.ts                                              |
|                                                                       |
| import { Module } from \'@nestjs/common\';                            |
|                                                                       |
| import { ConfigModule } from \'@nestjs/config\';                      |
|                                                                       |
| import { GeoService } from \'./geo.service\';                         |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[ConfigModule\],                                            |
|                                                                       |
| providers:\[GeoService\],                                             |
|                                                                       |
| exports: \[GeoService\],                                              |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class GeoModule {}                                             |
+=======================================================================+

# **7. CurrencyService --- Full Implementation**

CurrencyService is the single injection point for all FX rate lookups
and balance conversions throughout earnings-service. It is injected into
BalanceService (ES-02) and EarningsService (ES-02). No other service
performs currency conversion directly.

### **src/currency/currency.module.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/currency/currency.module.ts                                    |
|                                                                       |
| import { Module } from \'@nestjs/common\';                            |
|                                                                       |
| import { TypeOrmModule } from \'@nestjs/typeorm\';                    |
|                                                                       |
| import { ConfigModule } from \'@nestjs/config\';                      |
|                                                                       |
| import { CurrencyService } from \'./currency.service\';               |
|                                                                       |
| import { FxRateCache } from \'../entities/fx-rate-cache.entity\';     |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[ConfigModule, TypeOrmModule.forFeature(\[FxRateCache\])\], |
|                                                                       |
| providers:\[CurrencyService\],                                        |
|                                                                       |
| exports: \[CurrencyService\],                                         |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class CurrencyModule {}                                        |
+=======================================================================+

### **src/currency/currency.service.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/currency/currency.service.ts                                   |
|                                                                       |
| import { Injectable, Logger } from \'@nestjs/common\';                |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import { InjectRepository } from \'@nestjs/typeorm\';                 |
|                                                                       |
| import { Repository } from \'typeorm\';                               |
|                                                                       |
| import Redis from \'ioredis\';                                        |
|                                                                       |
| import axios from \'axios\';                                          |
|                                                                       |
| import { FxRateCache } from \'../entities/fx-rate-cache.entity\';     |
|                                                                       |
| export interface ConversionResult {                                   |
|                                                                       |
| amount: string; // converted amount, rounded to nearest whole unit    |
|                                                                       |
| currency: string; // ISO 4217 target currency                         |
|                                                                       |
| rate: string; // the exchange rate used (8 decimal places)            |
|                                                                       |
| stale: boolean; // true if rate came from DB or emergency fallback    |
|                                                                       |
| rateSource: \'primary\' \| \'fallback\' \| \'db_cache\' \|            |
| \'emergency\';                                                        |
|                                                                       |
| }                                                                     |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class CurrencyService {                                        |
|                                                                       |
| private readonly logger = new Logger(CurrencyService.name);           |
|                                                                       |
| private readonly redis: Redis;                                        |
|                                                                       |
| private readonly primaryUrl: string;                                  |
|                                                                       |
| private readonly fallbackUrl: string;                                 |
|                                                                       |
| private readonly cacheTtl: number;                                    |
|                                                                       |
| private readonly staleMax: number;                                    |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| private readonly config: ConfigService,                               |
|                                                                       |
| \@InjectRepository(FxRateCache)                                       |
|                                                                       |
| private readonly fxRepo: Repository\<FxRateCache\>,                   |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| this.redis = new Redis(this.config.get\<string\>(\'REDIS_URL\'));     |
|                                                                       |
| this.primaryUrl = this.config.get\<string\>(\'FX_API_URL\');          |
|                                                                       |
| this.fallbackUrl = this.config.get(\'FX_API_FALLBACK_URL\',           |
| \'https://api.frankfurter.app\');                                     |
|                                                                       |
| this.cacheTtl = parseInt(this.config.get(\'FX_CACHE_TTL_SECONDS\',    |
| \'3600\'), 10);                                                       |
|                                                                       |
| this.staleMax = parseInt(this.config.get(\'FX_STALE_MAX_SECONDS\',    |
| \'86400\'), 10);                                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ── PUBLIC API ──────────────────────────────────────────────────   |
|                                                                       |
| // Convert amountUsd (USD string) to the target currency.             |
|                                                                       |
| // Returns the display amount rounded to nearest whole unit.          |
|                                                                       |
| async convertFromUsd(amountUsd: string, toCurrency: string):          |
| Promise\<ConversionResult\> {                                         |
|                                                                       |
| if (toCurrency === \'USD\') {                                         |
|                                                                       |
| return {                                                              |
|                                                                       |
| amount: String(Math.round(parseFloat(amountUsd))),                    |
|                                                                       |
| currency: \'USD\',                                                    |
|                                                                       |
| rate: \'1.00000000\',                                                 |
|                                                                       |
| stale: false,                                                         |
|                                                                       |
| rateSource: \'primary\',                                              |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| const { rate, stale, rateSource } = await this.getRate(\'USD\',       |
| toCurrency);                                                          |
|                                                                       |
| const raw = parseFloat(amountUsd) \* rate;                            |
|                                                                       |
| const rounded = Math.round(raw);                                      |
|                                                                       |
| return {                                                              |
|                                                                       |
| amount: String(rounded),                                              |
|                                                                       |
| currency: toCurrency,                                                 |
|                                                                       |
| rate: rate.toFixed(8),                                                |
|                                                                       |
| stale,                                                                |
|                                                                       |
| rateSource,                                                           |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ── RATE RESOLUTION ─────────────────────────────────────────────   |
|                                                                       |
| async getRate(                                                        |
|                                                                       |
| from: string,                                                         |
|                                                                       |
| to: string,                                                           |
|                                                                       |
| ): Promise\<{rate: number; stale: boolean; rateSource:                |
| ConversionResult\[\'rateSource\'\]}\> {                               |
|                                                                       |
| from = from.toUpperCase(); to = to.toUpperCase();                     |
|                                                                       |
| if (from === to) return { rate: 1, stale: false, rateSource:          |
| \'primary\' };                                                        |
|                                                                       |
| // Step 1: Redis cache.                                               |
|                                                                       |
| const redisKey = \`fx:\${from.toLowerCase()}:\${to.toLowerCase()}\`;  |
|                                                                       |
| const cached = await this.redis.get(redisKey);                        |
|                                                                       |
| if (cached) {                                                         |
|                                                                       |
| return { rate: parseFloat(cached), stale: false, rateSource:          |
| \'primary\' };                                                        |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Step 2: Primary --- fawazahmed0/exchange-api.                      |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const rate = await this.fetchFromPrimary(from, to);                   |
|                                                                       |
| await this.cacheRate(from, to, rate);                                 |
|                                                                       |
| return { rate, stale: false, rateSource: \'primary\' };               |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| this.logger.warn(\`Primary FX fetch failed (\${from}→\${to}):         |
| \${err.message}\`);                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Step 3: Fallback --- Frankfurter.                                  |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const rate = await this.fetchFromFallback(from, to);                  |
|                                                                       |
| await this.cacheRate(from, to, rate);                                 |
|                                                                       |
| return { rate, stale: false, rateSource: \'fallback\' };              |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| this.logger.warn(\`Fallback FX fetch failed (\${from}→\${to}):        |
| \${err.message}\`);                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Step 4: fx_rate_cache DB table.                                    |
|                                                                       |
| const dbRow = await this.fxRepo.findOne({ where: { fromCurrency:      |
| from, toCurrency: to } });                                            |
|                                                                       |
| if (dbRow) {                                                          |
|                                                                       |
| const ageSeconds = (Date.now() - dbRow.fetchedAt.getTime()) / 1000;   |
|                                                                       |
| if (ageSeconds \<= this.staleMax) {                                   |
|                                                                       |
| this.logger.warn(\`Using stale DB rate for \${from}→\${to} (age:      |
| \${Math.round(ageSeconds)}s)\`);                                      |
|                                                                       |
| return { rate: parseFloat(dbRow.rate), stale: true, rateSource:       |
| \'db_cache\' };                                                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Step 5: Emergency --- return 1.0 and log ERROR.                    |
|                                                                       |
| this.logger.error(                                                    |
|                                                                       |
| \`All FX sources exhausted for \${from}→\${to}. Returning emergency   |
| rate 1.0.\`,                                                          |
|                                                                       |
| { primaryUrl: this.primaryUrl, fallbackUrl: this.fallbackUrl },       |
|                                                                       |
| );                                                                    |
|                                                                       |
| return { rate: 1, stale: true, rateSource: \'emergency\' };           |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ── PRIMARY FETCH --- fawazahmed0 ────────────────────────────────  |
|                                                                       |
| private async fetchFromPrimary(from: string, to: string):             |
| Promise\<number\> {                                                   |
|                                                                       |
| // fawazahmed0 returns all rates relative to the base currency.       |
|                                                                       |
| // Always fetch USD as base, derive the from→to rate.                 |
|                                                                       |
| const url = \`\${this.primaryUrl}/v1/currencies/usd.json\`;           |
|                                                                       |
| const res = await axios.get(url, { timeout: 3000 });                  |
|                                                                       |
| if (res.status !== 200) throw new Error(\`HTTP \${res.status}\`);     |
|                                                                       |
| const data = res.data?.usd;                                           |
|                                                                       |
| if (!data) throw new Error(\'Unexpected response shape from           |
| fawazahmed0\');                                                       |
|                                                                       |
| // If from=USD, just return data\[to.toLowerCase()\].                 |
|                                                                       |
| if (from === \'USD\') {                                               |
|                                                                       |
| const rate = data\[to.toLowerCase()\];                                |
|                                                                       |
| if (!rate) throw new Error(\`Currency \${to} not found in fawazahmed0 |
| response\`);                                                          |
|                                                                       |
| return rate;                                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Cross-rate: from→to = (USD→to) / (USD→from)                        |
|                                                                       |
| const usdToTo = data\[to.toLowerCase()\];                             |
|                                                                       |
| const usdToFrom = data\[from.toLowerCase()\];                         |
|                                                                       |
| if (!usdToTo \|\| !usdToFrom) throw new Error(\`Missing rate for      |
| \${from} or \${to}\`);                                                |
|                                                                       |
| return usdToTo / usdToFrom;                                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ── FALLBACK FETCH --- Frankfurter ───────────────────────────────  |
|                                                                       |
| private async fetchFromFallback(from: string, to: string):            |
| Promise\<number\> {                                                   |
|                                                                       |
| const url = \`\${this.fallbackUrl}/latest?from=\${from}&to=\${to}\`;  |
|                                                                       |
| const res = await axios.get(url, { timeout: 5000 });                  |
|                                                                       |
| if (res.status !== 200) throw new Error(\`Frankfurter HTTP            |
| \${res.status}\`);                                                    |
|                                                                       |
| const rate = res.data?.rates?.\[to\];                                 |
|                                                                       |
| if (!rate) throw new Error(\`Frankfurter: no rate for \${to}\`);      |
|                                                                       |
| return rate;                                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ── CACHE WRITE ─────────────────────────────────────────────────   |
|                                                                       |
| private async cacheRate(from: string, to: string, rate: number):      |
| Promise\<void\> {                                                     |
|                                                                       |
| const fKey = \`fx:\${from.toLowerCase()}:\${to.toLowerCase()}\`;      |
|                                                                       |
| const rKey = \`fx:\${to.toLowerCase()}:\${from.toLowerCase()}\`;      |
|                                                                       |
| // Cache forward and inverse rate in one pipeline.                    |
|                                                                       |
| await this.redis.pipeline()                                           |
|                                                                       |
| .setex(fKey, this.cacheTtl, rate.toFixed(8))                          |
|                                                                       |
| .setex(rKey, this.cacheTtl, (1 / rate).toFixed(8))                    |
|                                                                       |
| .exec();                                                              |
|                                                                       |
| // Upsert into fx_rate_cache DB table (persistent backup for Step 4). |
|                                                                       |
| await this.fxRepo.query(\`                                            |
|                                                                       |
| INSERT INTO fx_rate_cache (from_currency, to_currency, rate,          |
| fetched_at)                                                           |
|                                                                       |
| VALUES (\$1, \$2, \$3, NOW())                                         |
|                                                                       |
| ON CONFLICT (from_currency, to_currency) DO UPDATE                    |
|                                                                       |
| SET rate = \$3, fetched_at = NOW()                                    |
|                                                                       |
| \`, \[from, to, rate.toFixed(8)\]);                                   |
|                                                                       |
| // Also upsert inverse.                                               |
|                                                                       |
| await this.fxRepo.query(\`                                            |
|                                                                       |
| INSERT INTO fx_rate_cache (from_currency, to_currency, rate,          |
| fetched_at)                                                           |
|                                                                       |
| VALUES (\$1, \$2, \$3, NOW())                                         |
|                                                                       |
| ON CONFLICT (from_currency, to_currency) DO UPDATE                    |
|                                                                       |
| SET rate = \$3, fetched_at = NOW()                                    |
|                                                                       |
| \`, \[to, from, (1 / rate).toFixed(8)\]);                             |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **8. Login Flow --- localCurrency Refresh**

On every login, the contractor\'s IP is passed to
GeoService.detectCurrency(). The result is stored on the session and
used for localCurrency in all balance responses for that session. It is
not persisted --- if the contractor logs in from a different country,
the next session picks up the new localCurrency automatically.

+-----------------------------------------------------------------------+
| **How localCurrency reaches earnings-service**                        |
|                                                                       |
| 1\. Contractor logs in via auth-service.                              |
|                                                                       |
| 2\. auth-service calls GeoService (or its own geo module) on the      |
| incoming request IP.                                                  |
|                                                                       |
| 3\. auth-service embeds localCurrency in the JWT payload.             |
|                                                                       |
| 4\. earnings-service reads localCurrency from the JWT in JwtAuthGuard |
| (ES-02).                                                              |
|                                                                       |
| 5\. BalanceService uses localCurrency from the JWT to populate        |
| availableBalanceLocal.                                                |
|                                                                       |
| If localCurrency is absent from the JWT (older token format, new      |
| contractor),                                                          |
|                                                                       |
| BalanceService defaults to DEFAULT_CURRENCY (USD).                    |
+=======================================================================+

## **8.1 JWT payload extension**

The JWT issued by auth-service must include localCurrency. Update
JwtPayload in jwt-auth.guard.ts:

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Update JwtPayload in src/guards/jwt-auth.guard.ts (ES-02)          |
|                                                                       |
| export interface JwtPayload {                                         |
|                                                                       |
| sub: string; // contractor userId                                     |
|                                                                       |
| role: string; // must be \'contractor\'                               |
|                                                                       |
| localCurrency: string; // ISO 4217 --- geo-detected by auth-service   |
| on login                                                              |
|                                                                       |
| displayCurrency:string; // ISO 4217 --- contractor\'s chosen currency |
| from Settings                                                         |
|                                                                       |
| iat: number;                                                          |
|                                                                       |
| exp: number;                                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| // In canActivate(), after verifying the token:                       |
|                                                                       |
| req.user = payload;                                                   |
|                                                                       |
| // req.user.localCurrency and req.user.displayCurrency are now        |
| available in controllers.                                             |
+=======================================================================+

# **9. Integration --- BalanceService & EarningsService Updates**

These are the minimal updates to the services from ES-02.
CurrencyService replaces the placeholder \"currency conversion in
ES-06\" comments.

## **9.1 BalanceService --- convertFromUsd() integration**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/balance/balance.service.ts --- updated getBalance()            |
|                                                                       |
| // Add CurrencyService to constructor injection.                      |
|                                                                       |
| async getBalance(contractorId: string, localCurrency: string,         |
| displayCurrency: string)                                              |
|                                                                       |
| : Promise\<BalanceResponseDto\> {                                     |
|                                                                       |
| // \... existing snap lookup \...                                     |
|                                                                       |
| // Convert to displayCurrency (for the main balance card).            |
|                                                                       |
| const display = await this.currencySvc.convertFromUsd(                |
|                                                                       |
| snap.availableBalance, displayCurrency,                               |
|                                                                       |
| );                                                                    |
|                                                                       |
| // Convert to localCurrency (for the secondary amount shown when they |
| differ).                                                              |
|                                                                       |
| const local = await this.currencySvc.convertFromUsd(                  |
|                                                                       |
| snap.availableBalance, localCurrency,                                 |
|                                                                       |
| );                                                                    |
|                                                                       |
| dto.availableBalanceDisplay = display.amount; // whole unit, no       |
| decimals                                                              |
|                                                                       |
| dto.displayCurrency = display.currency;                               |
|                                                                       |
| dto.availableBalanceLocal = local.amount; // whole unit, no decimals  |
|                                                                       |
| dto.localCurrency = local.currency;                                   |
|                                                                       |
| // If rate was stale or from emergency fallback, add a warning to the |
| response.                                                             |
|                                                                       |
| // The UI can show a tooltip: \'Exchange rate may be delayed.\'       |
|                                                                       |
| if (display.stale) {                                                  |
|                                                                       |
| dto.displayLabel = \'After reserve & threshold deductions (rate may   |
| be delayed)\';                                                        |
|                                                                       |
| }                                                                     |
|                                                                       |
| return dto;                                                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Update the controller call in BalanceController to pass            |
| localCurrency and displayCurrency:                                    |
|                                                                       |
| \@Get(\'balance\')                                                    |
|                                                                       |
| async getBalance(@Request() req): Promise\<BalanceResponseDto\> {     |
|                                                                       |
| return this.svc.getBalance(                                           |
|                                                                       |
| req.user.sub,                                                         |
|                                                                       |
| req.user.localCurrency \|\| \'USD\',                                  |
|                                                                       |
| req.user.displayCurrency \|\| \'USD\',                                |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **9.2 EarningsService --- netAmountDisplay conversion**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/earnings/earnings.service.ts --- updated mapRow()              |
|                                                                       |
| // In the mapRow() helper, replace the placeholder for                |
| netAmountDisplay:                                                     |
|                                                                       |
| private async mapRowWithCurrency(                                     |
|                                                                       |
| row: EarningsCache,                                                   |
|                                                                       |
| lmap: Map\<string, ContractLabelCache\>,                              |
|                                                                       |
| view: string,                                                         |
|                                                                       |
| displayCurrency: string,                                              |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| const base = this.mapRow(row, lmap, view);                            |
|                                                                       |
| // Convert netAmountUsd to displayCurrency for UI display.            |
|                                                                       |
| const converted = await this.currencySvc.convertFromUsd(              |
|                                                                       |
| row.netAmountUsd, displayCurrency,                                    |
|                                                                       |
| );                                                                    |
|                                                                       |
| return {                                                              |
|                                                                       |
| \...base,                                                             |
|                                                                       |
| netAmountDisplay: converted.amount, // whole unit, no decimals        |
|                                                                       |
| displayCurrency: converted.currency,                                  |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // getEarnings() becomes async with Promise.all() for batch           |
| conversion:                                                           |
|                                                                       |
| data: await Promise.all(rows.map(r =\>                                |
|                                                                       |
| this.mapRowWithCurrency(r, lmap, q.view, displayCurrency),            |
|                                                                       |
| )),                                                                   |
+=======================================================================+

## **9.3 app.module.ts --- add CurrencyModule and GeoModule**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/app.module.ts --- final state after ES-06                      |
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
| import { InternalModule } from \'./internal/internal.module\';        |
|                                                                       |
| import { ConsumersModule } from \'./consumers/consumers.module\';     |
|                                                                       |
| import { PublishersModule } from \'./publishers/publishers.module\';  |
|                                                                       |
| import { CurrencyModule } from \'./currency/currency.module\'; // ←   |
| added                                                                 |
|                                                                       |
| import { GeoModule } from \'./geo/geo.module\'; // ← added            |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[                                                           |
|                                                                       |
| ConfigModule.forRoot({ isGlobal: true }),                             |
|                                                                       |
| DatabaseModule, BalanceModule, EarningsModule,                        |
|                                                                       |
| InternalModule, ConsumersModule, PublishersModule,                    |
|                                                                       |
| CurrencyModule, GeoModule, // ← added                                 |
|                                                                       |
| \],                                                                   |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class AppModule {}                                             |
+=======================================================================+

# **10. Rounding Reference**

Every converted amount returned by CurrencyService.convertFromUsd() is
rounded via Math.round() before being placed in the response. This
section documents every display field and its rounding behaviour.

  ---------------------------------------------------------------------------------------------
  **Response field**            **Endpoint**                    **Rounding**     **Example**
  ----------------------------- ------------------------------- ---------------- --------------
  **availableBalanceDisplay**   GET /v1/earnings/balance        Math.round() to  \$567.83 →
                                                                whole unit       \$567 \|
                                                                                 ₹47238.77 →
                                                                                 ₹47239

  **availableBalanceLocal**     GET /v1/earnings/balance        Math.round() to  ₹47238.77 →
                                                                whole unit       ₹47239

  **netAmountDisplay (per       GET /v1/earnings                Math.round() to  \$128.49 →
  row)**                                                        whole unit       \$128 \|
                                                                                 ₩168,412.8 →
                                                                                 ₩168413

  **amount (summary cards)**    GET /v1/earnings/summary        Math.round() to  \$2560.50 →
                                                                whole unit       \$2560

  **netAmountDisplay (detail)** GET /v1/earnings/:id            Math.round() to  \$128.49 →
                                                                whole unit       \$128

  **DB stored amounts**         earnings_cache,                 Never rounded    567.83120000
                                balance_snapshots               --- full         
                                                                NUMERIC(18,8)    

  **Contract-locked rates**     earnings_cache.fx_rate_to_usd   Never rounded    0.01197605
                                                                --- full         
                                                                precision        
  ---------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Never round stored or internal values**                             |
|                                                                       |
| Math.round() is applied ONLY at the final response serialisation step |
| in CurrencyService.                                                   |
|                                                                       |
| All DB writes, internal calculations, and event payloads use full     |
| NUMERIC(18,8) precision.                                              |
|                                                                       |
| Rounding a stored amount would cause compounding errors over many     |
| transactions.                                                         |
+=======================================================================+

# **11. Fallback Behaviour Matrix**

This matrix documents what contractors see in the UI under each failure
scenario.

  --------------------------------------------------------------------------
  **Failure scenario**     **Rate source      **stale   **UI behaviour**
                           used**             flag**    
  ------------------------ ------------------ --------- --------------------
  **Primary FX API         Redis cache or     false     Normal --- no
  reachable**              live API call                warning

  **Primary down, fallback Frankfurter API    false     Normal ---
  reachable**                                           Frankfurter rates
                                                        are real-time

  **Both APIs down, DB     fx_rate_cache      true      Tooltip: \"Exchange
  cache \< 24h old**       table (last known            rate may be
                           good)                        delayed\"

  **Both APIs down, DB     Emergency rate:    true      Tooltip shown.
  cache \> 24h old**       1.0 (USD                     Balance displayed in
                           passthrough)                 USD regardless of
                                                        displayCurrency

  **fawazahmed0 returns    Frankfurter        ---       As above fallback
  unknown currency**       fallback attempted           chain

  **Frankfurter returns    DB cache or        true      As above fallback
  404 for currency**       emergency rate               chain
  --------------------------------------------------------------------------

# **12. Verification**

## **Confirm FX rate resolution --- primary path**

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| \# 1. Clear Redis FX keys:                                            |
|                                                                       |
| redis-cli KEYS \'fx:\*\' \| xargs redis-cli DEL                       |
|                                                                       |
| \# 2. Call the balance endpoint (requires a contractor JWT with       |
| displayCurrency != USD):                                              |
|                                                                       |
| curl -s -H \'Authorization: Bearer TOKEN_WITH_INR_DISPLAY\' \\        |
|                                                                       |
| http://localhost:3010/v1/earnings/balance \| jq .                     |
|                                                                       |
| \# Expected: availableBalanceDisplay is a whole number in INR         |
|                                                                       |
| \# Expected: displayCurrency: \'INR\'                                 |
|                                                                       |
| \# 3. Confirm Redis key was created:                                  |
|                                                                       |
| redis-cli GET fx:usd:inr                                              |
|                                                                       |
| \# Expected: a numeric string e.g. \'83.42000000\'                    |
|                                                                       |
| redis-cli TTL fx:usd:inr                                              |
|                                                                       |
| \# Expected: \<= 3600                                                 |
+=======================================================================+

## **Confirm fallback chain --- primary down**

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| \# 1. Stop the fx-api container:                                      |
|                                                                       |
| docker compose stop fx-api                                            |
|                                                                       |
| \# 2. Clear Redis FX keys to force a live lookup:                     |
|                                                                       |
| redis-cli KEYS \'fx:\*\' \| xargs redis-cli DEL                       |
|                                                                       |
| \# 3. Call the balance endpoint:                                      |
|                                                                       |
| curl -s -H \'Authorization: Bearer TOKEN_WITH_INR_DISPLAY\' \\        |
|                                                                       |
| http://localhost:3010/v1/earnings/balance \| jq .                     |
|                                                                       |
| \# Expected: balance returned (from Frankfurter fallback)             |
|                                                                       |
| \# Check logs: \'Primary FX fetch failed\' +                          |
| \'earnings.balance.updated published\'                                |
|                                                                       |
| \# 4. Also stop Frankfurter (simulate by blocking outbound --- or     |
| mock with wrong URL):                                                 |
|                                                                       |
| \# Set FX_API_FALLBACK_URL=http://does-not-exist in .env and restart  |
| service                                                               |
|                                                                       |
| \# Expected: logs show \'Fallback FX fetch failed\', then \'Using     |
| stale DB rate\'                                                       |
|                                                                       |
| \# Response: displayLabel contains \'rate may be delayed\'            |
+=======================================================================+

## **Confirm rounding --- no decimal places in display**

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| \# Verify all numeric display fields are whole integers:              |
|                                                                       |
| curl -s -H \'Authorization: Bearer TOKEN\' \\                         |
|                                                                       |
| http://localhost:3010/v1/earnings/balance \| jq \'{                   |
|                                                                       |
| availableBalanceDisplay,                                              |
|                                                                       |
| availableBalanceLocal                                                 |
|                                                                       |
| }\'                                                                   |
|                                                                       |
| \# Both values must be strings containing only digits --- no decimal  |
| point.                                                                |
|                                                                       |
| curl -s -H \'Authorization: Bearer TOKEN\' \\                         |
|                                                                       |
| \'http://localhost:3010/v1/earnings?view=daily&dateRange=this_week\'  |
| \| jq \'.data\[\].netAmountDisplay\'                                  |
|                                                                       |
| \# All values must be whole number strings.                           |
+=======================================================================+

## **Confirm geolocation --- localCurrency detection**

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| \# If GeoLite2 DB is mounted, test with a known IP:                   |
|                                                                       |
| \# India IP example (should return INR):                              |
|                                                                       |
| curl -s -H \'Authorization: Bearer TOKEN\' \\                         |
|                                                                       |
| -H \'X-Forwarded-For: 49.36.0.1\' \\                                  |
|                                                                       |
| http://localhost:3010/v1/earnings/balance \| jq                       |
| \'{localCurrency,availableBalanceLocal}\'                             |
|                                                                       |
| \# Expected: localCurrency: \'INR\'                                   |
|                                                                       |
| \# Private IP (dev environment --- should return DEFAULT_CURRENCY):   |
|                                                                       |
| \# In local dev, req.ip is 127.0.0.1 → returns USD (or                |
| DEFAULT_CURRENCY value)                                               |
+=======================================================================+

# **13. References**

  -----------------------------------------------------------------------
  **Document**              **Relationship to ES-06**
  ------------------------- ---------------------------------------------
  **ES-01 --- Database      fx_rate_cache table (6 columns, 3 indexes)
  Schema**                  used as persistent FX rate backup

  **ES-02 --- Contractor    BalanceService and EarningsService inject
  Endpoints**               CurrencyService; all ES-02 placeholder
                            comments resolved here

  **ES-07 --- Redis         Redis FX key format (fx:{from}:{to})
  Caching**                 documented here. ES-07 covers the
                            balance:{contractorId} key.
  -----------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
earnings-service ES-06 \| v1.0
