**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**earnings-service**

**ES-08 --- Service Fee Display Logic**

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Service**         earnings-service

  **Document**        ES-08 --- Service Fee Display Logic

  **Version**         1.0

  **Status**          Draft --- Awaiting Engineering Review

  **Fee rate**        20% of gross earnings --- calculated in
                      billing-service, stored in earnings_cache

  **Display scope**   earnings history list, earnings detail view,
                      summary cards, balance card

  **Fee label**       Marketeq Service Fee

  **Prerequisites**   ES-00, ES-01, ES-02

  **Next Document**   ES-09 --- Export Endpoint (CSV / PDF)
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Purpose & Scope**                                                   |
|                                                                       |
| This document defines how the Marketeq 20% service fee is presented   |
| to contractors in                                                     |
|                                                                       |
| the earnings-service API responses. It covers display logic only.     |
|                                                                       |
| What is IN scope:                                                     |
|                                                                       |
| • Which fields are shown in which endpoint responses                  |
|                                                                       |
| • Exact label strings for gross amount, fee line item, and net amount |
|                                                                       |
| • How fee amounts are formatted and rounded for display               |
|                                                                       |
| • Fee representation in earnings history list, detail view, and       |
| summary cards                                                         |
|                                                                       |
| • The feeBreakdown object structure in detail responses               |
|                                                                       |
| • Edge cases: reversed entries, zero-fee contracts, legacy pre-fee    |
| entries                                                               |
|                                                                       |
| What is NOT in scope (belongs to other services):                     |
|                                                                       |
| • Fee calculation --- performed by billing-service at the time work   |
| is billed                                                             |
|                                                                       |
| • Fee percentage changes or per-contract overrides --- managed in     |
| contracts-service                                                     |
|                                                                       |
| • Invoice generation --- belongs to billing-service                   |
|                                                                       |
| • Client-facing fee display --- belongs to client-portal-service      |
|                                                                       |
| • Tax treatment of the fee --- belongs to kyc-identity-service and    |
| compliance-service                                                    |
|                                                                       |
| By the time transaction.created reaches earnings-service (ES-04),     |
| grossAmount, feeAmount,                                               |
|                                                                       |
| and netAmount are already computed and immutable. earnings-service    |
| reads them and formats                                                |
|                                                                       |
| them for display. It never recalculates them.                         |
+=======================================================================+

# **1. Prerequisites**

  -----------------------------------------------------------------------
  **Requirement**                         **Reference**
  --------------------------------------- -------------------------------
  **ES-01 --- earnings_cache columns:     All fee display fields are read
  gross_amount, fee_amount, net_amount,   from these columns
  currency, fx_rate_to_usd,               
  net_amount_usd**                        

  **ES-02 --- EarningsService.mapRow(),   Fee display fields are added to
  getDetail(), getEarnings(),             these existing response shapes
  getSummary()**                          

  **ES-06 ---                             Fee amounts converted to
  CurrencyService.convertFromUsd()**      displayCurrency for display
  -----------------------------------------------------------------------

# **2. Fee Data --- What Is Already in the Database**

earnings-service never calculates the fee. The three fee-related fields
arrive in the transaction.created event payload (ES-04) and are written
verbatim into earnings_cache. They are immutable from the moment they
are written.

  ---------------------------------------------------------------------------------------------------------
  **Column**                          **Type**        **Value**           **Set by**            **Mutable
                                                                                                after
                                                                                                write?**
  ----------------------------------- --------------- ------------------- --------------------- -----------
  **earnings_cache.gross_amount**     NUMERIC(18,8)   Full amount billed  billing-service via   Never
                                                      to client in        transaction.created   
                                                      rateCurrency        event                 

  **earnings_cache.fee_amount**       NUMERIC(18,8)   20% of gross_amount billing-service via   Never
                                                      in rateCurrency     transaction.created   
                                                                          event                 

  **earnings_cache.net_amount**       NUMERIC(18,8)   gross_amount minus  billing-service via   Never
                                                      fee_amount in       transaction.created   
                                                      rateCurrency        event                 

  **earnings_cache.net_amount_usd**   NUMERIC(18,8)   net_amount          billing-service via   Never
                                                      converted to USD at transaction.created   
                                                      contract FX rate    event                 

  **earnings_cache.currency**         VARCHAR(3)      ISO 4217 --- the    billing-service via   Never
                                                      rateCurrency of the transaction.created   
                                                      contract            event                 

  **earnings_cache.fx_rate_to_usd**   NUMERIC(18,8)   FX rate locked at   billing-service via   Never
                                                      contract creation   transaction.created   
                                                      time                event                 
  ---------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Fee rate is always 20% in current data --- but do not hardcode it   |
| in display logic**                                                    |
|                                                                       |
| All current entries have fee_amount = gross_amount \* 0.20.           |
|                                                                       |
| Future contracts may have negotiated rates. Fee percentage overrides  |
| are managed in                                                        |
|                                                                       |
| contracts-service and billing-service --- not in earnings-service.    |
|                                                                       |
| earnings-service always derives the display fee percentage            |
| dynamically:                                                          |
|                                                                       |
| feePercent = (feeAmount / grossAmount) \* 100, rounded to one decimal |
| place.                                                                |
|                                                                       |
| This ensures the display is always accurate even if the rate changes  |
| for a specific contract.                                              |
+=======================================================================+

