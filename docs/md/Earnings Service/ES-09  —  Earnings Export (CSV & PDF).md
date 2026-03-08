**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**earnings-service**

**ES-09 --- Earnings Export (CSV & PDF)**

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Service**         earnings-service

  **Document**        ES-09 --- Earnings Export (CSV & PDF)

  **Version**         1.0

  **Status**          Draft --- Awaiting Engineering Review

  **Sync threshold**  5,000 rows --- below this, file is generated inline
                      and streamed directly

  **Async storage**   Cloudflare R2 (S3-compatible) --- bucket:
                      marketeq-exports

  **Download link     24 hours --- presigned R2 URL, expires after first
  TTL**               access or 24h

  **Export formats**  CSV, PDF

  **Prerequisites**   ES-00, ES-01, ES-02, ES-06, ES-08

  **Next Document**   ES-10 --- Pagination & Filtering Deep Dive
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Purpose**                                                           |
|                                                                       |
| Defines the earnings export endpoint and everything needed to         |
| implement it end-to-end.                                              |
|                                                                       |
| Two execution paths:                                                  |
|                                                                       |
| Synchronous (\< 5,000 rows) --- file built in memory, streamed in     |
| HTTP response.                                                        |
|                                                                       |
| Response headers: Content-Type, Content-Disposition, X-Row-Count.     |
|                                                                       |
| No job queue, no R2, no notification.                                 |
|                                                                       |
| Asynchronous (\>= 5,000 rows) --- 202 Accepted returned immediately.  |
|                                                                       |
| Background Bull job generates the file, uploads to R2.                |
|                                                                       |
| notification-service sends a download link to the contractor.         |
|                                                                       |
| Link expires after 24 hours.                                          |
|                                                                       |
| Covered: endpoint spec, sync and async implementation, export field   |
| definitions,                                                          |
|                                                                       |
| column headers for CSV and PDF, date formatting rules, R2 upload,     |
| presigned URL                                                         |
|                                                                       |
| generation, job queue setup, notification event payload, and          |
| verification.                                                         |
|                                                                       |
| Not covered: notification-service email/in-app rendering, R2 bucket   |
| creation,                                                             |
|                                                                       |
| Bull queue infrastructure setup (covered in ES-00 infrastructure      |
| doc).                                                                 |
+=======================================================================+

# **1. Prerequisites**

  -----------------------------------------------------------------------
  **Requirement**                      **Reference**
  ------------------------------------ ----------------------------------
  **ES-01 --- earnings_cache table     Must be migrated
  with all columns queried during      
  export**                             

  **ES-02 --- EarningsService exists;  Implement first
  export reuses date-range resolution  
  and filter logic**                   

  **ES-06 --- CurrencyService for      Implement first
  display amount conversion in         
  exports**                            

  **ES-08 --- Fee field definitions    Column definitions in export match
  and feeLabel construction**          ES-08 labels

  **Cloudflare R2 bucket               See §3
  marketeq-exports created, R2\_\* env 
  vars configured**                    

  **Bull queue infrastructure          See §3 --- Bull uses existing
  (Redis-backed) running**             REDIS_URL
  -----------------------------------------------------------------------

# **2. Folder Placement**

+-----------------------------------------------------------------------+
| plaintext                                                             |
+-----------------------------------------------------------------------+
| apps/earnings-service/src/                                            |
|                                                                       |
| ├─ export/                                                            |
|                                                                       |
| │ ├─ export.module.ts ← ES-09 NEW                                     |
|                                                                       |
| │ ├─ export.controller.ts ← ES-09 NEW                                 |
|                                                                       |
| │ ├─ export.service.ts ← ES-09 NEW (orchestration + sync path)        |
|                                                                       |
| │ ├─ export.processor.ts ← ES-09 NEW (Bull job processor for async    |
| path)                                                                 |
|                                                                       |
| │ ├─ r2.service.ts ← ES-09 NEW (Cloudflare R2 upload + presign)       |
|                                                                       |
| │ ├─ csv.builder.ts ← ES-09 NEW (CSV generation)                      |
|                                                                       |
| │ └─ pdf.builder.ts ← ES-09 NEW (PDF generation)                      |
|                                                                       |
| └─ app.module.ts updated §11 --- adds ExportModule                    |
+=======================================================================+

# **3. Environment Variables**

  -------------------------------------------------------------------------------------------------
  **Variable**                   **Required**   **Default**        **Description**
  ------------------------------ -------------- ------------------ --------------------------------
  **R2_ACCOUNT_ID**              Yes            ---                Cloudflare account ID. Found in
                                                                   Cloudflare dashboard.

  **R2_ACCESS_KEY_ID**           Yes            ---                R2 API token access key. Scoped
                                                                   to marketeq-exports bucket,
                                                                   Object Read & Write.

  **R2_SECRET_ACCESS_KEY**       Yes            ---                R2 API token secret.

  **R2_BUCKET_NAME**             No             marketeq-exports   R2 bucket name for all export
                                                                   files.

  **R2_PUBLIC_ENDPOINT**         No             ---                Custom domain for R2 bucket if
                                                                   configured. Used to build
                                                                   download URLs. If absent,
                                                                   presigned endpoint is derived
                                                                   from ACCOUNT_ID.

  **EXPORT_LINK_TTL_SECONDS**    No             86400              Presigned URL TTL. Default 24
                                                                   hours. The R2 object itself is
                                                                   not deleted --- only the
                                                                   presigned URL expires.

  **EXPORT_SYNC_ROW_LIMIT**      No             5000               Maximum rows for synchronous
                                                                   export. Requests above this
                                                                   threshold are queued
                                                                   asynchronously.

  **EXPORT_ASYNC_MAX_ROWS**      No             500000             Hard cap on async export row
                                                                   count. Requests above this are
                                                                   rejected with 400.

  **EXPORT_R2_RETENTION_DAYS**   No             30                 Number of days before R2 objects
                                                                   are eligible for lifecycle
                                                                   deletion. Managed via R2
                                                                   lifecycle rules --- not enforced
                                                                   in code.
  -------------------------------------------------------------------------------------------------

# **4. Endpoint Specification**

  -------------------------------------------------------------------------
  **GET**   **/v1/earnings/export**                      JWT Bearer ---
                                                         contractor
  --------- -------------------------------------------- ------------------

  -------------------------------------------------------------------------

## **4.1 Query Parameters**

  ----------------------------------------------------------------------------------------
  **Parameter**   **Type**   **Default**       **Validation**      **Description**
  --------------- ---------- ----------------- ------------------- -----------------------
  **format**      string     csv               \"csv\" or \"pdf\"  Output file format.

  **dateRange**   string     all_time          Same 10 presets as  Date range preset. Use
                                               GET /v1/earnings    custom with
                                               (ES-02)             startDate/endDate for a
                                                                   precise range.

  **startDate**   date       ---               YYYY-MM-DD.         Inclusive start date
                  string                       Required when       (UTC).
                                               dateRange=custom.   

  **endDate**     date       ---               YYYY-MM-DD.         Inclusive end date
                  string                       Required when       (UTC).
                                               dateRange=custom.   
                                               Must be \>=         
                                               startDate.          

  **currency**    string     displayCurrency   ISO 4217            Currency for all
                             from JWT                              display amounts in the
                                                                   export. Defaults to the
                                                                   contractor\'s
                                                                   displayCurrency.

  **projectId**   UUID       ---               Optional filter     Limit export to one
                                                                   project.

  **clientId**    UUID       ---               Optional filter     Limit export to one
                                                                   client.

  **entryType**   string     ---               \"automated\" or    Filter by entry type.
                                               \"manual\"          

  **status**      string     ---               \"paid\",           Filter by payment
                                               \"unpaid\",         status.
                                               \"failed\"          
  ----------------------------------------------------------------------------------------

