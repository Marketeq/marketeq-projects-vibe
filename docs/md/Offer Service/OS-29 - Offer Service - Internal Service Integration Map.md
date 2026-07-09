**OS-29**

**Offer Service --- Internal Service Integration Map**

**Integrates with:** listings-service, pricing-service, legal-service
**HTTP client:** \@nestjs/axios **Pattern:** graceful degradation on
timeout

This document covers every internal service call made by offer-service:
which service is called, why, the HTTP contract, timeout configuration,
and what happens when the downstream service is unavailable. The pattern
throughout is graceful degradation --- offer-service continues to
function even if a downstream service is temporarily unreachable.

**File Map**

  ---------- ------------------------------------------- ----------------------
  **Step**   **File Path**                               **Purpose**

  **0**      (install)                                   npm install
                                                         \@nestjs/axios axios

  **1**      src/integrations/integrations.module.ts     HttpModule
                                                         registration with
                                                         timeout and retry
                                                         defaults

  **2**      src/integrations/listings.client.ts         listings-service:
                                                         validate jobListingId
                                                         before offer creation

  **3**      src/integrations/pricing.client.ts          pricing-service: FX
                                                         rates for display
                                                         currency conversion

  **4**      src/integrations/legal.client.ts            legal-service: NDA
                                                         status for scope view
                                                         gate

  **5**      src/config/offer.config.ts (update)         Service URLs and
                                                         timeout env vars

  **6**      (reference)                                 Integration summary
                                                         table: endpoint,
                                                         timeout, fallback for
                                                         each call

  **7**      (reference)                                 Verification: testing
                                                         downstream
                                                         unavailability
  ---------- ------------------------------------------- ----------------------

+-----------------------------------------------------------------------+
| **Overview Integration Map --- Why Each Service is Called**           |
|                                                                       |
| Context for all three downstream integrations                         |
+-----------------------------------------------------------------------+

  ---------------------- ----------------------- --------------- ------------------------------- --------------
  **Service**            **Called when**         **Blocking?**   **Fallback**                    **Call type**

  **listings-service**   POST /v1/offers         **YES --- if    None: throw 422                 Validation
                         (create), POST          listing is      ListingNotFoundOrAccessDenied   (blocking)
                         /v1/offers/:id/resend   invalid, offer                                  
                                                 cannot be                                       
                                                 created**                                       

  **pricing-service**    GET /v1/offers/:id      NO --- FX       Return null: frontend renders   Enrichment
                         (fetch), any response   conversion is   rate in base currency without   (optional)
                         that includes display   for display     conversion                      
                         rate                    only                                            

  **legal-service**      GET /v1/offers/:id      NO --- offer    Treat as unsigned: return       Gate check
                         (when scope_view is     actions are     nda.signed = false              (optional)
                         requested), talent      never blocked                                   
                         viewing offer with NDA  by NDA status                                   
                         requirement                                                             
  ---------------------- ----------------------- --------------- ------------------------------- --------------

+-----------------------------------------------------------------------+
| The \"blocking vs optional\" distinction is critical:                 |
|                                                                       |
| listings-service is BLOCKING because an offer without a valid job     |
| listing is meaningless.                                               |
|                                                                       |
| The offer_id references a job listing that must exist and be          |
| accessible to the client.                                             |
|                                                                       |
| pricing-service and legal-service are OPTIONAL because:               |
|                                                                       |
| \- FX rates are for display only. The offer stores the rate in the    |
| original currency.                                                    |
|                                                                       |
| \- NDA status gates the SCOPE VIEW, not offer actions. A talent can   |
| accept/decline                                                        |
|                                                                       |
| without ever viewing the NDA-gated scope document.                    |
|                                                                       |
| If pricing-service or legal-service is down: offer-service continues  |
| normally.                                                             |
|                                                                       |
| If listings-service is down: offer creation fails with a clear error. |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 0 Install Dependencies**                                       |
|                                                                       |
| \@nestjs/axios wraps axios with NestJS DI                             |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| \# Install the HTTP client packages                                   |
|                                                                       |
| npm install \@nestjs/axios axios                                      |
|                                                                       |
| \# Verify:                                                            |
|                                                                       |
| cat package.json \| grep -E \"axios\|@nestjs/axios\"                  |
|                                                                       |
| \# Expected:                                                          |
|                                                                       |
| \# \"@nestjs/axios\": \"\^3.x.x\"                                     |
|                                                                       |
| \# \"axios\": \"\^1.x.x\"                                             |
|                                                                       |
| \# \@nestjs/axios v3 works with NestJS v10+.                          |
|                                                                       |
| \# It wraps the axios HTTP client with NestJS DI and RxJS             |
| Observables.                                                          |
|                                                                       |
| \# All HTTP calls return Observables; we convert to Promises using    |
| firstValueFrom().                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 1 IntegrationsModule --- integrations.module.ts**              |
|                                                                       |
| Registers HttpModule with shared timeout, registers all three clients |
+-----------------------------------------------------------------------+