# **3. Fee Display Fields --- Definitions**

These are the canonical field names and label strings used across all
earnings-service responses. Frontend must use these exact labels ---
they appear in the UI verbatim.

  ---------------------------------------------------------------------------
  **API field name**       **UI label**       **Description**     **Example
                                                                  value**
  ------------------------ ------------------ ------------------- -----------
  **grossAmount**          Gross Earnings     Total amount billed 100.00
                                              before the service  
                                              fee. In             
                                              rateCurrency.       

  **grossAmountDisplay**   Gross Earnings     grossAmount         ₹8342
                                              converted to        
                                              displayCurrency,    
                                              rounded to whole    
                                              unit                

  **feeAmount**            Marketeq Service   The service fee     20.00
                           Fee                deducted. In        
                                              rateCurrency.       

  **feeAmountDisplay**     Marketeq Service   feeAmount converted ₹1668
                           Fee                to displayCurrency, 
                                              rounded to whole    
                                              unit                

  **feePercent**           Fee rate           Dynamically         20.0%
                                              computed:           
                                              (feeAmount /        
                                              grossAmount) \*     
                                              100. One decimal    
                                              place.              

  **feeLabel**             ---                Human-readable fee  Marketeq
                                              label string.       Service Fee
                                              Always \"Marketeq   (20.0%)
                                              Service Fee (20%)\" 
                                              for 20% rate.       
                                              Format: \"Marketeq  
                                              Service Fee         
                                              ({feePercent}%)\"   

  **netAmount**            You Receive        gross minus fee. In 80.00
                                              rateCurrency.       

  **netAmountDisplay**     You Receive        netAmount converted ₹6674
                                              to displayCurrency, 
                                              rounded to whole    
                                              unit                

  **netAmountUsd**         ---                Internal USD        80.00
                                              amount. Not shown   
                                              in the list view.   
                                              Shown in detail     
                                              view for reference. 
  ---------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Label string construction rule**                                    |
