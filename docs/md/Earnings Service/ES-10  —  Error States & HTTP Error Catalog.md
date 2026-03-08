**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**earnings-service**

**ES-10 --- Error States & HTTP Error Catalog**

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Service**         earnings-service

  **Document**        ES-10 --- Error States & HTTP Error Catalog

  **Version**         1.0

  **Status**          Draft --- Awaiting Engineering Review

  **Total error codes 32
  defined**           

  **Error code        ERR_EARNINGS\_ --- every internal error code is
  prefix**            prefixed

  **Response shape**  { statusCode, error, message, errorCode, requestId,
                      timestamp }

  **Prerequisites**   ES-00 through ES-09

  **Next Document**   ES-11 --- Integration Test Suite
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Purpose**                                                           |
|                                                                       |
| Single authoritative reference for every error earnings-service can   |
| return.                                                               |
|                                                                       |
| For each error:                                                       |
|                                                                       |
| • HTTP status code and internal error code string (ERR_EARNINGS\_\*)  |
|                                                                       |
| • Which endpoint(s) can produce it                                    |
|                                                                       |
| • What triggers it                                                    |
|                                                                       |
| • Exact user-facing message string (copy these verbatim into frontend |
| i18n)                                                                 |
|                                                                       |
| • Internal log message pattern (what engineers see in logs)           |
|                                                                       |
| • Recovery action (what the caller should do)                         |
|                                                                       |
| Errors are grouped by HTTP status family:                             |
|                                                                       |
| §3 400 Bad Request (10 errors)                                        |
|                                                                       |
| §4 401 Unauthorized (3 errors)                                        |
|                                                                       |
| §5 403 Forbidden (3 errors)                                           |
|                                                                       |
| §6 404 Not Found (4 errors)                                           |
|                                                                       |
| §7 422 Unprocessable Entity (3 errors)                                |
|                                                                       |
| §8 429 Too Many Requests (2 errors)                                   |
|                                                                       |
| §9 500 Internal Server Error (4 errors)                               |
|                                                                       |
| §10 503 Service Unavailable (3 errors)                                |
+=======================================================================+

# **1. Prerequisites**

  -----------------------------------------------------------------------
  **Requirement**                **Purpose in this doc**
  ------------------------------ ----------------------------------------
  **ES-02 --- Contractor         Error sources: balance, history,
  Endpoints**                    summary, detail endpoints

  **ES-03 --- Internal           Error sources: service-to-service
  Endpoints**                    balance and YTD endpoints

  **ES-06 --- Currency           FX unavailability errors (§10)
  Conversion**                   

  **ES-09 --- Export Endpoint**  Export-specific errors (§3, §9)
  -----------------------------------------------------------------------

# **2. Standard Error Response Shape**

Every error response from earnings-service --- whether from a guard, a
pipe, a service, or an unhandled exception filter --- follows this exact
JSON shape. Frontend must never parse error messages for logic; use
errorCode only.

+-----------------------------------------------------------------------+
| json                                                                  |
+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"statusCode\": 400,                                                  |
|                                                                       |
| \"error\": \"Bad Request\",                                           |
|                                                                       |
| \"message\": \"Human-readable description of the error.\",            |
|                                                                       |
| \"errorCode\": \"ERR_EARNINGS_INVALID_DATE_RANGE\",                   |
|                                                                       |
| \"requestId\": \"uuid-v4-per-request\",                               |
|                                                                       |
| \"timestamp\": \"2025-06-10T14:32:01Z\"                               |
|                                                                       |
| }                                                                     |
+=======================================================================+

  -------------------------------------------------------------------------
  **Field**        **Type**   **Notes**
  ---------------- ---------- ---------------------------------------------
  **statusCode**   integer    HTTP status code --- matches the HTTP
                              response status.

  **error**        string     HTTP status phrase --- \"Bad Request\",
                              \"Unauthorized\", etc.

  **message**      string     User-facing message. Safe to display in UI.
                              English only --- frontend i18n layer wraps
                              this.

  **errorCode**    string     Machine-readable code. Always
                              ERR_EARNINGS\_\* prefix. Frontend switches on
                              this field --- never on message text.

  **requestId**    UUID       UUID generated per request in the global
                   string     request interceptor. Include in support
                              tickets.

  **timestamp**    ISO 8601   UTC timestamp when the error was generated.
                              Matches the log entry timestamp.
  -------------------------------------------------------------------------