IntegrationsModule registers HttpModule globally and provides all three
service clients as injectable providers. The HttpModule is configured
with the default timeout and retry settings. Individual clients can
override these per-call if needed.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/integrations/integrations.module.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Module, Global } from \'@nestjs/common\';                    |
|                                                                       |
| import { HttpModule } from \'@nestjs/axios\';                         |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import { ListingsClient } from \'./listings.client\';                 |
|                                                                       |
| import { PricingClient } from \'./pricing.client\';                   |
|                                                                       |
| import { LegalClient } from \'./legal.client\';                       |
|                                                                       |
| import { OfferConfig } from \'../config/offer.config\';               |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* IntegrationsModule --- HTTP client for all downstream services.    |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* \@Global(): ListingsClient, PricingClient, LegalClient injectable  |
| everywhere.                                                           |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@Global()                                                            |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[                                                           |
|                                                                       |
| HttpModule.registerAsync({                                            |
|                                                                       |
| inject: \[ConfigService\],                                            |
|                                                                       |
| useFactory: (config: ConfigService) =\> {                             |
|                                                                       |
| const cfg = config.get\<OfferConfig\>(\'offer\').integrations;        |
|                                                                       |
| return {                                                              |
|                                                                       |
| // Default timeout for all downstream calls.                          |
|                                                                       |
| // Individual methods can override with { timeout: X } per call.      |
|                                                                       |
| timeout: cfg.defaultTimeoutMs ?? 3000,                                |
|                                                                       |
| // Maximum number of redirect follows (not retries).                  |
|                                                                       |
| maxRedirects: 0,                                                      |
|                                                                       |
| headers: {                                                            |
|                                                                       |
| \'Content-Type\': \'application/json\',                               |
|                                                                       |
| // Internal service auth header.                                      |
|                                                                       |
| // All internal services validate this shared secret.                 |
|                                                                       |
| \'X-Internal-Secret\': cfg.internalSecret,                            |
|                                                                       |
| },                                                                    |
|                                                                       |
| };                                                                    |
|                                                                       |
| },                                                                    |
|                                                                       |
| }),                                                                   |
|                                                                       |
| \],                                                                   |
|                                                                       |
| providers: \[ListingsClient, PricingClient, LegalClient\],            |
|                                                                       |
| exports: \[ListingsClient, PricingClient, LegalClient\],              |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class IntegrationsModule {}                                    |
+-----------------------------------------------------------------------+

Add IntegrationsModule to AppModule:

+-----------------------------------------------------------------------+
| // In apps/offer-service/src/app.module.ts:                           |
|                                                                       |
| import { IntegrationsModule } from                                    |
| \'./integrations/integrations.module\';                               |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[                                                           |
|                                                                       |
| // \... other modules \...                                            |
|                                                                       |
| IntegrationsModule, // \<\-- ADD                                      |
|                                                                       |
| OffersModule,                                                         |
|                                                                       |
| CounterOffersModule,                                                  |
|                                                                       |
| HealthModule,                                                         |
|                                                                       |
| \],                                                                   |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class AppModule {}                                             |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 2 ListingsClient --- listings.client.ts**                      |
|                                                                       |
| Validates job listing existence before offer creation                 |
+-----------------------------------------------------------------------+