|                                                                       |
| feeLabel is always built at response serialisation time, never        |
| stored:                                                               |
|                                                                       |
| const feePercent = ((feeAmount / grossAmount) \* 100).toFixed(1);     |
|                                                                       |
| const feeLabel = \`Marketeq Service Fee (\${feePercent}%)\`;          |
|                                                                       |
| For current 20% entries: \"Marketeq Service Fee (20.0%)\"             |
|                                                                       |
| For a hypothetical 15% contract: \"Marketeq Service Fee (15.0%)\"     |
|                                                                       |
| For a zero-fee entry (grossAmount = feeAmount = 0): feeLabel =        |
| \"Marketeq Service Fee (0.0%)\"                                       |
|                                                                       |
| --- see §7.2 for zero-fee edge cases.                                 |
+=======================================================================+

# **4. Earnings History List --- GET /v1/earnings**

The earnings list (ES-02 §7) returns one row per work entry. Fee
information is included in a compact form: the net amount is the primary
figure, with gross and fee surfaced in a nested breakdown object. The
list is never shown in gross-only form.

## **4.1 List row fee fields**

  ---------------------------------------------------------------------------
  **Field**                **Included in   **Notes**
                           list row?**     
  ------------------------ --------------- ----------------------------------
  **netAmountDisplay**     Yes --- primary The headline figure shown in the
                           amount          row. Whole unit, displayCurrency.

  **grossAmountDisplay**   Yes --- in      Nested inside feeBreakdown --- not
                           feeBreakdown    at the top level of the row.

  **feeAmountDisplay**     Yes --- in      Nested inside feeBreakdown.
                           feeBreakdown    

  **feeLabel**             Yes --- in      e.g. \"Marketeq Service Fee
                           feeBreakdown    (20.0%)\"

  **feePercent**           Yes --- in      Numeric string with one decimal
                           feeBreakdown    place. e.g. \"20.0\"

  **netAmountUsd**         No --- detail   Only in GET /v1/earnings/:id
                           view only       response.

  **currency**             Yes --- in      rateCurrency --- the currency in
                           feeBreakdown    which fee was deducted.
  ---------------------------------------------------------------------------

## **4.2 Updated list row response shape (addition to ES-02 §7)**

+-----------------------------------------------------------------------+
| json                                                                  |
+-----------------------------------------------------------------------+
| // Addition to the EarningsRowDto from ES-02.                         |
|                                                                       |
| // Each row in the data\[\] array of GET /v1/earnings now includes:   |
|                                                                       |
| {                                                                     |
|                                                                       |
| // \... existing fields from ES-02 (date, project, task, duration,    |
| etc.) \...                                                            |
|                                                                       |
| // Primary display amount --- always net                              |
|                                                                       |
| \"netAmountDisplay\": \"6674\", // displayCurrency, whole unit        |
|                                                                       |
| \"displayCurrency\": \"INR\",                                         |
|                                                                       |
| // Fee breakdown --- collapsed by default in UI, expandable           |
|                                                                       |
| \"feeBreakdown\": {                                                   |
|                                                                       |
| \"grossAmountDisplay\": \"8342\",                                     |
|                                                                       |
| \"grossAmountRaw\": \"100.00\", // rateCurrency --- for tooltip /     |
| export                                                                |
|                                                                       |
| \"feeAmountDisplay\": \"1668\",                                       |
|                                                                       |
| \"feeAmountRaw\": \"20.00\", // rateCurrency                          |
|                                                                       |
| \"feeLabel\": \"Marketeq Service Fee (20.0%)\",                       |
|                                                                       |
| \"feePercent\": \"20.0\",                                             |
|                                                                       |
| \"netAmountRaw\": \"80.00\", // rateCurrency                          |
|                                                                       |
| \"currency\": \"USD\", // rateCurrency                                |
|                                                                       |
| \"displayCurrency\": \"INR\"                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Why net is the primary figure**                                     |
|                                                                       |
| Contractors care about what they receive, not what the client paid.   |
|                                                                       |
| The gross amount is secondary context --- shown on expand or hover.   |
|                                                                       |
| This is consistent with how payslips work: take-home pay is headline, |
| deductions are detail.                                                |
+=======================================================================+

## **4.3 mapRow() update --- add feeBreakdown to list response**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/earnings/earnings.service.ts --- update to mapRow() /          |
| mapRowWithCurrency()                                                  |
|                                                                       |
| // Add fee breakdown construction inside mapRowWithCurrency().        |
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
| // Currency conversions for display amounts.                          |
|                                                                       |
| const gross = await                                                   |
| this.currencySvc.convertFromUsd(row.grossAmountUsd, displayCurrency); |
|                                                                       |
| // NOTE: grossAmountUsd must be stored in earnings_cache.             |
|                                                                       |
| // If not present, derive: grossAmountUsd = parseFloat(grossAmount)   |
| \* parseFloat(fxRateToUsd)                                            |
|                                                                       |
| const feeDisp = await                                                 |
| this.currencySvc.convertFromUsd(row.feeAmountUsd, displayCurrency);   |
|                                                                       |
| const net = await this.currencySvc.convertFromUsd(row.netAmountUsd,   |
| displayCurrency);                                                     |
|                                                                       |
| // Dynamic fee percentage --- never hardcode 20.                      |
|                                                                       |
| const grossRaw = parseFloat(row.grossAmount);                         |
|                                                                       |
| const feeRaw = parseFloat(row.feeAmount);                             |
|                                                                       |
| const feePercent = grossRaw \> 0                                      |
|                                                                       |
| ? ((feeRaw / grossRaw) \* 100).toFixed(1)                             |
|                                                                       |
| : \'0.0\';                                                            |
|                                                                       |
| return {                                                              |
|                                                                       |
| \...base,                                                             |
|                                                                       |
| netAmountDisplay: net.amount,                                         |
|                                                                       |
| displayCurrency: net.currency,                                        |
|                                                                       |
| feeBreakdown: {                                                       |
|                                                                       |
| grossAmountDisplay: gross.amount,                                     |
|                                                                       |
| grossAmountRaw: row.grossAmount,                                      |
|                                                                       |
| feeAmountDisplay: feeDisp.amount,                                     |
|                                                                       |
| feeAmountRaw: row.feeAmount,                                          |
|                                                                       |
| feeLabel: \`Marketeq Service Fee (\${feePercent}%)\`,                 |
|                                                                       |
| feePercent,                                                           |
|                                                                       |
| netAmountRaw: row.netAmount,                                          |
|                                                                       |
| currency: row.currency,                                               |
|                                                                       |
| displayCurrency: net.currency,                                        |
|                                                                       |
| },                                                                    |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **5. Earnings Entry Detail --- GET /v1/earnings/:id**

The detail view (ES-02 §9) shows a single entry in full. The fee
breakdown is expanded by default --- not collapsed. All raw
(rateCurrency) amounts and USD amounts are included alongside the
display amounts.

## **5.1 Detail view fee fields**

+-----------------------------------------------------------------------+
| json                                                                  |
+-----------------------------------------------------------------------+
| // Addition to EarningsDetailDto from ES-02.                          |
|                                                                       |
| // GET /v1/earnings/:id response includes the full fee section:       |
|                                                                       |
| {                                                                     |
|                                                                       |
| // \... existing fields (id, contractorId, entryType, dates,          |
| activity, etc.) \...                                                  |
|                                                                       |
| // ── Fee section ──────────────────────────────────────────────      |
|                                                                       |
| \"feeSection\": {                                                     |
|                                                                       |
| // rateCurrency amounts (what was actually billed and deducted)       |
|                                                                       |
| \"grossAmount\": \"100.00\",                                          |
|                                                                       |
| \"grossAmountDisplay\": \"8342\",                                     |
|                                                                       |
| \"feeAmount\": \"20.00\",                                             |
|                                                                       |
| \"feeAmountDisplay\": \"1668\",                                       |
|                                                                       |
| \"netAmount\": \"80.00\",                                             |
|                                                                       |
| \"netAmountDisplay\": \"6674\",                                       |
|                                                                       |
| // USD equivalents --- for reference and for export / 1099            |
| calculations                                                          |
|                                                                       |
| \"grossAmountUsd\": \"100.00\",                                       |
|                                                                       |
| \"feeAmountUsd\": \"20.00\",                                          |
|                                                                       |
| \"netAmountUsd\": \"80.00\",                                          |
|                                                                       |
| // The currency the amounts were billed in                            |
|                                                                       |
| \"billingCurrency\": \"USD\",                                         |
|                                                                       |
| \"displayCurrency\": \"INR\",                                         |
|                                                                       |
| // The FX rate locked at contract creation --- shown for transparency |
|                                                                       |
| \"fxRateToUsd\": \"1.00000000\",                                      |
|                                                                       |
| \"fxRateLabel\": \"1 USD = 1.00000000 USD (rate locked at contract    |
| creation)\",                                                          |
|                                                                       |
| // Fee metadata                                                       |
|                                                                       |
| \"feeLabel\": \"Marketeq Service Fee (20.0%)\",                       |
|                                                                       |
| \"feePercent\": \"20.0\",                                             |
|                                                                       |
| // Breakdown row structure --- maps directly to a line-item table in  |
| the UI                                                                |
|                                                                       |
| \"lineItems\": \[                                                     |
|                                                                       |
| { \"label\": \"Gross Earnings\", \"amount\": \"8342\", \"currency\":  |
| \"INR\", \"amountRaw\": \"100.00\", \"currencyRaw\": \"USD\" },       |
|                                                                       |
| { \"label\": \"Marketeq Service Fee (20.0%)\", \"amount\":            |
| \"-1668\",\"currency\": \"INR\", \"amountRaw\":                       |
| \"-20.00\",\"currencyRaw\": \"USD\" },                                |
|                                                                       |
| { \"label\": \"You Receive\", \"amount\": \"6674\", \"currency\":     |
| \"INR\", \"amountRaw\": \"80.00\", \"currencyRaw\": \"USD\",          |
| \"isTotal\": true }                                                   |
|                                                                       |
| \]                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **lineItems array**                                                   |
|                                                                       |
| lineItems is the canonical structure for rendering the fee breakdown  |
| as a UI table.                                                        |
|                                                                       |
| Three rows, always in this order:                                     |
|                                                                       |
| 1\. Gross Earnings --- positive amount                                |
|                                                                       |
| 2\. Marketeq Service Fee --- negative amount (always prefixed with    |
| \"-\")                                                                |
|                                                                       |
| 3\. You Receive --- positive net, isTotal: true (bold in UI)          |
|                                                                       |
| The feeAmount is displayed as a negative number in                    |
| lineItems\[1\].amount and amountRaw                                   |
|                                                                       |
| to make the deduction semantics visually clear.                       |
+=======================================================================+

## **5.2 getDetail() update --- add feeSection**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/earnings/earnings.service.ts --- update to getDetail()         |
|                                                                       |
| // Add feeSection construction after the existing detail mapping.     |
|                                                                       |
| async getDetail(contractorId: string, entryId: string,                |
| displayCurrency: string) {                                            |
|                                                                       |
| const row = await this.earningsRepo.findOne({                         |
|                                                                       |
| where: { id: entryId, contractorId }                                  |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (!row) throw new NotFoundException(\'Earnings entry not found\');  |
|                                                                       |
| // \... existing detail mapping \...                                  |
|                                                                       |
| // Build feeSection.                                                  |
|                                                                       |
| const grossUsd = (parseFloat(row.grossAmount) \*                      |
| parseFloat(row.fxRateToUsd)).toFixed(8);                              |
|                                                                       |
| const feeUsd = (parseFloat(row.feeAmount) \*                          |
| parseFloat(row.fxRateToUsd)).toFixed(8);                              |
|                                                                       |
| const grossDisp = await this.currencySvc.convertFromUsd(grossUsd,     |
| displayCurrency);                                                     |
|                                                                       |
| const feeDisp = await this.currencySvc.convertFromUsd(feeUsd,         |
| displayCurrency);                                                     |
|                                                                       |
| const netDisp = await                                                 |
| this.currencySvc.convertFromUsd(row.netAmountUsd, displayCurrency);   |
|                                                                       |
| const grossRaw = parseFloat(row.grossAmount);                         |
|                                                                       |
| const feeRaw = parseFloat(row.feeAmount);                             |
|                                                                       |
| const feePercent = grossRaw \> 0 ? ((feeRaw / grossRaw) \*            |
| 100).toFixed(1) : \'0.0\';                                            |
|                                                                       |
| const feeLabel = \`Marketeq Service Fee (\${feePercent}%)\`;          |
|                                                                       |
| const fxPair = row.currency === \'USD\'                               |
|                                                                       |
| ? \`1 USD = \${row.fxRateToUsd} USD (rate locked at contract          |
| creation)\`                                                           |
|                                                                       |
| : \`1 \${row.currency} = \${row.fxRateToUsd} USD (rate locked at      |
| contract creation)\`;                                                 |
|                                                                       |
| dto.feeSection = {                                                    |
|                                                                       |
| grossAmount: row.grossAmount,                                         |
|                                                                       |
| grossAmountDisplay: grossDisp.amount,                                 |
|                                                                       |
| feeAmount: row.feeAmount,                                             |
|                                                                       |
| feeAmountDisplay: feeDisp.amount,                                     |
|                                                                       |
| netAmount: row.netAmount,                                             |
|                                                                       |
| netAmountDisplay: netDisp.amount,                                     |
|                                                                       |
| grossAmountUsd: grossUsd,                                             |
|                                                                       |
| feeAmountUsd: feeUsd,                                                 |
|                                                                       |
| netAmountUsd: row.netAmountUsd,                                       |
|                                                                       |
| billingCurrency: row.currency,                                        |
|                                                                       |
| displayCurrency: netDisp.currency,                                    |
|                                                                       |
| fxRateToUsd: row.fxRateToUsd,                                         |
|                                                                       |
| fxRateLabel: fxPair,                                                  |
|                                                                       |
| feeLabel,                                                             |
|                                                                       |
| feePercent,                                                           |
|                                                                       |
| lineItems: \[                                                         |
|                                                                       |
| {                                                                     |
|                                                                       |
| label: \'Gross Earnings\',                                            |
|                                                                       |
| amount: grossDisp.amount,                                             |
|                                                                       |
| currency: netDisp.currency,                                           |
|                                                                       |
| amountRaw: row.grossAmount,                                           |
|                                                                       |
| currencyRaw: row.currency,                                            |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| label: feeLabel,                                                      |
|                                                                       |
| amount: \`-\${feeDisp.amount}\`,                                      |
|                                                                       |
| currency: netDisp.currency,                                           |
|                                                                       |
| amountRaw: \`-\${row.feeAmount}\`,                                    |
|                                                                       |
| currencyRaw: row.currency,                                            |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| label: \'You Receive\',                                               |
|                                                                       |
| amount: netDisp.amount,                                               |
|                                                                       |
| currency: netDisp.currency,                                           |
|                                                                       |
| amountRaw: row.netAmount,                                             |
|                                                                       |
| currencyRaw: row.currency,                                            |
|                                                                       |
| isTotal: true,                                                        |
|                                                                       |
| },                                                                    |
|                                                                       |
| \],                                                                   |
|                                                                       |
| };                                                                    |
|                                                                       |
| return dto;                                                           |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **6. Summary Cards & Balance Card**

## **6.1 Summary cards --- GET /v1/earnings/summary**

Summary card amounts (Today, This Week, This Month, All Time) are always
net amounts. Gross is not surfaced in the cards. A single fee note is
appended to the card subtitle so contractors understand the amounts are
after fee.

  ---------------------------------------------------------------------------
  **Field**                **Value**                      **Example**
  ------------------------ ------------------------------ -------------------
  **amount**               Net amount (netAmountUsd       ₹6674
                           converted to displayCurrency), 
                           whole unit                     

  **subtitle**             Period label + fee note        This week · After
                                                          20% service fee

  **feeNoteLabel**         Always: \"After {feePercent}%  After 20% service
                           service fee\" --- feePercent   fee
                           from most recent entry in the  
                           period. Falls back to \"After  
                           service fee\" if no entries in 
                           period.                        

  **grossAmountDisplay**   Not included in summary cards  ---
  ---------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Why gross is excluded from summary cards**                          |
|                                                                       |
| Summary cards are a snapshot of contractor take-home income.          |
|                                                                       |
| Showing gross would require a secondary line or tooltip on every      |
| card, adding noise.                                                   |
|                                                                       |
| The fee note in the subtitle makes the deduction explicit without     |
| cluttering the figure.                                                |
|                                                                       |
| Full gross/fee breakdown is available by drilling into the earnings   |
| history list.                                                         |
+=======================================================================+

## **6.2 Summary card getSummary() update**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/earnings/earnings.service.ts --- update to buildCard()         |
|                                                                       |
| // Add feeNoteLabel to each summary card.                             |
|                                                                       |
| private async buildCard(                                              |
|                                                                       |
| contractorId: string,                                                 |
|                                                                       |
| label: string,                                                        |
|                                                                       |
| from: Date,                                                           |
|                                                                       |
| to: Date,                                                             |
|                                                                       |
| displayCurrency: string,                                              |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| // \... existing aggregation query \...                               |
|                                                                       |
| // Derive fee percentage from the most recent entry in the period.    |
|                                                                       |
| // Falls back to 20.0 if no entries or if fee data is missing.        |
|                                                                       |
| const feeRow = await this.earningsRepo                                |
|                                                                       |
| .createQueryBuilder(\'ec\')                                           |
|                                                                       |
| .select(\'ec.grossAmount\', \'gross\')                                |
|                                                                       |
| .addSelect(\'ec.feeAmount\', \'fee\')                                 |
|                                                                       |
| .where(\'ec.contractorId = :id\', { id: contractorId })               |
|                                                                       |
| .andWhere(\'ec.status = :s\', { s: \'confirmed\' })                   |
|                                                                       |
| .andWhere(\'ec.workStartAt \>= :from\', { from })                     |
|                                                                       |
| .andWhere(\'ec.workStartAt \<= :to\', { to })                         |
|                                                                       |
| .orderBy(\'ec.workStartAt\', \'DESC\')                                |
|                                                                       |
| .limit(1)                                                             |
|                                                                       |
| .getRawOne();                                                         |
|                                                                       |
| const feePercent = feeRow && parseFloat(feeRow.gross) \> 0            |
|                                                                       |
| ? ((parseFloat(feeRow.fee) / parseFloat(feeRow.gross)) \*             |
| 100).toFixed(1)                                                       |
|                                                                       |
| : \'20.0\';                                                           |
|                                                                       |
| return {                                                              |
|                                                                       |
| \...existingCard,                                                     |
|                                                                       |
| feeNoteLabel: \`After \${feePercent}% service fee\`,                  |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **6.3 Balance card**

The balance card (GET /v1/earnings/balance) shows the current available
balance, which is already the net balance --- fees have been deducted at
billing time. No gross or fee breakdown is shown on the balance card
itself. The balance card does show a descriptive label.

  -----------------------------------------------------------------------
  **Field**                   **Value**
  --------------------------- -------------------------------------------
  **displayLabel**            Always: \"After reserve & threshold
                              deductions\" (or stale rate variant ---
                              ES-07)

  **Fee note on balance       Not shown --- the balance is already net.
  card**                      Fee context belongs in earnings history.

  **gross on balance card**   Not shown --- balance_snapshots stores only
                              net amounts.
  -----------------------------------------------------------------------

# **7. Fee Display Edge Cases**

## **7.1 Reversed entries**

  -----------------------------------------------------------------------
  **Scenario**          **Display behaviour**
  --------------------- -------------------------------------------------
  **An entry is         feeBreakdown is still shown with original gross,
  reversed (status =    fee, and net values. A \"reversed\" badge is
  \"reversed\")**       applied to the row. All amounts are crossed out
                        in the UI (frontend responsibility). The
                        lineItems array is unchanged --- no negative or
                        zero-out values.

  **feeLabel on a       Unchanged --- \"Marketeq Service Fee (20.0%)\".
  reversed entry**      The reversal does not affect the fee label.

  **netAmountDisplay on Still shown (crossed out). Value is the original
  a reversed entry**    net --- not zero. The reversal restores the
                        balance in balance_snapshots (ES-04) but the
                        display shows what was originally credited and
                        then reversed.
  -----------------------------------------------------------------------

## **7.2 Zero-fee entries**

  -----------------------------------------------------------------------
  **Scenario**          **Display behaviour**
  --------------------- -------------------------------------------------
  **feeAmount = 0       feeBreakdown.feeAmountDisplay = \"0\". feeLabel =
  (promotional or       \"Marketeq Service Fee (0.0%)\".
  zero-fee contract)**  lineItems\[1\].amount = \"-0\". The fee row is
                        still shown --- removing it would break the
                        consistent three-row structure.

  **grossAmount = 0     feePercent computation: grossRaw = 0 → guard
  (edge case --- should returns \"0.0\". feeLabel = \"Marketeq Service
  not occur in          Fee (0.0%)\". Log WARN for investigation.
  production)**         
  -----------------------------------------------------------------------

## **7.3 Legacy entries without fee data**

Entries written before the fee fields were added to earnings_cache may
have gross_amount = fee_amount = 0 with only net_amount populated. These
are treated as a special display state.

  ----------------------------------------------------------------------------------
  **Condition**         **Detection**          **Display behaviour**
  --------------------- ---------------------- -------------------------------------
  **gross_amount = 0    Checked in             feeBreakdown is omitted from the
  AND fee_amount = 0    mapRowWithCurrency()   response entirely. netAmountDisplay
  AND net_amount \> 0**                        is shown as the only amount field. No
                                               feeLabel is shown. A \"legacyEntry:
                                               true\" flag is added to the row so
                                               the UI can display a note: \"Fee
                                               breakdown not available for this
                                               entry.\"

  ----------------------------------------------------------------------------------

## **7.4 Cross-currency entries**

When a contract is denominated in a non-USD currency (e.g. GBP),
gross_amount, fee_amount, and net_amount are in GBP. The fxRateToUsd
rate converts them to USD for the netAmountUsd stored value. For display
purposes, all amounts are converted from USD via displayCurrency
(ES-06).

+-----------------------------------------------------------------------+
| json                                                                  |
+-----------------------------------------------------------------------+
| // Cross-currency entry example --- contract denominated in GBP:      |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"grossAmount\": \"80.00\", // GBP                                    |
|                                                                       |
| \"feeAmount\": \"16.00\", // GBP                                      |
|                                                                       |
| \"netAmount\": \"64.00\", // GBP                                      |
|                                                                       |
| \"netAmountUsd\": \"81.28\", // USD (64 GBP \* 1.27 fx rate)          |
|                                                                       |
| \"currency\": \"GBP\",                                                |
|                                                                       |
| \"fxRateToUsd\": \"1.27000000\",                                      |
|                                                                       |
| \"feeBreakdown\": {                                                   |
|                                                                       |
| \"grossAmountDisplay\": \"8505\", // INR (100 USD equiv converted to  |
| INR)                                                                  |
|                                                                       |
| \"grossAmountRaw\": \"80.00\", // GBP --- original billing currency   |
|                                                                       |
| \"feeAmountDisplay\": \"1701\",                                       |
|                                                                       |
| \"feeAmountRaw\": \"16.00\", // GBP                                   |
|                                                                       |
| \"feeLabel\": \"Marketeq Service Fee (20.0%)\",                       |
|                                                                       |
| \"feePercent\": \"20.0\",                                             |
|                                                                       |
| \"netAmountRaw\": \"64.00\", // GBP                                   |
|                                                                       |
| \"currency\": \"GBP\", // rateCurrency --- what the deduction was     |
| made in                                                               |
|                                                                       |
| \"displayCurrency\": \"INR\"                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Cross-currency display note for frontend**                          |
|                                                                       |
| The feeBreakdown.currency field tells the frontend which currency the |
| fee was originally                                                    |
|                                                                       |
| deducted in. The grossAmountRaw, feeAmountRaw, and netAmountRaw       |
| fields are in that currency.                                          |
|                                                                       |
| The display amounts (\*Display fields) are always in displayCurrency. |
|                                                                       |
| Frontend tooltip pattern: \"20.00 GBP deducted as Marketeq Service    |
| Fee\"                                                                 |
|                                                                       |
| This is constructed from: feeAmountRaw + \" \" +                      |
| feeBreakdown.currency + \" deducted as \" + feeLabel                  |
+=======================================================================+

# **8. Complete DTO Definitions**

### **src/earnings/dto/fee-breakdown.dto.ts**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/earnings/dto/fee-breakdown.dto.ts                              |
|                                                                       |
| // Used in EarningsRowDto (list) and EarningsDetailDto (detail).      |
|                                                                       |
| export class FeeBreakdownDto {                                        |
|                                                                       |
| grossAmountDisplay: string; // displayCurrency, whole unit            |
|                                                                       |
| grossAmountRaw: string; // rateCurrency (billing currency)            |
|                                                                       |
| feeAmountDisplay: string; // displayCurrency, whole unit              |
|                                                                       |
| feeAmountRaw: string; // rateCurrency                                 |
|                                                                       |
| feeLabel: string; // \'Marketeq Service Fee (20.0%)\'                 |
|                                                                       |
| feePercent: string; // \'20.0\'                                       |
|                                                                       |
| netAmountRaw: string; // rateCurrency                                 |
|                                                                       |
| currency: string; // rateCurrency (ISO 4217)                          |
|                                                                       |
| displayCurrency: string; // displayCurrency (ISO 4217)                |
|                                                                       |
| }                                                                     |
|                                                                       |
| // src/earnings/dto/fee-line-item.dto.ts                              |
|                                                                       |
| // One row in the feeSection.lineItems array (detail view only).      |
|                                                                       |
| export class FeeLineItemDto {                                         |
|                                                                       |
| label: string; // \'Gross Earnings\' \| \'Marketeq Service Fee (X%)\' |
| \| \'You Receive\'                                                    |
|                                                                       |
| amount: string; // displayCurrency, whole unit. Negative for fee row. |
|                                                                       |
| currency: string; // displayCurrency                                  |
|                                                                       |
| amountRaw: string; // rateCurrency. Negative for fee row.             |
|                                                                       |
| currencyRaw: string; // rateCurrency                                  |
|                                                                       |
| isTotal?: boolean; // true only for the \'You Receive\' row           |
|                                                                       |
| }                                                                     |
|                                                                       |
| // src/earnings/dto/fee-section.dto.ts                                |
|                                                                       |
| // Used in EarningsDetailDto (detail view only).                      |
|                                                                       |
| export class FeeSectionDto extends FeeBreakdownDto {                  |
|                                                                       |
| grossAmountUsd: string;                                               |
|                                                                       |
| feeAmountUsd: string;                                                 |
|                                                                       |
| netAmountUsd: string;                                                 |
|                                                                       |
| billingCurrency: string;                                              |
|                                                                       |
| fxRateToUsd: string;                                                  |
|                                                                       |
| fxRateLabel: string;                                                  |
|                                                                       |
| lineItems: FeeLineItemDto\[\];                                        |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **9. Response Field Map --- Which Fields Appear Where**

Quick reference for frontend integration. A checkmark means the field is
present; a dash means it is absent. All checked display fields are in
displayCurrency unless the Raw suffix indicates rateCurrency.

  ------------------------------------------------------------------------------------------------------
  **Field**                **List row (GET   **Detail (GET         **Summary   **Balance card**
                           /v1/earnings)**   /v1/earnings/:id)**   card**      
  ------------------------ ----------------- --------------------- ----------- -------------------------
  **netAmountDisplay**     ✓ top-level       ✓ in feeSection       ✓ as amount ✓ as
                                                                               availableBalanceDisplay

  **grossAmountDisplay**   ✓ in feeBreakdown ✓ in feeSection       ---         ---

  **feeAmountDisplay**     ✓ in feeBreakdown ✓ in feeSection       ---         ---

  **feeLabel**             ✓ in feeBreakdown ✓ in feeSection +     ---         ---
                                             lineItems                         

  **feePercent**           ✓ in feeBreakdown ✓ in feeSection       ---         ---

  **feeNoteLabel**         ---               ---                   ✓ e.g.      ---
                                                                   \"After 20% 
                                                                   service     
                                                                   fee\"       

  **grossAmountRaw**       ✓ in feeBreakdown ✓ in feeSection       ---         ---

  **feeAmountRaw**         ✓ in feeBreakdown ✓ in feeSection       ---         ---

  **netAmountRaw**         ✓ in feeBreakdown ✓ in feeSection       ---         ---

  **netAmountUsd**         ---               ✓ in feeSection       ---         ---

  **fxRateToUsd**          ---               ✓ in feeSection       ---         ---

  **fxRateLabel**          ---               ✓ in feeSection       ---         ---

  **lineItems\[\]**        ---               ✓ 3-row array in      ---         ---
                                             feeSection                        
  ------------------------------------------------------------------------------------------------------

# **10. Verification**

## **List view --- confirm feeBreakdown is present**

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| curl -s -H \'Authorization: Bearer TOKEN\' \\                         |
|                                                                       |
| \'http://localhost:3010/v1/earnings?view=daily&dateRange=this_week\'  |
| \\                                                                    |
|                                                                       |
| \| jq \'.data\[0\].feeBreakdown\'                                     |
|                                                                       |
| \# Expected:                                                          |
|                                                                       |
| \# {                                                                  |
|                                                                       |
| \# \"grossAmountDisplay\": \"\<whole number\>\",                      |
|                                                                       |
| \# \"feeAmountDisplay\": \"\<whole number\>\",                        |
|                                                                       |
| \# \"feeLabel\": \"Marketeq Service Fee (20.0%)\",                    |
|                                                                       |
| \# \"feePercent\": \"20.0\",                                          |
|                                                                       |
| \# \"currency\": \"USD\" (or contract rateCurrency)                   |
|                                                                       |
| \# }                                                                  |
+=======================================================================+

## **Detail view --- confirm lineItems structure**

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| curl -s -H \'Authorization: Bearer TOKEN\' \\                         |
|                                                                       |
| http://localhost:3010/v1/earnings/ENTRY_UUID \\                       |
|                                                                       |
| \| jq \'.feeSection.lineItems\'                                       |
|                                                                       |
| \# Expected: 3-element array                                          |
|                                                                       |
| \# \[                                                                 |
|                                                                       |
| \# { \"label\": \"Gross Earnings\", \"isTotal\": undefined or absent  |
| },                                                                    |
|                                                                       |
| \# { \"label\": \"Marketeq Service Fee (20.0%)\", \"amount\": starts  |
| with \"-\" },                                                         |
|                                                                       |
| \# { \"label\": \"You Receive\", \"isTotal\": true }                  |
|                                                                       |
| \# \]                                                                 |
|                                                                       |
| \# Verify fee amount is negative in lineItems\[1\]:                   |
|                                                                       |
| curl -s -H \'Authorization: Bearer TOKEN\'                            |
| http://localhost:3010/v1/earnings/ENTRY_UUID \\                       |
|                                                                       |
| \| jq \'.feeSection.lineItems\[1\].amount \| startswith(\"-\")\'      |
|                                                                       |
| \# Expected: true                                                     |
+=======================================================================+

## **Summary card --- confirm feeNoteLabel**

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| curl -s -H \'Authorization: Bearer TOKEN\' \\                         |
|                                                                       |
| http://localhost:3010/v1/earnings/summary \\                          |
|                                                                       |
| \| jq \'\[.cards\[\].feeNoteLabel\]\'                                 |
|                                                                       |
| \# Expected: array of 4 strings, each starting with \'After\' and     |
| ending with \'service fee\'                                           |
|                                                                       |
| \# e.g. \[\'After 20.0% service fee\', \'After 20.0% service fee\',   |
| \...\]                                                                |
+=======================================================================+

## **No decimal places in display amounts**

+-----------------------------------------------------------------------+
| bash                                                                  |
+-----------------------------------------------------------------------+
| \# All \*Display fields must be whole number strings:                 |
|                                                                       |
| curl -s -H \'Authorization: Bearer TOKEN\'                            |
| http://localhost:3010/v1/earnings/ENTRY_UUID \\                       |
|                                                                       |
| \| jq \'\[.feeSection.grossAmountDisplay,                             |
| .feeSection.feeAmountDisplay, .feeSection.netAmountDisplay\]\'        |
|                                                                       |
| \# Expected: array of strings with no decimal point in any value      |
|                                                                       |
| \# e.g. \[\'8342\', \'1668\', \'6674\'\] --- not \[\'8342.0\',        |
| \'1668.4\', \'6673.6\'\]                                              |
+=======================================================================+

# **11. References**

  -----------------------------------------------------------------------
  **Document**              **Relationship to ES-08**
  ------------------------- ---------------------------------------------
  **ES-01 --- Database      gross_amount, fee_amount, net_amount,
  Schema**                  fx_rate_to_usd columns in earnings_cache

  **ES-02 --- Contractor    mapRow(), getDetail(), getSummary() updated
  Endpoints**               in this document to add fee display fields

  **ES-04 --- RabbitMQ      transaction.created consumer writes the three
  Consumers**               fee fields verbatim --- no recalculation ever
                            happens in earnings-service

  **ES-06 --- Currency      convertFromUsd() used to convert all Raw
  Conversion**              amounts to displayCurrency for all \*Display
                            fields

  **ES-09 --- Export        CSV and PDF exports include the full fee
  Endpoint**                breakdown using the same field definitions
                            from this document
  -----------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
earnings-service ES-08 \| v1.0