## **4.2 Response paths**

  ----------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Condition**             **HTTP     **Response body**                                                                  **Headers**
                            status**                                                                                      
  ------------------------- ---------- ---------------------------------------------------------------------------------- ----------------------------------------
  **Row count \<            200 OK     Raw file bytes streamed directly                                                   Content-Type: text/csv or
  EXPORT_SYNC_ROW_LIMIT                                                                                                   application/pdf \| Content-Disposition:
  (5000)**                                                                                                                attachment;
                                                                                                                          filename=\"earnings-{YYYY-MM-DD}.csv\"
                                                                                                                          \| X-Row-Count: {n} \| X-Export-Mode:
                                                                                                                          sync

  **Row count \>=           202        {\"jobId\":\"uuid\",\"status\":\"queued\",\"estimatedRows\":N,\"message\":\"Your   X-Export-Mode: async
  EXPORT_SYNC_ROW_LIMIT**   Accepted   export is being prepared. You will receive a download link by notification when it 
                                       is ready.\"}                                                                       

  **Row count \>            400 Bad    {\"statusCode\":400,\"message\":\"Export exceeds maximum row limit of 500000.      ---
  EXPORT_ASYNC_MAX_ROWS     Request    Narrow your date range or apply filters.\"}                                        
  (500000)**                                                                                                              

  **format not \"csv\" or   400 Bad    {\"statusCode\":400,\"message\":\"format must be csv or pdf\"}                     ---
  \"pdf\"**                 Request                                                                                       
  ----------------------------------------------------------------------------------------------------------------------------------------------------------------

# **5. Export Field Definitions**

These are the canonical column definitions for both CSV and PDF exports.
The column order is fixed and must not be changed between versions.
Adding columns is permitted at the end only --- insertions break
existing spreadsheet formulas in customer workflows.

  -------------------------------------------------------------------------------------------------------
  **\#**   **Column header**  **Source field**                       **Format**      **Notes**
  -------- ------------------ -------------------------------------- --------------- --------------------
  **1**    Date               workStartAt                            YYYY-MM-DD      Work start date only
                                                                     (UTC)           --- time omitted
                                                                                     from CSV/PDF for
                                                                                     readability

  **2**    Day                workStartAt                            Full weekday    Derived from
                                                                     name: Monday,   workStartAt UTC date
                                                                     Tuesday...      

  **3**    Project            contractLabelCache.projectName         String          Falls back to
                                                                                     \"---\" if no
                                                                                     project label cached
                                                                                     (ES-04
                                                                                     contract.activated
                                                                                     consumer)

  **4**    Client             contractLabelCache.clientDisplayName   String          Falls back to
                                                                                     \"---\" if no client
                                                                                     label cached

  **5**    Contract           contractLabelCache.contractTitle       String          Falls back to
                                                                                     \"---\" if no
                                                                                     contract title
                                                                                     cached

  **6**    Task               taskId label (future)                  String          Reserved ---
                                                                                     currently \"---\"
                                                                                     for all rows. taskId
                                                                                     lookup not yet
                                                                                     implemented.

  **7**    Type               entryType                              Automated or    DB value
                                                                     Manual          \"screenshot\" maps
                                                                                     to \"Automated\";
                                                                                     \"manual\" maps to
                                                                                     \"Manual\"

  **8**    Start Time         workStartAt                            HH:MM (24h,     Time component of
                                                                     UTC)            workStartAt

  **9**    End Time           workEndAt                              HH:MM (24h,     Time component of
                                                                     UTC)            workEndAt

  **10**   Duration           durationMinutes                        Xh Ym           e.g. 2h 15m. If
                                                                                     durationMinutes \<
                                                                                     60, show as \"Ym\"
                                                                                     only (e.g. \"45m\")

  **11**   Keyboard %         avgKeyboardPct                         N% or ---       Integer percentage.
                                                                                     \"---\" for manual
                                                                                     entries or null
                                                                                     values

  **12**   Mouse %            avgMousePct                            N% or ---       Integer percentage.
                                                                                     \"---\" for manual
                                                                                     entries or null
                                                                                     values

  **13**   Gross              grossAmount + currency                 N.NN            Full precision raw
           (rateCurrency)                                                            value. Header
                                                                                     includes currency
                                                                                     code: e.g. \"Gross
                                                                                     (USD)\"

  **14**   Fee (rateCurrency) feeAmount + feePercent                 N.NN (X.X%)     Raw value. Header:
                                                                                     e.g. \"Fee (USD,
                                                                                     20.0%)\".
                                                                                     Parenthetical shows
                                                                                     fee percent.

  **15**   Net (rateCurrency) netAmount + currency                   N.NN            Raw value. Header:
                                                                                     e.g. \"Net (USD)\"

  **16**   FX Rate (to USD)   fxRateToUsd                            N.NNNNNNNN      8 decimal places.
                                                                                     \"1.00000000\" when
                                                                                     rateCurrency = USD

  **17**   Net (USD)          netAmountUsd                           N.NN            Full precision.
                                                                                     Always USD
                                                                                     regardless of export
                                                                                     currency param.

  **18**   Display Amount     netAmountUsd → displayCurrency         Whole integer   Net converted to
                                                                                     export currency
                                                                                     (param). Rounded per
                                                                                     ES-06 rounding
                                                                                     rules.

  **19**   Display Currency   export currency param                  ISO 4217 string e.g. \"INR\". Same
                                                                                     value repeated on
                                                                                     every row.

  **20**   Status             status                                 Confirmed,      DB \"confirmed\" →
                                                                     Reversed        \"Confirmed\"; DB
                                                                                     \"reversed\" →
                                                                                     \"Reversed\"

  **21**   Entry ID           id                                     UUID string     The
                                                                                     earnings_cache.id.
                                                                                     For customer
                                                                                     reference and
                                                                                     support lookup.
  -------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Date & time formatting rules**                                      |
|                                                                       |
| All dates and times: UTC. No timezone conversion is applied in        |
| exports.                                                              |
|                                                                       |
| A footnote is added to the CSV header row and PDF document header:    |
|                                                                       |
| \"All dates and times are in UTC.\"                                   |
|                                                                       |
| Date column (col 1): YYYY-MM-DD e.g. 2025-06-10                       |
|                                                                       |
| Day column (col 2): Full weekday name e.g. Tuesday                    |
|                                                                       |
| Time columns (8, 9): HH:MM 24-hour e.g. 09:00, 14:30                  |
|                                                                       |
| Duration (col 10): Xh Ym e.g. 2h 15m, 45m, 1h 0m                      |
|                                                                       |
| Never use locale-specific date formats (MM/DD/YYYY or DD/MM/YYYY).    |
|                                                                       |
| ISO 8601 (YYYY-MM-DD) is the only acceptable format for date columns. |
+=======================================================================+

# **6. CSV Builder**

### **src/export/csv.builder.ts**

+------------------------------------------------------------------------------------------------------------+
| typescript                                                                                                 |
+------------------------------------------------------------------------------------------------------------+
| // src/export/csv.builder.ts                                                                               |
|                                                                                                            |
| // Builds a CSV Buffer from a rows array. No external CSV library required.                                |
|                                                                                                            |
| // RFC 4180 compliant: CRLF line endings, fields with commas/quotes/newlines escaped.                      |
|                                                                                                            |
| import { EarningsCache } from \'../entities/earnings-cache.entity\';                                       |
|                                                                                                            |
| import { ContractLabelCache } from \'../entities/contract-label-cache.entity\';                            |
|                                                                                                            |
| const CRLF = \'\\r\\n\';                                                                                   |
|                                                                                                            |
| // CSV escape: wrap in double-quotes if the field contains comma, quote, or newline.                       |
|                                                                                                            |
| function esc(v: string \| number \| null \| undefined): string {                                           |
|                                                                                                            |
| const s = v == null ? \'---\' : String(v);                                                                 |
|                                                                                                            |
| if (s.includes(\',\') \|\| s.includes(\'\"\') \|\| s.includes(\'\\n\') \|\| s.includes(\'\\r\')) {         |
|                                                                                                            |
| return \'\"\' + s.replace(/\"/g, \'\"\"\') + \'\"\';                                                       |
|                                                                                                            |
| }                                                                                                          |
|                                                                                                            |
| return s;                                                                                                  |
|                                                                                                            |
| }                                                                                                          |
|                                                                                                            |
| function fmtDate(d: Date): string {                                                                        |
|                                                                                                            |
| return d.toISOString().slice(0, 10); // YYYY-MM-DD                                                         |
|                                                                                                            |
| }                                                                                                          |
|                                                                                                            |
| function fmtDay(d: Date): string {                                                                         |
|                                                                                                            |
| return                                                                                                     |
| \[\'Sunday\',\'Monday\',\'Tuesday\',\'Wednesday\',\'Thursday\',\'Friday\',\'Saturday\'\]\[d.getUTCDay()\]; |
|                                                                                                            |
| }                                                                                                          |
|                                                                                                            |
| function fmtTime(d: Date): string {                                                                        |
|                                                                                                            |
| return d.toISOString().slice(11, 16); // HH:MM                                                             |
|                                                                                                            |
| }                                                                                                          |
|                                                                                                            |
| function fmtDuration(minutes: number): string {                                                            |
|                                                                                                            |
| if (minutes \< 60) return \`\${minutes}m\`;                                                                |
|                                                                                                            |
| const h = Math.floor(minutes / 60);                                                                        |
|                                                                                                            |
| const m = minutes % 60;                                                                                    |
|                                                                                                            |
| return \`\${h}h \${m}m\`;                                                                                  |
|                                                                                                            |
| }                                                                                                          |
|                                                                                                            |
| function fmtStatus(s: string): string {                                                                    |
|                                                                                                            |
| return s === \'confirmed\' ? \'Confirmed\' : s === \'reversed\' ? \'Reversed\' : s;                        |
|                                                                                                            |
| }                                                                                                          |
|                                                                                                            |
| function fmtType(t: string): string {                                                                      |
|                                                                                                            |
| return t === \'screenshot\' ? \'Automated\' : \'Manual\';                                                  |
|                                                                                                            |
| }                                                                                                          |
|                                                                                                            |
| export interface CsvBuildOptions {                                                                         |
|                                                                                                            |
| rows: EarningsCache\[\];                                                                                   |
|                                                                                                            |
| labels: Map\<string, ContractLabelCache\>;                                                                 |
|                                                                                                            |
| displayCurrency: string;                                                                                   |
|                                                                                                            |
| displayAmounts: Map\<string, string\>; // entryId → converted whole-unit amount                            |
|                                                                                                            |
| contractorName?: string;                                                                                   |
|                                                                                                            |
| exportedAt: Date;                                                                                          |
|                                                                                                            |
| }                                                                                                          |
|                                                                                                            |
| export function buildCsv(opts: CsvBuildOptions): Buffer {                                                  |
|                                                                                                            |
| const { rows, labels, displayCurrency, displayAmounts } = opts;                                            |
|                                                                                                            |
| // Derive rateCurrency from first row (all rows in a single export share currency).                        |
|                                                                                                            |
| // If rows span multiple currencies, column headers use \'rateCurrency\' as placeholder.                   |
|                                                                                                            |
| const firstRow = rows\[0\];                                                                                |
|                                                                                                            |
| const rateCurrency = firstRow?.currency ?? \'USD\';                                                        |
|                                                                                                            |
| const feePercent = firstRow && parseFloat(firstRow.grossAmount) \> 0                                       |
|                                                                                                            |
| ? ((parseFloat(firstRow.feeAmount) / parseFloat(firstRow.grossAmount)) \* 100).toFixed(1)                  |
|                                                                                                            |
| : \'20.0\';                                                                                                |
|                                                                                                            |
| // Column headers (21 columns --- fixed order per §5).                                                     |
|                                                                                                            |
| const headers = \[                                                                                         |
|                                                                                                            |
| \'Date\', \'Day\', \'Project\', \'Client\', \'Contract\', \'Task\', \'Type\',                              |
|                                                                                                            |
| \'Start Time\', \'End Time\', \'Duration\', \'Keyboard %\', \'Mouse %\',                                   |
|                                                                                                            |
| \`Gross (\${rateCurrency})\`,                                                                              |
|                                                                                                            |
| \`Fee (\${rateCurrency}, \${feePercent}%)\`,                                                               |
|                                                                                                            |
| \`Net (\${rateCurrency})\`,                                                                                |
|                                                                                                            |
| \'FX Rate (to USD)\', \'Net (USD)\',                                                                       |
|                                                                                                            |
| \`Display Amount\`, \'Display Currency\',                                                                  |
|                                                                                                            |
| \'Status\', \'Entry ID\',                                                                                  |
|                                                                                                            |
| \];                                                                                                        |
|                                                                                                            |
| const lines: string\[\] = \[\];                                                                            |
|                                                                                                            |
| // Metadata header (2 lines before column row).                                                            |
|                                                                                                            |
| lines.push(\`# Marketeq Earnings Export --- \${opts.contractorName ?? \'Contractor\'}\`);                  |
|                                                                                                            |
| lines.push(\`# Generated: \${opts.exportedAt.toISOString()} UTC --- All dates and times are in UTC.\`);    |
|                                                                                                            |
| lines.push(\'\');                                                                                          |
|                                                                                                            |
| lines.push(headers.map(esc).join(\',\'));                                                                  |
|                                                                                                            |
| for (const row of rows) {                                                                                  |
|                                                                                                            |
| const label = labels.get(row.contractId ?? \'\');                                                          |
|                                                                                                            |
| const start = new Date(row.workStartAt);                                                                   |
|                                                                                                            |
| const end = new Date(row.workEndAt);                                                                       |
|                                                                                                            |
| lines.push(\[                                                                                              |
|                                                                                                            |
| fmtDate(start),                                                                                            |
|                                                                                                            |
| fmtDay(start),                                                                                             |
|                                                                                                            |
| label?.projectName ?? \'---\',                                                                             |
|                                                                                                            |
| label?.clientDisplayName ?? \'---\',                                                                       |
|                                                                                                            |
| label?.contractTitle ?? \'---\',                                                                           |
|                                                                                                            |
| \'---\', // Task --- reserved                                                                              |
|                                                                                                            |
| fmtType(row.entryType),                                                                                    |
|                                                                                                            |
| fmtTime(start),                                                                                            |
|                                                                                                            |
| fmtTime(end),                                                                                              |
|                                                                                                            |
| fmtDuration(row.durationMinutes),                                                                          |
|                                                                                                            |
| row.avgKeyboardPct != null ? \`\${row.avgKeyboardPct}%\` : \'---\',                                        |
|                                                                                                            |
| row.avgMousePct != null ? \`\${row.avgMousePct}%\` : \'---\',                                              |
|                                                                                                            |
| row.grossAmount,                                                                                           |
|                                                                                                            |
| row.feeAmount,                                                                                             |
|                                                                                                            |
| row.netAmount,                                                                                             |
|                                                                                                            |
| row.fxRateToUsd,                                                                                           |
|                                                                                                            |
| row.netAmountUsd,                                                                                          |
|                                                                                                            |
| displayAmounts.get(row.id) ?? \'---\',                                                                     |
|                                                                                                            |
| displayCurrency,                                                                                           |
|                                                                                                            |
| fmtStatus(row.status),                                                                                     |
|                                                                                                            |
| row.id,                                                                                                    |
|                                                                                                            |
| \].map(esc).join(\',\'));                                                                                  |
|                                                                                                            |
| }                                                                                                          |
|                                                                                                            |
| return Buffer.from(lines.join(CRLF) + CRLF, \'utf8\');                                                     |
|                                                                                                            |
| }                                                                                                          |
+============================================================================================================+

# **7. PDF Builder**

PDF exports use pdfkit to produce a structured, print-ready document.
The PDF is a simplified version of the CSV --- it does not include raw
rateCurrency columns or the FX rate column because those are too wide
for A4 landscape layout. A footer note directs the contractor to use CSV
for full data.

  ------------------------------------------------------------------------
  **PDF column**        **CSV equivalent** **Notes**
  --------------------- ------------------ -------------------------------
  **Date**              col 1              YYYY-MM-DD

  **Type**              col 7              Automated or Manual

  **Project**           col 3              

  **Duration**          col 10             Xh Ym

  **Gross (currency)**  col 13             rateCurrency value

  **Fee**               col 14             rateCurrency value + fee %

  **Net (currency)**    col 15             rateCurrency value

  **Display Amount**    col 18             Whole unit in displayCurrency

  **Status**            col 20             Confirmed or Reversed
  ------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **PDF layout spec**                                                   |
|                                                                       |
| Paper: A4 landscape (297mm × 210mm)                                   |
|                                                                       |
| Font: Helvetica (built-in pdfkit font --- no external font files      |
| needed)                                                               |
|                                                                       |
| Header: \"Marketeq Earnings Export\" --- contractor name --- date     |
| range --- generated timestamp                                         |
|                                                                       |
| Footer: Page N of M --- \"All dates and times are in UTC.\" ---       |
| \"Full data available in CSV export.\"                                |
|                                                                       |
| Table: alternating row shading (#F7F8FA on even rows)                 |
|                                                                       |
| Totals row at bottom: sum of Gross, Fee, Net, Display Amount columns  |
|                                                                       |
| Reversed rows: row text in grey (#999999) with \"(Reversed)\"         |
| appended to Status column                                             |
+=======================================================================+

### **src/export/pdf.builder.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/export/pdf.builder.ts                                          |
|                                                                       |
| // Builds a PDF Buffer using pdfkit.                                  |
|                                                                       |
| // Install: npm install pdfkit \@types/pdfkit                         |
|                                                                       |
| import PDFDocument from \'pdfkit\';                                   |
|                                                                       |
| import { EarningsCache } from \'../entities/earnings-cache.entity\';  |
|                                                                       |
| import { ContractLabelCache } from                                    |
| \'../entities/contract-label-cache.entity\';                          |
|                                                                       |
| const PAGE = { size: \'A4\', layout: \'landscape\', margin: 36 };     |
|                                                                       |
| const COL_W = \[68, 62, 120, 62, 62, 62, 72, 80, 68\]; // px widths   |
| for 9 columns                                                         |
|                                                                       |
| const HEADERS = \[\'Date\',\'Type\',\'Project\',\'Duration\',         |
|                                                                       |
| \'Gross\',\'Fee\',\'Net\',\'Display Amount\',\'Status\'\];            |
|                                                                       |
| export interface PdfBuildOptions {                                    |
|                                                                       |
| rows: EarningsCache\[\];                                              |
|                                                                       |
| labels: Map\<string, ContractLabelCache\>;                            |
|                                                                       |
| displayCurrency: string;                                              |
|                                                                       |
| displayAmounts: Map\<string, string\>;                                |
|                                                                       |
| contractorName?: string;                                              |
|                                                                       |
| dateRangeLabel: string;                                               |
|                                                                       |
| exportedAt: Date;                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| export function buildPdf(opts: PdfBuildOptions): Promise\<Buffer\> {  |
|                                                                       |
| return new Promise((resolve, reject) =\> {                            |
|                                                                       |
| const doc = new PDFDocument({ \...PAGE, autoFirstPage: true,          |
| bufferPages: true });                                                 |
|                                                                       |
| const chunks: Buffer\[\] = \[\];                                      |
|                                                                       |
| doc.on(\'data\', c =\> chunks.push(c));                               |
|                                                                       |
| doc.on(\'end\', () =\> resolve(Buffer.concat(chunks)));               |
|                                                                       |
| doc.on(\'error\', reject);                                            |
|                                                                       |
| const { rows, labels, displayCurrency, displayAmounts } = opts;       |
|                                                                       |
| const firstRow = rows\[0\];                                           |
|                                                                       |
| const rateCurrency = firstRow?.currency ?? \'USD\';                   |
|                                                                       |
| const feePercent = firstRow && parseFloat(firstRow.grossAmount) \> 0  |
|                                                                       |
| ? ((parseFloat(firstRow.feeAmount) /                                  |
| parseFloat(firstRow.grossAmount)) \* 100).toFixed(1)                  |
|                                                                       |
| : \'20.0\';                                                           |
|                                                                       |
| // ── Document header ─────────────────────────────────────────       |
|                                                                       |
| doc.fontSize(16).fillColor(\'#1B3A6B\').font(\'Helvetica-Bold\')      |
|                                                                       |
| .text(\'Marketeq Earnings Export\', PAGE.margin, PAGE.margin);        |
|                                                                       |
| doc.fontSize(9).fillColor(\'#333333\').font(\'Helvetica\')            |
|                                                                       |
| .text(\`Contractor: \${opts.contractorName ?? \'N/A\'} Period:        |
| \${opts.dateRangeLabel} Generated:                                    |
| \${opts.exportedAt.toISOString().slice(0,10)} UTC\`,                  |
|                                                                       |
| PAGE.margin, PAGE.margin + 22);                                       |
|                                                                       |
| doc.fontSize(8).fillColor(\'#999999\')                                |
|                                                                       |
| .text(\'All dates and times are in UTC.\', PAGE.margin, PAGE.margin + |
| 34);                                                                  |
|                                                                       |
| // ── Column headers ───────────────────────────────────────────      |
|                                                                       |
| let y = PAGE.margin + 52;                                             |
|                                                                       |
| let x = PAGE.margin;                                                  |
|                                                                       |
| doc.rect(x, y, COL_W.reduce((a,b)=\>a+b,0), 18).fill(\'#1B3A6B\');    |
|                                                                       |
| const colHeaders = \[\...HEADERS\];                                   |
|                                                                       |
| colHeaders\[4\] = \`Gross (\${rateCurrency})\`;                       |
|                                                                       |
| colHeaders\[5\] = \`Fee (\${feePercent}%)\`;                          |
|                                                                       |
| colHeaders\[6\] = \`Net (\${rateCurrency})\`;                         |
|                                                                       |
| colHeaders\[7\] = \`Amount (\${displayCurrency})\`;                   |
|                                                                       |
| doc.fontSize(7.5).fillColor(\'#FFFFFF\').font(\'Helvetica-Bold\');    |
|                                                                       |
| for (let i = 0; i \< colHeaders.length; i++) {                        |
|                                                                       |
| doc.text(colHeaders\[i\], x + 3, y + 5, { width: COL_W\[i\] - 4,      |
| lineBreak: false });                                                  |
|                                                                       |
| x += COL_W\[i\];                                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| y += 18;                                                              |
|                                                                       |
| // ── Data rows ────────────────────────────────────────────────      |
|                                                                       |
| let grossTotal = 0; let feeTotal = 0; let netTotal = 0; let dispTotal |
| = 0;                                                                  |
|                                                                       |
| rows.forEach((row, ri) =\> {                                          |
|                                                                       |
| if (y \> doc.page.height - 60) { doc.addPage(); y = PAGE.margin; }    |
|                                                                       |
| const label = labels.get(row.contractId ?? \'\');                     |
|                                                                       |
| const reversed = row.status === \'reversed\';                         |
|                                                                       |
| const rowColor = reversed ? \'#999999\' : \'#333333\';                |
|                                                                       |
| const bgColor = ri % 2 === 0 ? \'#FFFFFF\' : \'#F7F8FA\';             |
|                                                                       |
| const rowW = COL_W.reduce((a,b)=\>a+b,0);                             |
|                                                                       |
| doc.rect(PAGE.margin, y, rowW, 14).fill(bgColor);                     |
|                                                                       |
| const start = new Date(row.workStartAt);                              |
|                                                                       |
| const dispAmt = displayAmounts.get(row.id) ?? \'---\';                |
|                                                                       |
| const project = label?.projectName ?? \'---\';                        |
|                                                                       |
| const dur = (() =\> {                                                 |
|                                                                       |
| const m = row.durationMinutes;                                        |
|                                                                       |
| return m \< 60 ? \`\${m}m\` : \`\${Math.floor(m/60)}h \${m%60}m\`;    |
|                                                                       |
| })();                                                                 |
|                                                                       |
| const cells = \[                                                      |
|                                                                       |
| start.toISOString().slice(0,10),                                      |
|                                                                       |
| row.entryType === \'screenshot\' ? \'Automated\' : \'Manual\',        |
|                                                                       |
| project.length \> 18 ? project.slice(0,16)+\'...\' : project,         |
|                                                                       |
| dur,                                                                  |
|                                                                       |
| row.grossAmount,                                                      |
|                                                                       |
| row.feeAmount,                                                        |
|                                                                       |
| row.netAmount,                                                        |
|                                                                       |
| dispAmt,                                                              |
|                                                                       |
| reversed ? \'Reversed\' : \'Confirmed\',                              |
|                                                                       |
| \];                                                                   |
|                                                                       |
| if (!reversed) {                                                      |
|                                                                       |
| grossTotal += parseFloat(row.grossAmount);                            |
|                                                                       |
| feeTotal += parseFloat(row.feeAmount);                                |
|                                                                       |
| netTotal += parseFloat(row.netAmount);                                |
|                                                                       |
| dispTotal += parseFloat(dispAmt) \|\| 0;                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| doc.fontSize(7.5).fillColor(rowColor).font(\'Helvetica\');            |
|                                                                       |
| x = PAGE.margin;                                                      |
|                                                                       |
| for (let i = 0; i \< cells.length; i++) {                             |
|                                                                       |
| doc.text(cells\[i\], x + 3, y + 3, { width: COL_W\[i\] - 4,           |
| lineBreak: false });                                                  |
|                                                                       |
| x += COL_W\[i\];                                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| y += 14;                                                              |
|                                                                       |
| });                                                                   |
|                                                                       |
| // ── Totals row ───────────────────────────────────────────────      |
|                                                                       |
| y += 4;                                                               |
|                                                                       |
| const rowW = COL_W.reduce((a,b)=\>a+b,0);                             |
|                                                                       |
| doc.rect(PAGE.margin, y, rowW, 16).fill(\'#EBF4FA\');                 |
|                                                                       |
| doc.fontSize(7.5).fillColor(\'#1B3A6B\').font(\'Helvetica-Bold\');    |
|                                                                       |
| const totals = \[\'TOTAL\',\'\',\'\',\'\'                             |
|                                                                       |
| , grossTotal.toFixed(2), feeTotal.toFixed(2), netTotal.toFixed(2)     |
|                                                                       |
| , String(Math.round(dispTotal)), \'\'\];                              |
|                                                                       |
| x = PAGE.margin;                                                      |
|                                                                       |
| for (let i = 0; i \< totals.length; i++) {                            |
|                                                                       |
| doc.text(totals\[i\], x + 3, y + 4, { width: COL_W\[i\] - 4,          |
| lineBreak: false });                                                  |
|                                                                       |
| x += COL_W\[i\];                                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ── Page footers ─────────────────────────────────────────────      |
|                                                                       |
| const pageCount = doc.bufferedPageRange().count;                      |
|                                                                       |
| for (let i = 0; i \< pageCount; i++) {                                |
|                                                                       |
| doc.switchToPage(i);                                                  |
|                                                                       |
| doc.fontSize(7).fillColor(\'#999999\').font(\'Helvetica\')            |
|                                                                       |
| .text(\`Page \${i+1} of \${pageCount} \| All dates and times are in   |
| UTC. \| Full data (including raw amounts and FX rates) available in   |
| CSV export.\`,                                                        |
|                                                                       |
| PAGE.margin, doc.page.height - 24, { width: 750, align: \'center\'    |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| doc.end();                                                            |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **8. R2 Service --- Cloudflare R2 Upload & Presigned URLs**

### **src/export/r2.service.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/export/r2.service.ts                                           |
|                                                                       |
| // Cloudflare R2 via \@aws-sdk/client-s3 (R2 is S3-compatible).       |
|                                                                       |
| // Install: npm install \@aws-sdk/client-s3                           |
| \@aws-sdk/s3-request-presigner                                        |
|                                                                       |
| import { Injectable, Logger } from \'@nestjs/common\';                |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import { S3Client, PutObjectCommand, HeadObjectCommand } from         |
| \'@aws-sdk/client-s3\';                                               |
|                                                                       |
| import { getSignedUrl } from \'@aws-sdk/s3-request-presigner\';       |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class R2Service {                                              |
|                                                                       |
| private readonly logger = new Logger(R2Service.name);                 |
|                                                                       |
| private readonly s3: S3Client;                                        |
|                                                                       |
| private readonly bucket: string;                                      |
|                                                                       |
| private readonly linkTtl:number;                                      |
|                                                                       |
| constructor(private readonly config: ConfigService) {                 |
|                                                                       |
| const accountId = this.config.get\<string\>(\'R2_ACCOUNT_ID\');       |
|                                                                       |
| this.bucket = this.config.get(\'R2_BUCKET_NAME\',                     |
| \'marketeq-exports\');                                                |
|                                                                       |
| this.linkTtl = parseInt(this.config.get(\'EXPORT_LINK_TTL_SECONDS\',  |
| \'86400\'), 10);                                                      |
|                                                                       |
| this.s3 = new S3Client({                                              |
|                                                                       |
| region: \'auto\',                                                     |
|                                                                       |
| endpoint: \`https://\${accountId}.r2.cloudflarestorage.com\`,         |
|                                                                       |
| credentials: {                                                        |
|                                                                       |
| accessKeyId: this.config.get\<string\>(\'R2_ACCESS_KEY_ID\'),         |
|                                                                       |
| secretAccessKey: this.config.get\<string\>(\'R2_SECRET_ACCESS_KEY\'), |
|                                                                       |
| },                                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Upload a file Buffer to R2.                                        |
|                                                                       |
| // Returns the R2 object key (path inside the bucket).                |
|                                                                       |
| async upload(opts: {                                                  |
|                                                                       |
| key: string; // e.g. \'exports/{contractorId}/{jobId}.csv\'           |
|                                                                       |
| body: Buffer;                                                         |
|                                                                       |
| contentType: string; // \'text/csv\' or \'application/pdf\'           |
|                                                                       |
| metadata?: Record\<string, string\>;                                  |
|                                                                       |
| }): Promise\<string\> {                                               |
|                                                                       |
| await this.s3.send(new PutObjectCommand({                             |
|                                                                       |
| Bucket: this.bucket,                                                  |
|                                                                       |
| Key: opts.key,                                                        |
|                                                                       |
| Body: opts.body,                                                      |
|                                                                       |
| ContentType: opts.contentType,                                        |
|                                                                       |
| Metadata: opts.metadata ?? {},                                        |
|                                                                       |
| }));                                                                  |
|                                                                       |
| this.logger.log(\`R2 upload: \${this.bucket}/\${opts.key}             |
| (\${opts.body.length} bytes)\`);                                      |
|                                                                       |
| return opts.key;                                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Generate a presigned GET URL for an existing R2 object.            |
|                                                                       |
| // URL expires after EXPORT_LINK_TTL_SECONDS (default 24h).           |
|                                                                       |
| async presign(key: string): Promise\<string\> {                       |
|                                                                       |
| const cmd = new HeadObjectCommand({ Bucket: this.bucket, Key: key }); |
|                                                                       |
| // Verify object exists before presigning.                            |
|                                                                       |
| await this.s3.send(cmd);                                              |
|                                                                       |
| const url = await getSignedUrl(                                       |
|                                                                       |
| this.s3,                                                              |
|                                                                       |
| new PutObjectCommand({ Bucket: this.bucket, Key: key }),              |
|                                                                       |
| { expiresIn: this.linkTtl },                                          |
|                                                                       |
| );                                                                    |
|                                                                       |
| return url;                                                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Build the canonical R2 object key for an export job.               |
|                                                                       |
| // Format: exports/{contractorId}/{YYYY-MM-DD}/{jobId}.{ext}          |
|                                                                       |
| buildKey(contractorId: string, jobId: string, format:                 |
| \'csv\'\|\'pdf\', date: Date): string {                               |
|                                                                       |
| const dateStr = date.toISOString().slice(0, 10);                      |
|                                                                       |
| return \`exports/\${contractorId}/\${dateStr}/\${jobId}.\${format}\`; |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **9. ExportService --- Orchestration**

### **src/export/export.service.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/export/export.service.ts                                       |
|                                                                       |
| import { Injectable, BadRequestException } from \'@nestjs/common\';   |
|                                                                       |
| import { InjectQueue } from \'@nestjs/bull\';                         |
|                                                                       |
| import { Queue } from \'bull\';                                       |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import { InjectRepository } from \'@nestjs/typeorm\';                 |
|                                                                       |
| import { Repository } from \'typeorm\';                               |
|                                                                       |
| import { Response } from \'express\';                                 |
|                                                                       |
| import { randomUUID } from \'crypto\';                                |
|                                                                       |
| import { EarningsCache } from \'../entities/earnings-cache.entity\';  |
|                                                                       |
| import { ContractLabelCache } from                                    |
| \'../entities/contract-label-cache.entity\';                          |
|                                                                       |
| import { CurrencyService } from \'../currency/currency.service\';     |
|                                                                       |
| import { EarningsService } from \'../earnings/earnings.service\';     |
|                                                                       |
| import { buildCsv } from \'./csv.builder\';                           |
|                                                                       |
| import { buildPdf } from \'./pdf.builder\';                           |
|                                                                       |
| import { R2Service } from \'./r2.service\';                           |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class ExportService {                                          |
|                                                                       |
| private readonly syncLimit: number;                                   |
|                                                                       |
| private readonly asyncMax: number;                                    |
|                                                                       |
| private readonly linkTtlSec: number;                                  |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| private readonly config: ConfigService,                               |
|                                                                       |
| private readonly earningsSvc: EarningsService,                        |
|                                                                       |
| private readonly currencySvc: CurrencyService,                        |
|                                                                       |
| private readonly r2: R2Service,                                       |
|                                                                       |
| \@InjectQueue(\'earnings-export\') private readonly queue: Queue,     |
|                                                                       |
| \@InjectRepository(EarningsCache)                                     |
|                                                                       |
| private readonly ecRepo: Repository\<EarningsCache\>,                 |
|                                                                       |
| \@InjectRepository(ContractLabelCache)                                |
|                                                                       |
| private readonly lblRepo: Repository\<ContractLabelCache\>,           |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| this.syncLimit = parseInt(this.config.get(\'EXPORT_SYNC_ROW_LIMIT\',  |
| \'5000\'), 10);                                                       |
|                                                                       |
| this.asyncMax = parseInt(this.config.get(\'EXPORT_ASYNC_MAX_ROWS\',   |
| \'500000\'), 10);                                                     |
|                                                                       |
| this.linkTtlSec =                                                     |
| parseInt(this.config.get(\'EXPORT_LINK_TTL_SECONDS\',\'86400\'), 10); |
|                                                                       |
| }                                                                     |
|                                                                       |
| async export(contractorId: string, query: ExportQueryDto, res:        |
| Response): Promise\<void\> {                                          |
|                                                                       |
| const count = await this.countRows(contractorId, query);              |
|                                                                       |
| if (count \> this.asyncMax) {                                         |
|                                                                       |
| throw new BadRequestException(                                        |
|                                                                       |
| \`Export exceeds maximum row limit of \${this.asyncMax}. Narrow your  |
| date range or apply filters.\`,                                       |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| if (count \>= this.syncLimit) {                                       |
|                                                                       |
| // Async path --- queue a Bull job.                                   |
|                                                                       |
| const jobId = randomUUID();                                           |
|                                                                       |
| await this.queue.add(\'generate\', { contractorId, query, jobId }, {  |
|                                                                       |
| attempts: 3,                                                          |
|                                                                       |
| backoff: { type: \'exponential\', delay: 2000 },                      |
|                                                                       |
| removeOnComplete: false, // keep job record for status polling        |
|                                                                       |
| removeOnFail: false,                                                  |
|                                                                       |
| });                                                                   |
|                                                                       |
| res.status(202).json({                                                |
|                                                                       |
| jobId,                                                                |
|                                                                       |
| status: \'queued\',                                                   |
|                                                                       |
| estimatedRows: count,                                                 |
|                                                                       |
| message: \'Your export is being prepared. You will receive a download |
| link by notification when it is ready.\',                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| return;                                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Sync path --- build and stream the file.                           |
|                                                                       |
| const { buffer, filename } = await this.buildFile(contractorId,       |
| query);                                                               |
|                                                                       |
| const contentType = query.format === \'pdf\' ? \'application/pdf\' :  |
| \'text/csv\';                                                         |
|                                                                       |
| res.setHeader(\'Content-Type\', contentType);                         |
|                                                                       |
| res.setHeader(\'Content-Disposition\', \`attachment;                  |
| filename=\"\${filename}\"\`);                                         |
|                                                                       |
| res.setHeader(\'Content-Length\', buffer.length);                     |
|                                                                       |
| res.setHeader(\'X-Row-Count\', String(count));                        |
|                                                                       |
| res.setHeader(\'X-Export-Mode\', \'sync\');                           |
|                                                                       |
| res.status(200).end(buffer);                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Shared by both sync path and async job processor.                  |
|                                                                       |
| async buildFile(contractorId: string, query: ExportQueryDto):         |
| Promise\<{buffer: Buffer; filename: string}\> {                       |
|                                                                       |
| const rows = await this.fetchRows(contractorId, query);               |
|                                                                       |
| const labels = await this.fetchLabels(rows);                          |
|                                                                       |
| const dispAmts = await this.buildDisplayAmounts(rows, query.currency  |
| ?? \'USD\');                                                          |
|                                                                       |
| const exportedAt = new Date();                                        |
|                                                                       |
| const dateStr = exportedAt.toISOString().slice(0, 10);                |
|                                                                       |
| const filename = \`earnings-\${dateStr}.\${query.format ??            |
| \'csv\'}\`;                                                           |
|                                                                       |
| const dateRangeLabel = query.dateRange ?? \'all_time\';               |
|                                                                       |
| let buffer: Buffer;                                                   |
|                                                                       |
| if (query.format === \'pdf\') {                                       |
|                                                                       |
| buffer = await buildPdf({ rows, labels, displayCurrency:              |
| query.currency ?? \'USD\',                                            |
|                                                                       |
| displayAmounts: dispAmts, dateRangeLabel, exportedAt });              |
|                                                                       |
| } else {                                                              |
|                                                                       |
| buffer = buildCsv({ rows, labels, displayCurrency: query.currency ??  |
| \'USD\',                                                              |
|                                                                       |
| displayAmounts: dispAmts, exportedAt });                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| return { buffer, filename };                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| private async countRows(contractorId: string, query: ExportQueryDto): |
| Promise\<number\> {                                                   |
|                                                                       |
| const qb = this.ecRepo.createQueryBuilder(\'ec\')                     |
|                                                                       |
| .where(\'ec.contractorId = :id\', { id: contractorId });              |
|                                                                       |
| this.applyFilters(qb, query);                                         |
|                                                                       |
| return qb.getCount();                                                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| private async fetchRows(contractorId: string, query: ExportQueryDto): |
| Promise\<EarningsCache\[\]\> {                                        |
|                                                                       |
| const qb = this.ecRepo.createQueryBuilder(\'ec\')                     |
|                                                                       |
| .where(\'ec.contractorId = :id\', { id: contractorId })               |
|                                                                       |
| .orderBy(\'ec.workStartAt\', \'ASC\');                                |
|                                                                       |
| this.applyFilters(qb, query);                                         |
|                                                                       |
| return qb.getMany();                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| private applyFilters(qb: any, query: ExportQueryDto): void {          |
|                                                                       |
| // Reuses the same date range resolution from EarningsService         |
| (ES-02).                                                              |
|                                                                       |
| const { from, to } = this.earningsSvc.resolveDateRange(query);        |
|                                                                       |
| if (from) qb.andWhere(\'ec.workStartAt \>= :from\', { from });        |
|                                                                       |
| if (to) qb.andWhere(\'ec.workStartAt \<= :to\', { to });              |
|                                                                       |
| if (query.projectId) qb.andWhere(\'ec.projectId = :pid\', { pid:      |
| query.projectId });                                                   |
|                                                                       |
| if (query.clientId) qb.andWhere(\'ec.contractId IN (SELECT id FROM    |
| contract_label_cache WHERE client_id = :cid)\', { cid: query.clientId |
| });                                                                   |
|                                                                       |
| if (query.entryType) qb.andWhere(\'ec.entryType = :et\', { et:        |
| query.entryType === \'automated\' ? \'screenshot\' : \'manual\' });   |
|                                                                       |
| if (query.status) qb.andWhere(\'ec.status = :st\', { st: query.status |
| === \'paid\' ? \'confirmed\' : query.status });                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| private async fetchLabels(rows: EarningsCache\[\]):                   |
| Promise\<Map\<string, ContractLabelCache\>\> {                        |
|                                                                       |
| const ids = \[\...new Set(rows.map(r =\>                              |
| r.contractId).filter(Boolean))\];                                     |
|                                                                       |
| if (!ids.length) return new Map();                                    |
|                                                                       |
| const lbls = await this.lblRepo.findBy({ contractId: ids as any });   |
|                                                                       |
| return new Map(lbls.map(l =\> \[l.contractId, l\]));                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| private async buildDisplayAmounts(rows: EarningsCache\[\], currency:  |
| string): Promise\<Map\<string, string\>\> {                           |
|                                                                       |
| const map = new Map\<string, string\>();                              |
|                                                                       |
| for (const row of rows) {                                             |
|                                                                       |
| const r = await this.currencySvc.convertFromUsd(row.netAmountUsd,     |
| currency);                                                            |
|                                                                       |
| map.set(row.id, r.amount);                                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| return map;                                                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| export class ExportQueryDto {                                         |
|                                                                       |
| format?: string;                                                      |
|                                                                       |
| dateRange?: string;                                                   |
|                                                                       |
| startDate?: string;                                                   |
|                                                                       |
| endDate?: string;                                                     |
|                                                                       |
| currency?: string;                                                    |
|                                                                       |
| projectId?: string;                                                   |
|                                                                       |
| clientId?: string;                                                    |
|                                                                       |
| entryType?: string;                                                   |
|                                                                       |
| status?: string;                                                      |
|                                                                       |
| }                                                                     |
+=======================================================================+

### **src/export/export.processor.ts --- async job handler**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/export/export.processor.ts                                     |
|                                                                       |
| import { Processor, Process } from \'@nestjs/bull\';                  |
|                                                                       |
| import { Logger } from \'@nestjs/common\';                            |
|                                                                       |
| import { Job } from \'bull\';                                         |
|                                                                       |
| import { ExportService } from \'./export.service\';                   |
|                                                                       |
| import { R2Service } from \'./r2.service\';                           |
|                                                                       |
| import { ClientProxy } from \'@nestjs/microservices\';                |
|                                                                       |
| import { Inject } from \'@nestjs/common\';                            |
|                                                                       |
| \@Processor(\'earnings-export\')                                      |
|                                                                       |
| export class ExportProcessor {                                        |
|                                                                       |
| private readonly logger = new Logger(ExportProcessor.name);           |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| private readonly exportSvc: ExportService,                            |
|                                                                       |
| private readonly r2: R2Service,                                       |
|                                                                       |
| \@Inject(\'NOTIFICATION_CLIENT\')                                     |
|                                                                       |
| private readonly notifyClient: ClientProxy,                           |
|                                                                       |
| ) {}                                                                  |
|                                                                       |
| \@Process(\'generate\')                                               |
|                                                                       |
| async handleGenerate(job: Job\<{contractorId: string; query: any;     |
| jobId: string}\>) {                                                   |
|                                                                       |
| const { contractorId, query, jobId } = job.data;                      |
|                                                                       |
| this.logger.log(\`Export job \${jobId}: starting for contractor       |
| \${contractorId}\`);                                                  |
|                                                                       |
| // Step 1: Build file.                                                |
|                                                                       |
| const { buffer, filename } = await                                    |
| this.exportSvc.buildFile(contractorId, query);                        |
|                                                                       |
| // Step 2: Upload to R2.                                              |
|                                                                       |
| const key = this.r2.buildKey(contractorId, jobId, query.format ??     |
| \'csv\', new Date());                                                 |
|                                                                       |
| await this.r2.upload({                                                |
|                                                                       |
| key,                                                                  |
|                                                                       |
| body: buffer,                                                         |
|                                                                       |
| contentType: query.format === \'pdf\' ? \'application/pdf\' :         |
| \'text/csv\',                                                         |
|                                                                       |
| metadata: { contractorId, jobId, filename },                          |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Step 3: Generate presigned download URL (24h TTL).                 |
|                                                                       |
| const downloadUrl = await this.r2.presign(key);                       |
|                                                                       |
| // Step 4: Publish download-ready event to notification-service.      |
|                                                                       |
| this.notifyClient.emit(\'earnings.export.ready\', {                   |
|                                                                       |
| contractorId,                                                         |
|                                                                       |
| jobId,                                                                |
|                                                                       |
| downloadUrl,                                                          |
|                                                                       |
| filename,                                                             |
|                                                                       |
| format: query.format ?? \'csv\',                                      |
|                                                                       |
| expiresAt: new Date(Date.now() + 86400 \* 1000).toISOString(),        |
|                                                                       |
| rowCount: Math.round(buffer.length / 200), // rough estimate for      |
| notification copy                                                     |
|                                                                       |
| });                                                                   |
|                                                                       |
| this.logger.log(\`Export job \${jobId}: complete --- \${key}          |
| (\${buffer.length} bytes)\`);                                         |
|                                                                       |
| return { key, downloadUrl };                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **10. Notification Event --- earnings.export.ready**

When the async job completes, ExportProcessor emits
earnings.export.ready. notification-service consumes this event and
delivers an in-app notification and email to the contractor containing
the download link.

+-----------------------------------------------------------------------+
| json                                                                  |
+-----------------------------------------------------------------------+
| // earnings.export.ready --- full payload                             |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"eventId\": \"uuid-v4\", // added by EarningsPublisher envelope      |
| (reuse pattern)                                                       |
|                                                                       |
| \"contractorId\": \"uuid\",                                           |
|                                                                       |
| \"jobId\": \"uuid\", // matches the jobId returned in the 202         |
| response                                                              |
|                                                                       |
| \"downloadUrl\": \"https://\...\", // presigned R2 URL, valid for 24  |
| hours                                                                 |
|                                                                       |
| \"filename\": \"earnings-2025-06-10.csv\",                            |
|                                                                       |
| \"format\": \"csv\", // \"csv\" or \"pdf\"                            |
|                                                                       |
| \"expiresAt\": \"2025-06-11T14:32:00Z\", // UTC --- when the download |
| link expires                                                          |
|                                                                       |
| \"rowCount\": 12450 // approximate --- used in notification copy      |
|                                                                       |
| }                                                                     |
+=======================================================================+

  -----------------------------------------------------------------------
  **Field**              **Used by notification-service for**
  ---------------------- ------------------------------------------------
  **contractorId**       Route notification to correct contractor inbox

  **downloadUrl**        The clickable download link in the notification
                         and email

  **filename**           Notification copy: \"Your export
                         earnings-2025-06-10.csv is ready\"

  **format**             Notification copy: \"CSV\" or \"PDF\" label

  **expiresAt**          Notification copy: \"Link expires Jun 11, 2025
                         at 2:32 PM UTC\"

  **rowCount**           Notification copy: \"Your export contains
                         \~12,450 rows\"

  **jobId**              Deduplication --- prevents duplicate
                         notifications if event is delivered twice
  -----------------------------------------------------------------------

# **11. ExportController & Module**

### **src/export/export.controller.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/export/export.controller.ts                                    |
|                                                                       |
| import { Controller, Get, Query, Req, Res, UseGuards } from           |
| \'@nestjs/common\';                                                   |
|                                                                       |
| import { Request, Response } from \'express\';                        |
|                                                                       |
| import { JwtAuthGuard } from \'../guards/jwt-auth.guard\';            |
|                                                                       |
| import { ExportService, ExportQueryDto } from \'./export.service\';   |
|                                                                       |
| \@Controller(\'v1/earnings\')                                         |
|                                                                       |
| \@UseGuards(JwtAuthGuard)                                             |
|                                                                       |
| export class ExportController {                                       |
|                                                                       |
| constructor(private readonly exportSvc: ExportService) {}             |
|                                                                       |
| \@Get(\'export\')                                                     |
|                                                                       |
| async export(                                                         |
|                                                                       |
| \@Req() req: Request,                                                 |
|                                                                       |
| \@Res() res: Response,                                                |
|                                                                       |
| \@Query() query: ExportQueryDto,                                      |
|                                                                       |
| ): Promise\<void\> {                                                  |
|                                                                       |
| // Validate format.                                                   |
|                                                                       |
| if (query.format && \![\'csv\',\'pdf\'\].includes(query.format)) {    |
|                                                                       |
| res.status(400).json({ statusCode:400, message:\'format must be csv   |
| or pdf\' });                                                          |
|                                                                       |
| return;                                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Default currency to JWT displayCurrency.                           |
|                                                                       |
| if (!query.currency) query.currency = (req as                         |
| any).user?.displayCurrency ?? \'USD\';                                |
|                                                                       |
| if (!query.format) query.format = \'csv\';                            |
|                                                                       |
| await this.exportSvc.export((req as any).user.sub, query, res);       |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

### **src/export/export.module.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/export/export.module.ts                                        |
|                                                                       |
| import { Module } from \'@nestjs/common\';                            |
|                                                                       |
| import { TypeOrmModule } from \'@nestjs/typeorm\';                    |
|                                                                       |
| import { ConfigModule } from \'@nestjs/config\';                      |
|                                                                       |
| import { BullModule } from \'@nestjs/bull\';                          |
|                                                                       |
| import { ClientsModule, Transport } from \'@nestjs/microservices\';   |
|                                                                       |
| import { ExportController } from \'./export.controller\';             |
|                                                                       |
| import { ExportService } from \'./export.service\';                   |
|                                                                       |
| import { ExportProcessor } from \'./export.processor\';               |
|                                                                       |
| import { R2Service } from \'./r2.service\';                           |
|                                                                       |
| import { EarningsCache } from \'../entities/earnings-cache.entity\';  |
|                                                                       |
| import { ContractLabelCache } from                                    |
| \'../entities/contract-label-cache.entity\';                          |
|                                                                       |
| import { CurrencyModule } from \'../currency/currency.module\';       |
|                                                                       |
| import { EarningsModule } from \'../earnings/earnings.module\';       |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[                                                           |
|                                                                       |
| ConfigModule,                                                         |
|                                                                       |
| TypeOrmModule.forFeature(\[EarningsCache, ContractLabelCache\]),      |
|                                                                       |
| CurrencyModule,                                                       |
|                                                                       |
| EarningsModule,                                                       |
|                                                                       |
| BullModule.registerQueue({ name: \'earnings-export\' }),              |
|                                                                       |
| ClientsModule.register(\[{                                            |
|                                                                       |
| name: \'NOTIFICATION_CLIENT\',                                        |
|                                                                       |
| transport: Transport.RMQ,                                             |
|                                                                       |
| options: {                                                            |
|                                                                       |
| urls: \[process.env.RABBITMQ_URL \|\|                                 |
| \'amqp://guest:guest@rabbitmq:5672\'\],                               |
|                                                                       |
| queue: \'notification.events\',                                       |
|                                                                       |
| queueOptions: { durable: true },                                      |
|                                                                       |
| },                                                                    |
|                                                                       |
| }\]),                                                                 |
|                                                                       |
| \],                                                                   |
|                                                                       |
| controllers: \[ExportController\],                                    |
|                                                                       |
| providers: \[ExportService, ExportProcessor, R2Service\],             |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class ExportModule {}                                          |
+=======================================================================+

### **src/app.module.ts --- final state after ES-09**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // Add to imports array in AppModule:                                 |
|                                                                       |
| import { ExportModule } from \'./export/export.module\';              |
|                                                                       |
| import { BullModule } from \'@nestjs/bull\';                          |
|                                                                       |
| // In \@Module imports:                                               |
|                                                                       |
| BullModule.forRoot({                                                  |
|                                                                       |
| redis: { host: process.env.REDIS_HOST \|\| \'redis\', port: 6379 },   |
|                                                                       |
| }),                                                                   |
|                                                                       |
| ExportModule,                                                         |
+=======================================================================+

# **12. Verification**

## **Sync export --- small date range**

+-----------------------------------------------------------------------------+
| bash                                                                        |
+-----------------------------------------------------------------------------+
| \# Request a CSV export for a 7-day range (should be \< 5000 rows):         |
|                                                                             |
| curl -s -o earnings.csv \\                                                  |
|                                                                             |
| -D - \\                                                                     |
|                                                                             |
| -H \'Authorization: Bearer TOKEN\' \\                                       |
|                                                                             |
| \'http://localhost:3010/v1/earnings/export?format=csv&dateRange=this_week\' |
|                                                                             |
| \# Expected headers:                                                        |
|                                                                             |
| \# HTTP/1.1 200 OK                                                          |
|                                                                             |
| \# Content-Type: text/csv                                                   |
|                                                                             |
| \# Content-Disposition: attachment; filename=\"earnings-YYYY-MM-DD.csv\"    |
|                                                                             |
| \# X-Row-Count: \<n\>                                                       |
|                                                                             |
| \# X-Export-Mode: sync                                                      |
|                                                                             |
| \# Inspect the file:                                                        |
|                                                                             |
| head -5 earnings.csv                                                        |
|                                                                             |
| \# Expected: 2 comment lines (#), 1 blank line, 1 header row with 21        |
| columns                                                                     |
|                                                                             |
| wc -l earnings.csv                                                          |
|                                                                             |
| \# Should be rows + 4 (3 metadata lines + 1 header)                         |
|                                                                             |
| \# Verify no decimal places in Display Amount column (col 18):              |
|                                                                             |
| awk -F\',\' \'{print \$18}\' earnings.csv \| grep \'\\.\' \| head           |
|                                                                             |
| \# Expected: 0 results (all display amounts are whole numbers)              |
+=============================================================================+

## **Async export --- force async path**

+-------------------------------------------------------------------------------------+
| bash                                                                                |
+-------------------------------------------------------------------------------------+
| \# Temporarily set EXPORT_SYNC_ROW_LIMIT=1 to force async path:                     |
|                                                                                     |
| EXPORT_SYNC_ROW_LIMIT=1 npm run start:dev                                           |
|                                                                                     |
| \# Request export:                                                                  |
|                                                                                     |
| curl -s -H \'Authorization: Bearer TOKEN\' \\                                       |
|                                                                                     |
| \'http://localhost:3010/v1/earnings/export?format=csv&dateRange=all_time\'          |
|                                                                                     |
| \# Expected: HTTP 202                                                               |
|                                                                                     |
| \# Body:                                                                            |
| {\"jobId\":\"uuid\",\"status\":\"queued\",\"estimatedRows\":N,\"message\":\"\...\"} |
|                                                                                     |
| \# Monitor Bull queue in Bull Board (if installed) or via Redis:                    |
|                                                                                     |
| redis-cli LLEN bull:earnings-export:wait                                            |
|                                                                                     |
| \# Expected: 1 (job waiting)                                                        |
|                                                                                     |
| \# After job completes, check R2 bucket for the file:                               |
|                                                                                     |
| \# File should appear at: exports/{contractorId}/{YYYY-MM-DD}/{jobId}.csv           |
+=====================================================================================+

## **PDF export**

+------------------------------------------------------------------------------+
| bash                                                                         |
+------------------------------------------------------------------------------+
| curl -s -o earnings.pdf \\                                                   |
|                                                                              |
| -H \'Authorization: Bearer TOKEN\' \\                                        |
|                                                                              |
| \'http://localhost:3010/v1/earnings/export?format=pdf&dateRange=this_month\' |
|                                                                              |
| \# Expected: HTTP 200, Content-Type: application/pdf                         |
|                                                                              |
| \# Open earnings.pdf --- verify:                                             |
|                                                                              |
| \# A4 landscape, Marketeq header, 9-column table, totals row, UTC footer     |
| note                                                                         |
|                                                                              |
| \# Reversed rows in grey text                                                |
|                                                                              |
| \# Display Amount column shows whole numbers (no decimals)                   |
+==============================================================================+

## **Row limit rejection**

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| \# Set EXPORT_ASYNC_MAX_ROWS=1 and request a large export:            |
|                                                                       |
| EXPORT_ASYNC_MAX_ROWS=1 curl -s -H \'Authorization: Bearer TOKEN\' \\ |
|                                                                       |
| \'http://localhost:3010/v1/earnings/export?dateRange=all_time\'       |
|                                                                       |
| \# Expected: HTTP 400                                                 |
|                                                                       |
| \# Body: {\"statusCode\":400,\"message\":\"Export exceeds maximum row |
| limit of 1\...\"}                                                     |
+=======================================================================+

# **13. References**

  ----------------------------------------------------------------------------
  **Document**              **Relationship to ES-09**
  ------------------------- --------------------------------------------------
  **ES-01 --- Database      earnings_cache and contract_label_cache columns
  Schema**                  queried for every export row

  **ES-02 --- Contractor    resolveDateRange() and filter logic reused in
  Endpoints**               ExportService.applyFilters()

  **ES-06 --- Currency      convertFromUsd() used to build displayAmounts map
  Conversion**              for the Display Amount column

  **ES-08 --- Service Fee   Fee column header format and feePercent derivation
  Display**                 follow ES-08 §3 label rules

  **Cloudflare R2 docs**    https://developers.cloudflare.com/r2/api/s3/api/
                            --- R2 S3-compatible API reference
  ----------------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
earnings-service ES-09 \| v1.0