ListingsClient calls listings-service to confirm that the job listing
referenced in the offer exists and is accessible to the client. This is
a blocking validation --- if it fails, the offer cannot be created. The
call also retrieves the listing\'s confirmed contract type and title for
consistency.

  --------------------- -------------------------------------------------
  **When called**       POST /v1/offers (create), POST
                        /v1/offers/:id/resend

  **What is validated** jobListingId exists, is not deleted, belongs to
                        the client (or is public)

  **What is returned**  jobListingId (confirmed), contractType, title
                        (for consistency check)

  **Timeout**           3 000ms (default). If listings-service does not
                        respond within 3s: throw.

  **Fallback**          NONE. This is a blocking call. If
                        listings-service is down, offer creation fails.

  **HTTP method**       GET /internal/listings/{listingId}

  **Auth**              X-Internal-Secret header (shared secret between
                        services)

  **Error on 404**      ListingNotFoundOrAccessDeniedException (422
                        Unprocessable Entity)

  **Error on 5xx**      ListingsServiceUnavailableException (503 --- use
                        to surface an actionable error)
  --------------------- -------------------------------------------------

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/integrations/listings.client.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Injectable, Logger } from \'@nestjs/common\';                |
|                                                                       |
| import { HttpService } from \'@nestjs/axios\';                        |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import { firstValueFrom, timeout } from \'rxjs\';                     |
|                                                                       |
| import { AxiosError } from \'axios\';                                 |
|                                                                       |
| import { OfferConfig } from \'../config/offer.config\';               |
|                                                                       |
| /\*\* Shape returned by listings-service for an individual listing.   |
| \*/                                                                   |
|                                                                       |
| export interface ListingDetails {                                     |
|                                                                       |
| id: string;                                                           |
|                                                                       |
| contractType: string; // PROJECT \| SERVICE \| TEAM \| CONTRACT       |
|                                                                       |
| title: string;                                                        |
|                                                                       |
| clientId: string;                                                     |
|                                                                       |
| status: string; // ACTIVE \| CLOSED \| DRAFT                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Thrown when the job listing is not found or the client does not    |
| own it.                                                               |
|                                                                       |
| \* HTTP 422 Unprocessable Entity.                                     |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export class ListingNotFoundOrAccessDeniedException extends Error {   |
|                                                                       |
| readonly statusCode = 422;                                            |
|                                                                       |
| readonly errorCode = \'LISTING_NOT_FOUND_OR_ACCESS_DENIED\';          |
|                                                                       |
| constructor(listingId: string) {                                      |
|                                                                       |
| super(\`Job listing \${listingId} not found or you do not have access |
| to it.\`);                                                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Thrown when listings-service is unavailable (timeout or 5xx).      |
|                                                                       |
| \* HTTP 503 Service Unavailable.                                      |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export class ListingsServiceUnavailableException extends Error {      |
|                                                                       |
| readonly statusCode = 503;                                            |
|                                                                       |
| readonly errorCode = \'LISTINGS_SERVICE_UNAVAILABLE\';                |
|                                                                       |
| constructor() {                                                       |
|                                                                       |
| super(\'Unable to validate the job listing. The listings service is   |
| temporarily unavailable. Please try again.\');                        |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class ListingsClient {                                         |
|                                                                       |
| private readonly logger = new Logger(ListingsClient.name);            |
|                                                                       |
| private readonly baseUrl: string;                                     |
|                                                                       |
| private readonly timeoutMs: number;                                   |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| private readonly http: HttpService,                                   |
|                                                                       |
| private readonly config: ConfigService,                               |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| const cfg = config.get\<OfferConfig\>(\'offer\').integrations;        |
|                                                                       |
| this.baseUrl = cfg.listingsServiceUrl;                                |
|                                                                       |
| this.timeoutMs = cfg.listingsTimeoutMs ?? 3000;                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* validateListing()                                                  |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Confirms the job listing exists and is accessible to the client.   |
|                                                                       |
| \* Called before every offer creation and resend.                     |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* \@param listingId The jobListingId from the CreateOfferDto         |
|                                                                       |
| \* \@param clientId The authenticated client user ID                  |
|                                                                       |
| \* \@returns ListingDetails if valid                                  |
|                                                                       |
| \* \@throws ListingNotFoundOrAccessDeniedException (422) if not       |
| found/accessible                                                      |
|                                                                       |
| \* \@throws ListingsServiceUnavailableException (503) on timeout/5xx  |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| async validateListing(                                                |
|                                                                       |
| listingId: string,                                                    |
|                                                                       |
| clientId: string,                                                     |
|                                                                       |
| ): Promise\<ListingDetails\> {                                        |
|                                                                       |
| const url = \`\${this.baseUrl}/internal/listings/\${listingId}\`;     |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const response = await firstValueFrom(                                |
|                                                                       |
| this.http.get\<ListingDetails\>(url, {                                |
|                                                                       |
| headers: {                                                            |
|                                                                       |
| // Pass clientId so listings-service can validate ownership.          |
|                                                                       |
| \'X-Client-Id\': clientId,                                            |
|                                                                       |
| },                                                                    |
|                                                                       |
| }).pipe(                                                              |
|                                                                       |
| timeout(this.timeoutMs),                                              |
|                                                                       |
| ),                                                                    |
|                                                                       |
| );                                                                    |
|                                                                       |
| const listing = response.data;                                        |
|                                                                       |
| // Extra check: listing must be ACTIVE (not CLOSED or DRAFT).         |
|                                                                       |
| if (listing.status !== \'ACTIVE\') {                                  |
|                                                                       |
| throw new ListingNotFoundOrAccessDeniedException(listingId);          |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Extra check: listing must belong to the requesting client.         |
|                                                                       |
| if (listing.clientId !== clientId) {                                  |
|                                                                       |
| throw new ListingNotFoundOrAccessDeniedException(listingId);          |
|                                                                       |
| }                                                                     |
|                                                                       |
| return listing;                                                       |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| if (err instanceof ListingNotFoundOrAccessDeniedException) throw err; |
|                                                                       |
| const axiosErr = err as AxiosError;                                   |
|                                                                       |
| // 404: listing does not exist.                                       |
|                                                                       |
| if (axiosErr.response?.status === 404) {                              |
|                                                                       |
| throw new ListingNotFoundOrAccessDeniedException(listingId);          |
|                                                                       |
| }                                                                     |
|                                                                       |
| // 403: listing exists but client does not own it.                    |
|                                                                       |
| if (axiosErr.response?.status === 403) {                              |
|                                                                       |
| throw new ListingNotFoundOrAccessDeniedException(listingId);          |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Timeout or 5xx: listings-service is down.                          |
|                                                                       |
| this.logger.error(\`listings-service call failed: \${err.message}\`); |
|                                                                       |
| throw new ListingsServiceUnavailableException();                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Usage in OffersService.create():                                   |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // const listing = await                                              |
| this.listingsClient.validateListing(dto.jobListingId, clientId);      |
|                                                                       |
| // // listing.contractType and listing.title are now available for    |
| consistency checks.                                                   |
|                                                                       |
| // // If the dto.contractType doesn\'t match listing.contractType,    |
| the service can                                                       |
|                                                                       |
| // // either reject or accept --- confirm with product. Default:      |
| accept dto values.                                                    |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 3 PricingClient --- pricing.client.ts**                        |
|                                                                       |
| FX rates for display-only currency conversion                         |
+-----------------------------------------------------------------------+

PricingClient calls pricing-service to get the current exchange rate
between two currencies. This is used to display a converted rate
alongside the native rate in the UI (e.g. a EUR-denominated offer shown
in USD equivalent). The native rate in the original currency is always
stored on the offer. FX conversion is display-only and purely optional
--- if pricing-service is unavailable, the offer still functions
normally.

  --------------------- -------------------------------------------------
  **When called**       GET /v1/offers/:id (any offer fetch where
                        displayCurrency differs from currencyCode)

  **What is returned**  Exchange rate: from/to/rate/fetchedAt

  **Timeout**           1 500ms (shorter than listings: FX is optional,
                        we fail fast)

  **Fallback**          Return null. Frontend renders the native rate
                        without conversion.

  **HTTP method**       GET /internal/rates?from={code}&to={code}

  **Cache**             Results can be cached client-side for up to 60
                        minutes. FX rates do not change by the second.

  **Stored?**           NO. The exchange rate is NOT stored on the offer.
                        Fetched fresh on each display.
  --------------------- -------------------------------------------------

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/integrations/pricing.client.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Injectable, Logger } from \'@nestjs/common\';                |
|                                                                       |
| import { HttpService } from \'@nestjs/axios\';                        |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import { firstValueFrom, timeout } from \'rxjs\';                     |
|                                                                       |
| import { OfferConfig } from \'../config/offer.config\';               |
|                                                                       |
| export interface FxRate {                                             |
|                                                                       |
| from: string; // ISO 4217 source currency code, e.g. \"EUR\"          |
|                                                                       |
| to: string; // ISO 4217 target currency code, e.g. \"USD\"            |
|                                                                       |
| rate: number; // Multiplier: amount_in_to = amount_in_from \* rate    |
|                                                                       |
| fetchedAt: string; // ISO 8601 UTC timestamp of when the rate was     |
| fetched                                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class PricingClient {                                          |
|                                                                       |
| private readonly logger = new Logger(PricingClient.name);             |
|                                                                       |
| private readonly baseUrl: string;                                     |
|                                                                       |
| private readonly timeoutMs: number;                                   |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| private readonly http: HttpService,                                   |
|                                                                       |
| private readonly config: ConfigService,                               |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| const cfg = config.get\<OfferConfig\>(\'offer\').integrations;        |
|                                                                       |
| this.baseUrl = cfg.pricingServiceUrl;                                 |
|                                                                       |
| this.timeoutMs = cfg.pricingTimeoutMs ?? 1500;                        |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* getFxRate()                                                        |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Returns the exchange rate from one currency to another.            |
|                                                                       |
| \* Returns null on any error (timeout, 404, 5xx) --- graceful         |
| degradation.                                                          |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* \@param from Source currency (e.g. \"EUR\")                        |
|                                                                       |
| \* \@param to Target currency (e.g. \"USD\")                          |
|                                                                       |
| \* \@returns FxRate object or null if unavailable                     |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| async getFxRate(from: string, to: string): Promise\<FxRate \| null\>  |
| {                                                                     |
|                                                                       |
| // Same currency: return rate of 1 immediately, no network call.      |
|                                                                       |
| if (from === to) return { from, to, rate: 1, fetchedAt: new           |
| Date().toISOString() };                                               |
|                                                                       |
| const url =                                                           |
| \`\${this.baseUrl}/internal/rates?from=\${from}&to=\${to}\`;          |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const response = await firstValueFrom(                                |
|                                                                       |
| this.http.get\<FxRate\>(url).pipe(timeout(this.timeoutMs)),           |
|                                                                       |
| );                                                                    |
|                                                                       |
| return response.data;                                                 |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| // Log the failure but do NOT throw. FX is optional.                  |
|                                                                       |
| this.logger.warn(                                                     |
|                                                                       |
| \`pricing-service FX rate unavailable (\${from} -\> \${to}):          |
| \${err.message}. \` +                                                 |
|                                                                       |
| \'Displaying native rate only.\'                                      |
|                                                                       |
| );                                                                    |
|                                                                       |
| return null;                                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Usage in OffersService.getOfferWithExtensionInfo():                |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // const displayCurrency = req.query.displayCurrency as string \|     |
| undefined;                                                            |
|                                                                       |
| // const fxRate = displayCurrency && displayCurrency !==              |
| offer.currencyCode                                                    |
|                                                                       |
| // ? await this.pricingClient.getFxRate(offer.currencyCode,           |
| displayCurrency)                                                      |
|                                                                       |
| // : null;                                                            |
|                                                                       |
| //                                                                    |
|                                                                       |
| // return {                                                           |
|                                                                       |
| // \...offer,                                                         |
|                                                                       |
| // extensionInfo: \...,                                               |
|                                                                       |
| // fxRate: fxRate ? {                                                 |
|                                                                       |
| // displayCurrency,                                                   |
|                                                                       |
| // displayRate: Math.round(offer.rate \* fxRate.rate),                |
|                                                                       |
| // rate: fxRate.rate,                                                 |
|                                                                       |
| // fetchedAt: fxRate.fetchedAt,                                       |
|                                                                       |
| // } : null,                                                          |
|                                                                       |
| // };                                                                 |
|                                                                       |
| // Frontend use: if fxRate is null, show only the native rate.        |
|                                                                       |
| // e.g. \"\$85 USD\" when fxRate is null.                             |
|                                                                       |
| // e.g. \"€78 EUR (≈90 USD)\" when fxRate is populated.               |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 4 LegalClient --- legal.client.ts**                            |
|                                                                       |
| NDA status for the scope view gate                                    |
+-----------------------------------------------------------------------+

LegalClient calls legal-service to check whether a user has signed the
NDA for a specific offer. The NDA gate applies only to viewing the scope
document --- it never blocks offer actions (accept, decline, withdraw,
etc.). If legal-service is unavailable, the system treats the NDA as
unsigned (conservative fallback) and shows the NDA signing UI.

  --------------------- ---------------------------------------------------------------
  **When called**       When a user requests the offer scope/brief document
                        (scope_view=true parameter)

  **What is checked**   Has this user (client or talent) signed the NDA for this
                        client-project relationship?

  **NDA scope**         Per client-project pair, not per offer. Once signed: permanent
                        for all offers from the same client for the same project.

  **Never blocks**      Accept, decline, withdraw, counter offer, edit. NDA only gates
                        the SCOPE document view.

  **Timeout**           2 000ms

  **Fallback**          Return { signed: false }. User sees the NDA signing flow.
                        Conservative --- do not reveal scope without confirmed NDA.

  **HTTP method**       GET
                        /internal/nda/status?userId={id}&clientId={id}&projectId={id}

  **Once signed**       NDA is permanent for this client-project pair. legal-service
                        never returns \"signed\" to \"unsigned\".
  --------------------- ---------------------------------------------------------------

+-----------------------------------------------------------------------+
| The NDA gate is on the SCOPE VIEW only. Never on offer actions.       |
|                                                                       |
| A talent can accept an offer without ever viewing the NDA-gated scope |
| document.                                                             |
|                                                                       |
| Do not add NDA checks to accept(), decline(), withdraw(), or counter  |
| offer methods.                                                        |
|                                                                       |
| The NDA check ONLY lives in the scope document access endpoint.       |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/integrations/legal.client.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Injectable, Logger } from \'@nestjs/common\';                |
|                                                                       |
| import { HttpService } from \'@nestjs/axios\';                        |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import { firstValueFrom, timeout } from \'rxjs\';                     |
|                                                                       |
| import { OfferConfig } from \'../config/offer.config\';               |
|                                                                       |
| export interface NdaStatus {                                          |
|                                                                       |
| userId: string;                                                       |
|                                                                       |
| clientId: string;                                                     |
|                                                                       |
| projectId: string;                                                    |
|                                                                       |
| signed: boolean;                                                      |
|                                                                       |
| signedAt: string \| null; // ISO 8601 UTC timestamp, null if not      |
| signed                                                                |
|                                                                       |
| }                                                                     |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class LegalClient {                                            |
|                                                                       |
| private readonly logger = new Logger(LegalClient.name);               |
|                                                                       |
| private readonly baseUrl: string;                                     |
|                                                                       |
| private readonly timeoutMs: number;                                   |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| private readonly http: HttpService,                                   |
|                                                                       |
| private readonly config: ConfigService,                               |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| const cfg = config.get\<OfferConfig\>(\'offer\').integrations;        |
|                                                                       |
| this.baseUrl = cfg.legalServiceUrl;                                   |
|                                                                       |
| this.timeoutMs = cfg.legalTimeoutMs ?? 2000;                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* getNdaStatus()                                                     |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Returns the NDA signing status for the user/client/project         |
| relationship.                                                         |
|                                                                       |
| \* Returns { signed: false } on any error (graceful degradation).     |
|                                                                       |
| \* Conservative fallback: when in doubt, require NDA signature.       |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* \@param userId The user requesting the scope view                  |
|                                                                       |
| \* \@param clientId The client who owns the project                   |
|                                                                       |
| \* \@param projectId The project/listing ID associated with the offer |
|                                                                       |
| \* \@returns NdaStatus object                                         |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| async getNdaStatus(                                                   |
|                                                                       |
| userId: string,                                                       |
|                                                                       |
| clientId: string,                                                     |
|                                                                       |
| projectId: string,                                                    |
|                                                                       |
| ): Promise\<NdaStatus\> {                                             |
|                                                                       |
| const url = \`\${this.baseUrl}/internal/nda/status\` +                |
|                                                                       |
| \`?userId=\${userId}&clientId=\${clientId}&projectId=\${projectId}\`; |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const response = await firstValueFrom(                                |
|                                                                       |
| this.http.get\<NdaStatus\>(url).pipe(timeout(this.timeoutMs)),        |
|                                                                       |
| );                                                                    |
|                                                                       |
| return response.data;                                                 |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| // Log the failure but do NOT throw.                                  |
|                                                                       |
| // Conservative fallback: treat as unsigned so the NDA flow is shown. |
|                                                                       |
| this.logger.warn(                                                     |
|                                                                       |
| \`legal-service NDA check failed for user \${userId}:                 |
| \${err.message}. \` +                                                 |
|                                                                       |
| \'Treating as unsigned (conservative fallback).\'                     |
|                                                                       |
| );                                                                    |
|                                                                       |
| return { userId, clientId, projectId, signed: false, signedAt: null   |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Usage in a scope document endpoint (example):                      |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // GET /v1/offers/:id/scope                                           |
|                                                                       |
| // This endpoint is NOT part of offer-service core --- it is shown    |
| for context.                                                          |
|                                                                       |
| // \@Get(\':id/scope\')                                               |
|                                                                       |
| // \@UseGuards(OfferPartyGuard)                                       |
|                                                                       |
| // async getScope(                                                    |
|                                                                       |
| // \@Param(\'id\', ParseUUIDPipe) id: string,                         |
|                                                                       |
| // \@Req() req: AuthenticatedRequest,                                 |
|                                                                       |
| // ) {                                                                |
|                                                                       |
| // const offer = await this.offersService.findByIdOrThrow(id);        |
|                                                                       |
| //                                                                    |
|                                                                       |
| // // Check NDA status for the requesting user.                       |
|                                                                       |
| // const ndaStatus = await this.legalClient.getNdaStatus(             |
|                                                                       |
| // req.user.sub,                                                      |
|                                                                       |
| // offer.clientId,                                                    |
|                                                                       |
| // offer.jobListingId,                                                |
|                                                                       |
| // );                                                                 |
|                                                                       |
| //                                                                    |
|                                                                       |
| // if (!ndaStatus.signed) {                                           |
|                                                                       |
| // // Return NDA signing required response --- NOT a 403.             |
|                                                                       |
| // // The frontend shows the NDA signing modal, then retries.         |
|                                                                       |
| // return { ndaRequired: true, offerId: id };                         |
|                                                                       |
| // }                                                                  |
|                                                                       |
| //                                                                    |
|                                                                       |
| // // NDA is signed: return scope document.                           |
|                                                                       |
| // return { ndaRequired: false, scope: offer.scopeDocument };         |
|                                                                       |
| // }                                                                  |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 5 Environment Variables**                                      |
|                                                                       |
| Service URLs and timeout configuration                                |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: .env (add to offer-service environment)**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| \# ============================================================       |
|                                                                       |
| \# Internal service URLs                                              |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# listings-service base URL (internal Docker/K8s network address)    |
|                                                                       |
| LISTINGS_SERVICE_URL=http://listings-service:3001                     |
|                                                                       |
| \# pricing-service base URL                                           |
|                                                                       |
| PRICING_SERVICE_URL=http://pricing-service:3002                       |
|                                                                       |
| \# legal-service base URL                                             |
|                                                                       |
| LEGAL_SERVICE_URL=http://legal-service:3003                           |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# Timeout configuration (milliseconds)                               |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# Default timeout for all downstream calls                           |
|                                                                       |
| INTEGRATIONS_DEFAULT_TIMEOUT_MS=3000                                  |
|                                                                       |
| \# listings-service timeout (blocking call --- slightly more          |
| generous)                                                             |
|                                                                       |
| LISTINGS_TIMEOUT_MS=3000                                              |
|                                                                       |
| \# pricing-service timeout (optional/display --- fail fast)           |
|                                                                       |
| PRICING_TIMEOUT_MS=1500                                               |
|                                                                       |
| \# legal-service timeout (optional --- conservative fallback)         |
|                                                                       |
| LEGAL_TIMEOUT_MS=2000                                                 |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# Internal service authentication                                    |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# Shared secret sent in X-Internal-Secret header.                    |
|                                                                       |
| \# All internal services must validate this header.                   |
|                                                                       |
| \# Generate: openssl rand -hex 32                                     |
|                                                                       |
| INTERNAL_SERVICE_SECRET=\<generate-a-strong-random-secret\>           |
+-----------------------------------------------------------------------+

Add these to the offer.config.ts OfferConfig interface and Joi
validation schema:

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/config/offer.config.ts --- add
  integrations block**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| // Add to OfferConfig interface:                                      |
|                                                                       |
| integrations: {                                                       |
|                                                                       |
| listingsServiceUrl: string;                                           |
|                                                                       |
| pricingServiceUrl: string;                                            |
|                                                                       |
| legalServiceUrl: string;                                              |
|                                                                       |
| defaultTimeoutMs: number;                                             |
|                                                                       |
| listingsTimeoutMs: number;                                            |
|                                                                       |
| pricingTimeoutMs: number;                                             |
|                                                                       |
| legalTimeoutMs: number;                                               |
|                                                                       |
| internalSecret: string;                                               |
|                                                                       |
| };                                                                    |
|                                                                       |
| // Add to the config factory function:                                |
|                                                                       |
| integrations: {                                                       |
|                                                                       |
| listingsServiceUrl: process.env.LISTINGS_SERVICE_URL!,                |
|                                                                       |
| pricingServiceUrl: process.env.PRICING_SERVICE_URL!,                  |
|                                                                       |
| legalServiceUrl: process.env.LEGAL_SERVICE_URL!,                      |
|                                                                       |
| defaultTimeoutMs:                                                     |
| parseInt(process.env.INTEGRATIONS_DEFAULT_TIMEOUT_MS ?? \'3000\',     |
| 10),                                                                  |
|                                                                       |
| listingsTimeoutMs: parseInt(process.env.LISTINGS_TIMEOUT_MS ??        |
| \'3000\', 10),                                                        |
|                                                                       |
| pricingTimeoutMs: parseInt(process.env.PRICING_TIMEOUT_MS ??          |
| \'1500\', 10),                                                        |
|                                                                       |
| legalTimeoutMs: parseInt(process.env.LEGAL_TIMEOUT_MS ?? \'2000\',    |
| 10),                                                                  |
|                                                                       |
| internalSecret: process.env.INTERNAL_SERVICE_SECRET!,                 |
|                                                                       |
| },                                                                    |
|                                                                       |
| // Add to Joi validationSchema:                                       |
|                                                                       |
| LISTINGS_SERVICE_URL: Joi.string().uri().required(),                  |
|                                                                       |
| PRICING_SERVICE_URL: Joi.string().uri().required(),                   |
|                                                                       |
| LEGAL_SERVICE_URL: Joi.string().uri().required(),                     |
|                                                                       |
| INTEGRATIONS_DEFAULT_TIMEOUT_MS: Joi.number().default(3000),          |
|                                                                       |
| LISTINGS_TIMEOUT_MS: Joi.number().default(3000),                      |
|                                                                       |
| PRICING_TIMEOUT_MS: Joi.number().default(1500),                       |
|                                                                       |
| LEGAL_TIMEOUT_MS: Joi.number().default(2000),                         |
|                                                                       |
| INTERNAL_SERVICE_SECRET: Joi.string().min(32).required(),             |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 6 (Reference) Integration Summary Table**                      |
|                                                                       |
| Complete reference for all downstream calls                           |
+-----------------------------------------------------------------------+

  ---------------------- --------------------------- ------------ ------------- --------------- ------------ -----------------
  **Service**            **Endpoint**                **Method**   **Timeout**   **Blocking?**   **Retry?**   **Fallback
                                                                                                             behaviour**

  **listings-service**   /internal/listings/{id}     GET          3 000ms       **YES**         NO           Throw 422
                                                                                                             (listing invalid)
                                                                                                             or 503 (service
                                                                                                             down)

  **pricing-service**    /internal/rates?from=&to=   GET          1 500ms       **NO**          NO           Return null ---
                                                                                                             frontend shows
                                                                                                             native rate only

  **legal-service**      /internal/nda/status?\...   GET          2 000ms       **NO**          NO           Return { signed:
                                                                                                             false } --- show
                                                                                                             NDA signing flow
  ---------------------- --------------------------- ------------ ------------- --------------- ------------ -----------------

+-----------------------------------------------------------------------+
| **Step 7 Verification --- Testing Downstream Unavailability**         |
|                                                                       |
| Confirm graceful degradation works for each service                   |
+-----------------------------------------------------------------------+

**Test 1 --- listings-service unavailable (blocking)**

+-----------------------------------------------------------------------+
| \# Set LISTINGS_SERVICE_URL to an unreachable address in .env:        |
|                                                                       |
| LISTINGS_SERVICE_URL=http://localhost:9999                            |
|                                                                       |
| \# Attempt to create an offer:                                        |
|                                                                       |
| curl -s -X POST http://localhost:3005/v1/offers \\                    |
|                                                                       |
| -H \"Authorization: Bearer \<CLIENT_JWT\>\" \\                        |
|                                                                       |
| -H \"Content-Type: application/json\" \\                              |
|                                                                       |
| -H \"X-Idempotency-Key: test-001\" \\                                 |
|                                                                       |
| -d \'{\"jobListingId\":\"\...\", \...}\' \| jq .                      |
|                                                                       |
| \# Expected: 503 LISTINGS_SERVICE_UNAVAILABLE                         |
|                                                                       |
| \# { \"statusCode\": 503, \"error\":                                  |
| \"LISTINGS_SERVICE_UNAVAILABLE\",                                     |
|                                                                       |
| \# \"message\": \"Unable to validate the job listing\...\" }          |
|                                                                       |
| \# Confirm the error fires within 3s (timeout setting):               |
|                                                                       |
| time curl -s -X POST http://localhost:3005/v1/offers \...             |
|                                                                       |
| \# Expected: \~3.0s response time (the timeout fires)                 |
+-----------------------------------------------------------------------+

**Test 2 --- pricing-service unavailable (non-blocking)**

+-----------------------------------------------------------------------+
| \# Set PRICING_SERVICE_URL to an unreachable address:                 |
|                                                                       |
| PRICING_SERVICE_URL=http://localhost:9999                             |
|                                                                       |
| \# Fetch an offer with displayCurrency query param:                   |
|                                                                       |
| curl -s                                                               |
| \"http://localhost:3005/v1/offers/\<OFFER_ID\>?displayCurrency=USD\"  |
| \\                                                                    |
|                                                                       |
| -H \"Authorization: Bearer \<JWT\>\" \| jq .fxRate                    |
|                                                                       |
| \# Expected: null                                                     |
|                                                                       |
| \# The offer still returns. fxRate is null because pricing-service is |
| down.                                                                 |
|                                                                       |
| \# Response time should be \~1.5s (pricing timeout) not blocked.      |
+-----------------------------------------------------------------------+

**Test 3 --- legal-service unavailable (non-blocking, conservative
fallback)**

+-----------------------------------------------------------------------+
| \# Set LEGAL_SERVICE_URL to an unreachable address:                   |
|                                                                       |
| LEGAL_SERVICE_URL=http://localhost:9999                               |
|                                                                       |
| \# Request scope view:                                                |
|                                                                       |
| curl -s \"http://localhost:3005/v1/offers/\<OFFER_ID\>/scope\" \\     |
|                                                                       |
| -H \"Authorization: Bearer \<TALENT_JWT\>\" \| jq .ndaRequired        |
|                                                                       |
| \# Expected: true                                                     |
|                                                                       |
| \# The conservative fallback: when legal-service is down, the user is |
|                                                                       |
| \# prompted to sign the NDA. Scope document is NOT shown.             |
|                                                                       |
| \# This is the correct safe behaviour.                                |
+-----------------------------------------------------------------------+

**Test 4 --- listings-service returns 404 (invalid listing ID)**

+-----------------------------------------------------------------------+
| \# Start listings-service normally but use a non-existent listing ID: |
|                                                                       |
| curl -s -X POST http://localhost:3005/v1/offers \\                    |
|                                                                       |
| -H \"Authorization: Bearer \<CLIENT_JWT\>\" \\                        |
|                                                                       |
| -H \"Content-Type: application/json\" \\                              |
|                                                                       |
| -H \"X-Idempotency-Key: test-002\" \\                                 |
|                                                                       |
| -d \'{\"jobListingId\":\"00000000-0000-0000-0000-000000000000\",      |
| \...}\' \| jq .                                                       |
|                                                                       |
| \# Expected: 422 LISTING_NOT_FOUND_OR_ACCESS_DENIED                   |
|                                                                       |
| \# { \"statusCode\": 422, \"error\":                                  |
| \"LISTING_NOT_FOUND_OR_ACCESS_DENIED\",                               |
|                                                                       |
| \# \"message\": \"Job listing 00000000-\... not found or you do not   |
| have access to it.\" }                                                |
+-----------------------------------------------------------------------+