## **2.1 GlobalExceptionFilter --- implementation**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/filters/global-exception.filter.ts                             |
|                                                                       |
| // Registered globally in main.ts: app.useGlobalFilters(new           |
| GlobalExceptionFilter())                                              |
|                                                                       |
| import { ExceptionFilter, Catch, ArgumentsHost, HttpException,        |
|                                                                       |
| HttpStatus, Logger } from \'@nestjs/common\';                         |
|                                                                       |
| import { Request, Response } from \'express\';                        |
|                                                                       |
| import { randomUUID } from \'crypto\';                                |
|                                                                       |
| \@Catch()                                                             |
|                                                                       |
| export class GlobalExceptionFilter implements ExceptionFilter {       |
|                                                                       |
| private readonly logger = new Logger(\'GlobalExceptionFilter\');      |
|                                                                       |
| catch(exception: unknown, host: ArgumentsHost) {                      |
|                                                                       |
| const ctx = host.switchToHttp();                                      |
|                                                                       |
| const req = ctx.getRequest\<Request\>();                              |
|                                                                       |
| const res = ctx.getResponse\<Response\>();                            |
|                                                                       |
| const isHttp = exception instanceof HttpException;                    |
|                                                                       |
| const status = isHttp ? exception.getStatus() :                       |
| HttpStatus.INTERNAL_SERVER_ERROR;                                     |
|                                                                       |
| const exRes = isHttp ? exception.getResponse() : null;                |
|                                                                       |
| // Extract errorCode from the thrown exception if it was set.         |
|                                                                       |
| const errorCode = (exRes as any)?.errorCode                           |
|                                                                       |
| ?? (exception as any)?.errorCode                                      |
|                                                                       |
| ?? \'ERR_EARNINGS_INTERNAL\';                                         |
|                                                                       |
| const message = (exRes as any)?.message                               |
|                                                                       |
| ?? (exception instanceof Error ? exception.message : \'An unexpected  |
| error occurred.\');                                                   |
|                                                                       |
| const body = {                                                        |
|                                                                       |
| statusCode: status,                                                   |
|                                                                       |
| error: HTTP_STATUS_PHRASES\[status\] ?? \'Error\',                    |
|                                                                       |
| message: Array.isArray(message) ? message.join(\'; \') : message,     |
|                                                                       |
| errorCode,                                                            |
|                                                                       |
| requestId: req.headers\[\'x-request-id\'\] as string ?? randomUUID(), |
|                                                                       |
| timestamp: new Date().toISOString(),                                  |
|                                                                       |
| };                                                                    |
|                                                                       |
| if (status \>= 500) {                                                 |
|                                                                       |
| this.logger.error(\`\${errorCode} --- \${body.message}\`, (exception  |
| as any)?.stack);                                                      |
|                                                                       |
| } else {                                                              |
|                                                                       |
| this.logger.warn(\`\${errorCode} --- \${body.message}                 |
| \[\${req.method} \${req.url}\]\`);                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| res.status(status).json(body);                                        |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| const HTTP_STATUS_PHRASES: Record\<number,string\> = {                |
|                                                                       |
| 400:\'Bad Request\', 401:\'Unauthorized\', 403:\'Forbidden\',         |
| 404:\'Not Found\',                                                    |
|                                                                       |
| 409:\'Conflict\', 422:\'Unprocessable Entity\', 429:\'Too Many        |
| Requests\',                                                           |
|                                                                       |
| 500:\'Internal Server Error\', 503:\'Service Unavailable\',           |
|                                                                       |
| };                                                                    |
+=======================================================================+

## **2.2 Throwing errors with errorCode from services**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Utility --- throw a typed earnings error from any service or       |
| guard.                                                                |
|                                                                       |
| // src/errors/earnings.error.ts                                       |
|                                                                       |
| import { HttpException, HttpStatus } from \'@nestjs/common\';         |
|                                                                       |
| export class EarningsError extends HttpException {                    |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| message: string,                                                      |
|                                                                       |
| status: HttpStatus,                                                   |
|                                                                       |
| errorCode: string,                                                    |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| super({ message, errorCode }, status);                                |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Usage --- throw from anywhere in the service layer:                |
|                                                                       |
| throw new EarningsError(                                              |
|                                                                       |
| \'No balance record has been calculated for this contractor yet.\',   |
|                                                                       |
| HttpStatus.NOT_FOUND,                                                 |
|                                                                       |
| \'ERR_EARNINGS_BALANCE_NOT_FOUND\',                                   |
|                                                                       |
| );                                                                    |
+=======================================================================+

# **3. 400 Bad Request**

Errors caused by invalid or malformed input from the caller. The caller
must fix their request before retrying.

+-----------------------------------------------------------------------------------+
|   ------------------------------------------------------------------------------- |
|   **ERR_EARNINGS_INVALID_DATE_RANGE**                      **HTTP 400**           |
|   -------------------------------------------------------- ---------------------- |
|   **Endpoint(s)**                                          GET /v1/earnings \|    |
|                                                            GET                    |
|                                                            /v1/earnings/summary   |
|                                                            \| GET                 |
|                                                            /v1/earnings/export    |
|                                                                                   |
|   **Trigger**                                              dateRange=custom       |
|                                                            supplied without       |
|                                                            startDate or endDate,  |
|                                                            or startDate is after  |
|                                                            endDate.               |
|   ------------------------------------------------------------------------------- |
|                                                                                   |
| **User-facing message:**                                                          |
|                                                                                   |
|   ---------------------------------------------------------------------           |
|   The date range is invalid. When using a custom range, both startDate            |
|   and endDate are required and startDate must be on or before endDate.            |
|   ---------------------------------------------------------------------           |
|                                                                                   |
|   ---------------------------------------------------------------------           |
|                                                                                   |
| **Internal log message:**                                                         |
|                                                                                   |
|   -----------------------------------------------------------------------         |
|   ERR_EARNINGS_INVALID_DATE_RANGE: dateRange=custom requires                      |
|   startDate\<=endDate. Received: startDate={startDate}, endDate={endDate}         |
|   -----------------------------------------------------------------------         |
|                                                                                   |
|   -----------------------------------------------------------------------         |
|                                                                                   |
| **Recovery action:**                                                              |
|                                                                                   |
| +---------------------------------------------------------------------+           |
| | If dateRange=custom: supply both startDate and endDate in           |           |
| | YYYY-MM-DD format.                                                  |           |
| |                                                                     |           |
| | Ensure startDate is not after endDate.                              |           |
| |                                                                     |           |
| | Use one of the 9 preset values if a custom range is not needed.     |           |
| +=====================================================================+           |
+===================================================================================+

+-----------------------------------------------------------------------------------+
|   ------------------------------------------------------------------------------- |
|   **ERR_EARNINGS_INVALID_DATE_FORMAT**                     **HTTP 400**           |
|   -------------------------------------------------------- ---------------------- |
|   **Endpoint(s)**                                          GET /v1/earnings \|    |
|                                                            GET                    |
|                                                            /v1/earnings/summary   |
|                                                            \| GET                 |
|                                                            /v1/earnings/export    |
|                                                                                   |
|   **Trigger**                                              startDate or endDate   |
|                                                            is not a valid         |
|                                                            YYYY-MM-DD date        |
|                                                            string.                |
|   ------------------------------------------------------------------------------- |
|                                                                                   |
| **User-facing message:**                                                          |
|                                                                                   |
|   ---------------------------------------------------------------------           |
|   The date format is invalid. Dates must be in YYYY-MM-DD format (e.g.            |
|   2025-06-01).                                                                    |
|   ---------------------------------------------------------------------           |
|                                                                                   |
|   ---------------------------------------------------------------------           |
|                                                                                   |
| **Internal log message:**                                                         |
|                                                                                   |
|   -----------------------------------------------------------------------         |
|   ERR_EARNINGS_INVALID_DATE_FORMAT: could not parse date \"{value}\" as           |
|   YYYY-MM-DD.                                                                     |
|   -----------------------------------------------------------------------         |
|                                                                                   |
|   -----------------------------------------------------------------------         |
|                                                                                   |
| **Recovery action:**                                                              |
|                                                                                   |
|   ---------------------------------------------------------------------           |
|   Supply dates in ISO 8601 YYYY-MM-DD format. Do not include time or              |
|   timezone components.                                                            |
|   ---------------------------------------------------------------------           |
|                                                                                   |
|   ---------------------------------------------------------------------           |
+===================================================================================+

+---------------------------------------------------------------------------+
|   ----------------------------------------------------------------------- |
|   **ERR_EARNINGS_INVALID_VIEW**                            **HTTP 400**   |
|   -------------------------------------------------------- -------------- |
|   **Endpoint(s)**                                          GET            |
|                                                            /v1/earnings   |
|                                                                           |
|   **Trigger**                                              view query     |
|                                                            parameter is   |
|                                                            not one of:    |
|                                                            daily, weekly, |
|                                                            monthly.       |
|   ----------------------------------------------------------------------- |
|                                                                           |
| **User-facing message:**                                                  |
|                                                                           |
|   ---------------------------------------------------------------------   |
|   The view parameter must be one of: daily, weekly, monthly.              |
|   ---------------------------------------------------------------------   |
|                                                                           |
|   ---------------------------------------------------------------------   |
|                                                                           |
| **Internal log message:**                                                 |
|                                                                           |
|   ----------------------------------------------------------------------- |
|   ERR_EARNINGS_INVALID_VIEW: received view=\"{value}\", expected          |
|   daily\|weekly\|monthly.                                                 |
|   ----------------------------------------------------------------------- |
|                                                                           |
|   ----------------------------------------------------------------------- |
|                                                                           |
| **Recovery action:**                                                      |
|                                                                           |
|   ---------------------------------------------------------------------   |
|   Set view to one of the three valid values. Default is daily if          |
|   omitted.                                                                |
|   ---------------------------------------------------------------------   |
|                                                                           |
|   ---------------------------------------------------------------------   |
+===========================================================================+

+---------------------------------------------------------------------------+
|   ----------------------------------------------------------------------- |
|   **ERR_EARNINGS_INVALID_PAGE**                            **HTTP 400**   |
|   -------------------------------------------------------- -------------- |
|   **Endpoint(s)**                                          GET            |
|                                                            /v1/earnings   |
|                                                                           |
|   **Trigger**                                              page is less   |
|                                                            than 1,        |
|                                                            greater than   |
|                                                            1000, or not   |
|                                                            an integer. Or |
|                                                            limit is less  |
|                                                            than 1,        |
|                                                            greater than   |
|                                                            100, or not an |
|                                                            integer.       |
|   ----------------------------------------------------------------------- |
|                                                                           |
| **User-facing message:**                                                  |
|                                                                           |
|   ---------------------------------------------------------------------   |
|   Pagination parameters are invalid. page must be between 1 and 1000,     |
|   and limit must be between 1 and 100.                                    |
|   ---------------------------------------------------------------------   |
|                                                                           |
|   ---------------------------------------------------------------------   |
|                                                                           |
| **Internal log message:**                                                 |
|                                                                           |
|   ----------------------------------------------------------------------- |
|   ERR_EARNINGS_INVALID_PAGE: page={page}, limit={limit} --- out of        |
|   accepted bounds.                                                        |
|   ----------------------------------------------------------------------- |
|                                                                           |
|   ----------------------------------------------------------------------- |
|                                                                           |
| **Recovery action:**                                                      |
|                                                                           |
|   ---------------------------------------------------------------------   |
|   Keep page between 1--1000 and limit between 1--100. Default limit is    |
|   25.                                                                     |
|   ---------------------------------------------------------------------   |
|                                                                           |
|   ---------------------------------------------------------------------   |
+===========================================================================+

+-----------------------------------------------------------------------------------+
|   ------------------------------------------------------------------------------- |
|   **ERR_EARNINGS_CURRENCY_NOT_SUPPORTED**                  **HTTP 400**           |
|   -------------------------------------------------------- ---------------------- |
|   **Endpoint(s)**                                          GET                    |
|                                                            /v1/earnings/balance   |
|                                                            \| GET /v1/earnings \| |
|                                                            GET                    |
|                                                            /v1/earnings/export    |
|                                                                                   |
|   **Trigger**                                              The currency query     |
|                                                            parameter (or          |
|                                                            displayCurrency from   |
|                                                            JWT) is not a valid    |
|                                                            ISO 4217 three-letter  |
|                                                            currency code, or is a |
|                                                            code that the FX API   |
|                                                            does not support.      |
|   ------------------------------------------------------------------------------- |
|                                                                                   |
| **User-facing message:**                                                          |
|                                                                                   |
|   ---------------------------------------------------------------------           |
|   The requested currency is not supported. Please choose a valid ISO              |
|   4217 currency code from the Settings page.                                      |
|   ---------------------------------------------------------------------           |
|                                                                                   |
|   ---------------------------------------------------------------------           |
|                                                                                   |
| **Internal log message:**                                                         |
|                                                                                   |
|   -----------------------------------------------------------------------         |
|   ERR_EARNINGS_CURRENCY_NOT_SUPPORTED: currency=\"{currency}\" not found          |
|   in fawazahmed0 response and has no fallback rate in fx_rate_cache.              |
|   -----------------------------------------------------------------------         |
|                                                                                   |
|   -----------------------------------------------------------------------         |
|                                                                                   |
| **Recovery action:**                                                              |
|                                                                                   |
| +---------------------------------------------------------------------+           |
| | Check that the currency code is exactly 3 uppercase letters (ISO    |           |
| | 4217).                                                              |           |
| |                                                                     |           |
| | Consult the supported currency list from GET /v1/currencies (future |           |
| | endpoint).                                                          |           |
| |                                                                     |           |
| | As an immediate workaround, use USD.                                |           |
| +=====================================================================+           |
+===================================================================================+

+----------------------------------------------------------------------------------+
|   ------------------------------------------------------------------------------ |
|   **ERR_EARNINGS_INVALID_EXPORT_FORMAT**                   **HTTP 400**          |
|   -------------------------------------------------------- --------------------- |
|   **Endpoint(s)**                                          GET                   |
|                                                            /v1/earnings/export   |
|                                                                                  |
|   **Trigger**                                              format query          |
|                                                            parameter is not      |
|                                                            \"csv\" or \"pdf\".   |
|   ------------------------------------------------------------------------------ |
|                                                                                  |
| **User-facing message:**                                                         |
|                                                                                  |
|   ---------------------------------------------------------------------          |
|   Export format must be csv or pdf.                                              |
|   ---------------------------------------------------------------------          |
|                                                                                  |
|   ---------------------------------------------------------------------          |
|                                                                                  |
| **Internal log message:**                                                        |
|                                                                                  |
|   -----------------------------------------------------------------------        |
|   ERR_EARNINGS_INVALID_EXPORT_FORMAT: received format=\"{value}\".               |
|   -----------------------------------------------------------------------        |
|                                                                                  |
|   -----------------------------------------------------------------------        |
|                                                                                  |
| **Recovery action:**                                                             |
|                                                                                  |
|   ---------------------------------------------------------------------          |
|   Set format=csv or format=pdf. If omitted, format defaults to csv.              |
|   ---------------------------------------------------------------------          |
|                                                                                  |
|   ---------------------------------------------------------------------          |
+==================================================================================+

+------------------------------------------------------------------------------------+
|   -------------------------------------------------------------------------------- |
|   **ERR_EARNINGS_EXPORT_TOO_LARGE**                        **HTTP 400**            |
|   -------------------------------------------------------- ----------------------- |
|   **Endpoint(s)**                                          GET /v1/earnings/export |
|                                                                                    |
|   **Trigger**                                              Row count for the       |
|                                                            requested export        |
|                                                            exceeds                 |
|                                                            EXPORT_ASYNC_MAX_ROWS   |
|                                                            (default 500,000).      |
|   -------------------------------------------------------------------------------- |
|                                                                                    |
| **User-facing message:**                                                           |
|                                                                                    |
|   ---------------------------------------------------------------------            |
|   Your export contains too many rows. Please narrow the date range,                |
|   apply filters (project, client, type, status), or reduce the time                |
|   period to under 500,000 entries.                                                 |
|   ---------------------------------------------------------------------            |
|                                                                                    |
|   ---------------------------------------------------------------------            |
|                                                                                    |
| **Internal log message:**                                                          |
|                                                                                    |
|   -----------------------------------------------------------------------          |
|   ERR_EARNINGS_EXPORT_TOO_LARGE: estimated rows={count} exceeds                    |
|   EXPORT_ASYNC_MAX_ROWS={limit}.                                                   |
|   -----------------------------------------------------------------------          |
|                                                                                    |
|   -----------------------------------------------------------------------          |
|                                                                                    |
| **Recovery action:**                                                               |
|                                                                                    |
| +---------------------------------------------------------------------+            |
| | Add a date range filter (e.g. dateRange=this_year instead of        |            |
| | all_time).                                                          |            |
| |                                                                     |            |
| | Filter by projectId, clientId, entryType, or status to reduce       |            |
| | scope.                                                              |            |
| |                                                                     |            |
| | If a full export is required, contact support for a direct DB       |            |
| | extract.                                                            |            |
| +=====================================================================+            |
+====================================================================================+

+----------------------------------------------------------------------------------+
|   ------------------------------------------------------------------------------ |
|   **ERR_EARNINGS_INVALID_ENTRY_TYPE**                      **HTTP 400**          |
|   -------------------------------------------------------- --------------------- |
|   **Endpoint(s)**                                          GET /v1/earnings \|   |
|                                                            GET                   |
|                                                            /v1/earnings/export   |
|                                                                                  |
|   **Trigger**                                              entryType filter is   |
|                                                            not \"automated\" or  |
|                                                            \"manual\".           |
|   ------------------------------------------------------------------------------ |
|                                                                                  |
| **User-facing message:**                                                         |
|                                                                                  |
|   ---------------------------------------------------------------------          |
|   The entryType filter must be automated or manual.                              |
|   ---------------------------------------------------------------------          |
|                                                                                  |
|   ---------------------------------------------------------------------          |
|                                                                                  |
| **Internal log message:**                                                        |
|                                                                                  |
|   -----------------------------------------------------------------------        |
|   ERR_EARNINGS_INVALID_ENTRY_TYPE: received entryType=\"{value}\".               |
|   -----------------------------------------------------------------------        |
|                                                                                  |
|   -----------------------------------------------------------------------        |
|                                                                                  |
| **Recovery action:**                                                             |
|                                                                                  |
|   ---------------------------------------------------------------------          |
|   Set entryType=automated or entryType=manual. If omitted, all entry             |
|   types are returned.                                                            |
|   ---------------------------------------------------------------------          |
|                                                                                  |
|   ---------------------------------------------------------------------          |
+==================================================================================+

+----------------------------------------------------------------------------------+
|   ------------------------------------------------------------------------------ |
|   **ERR_EARNINGS_INVALID_STATUS**                          **HTTP 400**          |
|   -------------------------------------------------------- --------------------- |
|   **Endpoint(s)**                                          GET /v1/earnings \|   |
|                                                            GET                   |
|                                                            /v1/earnings/export   |
|                                                                                  |
|   **Trigger**                                              status filter is not  |
|                                                            \"paid\", \"unpaid\", |
|                                                            or \"failed\".        |
|   ------------------------------------------------------------------------------ |
|                                                                                  |
| **User-facing message:**                                                         |
|                                                                                  |
|   ---------------------------------------------------------------------          |
|   The status filter must be paid, unpaid, or failed.                             |
|   ---------------------------------------------------------------------          |
|                                                                                  |
|   ---------------------------------------------------------------------          |
|                                                                                  |
| **Internal log message:**                                                        |
|                                                                                  |
|   -----------------------------------------------------------------------        |
|   ERR_EARNINGS_INVALID_STATUS: received status=\"{value}\".                      |
|   -----------------------------------------------------------------------        |
|                                                                                  |
|   -----------------------------------------------------------------------        |
|                                                                                  |
| **Recovery action:**                                                             |
|                                                                                  |
|   ---------------------------------------------------------------------          |
|   Set status to one of: paid, unpaid, failed. If omitted, all statuses           |
|   are returned.                                                                  |
|   ---------------------------------------------------------------------          |
|                                                                                  |
|   ---------------------------------------------------------------------          |
+==================================================================================+

+----------------------------------------------------------------------------------------------------+
|   ------------------------------------------------------------------------------------------------ |
|   **ERR_EARNINGS_ZERO_BALANCE_WITHDRAWAL**                 **HTTP 400**                            |
|   -------------------------------------------------------- --------------------------------------- |
|   **Endpoint(s)**                                          GET                                     |
|                                                            /v1/internal/earnings/balance/:userId   |
|                                                            (consumed by payout-service)            |
|                                                                                                    |
|   **Trigger**                                              payout-service calls the internal       |
|                                                            balance endpoint before a withdrawal    |
|                                                            attempt and the returned                |
|                                                            availableBalance is 0.00 or below the   |
|                                                            \$50 minimum payout threshold.          |
|                                                            payout-service returns this error to    |
|                                                            the contractor.                         |
|   ------------------------------------------------------------------------------------------------ |
|                                                                                                    |
| **User-facing message:**                                                                           |
|                                                                                                    |
|   ---------------------------------------------------------------------                            |
|   Your available balance is below the minimum withdrawal amount of                                 |
|   \$50. Earnings must be confirmed before they can be withdrawn.                                   |
|   ---------------------------------------------------------------------                            |
|                                                                                                    |
|   ---------------------------------------------------------------------                            |
|                                                                                                    |
| **Internal log message:**                                                                          |
|                                                                                                    |
|   -----------------------------------------------------------------------                          |
|   ERR_EARNINGS_ZERO_BALANCE_WITHDRAWAL: contractorId={id},                                         |
|   availableBalance={balance}, minimum=50.00.                                                       |
|   -----------------------------------------------------------------------                          |
|                                                                                                    |
|   -----------------------------------------------------------------------                          |
|                                                                                                    |
| **Recovery action:**                                                                               |
|                                                                                                    |
| +---------------------------------------------------------------------+                            |
| | This error is returned by payout-service using balance data from    |                            |
| | earnings-service.                                                   |                            |
| |                                                                     |                            |
| | earnings-service returns 200 with the real balance --- the 400 is   |                            |
| | raised by payout-service.                                           |                            |
| |                                                                     |                            |
| | Contractor must wait for additional confirmed earnings before       |                            |
| | attempting withdrawal.                                              |                            |
| |                                                                     |                            |
| | If balance appears incorrect, check balance_snapshots for the       |                            |
| | contractor and audit recent events.                                 |                            |
| +=====================================================================+                            |
+====================================================================================================+

# **4. 401 Unauthorized**

Authentication failures. The caller must obtain or refresh their
credentials before retrying.

+------------------------------------------------------------------------------+
|   -------------------------------------------------------------------------- |
|   **ERR_EARNINGS_AUTH_MISSING_TOKEN**                      **HTTP 401**      |
|   -------------------------------------------------------- ----------------- |
|   **Endpoint(s)**                                          All contractor    |
|                                                            endpoints under   |
|                                                            /v1/earnings/\*   |
|                                                                              |
|   **Trigger**                                              Authorization     |
|                                                            header is absent  |
|                                                            from the request. |
|   -------------------------------------------------------------------------- |
|                                                                              |
| **User-facing message:**                                                     |
|                                                                              |
|   ---------------------------------------------------------------------      |
|   Authentication is required. Please log in and try again.                   |
|   ---------------------------------------------------------------------      |
|                                                                              |
|   ---------------------------------------------------------------------      |
|                                                                              |
| **Internal log message:**                                                    |
|                                                                              |
|   -----------------------------------------------------------------------    |
|   ERR_EARNINGS_AUTH_MISSING_TOKEN: Authorization header missing on           |
|   {method} {url}.                                                            |
|   -----------------------------------------------------------------------    |
|                                                                              |
|   -----------------------------------------------------------------------    |
|                                                                              |
| **Recovery action:**                                                         |
|                                                                              |
|   ---------------------------------------------------------------------      |
|   Include Authorization: Bearer {jwt} header. Redirect to login if           |
|   token is not available.                                                    |
|   ---------------------------------------------------------------------      |
|                                                                              |
|   ---------------------------------------------------------------------      |
+==============================================================================+

+------------------------------------------------------------------------------+
|   -------------------------------------------------------------------------- |
|   **ERR_EARNINGS_AUTH_INVALID_TOKEN**                      **HTTP 401**      |
|   -------------------------------------------------------- ----------------- |
|   **Endpoint(s)**                                          All contractor    |
|                                                            endpoints under   |
|                                                            /v1/earnings/\*   |
|                                                                              |
|   **Trigger**                                              Authorization     |
|                                                            header is present |
|                                                            but the JWT is    |
|                                                            malformed, has an |
|                                                            invalid           |
|                                                            signature, or     |
|                                                            cannot be         |
|                                                            decoded.          |
|   -------------------------------------------------------------------------- |
|                                                                              |
| **User-facing message:**                                                     |
|                                                                              |
|   ---------------------------------------------------------------------      |
|   Your session token is invalid. Please log in again.                        |
|   ---------------------------------------------------------------------      |
|                                                                              |
|   ---------------------------------------------------------------------      |
|                                                                              |
| **Internal log message:**                                                    |
|                                                                              |
|   -----------------------------------------------------------------------    |
|   ERR_EARNINGS_AUTH_INVALID_TOKEN: JWT verification failed ---               |
|   {error.message}.                                                           |
|   -----------------------------------------------------------------------    |
|                                                                              |
|   -----------------------------------------------------------------------    |
|                                                                              |
| **Recovery action:**                                                         |
|                                                                              |
|   ---------------------------------------------------------------------      |
|   Discard the invalid token and redirect the user to the login page to       |
|   obtain a fresh JWT.                                                        |
|   ---------------------------------------------------------------------      |
|                                                                              |
|   ---------------------------------------------------------------------      |
+==============================================================================+

+------------------------------------------------------------------------------+
|   -------------------------------------------------------------------------- |
|   **ERR_EARNINGS_AUTH_TOKEN_EXPIRED**                      **HTTP 401**      |
|   -------------------------------------------------------- ----------------- |
|   **Endpoint(s)**                                          All contractor    |
|                                                            endpoints under   |
|                                                            /v1/earnings/\*   |
|                                                                              |
|   **Trigger**                                              JWT exp claim is  |
|                                                            in the past ---   |
|                                                            the token has     |
|                                                            expired.          |
|   -------------------------------------------------------------------------- |
|                                                                              |
| **User-facing message:**                                                     |
|                                                                              |
|   ---------------------------------------------------------------------      |
|   Your session has expired. Please log in again.                             |
|   ---------------------------------------------------------------------      |
|                                                                              |
|   ---------------------------------------------------------------------      |
|                                                                              |
| **Internal log message:**                                                    |
|                                                                              |
|   -----------------------------------------------------------------------    |
|   ERR_EARNINGS_AUTH_TOKEN_EXPIRED: JWT expired at {exp}, current time        |
|   {now}.                                                                     |
|   -----------------------------------------------------------------------    |
|                                                                              |
|   -----------------------------------------------------------------------    |
|                                                                              |
| **Recovery action:**                                                         |
|                                                                              |
| +---------------------------------------------------------------------+      |
| | If a refresh token is available, call the auth-service refresh      |      |
| | endpoint to obtain a new JWT.                                       |      |
| |                                                                     |      |
| | If no refresh token is available, redirect to login.                |      |
| |                                                                     |      |
| | Do not retry the original request with the expired token.           |      |
| +=====================================================================+      |
+==============================================================================+

+----------------------------------------------------------------------------------------------------+
|   ------------------------------------------------------------------------------------------------ |
|   **ERR_EARNINGS_INTERNAL_AUTH_INVALID**                   **HTTP 401**                            |
|   -------------------------------------------------------- --------------------------------------- |
|   **Endpoint(s)**                                          GET                                     |
|                                                            /v1/internal/earnings/balance/:userId   |
|                                                            \| GET                                  |
|                                                            /v1/internal/earnings/ytd/:userId       |
|                                                                                                    |
|   **Trigger**                                              X-Service-Token header is absent, does  |
|                                                            not match INTERNAL_SERVICE_TOKEN, or    |
|                                                            fails timing-safe comparison.           |
|   ------------------------------------------------------------------------------------------------ |
|                                                                                                    |
| **User-facing message:**                                                                           |
|                                                                                                    |
|   ---------------------------------------------------------------------                            |
|   Service authentication failed.                                                                   |
|   ---------------------------------------------------------------------                            |
|                                                                                                    |
|   ---------------------------------------------------------------------                            |
|                                                                                                    |
| **Internal log message:**                                                                          |
|                                                                                                    |
|   -----------------------------------------------------------------------                          |
|   ERR_EARNINGS_INTERNAL_AUTH_INVALID: X-Service-Token mismatch or missing                          |
|   on {method} {url} from {ip}.                                                                     |
|   -----------------------------------------------------------------------                          |
|                                                                                                    |
|   -----------------------------------------------------------------------                          |
|                                                                                                    |
| **Recovery action:**                                                                               |
|                                                                                                    |
| +---------------------------------------------------------------------+                            |
| | Internal callers (payout-service, kyc-identity-service) must        |                            |
| | include X-Service-Token header.                                     |                            |
| |                                                                     |                            |
| | Verify INTERNAL_SERVICE_TOKEN env var matches on both services.     |                            |
| |                                                                     |                            |
| | If token was recently rotated, ensure all callers received the new  |                            |
| | value before rotation.                                              |                            |
| |                                                                     |                            |
| | Check that the request is not accidentally hitting a public-facing  |                            |
| | API gateway route.                                                  |                            |
| +=====================================================================+                            |
+====================================================================================================+

# **5. 403 Forbidden**

Authorization failures. The caller is authenticated but does not have
permission for the requested resource or action.

+------------------------------------------------------------------------------+
|   -------------------------------------------------------------------------- |
|   **ERR_EARNINGS_WRONG_ROLE**                              **HTTP 403**      |
|   -------------------------------------------------------- ----------------- |
|   **Endpoint(s)**                                          All contractor    |
|                                                            endpoints under   |
|                                                            /v1/earnings/\*   |
|                                                                              |
|   **Trigger**                                              JWT is valid but  |
|                                                            the role claim is |
|                                                            not               |
|                                                            \"contractor\".   |
|                                                            e.g. a client or  |
|                                                            admin JWT is used |
|                                                            to call           |
|                                                            contractor        |
|                                                            earnings          |
|                                                            endpoints.        |
|   -------------------------------------------------------------------------- |
|                                                                              |
| **User-facing message:**                                                     |
|                                                                              |
|   ---------------------------------------------------------------------      |
|   You do not have permission to access this resource.                        |
|   ---------------------------------------------------------------------      |
|                                                                              |
|   ---------------------------------------------------------------------      |
|                                                                              |
| **Internal log message:**                                                    |
|                                                                              |
|   -----------------------------------------------------------------------    |
|   ERR_EARNINGS_WRONG_ROLE: JWT role=\"{role}\" is not \"contractor\" on      |
|   {method} {url}.                                                            |
|   -----------------------------------------------------------------------    |
|                                                                              |
|   -----------------------------------------------------------------------    |
|                                                                              |
| **Recovery action:**                                                         |
|                                                                              |
|   ---------------------------------------------------------------------      |
|   Earnings endpoints are contractor-only. Use a JWT with                     |
|   role=contractor. Internal or admin access uses the /v1/internal/\*         |
|   endpoints with X-Service-Token.                                            |
|   ---------------------------------------------------------------------      |
|                                                                              |
|   ---------------------------------------------------------------------      |
+==============================================================================+

+-------------------------------------------------------------------------------+
|   --------------------------------------------------------------------------- |
|   **ERR_EARNINGS_ENTRY_ACCESS_DENIED**                     **HTTP 403**       |
|   -------------------------------------------------------- ------------------ |
|   **Endpoint(s)**                                          GET                |
|                                                            /v1/earnings/:id   |
|                                                                               |
|   **Trigger**                                              The requested      |
|                                                            earnings entry     |
|                                                            exists but belongs |
|                                                            to a different     |
|                                                            contractor         |
|                                                            (contractorId in   |
|                                                            the record does    |
|                                                            not match the JWT  |
|                                                            sub claim).        |
|   --------------------------------------------------------------------------- |
|                                                                               |
| **User-facing message:**                                                      |
|                                                                               |
|   ---------------------------------------------------------------------       |
|   You do not have permission to view this earnings entry.                     |
|   ---------------------------------------------------------------------       |
|                                                                               |
|   ---------------------------------------------------------------------       |
|                                                                               |
| **Internal log message:**                                                     |
|                                                                               |
|   -----------------------------------------------------------------------     |
|   ERR_EARNINGS_ENTRY_ACCESS_DENIED: contractorId={jwtSub} attempted to        |
|   access entry {entryId} belonging to {entryContractorId}.                    |
|   -----------------------------------------------------------------------     |
|                                                                               |
|   -----------------------------------------------------------------------     |
|                                                                               |
| **Recovery action:**                                                          |
|                                                                               |
| +---------------------------------------------------------------------+       |
| | This is not an error in normal operation --- it means a contractor  |       |
| | is requesting another contractor\'s data.                           |       |
| |                                                                     |       |
| | Verify the entry ID in the URL is correct for the authenticated     |       |
| | contractor.                                                         |       |
| |                                                                     |       |
| | Log and review if this occurs repeatedly from the same contractor   |       |
| | ID --- potential enumeration attempt.                               |       |
| +=====================================================================+       |
+===============================================================================+

+----------------------------------------------------------------------------------------------------+
|   ------------------------------------------------------------------------------------------------ |
|   **ERR_EARNINGS_INTERNAL_NETWORK_EXPOSURE**               **HTTP 403**                            |
|   -------------------------------------------------------- --------------------------------------- |
|   **Endpoint(s)**                                          GET                                     |
|                                                            /v1/internal/earnings/balance/:userId   |
|                                                            \| GET                                  |
|                                                            /v1/internal/earnings/ytd/:userId       |
|                                                                                                    |
|   **Trigger**                                              An internal endpoint is reached from an |
|                                                            IP outside the trusted internal network |
|                                                            range (VPC / Docker internal network).  |
|                                                            Indicates misconfigured API gateway or  |
|                                                            network routing.                        |
|   ------------------------------------------------------------------------------------------------ |
|                                                                                                    |
| **User-facing message:**                                                                           |
|                                                                                                    |
|   ---------------------------------------------------------------------                            |
|   Access to this endpoint is not permitted from this network.                                      |
|   ---------------------------------------------------------------------                            |
|                                                                                                    |
|   ---------------------------------------------------------------------                            |
|                                                                                                    |
| **Internal log message:**                                                                          |
|                                                                                                    |
|   -----------------------------------------------------------------------                          |
|   ERR_EARNINGS_INTERNAL_NETWORK_EXPOSURE: internal endpoint accessed from                          |
|   external IP {ip}. This is a network misconfiguration ---                                         |
|   /v1/internal/\* must not be exposed via API Gateway.                                             |
|   -----------------------------------------------------------------------                          |
|                                                                                                    |
|   -----------------------------------------------------------------------                          |
|                                                                                                    |
| **Recovery action:**                                                                               |
|                                                                                                    |
| +---------------------------------------------------------------------+                            |
| | This should never occur in production. If it does, it indicates a   |                            |
| | critical network misconfiguration.                                  |                            |
| |                                                                     |                            |
| | Immediately verify API Gateway routing rules --- /v1/internal/\*    |                            |
| | must not be routable externally.                                    |                            |
| |                                                                     |                            |
| | Alert the infrastructure team.                                      |                            |
| |                                                                     |                            |
| | Block the requesting IP at the gateway level pending investigation. |                            |
| +=====================================================================+                            |
+====================================================================================================+

# **6. 404 Not Found**

Resource not found. The requested entity does not exist, has been
deleted, or has not yet been created.

+----------------------------------------------------------------------------------------------------+
|   ------------------------------------------------------------------------------------------------ |
|   **ERR_EARNINGS_BALANCE_NOT_FOUND**                       **HTTP 404**                            |
|   -------------------------------------------------------- --------------------------------------- |
|   **Endpoint(s)**                                          GET /v1/earnings/balance \| GET         |
|                                                            /v1/internal/earnings/balance/:userId   |
|                                                                                                    |
|   **Trigger**                                              No row exists in balance_snapshots for  |
|                                                            the requested contractorId. This occurs |
|                                                            for new contractors who have never had  |
|                                                            a transaction processed.                |
|   ------------------------------------------------------------------------------------------------ |
|                                                                                                    |
| **User-facing message:**                                                                           |
|                                                                                                    |
|   ---------------------------------------------------------------------                            |
|   Your earnings balance has not been calculated yet. This usually means                            |
|   no work has been tracked or billed yet. Your balance will appear here                            |
|   once your first billing is confirmed.                                                            |
|   ---------------------------------------------------------------------                            |
|                                                                                                    |
|   ---------------------------------------------------------------------                            |
|                                                                                                    |
| **Internal log message:**                                                                          |
|                                                                                                    |
|   -----------------------------------------------------------------------                          |
|   ERR_EARNINGS_BALANCE_NOT_FOUND: no balance_snapshots row for                                     |
|   contractorId={id}.                                                                               |
|   -----------------------------------------------------------------------                          |
|                                                                                                    |
|   -----------------------------------------------------------------------                          |
|                                                                                                    |
| **Recovery action:**                                                                               |
|                                                                                                    |
| +---------------------------------------------------------------------+                            |
| | For new contractors: this is expected --- balance is created on     |                            |
| | first transaction.created event (ES-04).                            |                            |
| |                                                                     |                            |
| | If the contractor has confirmed work and balance is still missing,  |                            |
| | check the consumer DLQ for failed transaction.created events.       |                            |
| |                                                                     |                            |
| | Internal callers (payout-service): treat 404 as                     |                            |
| | availableBalance=0.00 --- withdrawal should be blocked.             |                            |
| +=====================================================================+                            |
+====================================================================================================+

+-------------------------------------------------------------------------------+
|   --------------------------------------------------------------------------- |
|   **ERR_EARNINGS_ENTRY_NOT_FOUND**                         **HTTP 404**       |
|   -------------------------------------------------------- ------------------ |
|   **Endpoint(s)**                                          GET                |
|                                                            /v1/earnings/:id   |
|                                                                               |
|   **Trigger**                                              No earnings_cache  |
|                                                            row exists with    |
|                                                            the given id and   |
|                                                            contractorId       |
|                                                            combination.       |
|   --------------------------------------------------------------------------- |
|                                                                               |
| **User-facing message:**                                                      |
|                                                                               |
|   ---------------------------------------------------------------------       |
|   This earnings entry could not be found.                                     |
|   ---------------------------------------------------------------------       |
|                                                                               |
|   ---------------------------------------------------------------------       |
|                                                                               |
| **Internal log message:**                                                     |
|                                                                               |
|   -----------------------------------------------------------------------     |
|   ERR_EARNINGS_ENTRY_NOT_FOUND: no earnings_cache row for id={id},            |
|   contractorId={contractorId}.                                                |
|   -----------------------------------------------------------------------     |
|                                                                               |
|   -----------------------------------------------------------------------     |
|                                                                               |
| **Recovery action:**                                                          |
|                                                                               |
| +---------------------------------------------------------------------+       |
| | Verify the entry ID. Entry IDs are UUIDs from earnings_cache.id.    |       |
| |                                                                     |       |
| | The entry may have been for a different contractor --- if so, a 403 |       |
| | is returned instead.                                                |       |
| |                                                                     |       |
| | If the ID was obtained from the list endpoint recently, the entry   |       |
| | may have been reversed and purged (not current behaviour ---        |       |
| | reversed entries are retained).                                     |       |
| +=====================================================================+       |
+===============================================================================+

+------------------------------------------------------------------------------------------------+
|   -------------------------------------------------------------------------------------------- |
|   **ERR_EARNINGS_EXPORT_JOB_NOT_FOUND**                    **HTTP 404**                        |
|   -------------------------------------------------------- ----------------------------------- |
|   **Endpoint(s)**                                          GET                                 |
|                                                            /v1/earnings/export/status/:jobId   |
|                                                            (future status-polling endpoint)    |
|                                                                                                |
|   **Trigger**                                              A jobId from a prior 202 response   |
|                                                            is polled but the Bull job record   |
|                                                            no longer exists (removed after TTL |
|                                                            or manually purged).                |
|   -------------------------------------------------------------------------------------------- |
|                                                                                                |
| **User-facing message:**                                                                       |
|                                                                                                |
|   ---------------------------------------------------------------------                        |
|   This export job could not be found. It may have expired or been                              |
|   removed. Please start a new export.                                                          |
|   ---------------------------------------------------------------------                        |
|                                                                                                |
|   ---------------------------------------------------------------------                        |
|                                                                                                |
| **Internal log message:**                                                                      |
|                                                                                                |
|   -----------------------------------------------------------------------                      |
|   ERR_EARNINGS_EXPORT_JOB_NOT_FOUND: Bull job {jobId} not found in                             |
|   earnings-export queue.                                                                       |
|   -----------------------------------------------------------------------                      |
|                                                                                                |
|   -----------------------------------------------------------------------                      |
|                                                                                                |
| **Recovery action:**                                                                           |
|                                                                                                |
|   ---------------------------------------------------------------------                        |
|   Start a new export request. The original job result (if completed)                           |
|   may still be available in R2 if the file was uploaded before the job                         |
|   record expired.                                                                              |
|   ---------------------------------------------------------------------                        |
|                                                                                                |
|   ---------------------------------------------------------------------                        |
+================================================================================================+

+-----------------------------------------------------------------------------------+
|   ------------------------------------------------------------------------------- |
|   **ERR_EARNINGS_NO_DATA_IN_RANGE**                        **HTTP 404**           |
|   -------------------------------------------------------- ---------------------- |
|   **Endpoint(s)**                                          GET /v1/earnings \|    |
|                                                            GET                    |
|                                                            /v1/earnings/summary   |
|                                                            \| GET                 |
|                                                            /v1/earnings/export    |
|                                                                                   |
|   **Trigger**                                              The requested date     |
|                                                            range, filters, or     |
|                                                            combination thereof    |
|                                                            returns zero rows from |
|                                                            earnings_cache.        |
|   ------------------------------------------------------------------------------- |
|                                                                                   |
| **User-facing message:**                                                          |
|                                                                                   |
|   ---------------------------------------------------------------------           |
|   No earnings data was found for the selected period. Try adjusting the           |
|   date range or removing filters.                                                 |
|   ---------------------------------------------------------------------           |
|                                                                                   |
|   ---------------------------------------------------------------------           |
|                                                                                   |
| **Internal log message:**                                                         |
|                                                                                   |
|   -----------------------------------------------------------------------         |
|   ERR_EARNINGS_NO_DATA_IN_RANGE: zero rows for contractorId={id},                 |
|   dateRange={range}, filters={filters}.                                           |
|   -----------------------------------------------------------------------         |
|                                                                                   |
|   -----------------------------------------------------------------------         |
|                                                                                   |
| **Recovery action:**                                                              |
|                                                                                   |
| +---------------------------------------------------------------------+           |
| | Widen the date range (try all_time to confirm data exists at all).  |           |
| |                                                                     |           |
| | Remove optional filters (projectId, clientId, entryType, status)    |           |
| | one at a time.                                                      |           |
| |                                                                     |           |
| | If all_time also returns 0, confirm the contractor has confirmed    |           |
| | earnings in earnings_cache.                                         |           |
| +=====================================================================+           |
+===================================================================================+

# **7. 422 Unprocessable Entity**

The request is well-formed but cannot be processed in the current system
state. These errors indicate a business rule violation rather than a bad
request.

+-----------------------------------------------------------------------------------+
|   ------------------------------------------------------------------------------- |
|   **ERR_EARNINGS_FX_RATE_UNAVAILABLE**                     **HTTP 422**           |
|   -------------------------------------------------------- ---------------------- |
|   **Endpoint(s)**                                          GET                    |
|                                                            /v1/earnings/balance   |
|                                                            \| GET /v1/earnings \| |
|                                                            GET                    |
|                                                            /v1/earnings/summary   |
|                                                                                   |
|   **Trigger**                                              All three FX rate      |
|                                                            sources (primary       |
|                                                            fawazahmed0 API,       |
|                                                            Frankfurter fallback,  |
|                                                            and fx_rate_cache DB)  |
|                                                            are unavailable or     |
|                                                            return no result for   |
|                                                            the requested currency |
|                                                            pair AND no stale DB   |
|                                                            rate exists within     |
|                                                            FX_STALE_MAX_SECONDS   |
|                                                            (24h).                 |
|   ------------------------------------------------------------------------------- |
|                                                                                   |
| **User-facing message:**                                                          |
|                                                                                   |
|   ---------------------------------------------------------------------           |
|   Your balance could not be converted to your selected currency right             |
|   now. We are showing your balance in USD while currency data is being            |
|   restored. Please try again shortly.                                             |
|   ---------------------------------------------------------------------           |
|                                                                                   |
|   ---------------------------------------------------------------------           |
|                                                                                   |
| **Internal log message:**                                                         |
|                                                                                   |
|   -----------------------------------------------------------------------         |
|   ERR_EARNINGS_FX_RATE_UNAVAILABLE: all FX sources exhausted for                  |
|   {from}→{to}. Emergency rate 1.0 applied. Primary: {primaryUrl},                 |
|   Fallback: {fallbackUrl}, DB age: {ageSeconds}s.                                 |
|   -----------------------------------------------------------------------         |
|                                                                                   |
|   -----------------------------------------------------------------------         |
|                                                                                   |
| **Recovery action:**                                                              |
|                                                                                   |
| +---------------------------------------------------------------------+           |
| | Check fx-api container health: docker compose ps fx-api.            |           |
| |                                                                     |           |
| | Verify FX_API_URL is reachable from within the earnings-service     |           |
| | container.                                                          |           |
| |                                                                     |           |
| | Check fx_rate_cache table for the currency pair --- if last fetch   |           |
| | is \> 24h ago, the DB fallback is also exhausted.                   |           |
| |                                                                     |           |
| | If Frankfurter (public fallback) is also down, check outbound       |           |
| | network connectivity.                                               |           |
| |                                                                     |           |
| | While FX sources are down, the service returns emergency rate 1.0   |           |
| | --- amounts are shown in USD regardless of displayCurrency.         |           |
| +=====================================================================+           |
+===================================================================================+

+----------------------------------------------------------------------------------------------------+
|   ------------------------------------------------------------------------------------------------ |
|   **ERR_EARNINGS_BALANCE_STALE**                           **HTTP 422**                            |
|   -------------------------------------------------------- --------------------------------------- |
|   **Endpoint(s)**                                          GET                                     |
|                                                            /v1/internal/earnings/balance/:userId   |
|                                                            (consumed by payout-service)            |
|                                                                                                    |
|   **Trigger**                                              payout-service has a configurable       |
|                                                            staleness tolerance for the balance     |
|                                                            check before a payout. If               |
|                                                            balance_snapshots.updated_at is older   |
|                                                            than the tolerance window (configured   |
|                                                            in payout-service, not                  |
|                                                            earnings-service), payout-service may   |
|                                                            reject the payout. This error is        |
|                                                            returned by payout-service citing       |
|                                                            earnings-service data.                  |
|   ------------------------------------------------------------------------------------------------ |
|                                                                                                    |
| **User-facing message:**                                                                           |
|                                                                                                    |
|   ---------------------------------------------------------------------                            |
|   Your balance data is temporarily unavailable for verification. Please                            |
|   try again in a moment.                                                                           |
|   ---------------------------------------------------------------------                            |
|                                                                                                    |
|   ---------------------------------------------------------------------                            |
|                                                                                                    |
| **Internal log message:**                                                                          |
|                                                                                                    |
|   -----------------------------------------------------------------------                          |
|   ERR_EARNINGS_BALANCE_STALE: balance_snapshots.updated_at={updatedAt} is                          |
|   older than payout-service tolerance. contractorId={id}.                                          |
|   -----------------------------------------------------------------------                          |
|                                                                                                    |
|   -----------------------------------------------------------------------                          |
|                                                                                                    |
| **Recovery action:**                                                                               |
|                                                                                                    |
| +---------------------------------------------------------------------+                            |
| | earnings-service returns 200 with the actual updated_at timestamp   |                            |
| | --- this 422 is raised by payout-service.                           |                            |
| |                                                                     |                            |
| | Check whether recent transactions are being processed: verify       |                            |
| | consumer queues are not backed up.                                  |                            |
| |                                                                     |                            |
| | Check whether the balance_snapshots row is being updated: look for  |                            |
| | recent DEL events on balance:{contractorId} Redis key.              |                            |
| |                                                                     |                            |
| | If balance is legitimately stale due to consumer lag, the           |                            |
| | contractor should retry in 60 seconds.                              |                            |
| +=====================================================================+                            |
+====================================================================================================+

+------------------------------------------------------------------------------------------------+
|   -------------------------------------------------------------------------------------------- |
|   **ERR_EARNINGS_YTD_YEAR_OUT_OF_RANGE**                   **HTTP 422**                        |
|   -------------------------------------------------------- ----------------------------------- |
|   **Endpoint(s)**                                          GET                                 |
|                                                            /v1/internal/earnings/ytd/:userId   |
|                                                                                                |
|   **Trigger**                                              The year query parameter is before  |
|                                                            2020 (platform launch year) or more |
|                                                            than 1 year in the future.          |
|   -------------------------------------------------------------------------------------------- |
|                                                                                                |
| **User-facing message:**                                                                       |
|                                                                                                |
|   ---------------------------------------------------------------------                        |
|   The requested tax year is outside the supported range.                                       |
|   ---------------------------------------------------------------------                        |
|                                                                                                |
|   ---------------------------------------------------------------------                        |
|                                                                                                |
| **Internal log message:**                                                                      |
|                                                                                                |
|   -----------------------------------------------------------------------                      |
|   ERR_EARNINGS_YTD_YEAR_OUT_OF_RANGE: year={year}, accepted range                              |
|   2020--{currentYear+1}.                                                                       |
|   -----------------------------------------------------------------------                      |
|                                                                                                |
|   -----------------------------------------------------------------------                      |
|                                                                                                |
| **Recovery action:**                                                                           |
|                                                                                                |
|   ---------------------------------------------------------------------                        |
|   Supply a year between 2020 and the current calendar year. The current                        |
|   year is the default if year is omitted.                                                      |
|   ---------------------------------------------------------------------                        |
|                                                                                                |
|   ---------------------------------------------------------------------                        |
+================================================================================================+

# **8. 429 Too Many Requests**

Rate limiting errors. The caller has exceeded the allowed request
frequency. All 429 responses include a Retry-After header.

+-----------------------------------------------------------------------+
| **429 response headers**                                              |
|                                                                       |
| All 429 responses include:                                            |
|                                                                       |
| Retry-After: {seconds} --- integer seconds until the rate limit       |
| window resets                                                         |
|                                                                       |
| X-RateLimit-Limit: {n} --- total requests allowed in the window       |
|                                                                       |
| X-RateLimit-Remaining: 0 --- always 0 when 429 is returned            |
|                                                                       |
| X-RateLimit-Reset: {unix} --- Unix timestamp when the window resets   |
+=======================================================================+

+----------------------------------------------------------------------------------------------------+
|   ------------------------------------------------------------------------------------------------ |
|   **ERR_EARNINGS_INTERNAL_RATE_LIMIT**                     **HTTP 429**                            |
|   -------------------------------------------------------- --------------------------------------- |
|   **Endpoint(s)**                                          GET                                     |
|                                                            /v1/internal/earnings/balance/:userId   |
|                                                            \| GET                                  |
|                                                            /v1/internal/earnings/ytd/:userId       |
|                                                                                                    |
|   **Trigger**                                              Internal caller (payout-service or      |
|                                                            kyc-identity-service) exceeds the       |
|                                                            per-endpoint, per-IP sliding window     |
|                                                            rate limit. Default: 120 req/min for    |
|                                                            balance, 60 req/min for ytd (ES-03).    |
|   ------------------------------------------------------------------------------------------------ |
|                                                                                                    |
| **User-facing message:**                                                                           |
|                                                                                                    |
|   ---------------------------------------------------------------------                            |
|   Service rate limit exceeded. Please retry after the indicated delay.                             |
|   ---------------------------------------------------------------------                            |
|                                                                                                    |
|   ---------------------------------------------------------------------                            |
|                                                                                                    |
| **Internal log message:**                                                                          |
|                                                                                                    |
|   -----------------------------------------------------------------------                          |
|   ERR_EARNINGS_INTERNAL_RATE_LIMIT: {endpoint} rate limit exceeded for                             |
|   IP={ip}. Limit={limit}/min, window=60s. Retry-After={seconds}s.                                  |
|   -----------------------------------------------------------------------                          |
|                                                                                                    |
|   -----------------------------------------------------------------------                          |
|                                                                                                    |
| **Recovery action:**                                                                               |
|                                                                                                    |
| +---------------------------------------------------------------------+                            |
| | Internal callers must honour the Retry-After header.                |                            |
| |                                                                     |                            |
| | payout-service should cache the balance result for the duration     |                            |
| | indicated by Retry-After.                                           |                            |
| |                                                                     |                            |
| | If payout-service is hitting the limit consistently, increase       |                            |
| | INTERNAL_RATE_LIMIT_BALANCE via env var after capacity review.      |                            |
| |                                                                     |                            |
| | Do not retry immediately --- the sliding window will not reset      |                            |
| | until the indicated time.                                           |                            |
| +=====================================================================+                            |
+====================================================================================================+

+----------------------------------------------------------------------------------+
|   ------------------------------------------------------------------------------ |
|   **ERR_EARNINGS_EXPORT_RATE_LIMIT**                       **HTTP 429**          |
|   -------------------------------------------------------- --------------------- |
|   **Endpoint(s)**                                          GET                   |
|                                                            /v1/earnings/export   |
|                                                                                  |
|   **Trigger**                                              Contractor submits    |
|                                                            more than 3 export    |
|                                                            requests within a     |
|                                                            5-minute window.      |
|                                                            Prevents queue        |
|                                                            flooding by a single  |
|                                                            user.                 |
|   ------------------------------------------------------------------------------ |
|                                                                                  |
| **User-facing message:**                                                         |
|                                                                                  |
|   ---------------------------------------------------------------------          |
|   You have requested too many exports recently. Please wait a few                |
|   minutes before requesting another export.                                      |
|   ---------------------------------------------------------------------          |
|                                                                                  |
|   ---------------------------------------------------------------------          |
|                                                                                  |
| **Internal log message:**                                                        |
|                                                                                  |
|   -----------------------------------------------------------------------        |
|   ERR_EARNINGS_EXPORT_RATE_LIMIT: contractorId={id} exceeded 3 export            |
|   requests in 5 minutes. Retry-After={seconds}s.                                 |
|   -----------------------------------------------------------------------        |
|                                                                                  |
|   -----------------------------------------------------------------------        |
|                                                                                  |
| **Recovery action:**                                                             |
|                                                                                  |
| +---------------------------------------------------------------------+          |
| | Wait for the Retry-After duration (up to 5 minutes) before          |          |
| | submitting another export request.                                  |          |
| |                                                                     |          |
| | If the previous export was async (202), check for the download      |          |
| | notification before requesting again.                               |          |
| +=====================================================================+          |
+==================================================================================+

# **9. 500 Internal Server Error**

Unexpected failures in earnings-service itself. These always indicate a
bug or infrastructure problem. All 500 errors are logged at ERROR level
with full stack trace.

+-----------------------------------------------------------------------+
| **On-call procedure for 500 errors**                                  |
|                                                                       |
| Every 500 from earnings-service triggers an alert. Steps:             |
|                                                                       |
| 1\. Check logs: grep for the requestId from the error response.       |
|                                                                       |
| 2\. Check the DLQ: if a consumer caused the 500, messages will be in  |
| the DLQ.                                                              |
|                                                                       |
| 3\. Check Redis health: if Redis is down, some operations may behave  |
| unexpectedly.                                                         |
|                                                                       |
| 4\. Check DB connectivity: query balance_snapshots to verify DB is    |
| reachable.                                                            |
|                                                                       |
| 5\. If the error is intermittent, check recent deploy history ---     |
| last deploy may have introduced a regression.                         |
+=======================================================================+

+---------------------------------------------------------------------------+
|   ----------------------------------------------------------------------  |
|   **ERR_EARNINGS_DB_QUERY_FAILED**                         **HTTP 500**   |
|   -------------------------------------------------------- -------------  |
|   **Endpoint(s)**                                          Any endpoint   |
|                                                            that reads     |
|                                                            from the       |
|                                                            database       |
|                                                                           |
|   **Trigger**                                              TypeORM query  |
|                                                            throws an      |
|                                                            unexpected     |
|                                                            error:         |
|                                                            connection     |
|                                                            lost, query    |
|                                                            timeout,       |
|                                                            constraint     |
|                                                            violation not  |
|                                                            caught by      |
|                                                            consumer       |
|                                                            guards, or     |
|                                                            unexpected DB  |
|                                                            schema state.  |
|   ----------------------------------------------------------------------  |
|                                                                           |
| **User-facing message:**                                                  |
|                                                                           |
|   ---------------------------------------------------------------------   |
|   An error occurred while retrieving your earnings data. Our team has     |
|   been notified. Please try again in a moment.                            |
|   ---------------------------------------------------------------------   |
|                                                                           |
|   ---------------------------------------------------------------------   |
|                                                                           |
| **Internal log message:**                                                 |
|                                                                           |
|   ----------------------------------------------------------------------- |
|   ERR_EARNINGS_DB_QUERY_FAILED: TypeORM query error on                    |
|   {entity}.{operation} --- {error.message}. Stack: {stack}.               |
|   ----------------------------------------------------------------------- |
|                                                                           |
|   ----------------------------------------------------------------------- |
|                                                                           |
| **Recovery action:**                                                      |
|                                                                           |
| +---------------------------------------------------------------------+   |
| | Check PostgreSQL connectivity from the earnings-service container.  |   |
| |                                                                     |   |
| | Look for TypeORM connection pool exhaustion in logs (max pool size: |   |
| | 10 by default).                                                     |   |
| |                                                                     |   |
| | If the query involves balance_snapshots, check for table locks from |   |
| | a long-running transaction in ES-04 consumers.                      |   |
| |                                                                     |   |
| | Restart the service if connection pool is exhausted and connections |   |
| | are not being returned.                                             |   |
| +=====================================================================+   |
+===========================================================================+

+----------------------------------------------------------------------------------------+
|   ------------------------------------------------------------------------------------ |
|   **ERR_EARNINGS_CACHE_WRITE_CRITICAL**                    **HTTP 500**                |
|   -------------------------------------------------------- --------------------------- |
|   **Endpoint(s)**                                          Any endpoint that writes to |
|                                                            the balance cache           |
|                                                            post-DB-read                |
|                                                                                        |
|   **Trigger**                                              CacheService.setBalance()   |
|                                                            throws in a code path where |
|                                                            the error was not silently  |
|                                                            swallowed (should not occur |
|                                                            in current implementation   |
|                                                            --- setBalance is always    |
|                                                            try-caught). This error     |
|                                                            code indicates a            |
|                                                            programming error in the    |
|                                                            catch block.                |
|   ------------------------------------------------------------------------------------ |
|                                                                                        |
| **User-facing message:**                                                               |
|                                                                                        |
|   ---------------------------------------------------------------------                |
|   A temporary error occurred. Please try again.                                        |
|   ---------------------------------------------------------------------                |
|                                                                                        |
|   ---------------------------------------------------------------------                |
|                                                                                        |
| **Internal log message:**                                                              |
|                                                                                        |
|   -----------------------------------------------------------------------              |
|   ERR_EARNINGS_CACHE_WRITE_CRITICAL: unexpected throw from                             |
|   CacheService.setBalance --- this should be unreachable. Error:                       |
|   {error.message}. Stack: {stack}.                                                     |
|   -----------------------------------------------------------------------              |
|                                                                                        |
|   -----------------------------------------------------------------------              |
|                                                                                        |
| **Recovery action:**                                                                   |
|                                                                                        |
| +---------------------------------------------------------------------+                |
| | This should never occur --- cache writes are always try-caught and  |                |
| | logged as WARN, never rethrown.                                     |                |
| |                                                                     |                |
| | If seen, a code change has broken the try-catch in CacheService.    |                |
| | Review recent commits.                                              |                |
| |                                                                     |                |
| | Hotfix: ensure all CacheService methods swallow errors after        |                |
| | logging.                                                            |                |
| +=====================================================================+                |
+========================================================================================+

+-----------------------------------------------------------------------------------------------+
|   ------------------------------------------------------------------------------------------- |
|   **ERR_EARNINGS_R2_UPLOAD_FAILED**                        **HTTP 500**                       |
|   -------------------------------------------------------- ---------------------------------- |
|   **Endpoint(s)**                                          GET /v1/earnings/export (async     |
|                                                            path --- error surfaces in job     |
|                                                            failure, not HTTP response)        |
|                                                                                               |
|   **Trigger**                                              ExportProcessor.handleGenerate()   |
|                                                            fails to upload the generated file |
|                                                            to Cloudflare R2 after all Bull    |
|                                                            retry attempts (3 retries with     |
|                                                            exponential backoff) are           |
|                                                            exhausted.                         |
|   ------------------------------------------------------------------------------------------- |
|                                                                                               |
| **User-facing message:**                                                                      |
|                                                                                               |
|   ---------------------------------------------------------------------                       |
|   Your export could not be completed due to a storage error. Our team                         |
|   has been notified. Please try requesting the export again.                                  |
|   ---------------------------------------------------------------------                       |
|                                                                                               |
|   ---------------------------------------------------------------------                       |
|                                                                                               |
| **Internal log message:**                                                                     |
|                                                                                               |
|   -----------------------------------------------------------------------                     |
|   ERR_EARNINGS_R2_UPLOAD_FAILED: R2 PutObject failed for key={key} after                      |
|   {attempts} retries. Error: {error.message}.                                                 |
|   -----------------------------------------------------------------------                     |
|                                                                                               |
|   -----------------------------------------------------------------------                     |
|                                                                                               |
| **Recovery action:**                                                                          |
|                                                                                               |
| +---------------------------------------------------------------------+                       |
| | Check R2 credentials: verify R2_ACCESS_KEY_ID and                   |                       |
| | R2_SECRET_ACCESS_KEY are current and have write access to the       |                       |
| | bucket.                                                             |                       |
| |                                                                     |                       |
| | Check R2 bucket exists and is not at storage capacity.              |                       |
| |                                                                     |                       |
| | Verify FX_API_URL network connectivity --- R2 upload is the last    |                       |
| | step; earlier steps (file build) succeeded.                         |                       |
| |                                                                     |                       |
| | Retry the export manually from the UI after verifying R2            |                       |
| | connectivity.                                                       |                       |
| +=====================================================================+                       |
+===============================================================================================+

+----------------------------------------------------------------------------+
|   ------------------------------------------------------------------------ |
|   **ERR_EARNINGS_INTERNAL**                                **HTTP 500**    |
|   -------------------------------------------------------- --------------- |
|   **Endpoint(s)**                                          Any endpoint    |
|                                                            --- catch-all   |
|                                                            for unexpected  |
|                                                            exceptions      |
|                                                                            |
|   **Trigger**                                              An exception    |
|                                                            was thrown that |
|                                                            did not match   |
|                                                            any known       |
|                                                            EarningsError   |
|                                                            subclass.       |
|                                                            Typically a     |
|                                                            null pointer,   |
|                                                            unhandled       |
|                                                            Promise         |
|                                                            rejection, or   |
|                                                            library error.  |
|   ------------------------------------------------------------------------ |
|                                                                            |
| **User-facing message:**                                                   |
|                                                                            |
|   ---------------------------------------------------------------------    |
|   An unexpected error occurred. Our team has been notified. Please try     |
|   again.                                                                   |
|   ---------------------------------------------------------------------    |
|                                                                            |
|   ---------------------------------------------------------------------    |
|                                                                            |
| **Internal log message:**                                                  |
|                                                                            |
|   -----------------------------------------------------------------------  |
|   ERR_EARNINGS_INTERNAL: unhandled exception --- {error.message}. Stack:   |
|   {stack}.                                                                 |
|   -----------------------------------------------------------------------  |
|                                                                            |
|   -----------------------------------------------------------------------  |
|                                                                            |
| **Recovery action:**                                                       |
|                                                                            |
| +---------------------------------------------------------------------+    |
| | Search logs by requestId to find the full stack trace.              |    |
| |                                                                     |    |
| | If reproducible, add a test case to the integration test suite to   |    |
| | prevent regression.                                                 |    |
| |                                                                     |    |
| | Check recent deploys and roll back if the error correlates with a   |    |
| | specific deployment.                                                |    |
| +=====================================================================+    |
+============================================================================+

# **10. 503 Service Unavailable**

Downstream dependency failures that prevent earnings-service from
completing the request. The service itself is running, but a required
upstream service is not available.

+-----------------------------------------------------------------------------------------------+
|   ------------------------------------------------------------------------------------------- |
|   **ERR_EARNINGS_RABBITMQ_UNAVAILABLE**                    **HTTP 503**                       |
|   -------------------------------------------------------- ---------------------------------- |
|   **Endpoint(s)**                                          GET /v1/earnings/export (async     |
|                                                            path --- 202 response already      |
|                                                            sent; error surfaces in job        |
|                                                            failure)                           |
|                                                                                               |
|   **Trigger**                                              ExportProcessor.handleGenerate()   |
|                                                            cannot publish the                 |
|                                                            earnings.export.ready notification |
|                                                            event because the RabbitMQ         |
|                                                            connection is down.                |
|   ------------------------------------------------------------------------------------------- |
|                                                                                               |
| **User-facing message:**                                                                      |
|                                                                                               |
|   ---------------------------------------------------------------------                       |
|   Your export file is ready but the download notification could not be                        |
|   sent. Please check the Exports section of your dashboard for a                              |
|   download link, or contact support with your export job ID: {jobId}.                         |
|   ---------------------------------------------------------------------                       |
|                                                                                               |
|   ---------------------------------------------------------------------                       |
|                                                                                               |
| **Internal log message:**                                                                     |
|                                                                                               |
|   -----------------------------------------------------------------------                     |
|   ERR_EARNINGS_RABBITMQ_UNAVAILABLE: could not publish                                        |
|   earnings.export.ready for jobId={jobId} --- RabbitMQ connection error:                      |
|   {error.message}.                                                                            |
|   -----------------------------------------------------------------------                     |
|                                                                                               |
|   -----------------------------------------------------------------------                     |
|                                                                                               |
| **Recovery action:**                                                                          |
|                                                                                               |
| +---------------------------------------------------------------------+                       |
| | The export file was successfully uploaded to R2 before this error   |                       |
| | --- it is not lost.                                                 |                       |
| |                                                                     |                       |
| | Check RabbitMQ health: docker compose ps rabbitmq.                  |                       |
| |                                                                     |                       |
| | After RabbitMQ recovers, manually re-emit the earnings.export.ready |                       |
| | event with the stored jobId and R2 key.                             |                       |
| |                                                                     |                       |
| | The contractor can retrieve the presigned URL from the R2 bucket    |                       |
| | directly via support.                                               |                       |
| +=====================================================================+                       |
+===============================================================================================+

+---------------------------------------------------------------------------+
|   ----------------------------------------------------------------------- |
|   **ERR_EARNINGS_DB_UNAVAILABLE**                          **HTTP 503**   |
|   -------------------------------------------------------- -------------- |
|   **Endpoint(s)**                                          Any endpoint   |
|                                                            that requires  |
|                                                            a DB           |
|                                                            read-through   |
|                                                            (cache miss or |
|                                                            cache          |
|                                                            disabled)      |
|                                                                           |
|   **Trigger**                                              PostgreSQL     |
|                                                            connection is  |
|                                                            refused or     |
|                                                            times out.     |
|                                                            Occurs when    |
|                                                            the DB         |
|                                                            container is   |
|                                                            down, network  |
|                                                            routing is     |
|                                                            broken, or the |
|                                                            connection     |
|                                                            pool is fully  |
|                                                            exhausted for  |
|                                                            longer than    |
|                                                            the query      |
|                                                            timeout.       |
|   ----------------------------------------------------------------------- |
|                                                                           |
| **User-facing message:**                                                  |
|                                                                           |
|   ---------------------------------------------------------------------   |
|   The service is temporarily unavailable. Please try again in a few       |
|   moments.                                                                |
|   ---------------------------------------------------------------------   |
|                                                                           |
|   ---------------------------------------------------------------------   |
|                                                                           |
| **Internal log message:**                                                 |
|                                                                           |
|   ----------------------------------------------------------------------- |
|   ERR_EARNINGS_DB_UNAVAILABLE: PostgreSQL connection failed ---           |
|   {error.message}. TypeORM pool state: {active}/{max} connections.        |
|   ----------------------------------------------------------------------- |
|                                                                           |
|   ----------------------------------------------------------------------- |
|                                                                           |
| **Recovery action:**                                                      |
|                                                                           |
| +---------------------------------------------------------------------+   |
| | Check PostgreSQL container: docker compose ps postgres.             |   |
| |                                                                     |   |
| | Verify DATABASE_URL env var is correct and the host is reachable    |   |
| | from the earnings-service container.                                |   |
| |                                                                     |   |
| | If connection pool is exhausted, restart the service to reset       |   |
| | connections.                                                        |   |
| |                                                                     |   |
| | If Redis is available, cached balance reads will still succeed      |   |
| | during a DB outage --- only cache-miss requests will fail.          |   |
| +=====================================================================+   |
+===========================================================================+

+-----------------------------------------------------------------------------------+
|   ------------------------------------------------------------------------------- |
|   **ERR_EARNINGS_FX_ALL_SOURCES_DOWN**                     **HTTP 503**           |
|   -------------------------------------------------------- ---------------------- |
|   **Endpoint(s)**                                          GET                    |
|                                                            /v1/earnings/balance   |
|                                                            \| GET /v1/earnings    |
|                                                            (when displayCurrency  |
|                                                            conversion is          |
|                                                            required)              |
|                                                                                   |
|   **Trigger**                                              All FX sources are     |
|                                                            exhausted (primary     |
|                                                            API, Frankfurter       |
|                                                            fallback, DB stale     |
|                                                            cache) AND the         |
|                                                            requested currency is  |
|                                                            not USD. The service   |
|                                                            cannot return          |
|                                                            converted amounts with |
|                                                            any degree of          |
|                                                            accuracy.              |
|   ------------------------------------------------------------------------------- |
|                                                                                   |
| **User-facing message:**                                                          |
|                                                                                   |
|   ---------------------------------------------------------------------           |
|   Currency conversion data is temporarily unavailable. Your balance is            |
|   shown in USD until this is resolved. Please try again later for                 |
|   amounts in your selected currency.                                              |
|   ---------------------------------------------------------------------           |
|                                                                                   |
|   ---------------------------------------------------------------------           |
|                                                                                   |
| **Internal log message:**                                                         |
|                                                                                   |
|   -----------------------------------------------------------------------         |
|   ERR_EARNINGS_FX_ALL_SOURCES_DOWN: emergency rate applied for                    |
|   {from}→{to}. All sources down: primary={primaryDown},                           |
|   fallback={fallbackDown}, dbAge={dbAgeHours}h \> max={maxHours}h.                |
|   -----------------------------------------------------------------------         |
|                                                                                   |
|   -----------------------------------------------------------------------         |
|                                                                                   |
| **Recovery action:**                                                              |
|                                                                                   |
| +---------------------------------------------------------------------+           |
| | Note: this error does NOT prevent the response --- the service      |           |
| | returns 200 with USD amounts and a stale warning.                   |           |
| |                                                                     |           |
| | The 503 is reserved for future strict mode where stale rates are    |           |
| | unacceptable.                                                       |           |
| |                                                                     |           |
| | Currently the service degrades gracefully (emergency rate 1.0)      |           |
| | rather than returning 503.                                          |           |
| |                                                                     |           |
| | Check fx-api container and outbound network connectivity.           |           |
| |                                                                     |           |
| | Monitor fx_rate_cache table --- if all entries are stale by more    |           |
| | than 48h, escalate.                                                 |           |
| +=====================================================================+           |
+===================================================================================+

# **11. Complete Error Code Index**

Quick-reference alphabetical index of all 32 error codes. Copy this
table into the frontend error handler switch statement.

  ------------------------------------------------------------------------
  **Error Code**                                **HTTP**   **Section**
  --------------------------------------------- ---------- ---------------
  **ERR_EARNINGS_AUTH_INVALID_TOKEN**           401        §4

  **ERR_EARNINGS_AUTH_MISSING_TOKEN**           401        §4

  **ERR_EARNINGS_AUTH_TOKEN_EXPIRED**           401        §4

  **ERR_EARNINGS_BALANCE_NOT_FOUND**            404        §6

  **ERR_EARNINGS_BALANCE_STALE**                422        §7

  **ERR_EARNINGS_CACHE_WRITE_CRITICAL**         500        §9

  **ERR_EARNINGS_CURRENCY_NOT_SUPPORTED**       400        §3

  **ERR_EARNINGS_DB_QUERY_FAILED**              500        §9

  **ERR_EARNINGS_DB_UNAVAILABLE**               503        §10

  **ERR_EARNINGS_ENTRY_ACCESS_DENIED**          403        §5

  **ERR_EARNINGS_ENTRY_NOT_FOUND**              404        §6

  **ERR_EARNINGS_EXPORT_JOB_NOT_FOUND**         404        §6

  **ERR_EARNINGS_EXPORT_RATE_LIMIT**            429        §8

  **ERR_EARNINGS_EXPORT_TOO_LARGE**             400        §3

  **ERR_EARNINGS_FX_ALL_SOURCES_DOWN**          503        §10

  **ERR_EARNINGS_FX_RATE_UNAVAILABLE**          422        §7

  **ERR_EARNINGS_INTERNAL**                     500        §9

  **ERR_EARNINGS_INTERNAL_AUTH_INVALID**        401        §4

  **ERR_EARNINGS_INTERNAL_NETWORK_EXPOSURE**    403        §5

  **ERR_EARNINGS_INTERNAL_RATE_LIMIT**          429        §8

  **ERR_EARNINGS_INVALID_DATE_FORMAT**          400        §3

  **ERR_EARNINGS_INVALID_DATE_RANGE**           400        §3

  **ERR_EARNINGS_INVALID_ENTRY_TYPE**           400        §3

  **ERR_EARNINGS_INVALID_EXPORT_FORMAT**        400        §3

  **ERR_EARNINGS_INVALID_PAGE**                 400        §3

  **ERR_EARNINGS_INVALID_STATUS**               400        §3

  **ERR_EARNINGS_INVALID_VIEW**                 400        §3

  **ERR_EARNINGS_NO_DATA_IN_RANGE**             404        §6

  **ERR_EARNINGS_R2_UPLOAD_FAILED**             500        §9

  **ERR_EARNINGS_RABBITMQ_UNAVAILABLE**         503        §10

  **ERR_EARNINGS_WRONG_ROLE**                   403        §5

  **ERR_EARNINGS_YTD_YEAR_OUT_OF_RANGE**        422        §7

  **ERR_EARNINGS_ZERO_BALANCE_WITHDRAWAL**      400        §3
  ------------------------------------------------------------------------

# **12. Frontend Integration Notes**

+-----------------------------------------------------------------------+
| **Never switch on message --- always use errorCode**                  |
|                                                                       |
| message strings may be updated without a version bump (typo fixes,    |
| copy improvements).                                                   |
|                                                                       |
| errorCode strings are versioned and will never change without a major |
| version bump.                                                         |
|                                                                       |
| Correct: if (error.errorCode === \"ERR_EARNINGS_BALANCE_NOT_FOUND\")  |
| { \... }                                                              |
|                                                                       |
| Incorrect: if (error.message.includes(\"balance has not been          |
| calculated\")) { \... }                                               |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Recommended frontend error handler pattern**                        |
|                                                                       |
| // Map errorCode → user action                                        |
|                                                                       |
| const AUTH_ERRORS = \[\"ERR_EARNINGS_AUTH_MISSING_TOKEN\",            |
|                                                                       |
| \"ERR_EARNINGS_AUTH_INVALID_TOKEN\",                                  |
|                                                                       |
| \"ERR_EARNINGS_AUTH_TOKEN_EXPIRED\"\];                                |
|                                                                       |
| if (AUTH_ERRORS.includes(error.errorCode)) {                          |
|                                                                       |
| redirectToLogin();                                                    |
|                                                                       |
| } else if (error.errorCode === \"ERR_EARNINGS_BALANCE_NOT_FOUND\") {  |
|                                                                       |
| showEmptyBalanceState();                                              |
|                                                                       |
| } else if (error.errorCode === \"ERR_EARNINGS_FX_RATE_UNAVAILABLE\")  |
| {                                                                     |
|                                                                       |
| showBalanceInUsdWithWarning();                                        |
|                                                                       |
| } else if (error.statusCode === 429) {                                |
|                                                                       |
| scheduleRetry(error.retryAfterSeconds);                               |
|                                                                       |
| } else if (error.statusCode \>= 500) {                                |
|                                                                       |
| showGenericErrorWithRequestId(error.requestId);                       |
|                                                                       |
| } else {                                                              |
|                                                                       |
| showValidationError(error.message);                                   |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **13. References**

  -----------------------------------------------------------------------
  **Document**              **Relationship to ES-10**
  ------------------------- ---------------------------------------------
  **ES-02 --- Contractor    Source of 400, 401, 403, 404 errors on
  Endpoints**               contractor-facing routes

  **ES-03 --- Internal      Source of 401
  Endpoints**               (ERR_EARNINGS_INTERNAL_AUTH_INVALID) and 429
                            (ERR_EARNINGS_INTERNAL_RATE_LIMIT)

  **ES-06 --- Currency      Source of 422
  Conversion**              (ERR_EARNINGS_FX_RATE_UNAVAILABLE) and 503
                            (ERR_EARNINGS_FX_ALL_SOURCES_DOWN)

  **ES-09 --- Export        Source of 400 export errors, 429 export rate
  Endpoint**                limit, 500 R2 upload failure, 503 RabbitMQ
                            unavailable
  -----------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
earnings-service ES-10 \| v1.0
