**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**earnings-service**

ES-13 --- Frontend Integration Guide

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Service**         earnings-service

  **Document**        ES-13 --- Frontend Integration Guide

  **Version**         1.0

  **Screens covered** Overview tab, Earnings tab, Entry Detail, Export
                      flow

  **Real-time         Ably primary; 60s polling fallback
  strategy**          

  **Prerequisites**   ES-02, ES-06, ES-08, ES-09, ES-10, ES-12
  -----------------------------------------------------------------------

# **1. Endpoint-to-Component Map**

  ------------------------------------------------------------------------------------------
  **Screen**    **Component**    **API call**                               **Trigger**
  ------------- ---------------- ------------------------------------------ ----------------
  **Overview    Balance card     GET /v1/earnings/balance                   Mount + Ably
  tab**                                                                     event + manual
                                                                            refresh

  **Overview    Summary cards    GET                                        Mount + period
  tab**         (×4)             /v1/earnings/summary?dateRange={period}    tab change

  **Overview    Recent activity  GET                                        Mount
  tab**         preview          /v1/earnings?limit=5&dateRange=this_week   

  **Earnings    Full history     GET                                        Mount + any
  tab**         list             /v1/earnings?view={v}&dateRange={r}&\...   filter/page
                                                                            change

  **Earnings    Export           GET /v1/earnings/export?format={f}&\...    Export button
  tab**                                                                     click

  **Entry       Fee + activity   GET /v1/earnings/:id                       Row click
  detail        detail                                                      
  drawer**                                                                  

  **Help &      Static content   None                                       Tab click
  Support tab**                                                             

  **Log Time    Contract         GET active contracts --- contracts-service Modal open
  modal**       dropdown                                                    

  **Log Time    Submit           POST --- time-tracking-service             Form submit
  modal**                                                                   
  ------------------------------------------------------------------------------------------

# **2. Overview Tab**

## **2.1 Balance card**

  ------------------------------------------------------------------------------
  **Field**          **Source**                  **Display rule**
  ------------------ --------------------------- -------------------------------
  **Primary amount** availableBalanceDisplay     Whole integer + currency
                                                 symbol. e.g. ₹6,674

  **Secondary        availableBalanceLocal       Show only if localCurrency ≠
  amount**                                       displayCurrency

  **Subtitle**       displayLabel                Verbatim from response. Never
                                                 hardcode.

  **Stale FX         stale:true on FX result     Tooltip: \"Exchange rate may be
  banner**                                       delayed\"

  **Last updated**   cachedAt                    \"Updated X min ago\" ---
                                                 recompute client-side from
                                                 cachedAt

  **Withdraw CTA**   availableBalance=\"0.00\"   Disabled + tooltip: \"No
                                                 available balance to withdraw\"
  ------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **\$0 vs no-balance-row --- two different states**                    |
|                                                                       |
| 200 + availableBalance=\"0.00\" → show balance card with \$0. Do NOT  |
| show onboarding state.                                                |
|                                                                       |
| 404 + ERR_EARNINGS_BALANCE_NOT_FOUND → hide card, show onboarding     |
| state (ES-12 §2.2).                                                   |
|                                                                       |
| Switch on errorCode, never on amount value.                           |
+=======================================================================+

## **2.2 Summary cards**

  ------------------------------------------------------------------------
  **Card**      **dateRange     **Amount field**      **Subtitle field**
                param**                               
  ------------- --------------- --------------------- --------------------
  **Today**     today           amount                feeNoteLabel

  **This Week** this_week       amount                feeNoteLabel

  **This        this_month      amount                feeNoteLabel
  Month**                                             

  **All Time**  all_time        amount                feeNoteLabel
  ------------------------------------------------------------------------

Fetch all four in parallel (Promise.all). A single card failure renders
that card with \"---\" and a retry icon --- it does not fail all four.

## **2.3 Recent activity preview**

Fixed 5-row preview. Non-paginated. Shows: date, project, duration,
netAmountDisplay. No fee breakdown. Clicking a row opens the Entry
Detail drawer.

# **3. Earnings Tab**

## **3.1 Query parameters by UI control**

  -------------------------------------------------------------------------------------------------------------------------
  **UI control**     **Query param**                                                           **Notes**
  ------------------ ------------------------------------------------------------------------- ----------------------------
  **Date range       dateRange=today\|this_week\|this_month\|last_month\|this_year\|all_time   Default on mount: this_month
  presets**                                                                                    

  **Custom date      dateRange=custom&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD                  Validate startDate\<=endDate
  picker**                                                                                     client-side before API call

  **View toggle**    view=daily\|weekly\|monthly                                               Default: daily

  **Project filter** projectId={uuid}                                                          Single-select

  **Client filter**  clientId={uuid}                                                           Single-select

  **Type filter**    entryType=automated\|manual                                               

  **Status filter**  status=paid\|unpaid\|failed                                               

  **Pagination**     page={n}&limit=25                                                         Reset to page=1 on any
                                                                                               filter or range change

  **Currency         currency={ISO4217}                                                        Defaults to displayCurrency
  override**                                                                                   from JWT
  -------------------------------------------------------------------------------------------------------------------------

## **3.2 Filter rules**

  -----------------------------------------------------------------------
  **Rule**              **Detail**
  --------------------- -------------------------------------------------
  **Filters are AND**   All active filters apply simultaneously

  **Filter change       Always reset to page=1 when any filter or date
  resets page**         range changes

  **Active filter       One chip per active filter above list. × to
  chips**               remove individually.

  **Clear all**         Appears when any filter active. Removes all and
                        re-fetches.

  **Sort order**        workStartAt DESC always. Not user-configurable in
                        v1.

  **Empty result**      Inline empty state with chips visible. \"No
                        earnings match your current filters.\" + Clear
                        all CTA. (ES-12 §2.4)
  -----------------------------------------------------------------------

## **3.3 Fee breakdown in list rows**

Each row shows netAmountDisplay as the primary figure. The feeBreakdown
object is nested --- render it collapsed by default with an expand
chevron. On expand, show a 3-line breakdown: Gross / Fee / You Receive.
Field names and labels are defined in ES-08 §4.

# **4. Entry Detail Drawer**

  ---------------------------------------------------------------------------------
  **Section**            **Fields to render**            **Source**
  ---------------------- ------------------------------- --------------------------
  **Header**             Date, day, entry type badge,    workStartAt, entryType,
                         status badge                    status

  **Time block**         Start time, end time, duration  workStartAt, workEndAt,
                                                         durationMinutes

  **Activity block**     Keyboard %, mouse % --- hide    avgKeyboardPct,
                         both for manual entries         avgMousePct

  **Fee breakdown**      3-row lineItems table: Gross /  feeSection.lineItems\[\]
                         Fee / You Receive               

  **Currency note**      Billing currency + locked FX    feeSection.fxRateLabel
                         rate                            

  **Contract/Project**   Project name, client name,      Populated from feeSection
                         contract title                  context or
                                                         contractLabelCache
  ---------------------------------------------------------------------------------

If GET /v1/earnings/:id returns 404, show inline message inside drawer:
\"This entry could not be found.\" with close button. Do not close the
drawer automatically.

# **5. Export Flow**

## **5.1 Pre-export row count check**

Before showing the export modal, display the estimated row count using
the current filter state. Derive it from the total field in the history
list response. If total=0, disable the Export button with tooltip: \"No
data to export for the selected range.\"

## **5.2 Sync vs async path**

  -------------------------------------------------------------------------------------
  **Condition**      **API response**                **Frontend behaviour**
  ------------------ ------------------------------- ----------------------------------
  **Row count \<     200 OK --- file bytes streamed  Trigger browser download from
  5,000 (sync)**                                     response blob. Show toast:
                                                     \"Export ready.\"

  **Row count \>=    202 Accepted --- jobId in body  Show in-progress state: \"Your
  5,000 (async)**                                    export is being prepared. We\'ll
                                                     notify you when it\'s ready.\"
                                                     Store jobId.

  **Row count \>     400                             Show inline error in modal. Do not
  500,000**          ERR_EARNINGS_EXPORT_TOO_LARGE   close modal.
  -------------------------------------------------------------------------------------

## **5.3 Async export --- notification handling**

When earnings.export.ready notification arrives (via Ably or in-app
notification bell), surface a persistent banner or notification card:
\"Your export is ready. \[Download\] --- Link expires {expiresAt}.\" The
download URL comes from the notification payload. Do not re-call the
export endpoint.

# **6. Real-Time Balance Updates --- Ably vs Polling**

## **6.1 Ably (primary strategy)**

notification-service publishes a balance.updated event to the
contractor\'s private Ably channel when earnings-service emits
earnings.balance.updated (ES-05). The frontend subscribes on mount and
re-fetches GET /v1/earnings/balance on each event.

  -----------------------------------------------------------------------
  **Property**             **Value**
  ------------------------ ----------------------------------------------
  **Ably channel**         private:{contractorId}:earnings

  **Event name**           balance.updated

  **Frontend action on     Invalidate balance card cache + re-fetch GET
  event**                  /v1/earnings/balance

  **Frontend action on     Re-fetch summary cards if Overview tab is
  event**                  active

  **Ably connection        Show subtle \"Live\" indicator on balance card
  state**                  when Ably connected
  -----------------------------------------------------------------------

## **6.2 Polling fallback**

If Ably is unavailable or the connection drops, fall back to polling GET
/v1/earnings/balance every 60 seconds while the earnings page is in
focus. Stop polling when the page loses focus (visibilitychange event).
Resume on focus restore. Stop polling entirely when Ably reconnects.

  -----------------------------------------------------------------------
  **Condition**               **Behaviour**
  --------------------------- -------------------------------------------
  **Ably connected**          No polling. Balance updates are
                              event-driven.

  **Ably disconnected or      Poll every 60s while page is focused
  unavailable**               

  **Page not in focus         Pause polling regardless of Ably state
  (background tab)**          

  **Ably reconnects**         Stop polling. Re-fetch balance once
                              immediately on reconnect.
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Do not poll faster than 60s**                                       |
|                                                                       |
| The balance cache TTL is 300s (ES-07). Polling faster than 60s        |
| provides no benefit and                                               |
|                                                                       |
| increases unnecessary DB load when Ably is down across many users     |
| simultaneously.                                                       |
+=======================================================================+

# **7. Loading States**

  ------------------------------------------------------------------------
  **Component**         **Skeleton treatment**          **Min display
                                                        time**
  --------------------- ------------------------------- ------------------
  **Balance card        Pulsing block 120×40px          150ms
  amount**                                              

  **Balance card        Pulsing block 80×24px           150ms
  secondary**                                           

  **Summary cards       4 pulsing card-shaped blocks,   150ms
  (×4)**                same dimensions as real cards   

  **History list**      3 pulsing full-width rows, 16px 150ms
                        height, alternating shade       

  **Entry detail        Full-width skeleton covering    150ms
  drawer**              all sections                    

  **Export button       Spinner inside button + text    Until 200 or 202
  (in-progress)**       \"Preparing export...\". Button received
                        disabled.                       
  ------------------------------------------------------------------------

# **8. Error States Per Component**

  ----------------------------------------------------------------------------------------------
  **Component**    **Error trigger**                  **Treatment**               **Toast?**
  ---------------- ---------------------------------- --------------------------- --------------
  **Balance card** 500 / 503                          Replace amount with         No
                                                      \"Balance unavailable\" +   
                                                      retry link inside card      

  **Balance card** 422                                Show balance in USD +       No
                   ERR_EARNINGS_FX_RATE_UNAVAILABLE   banner: \"Showing in USD    
                                                      --- currency data           
                                                      temporarily unavailable\"   

  **Summary        500 / 503                          Replace each card amount    No
  cards**                                             with \"---\". One shared    
                                                      error note below all 4      
                                                      cards + Refresh link.       

  **History list** 500 / 503                          Replace list with \"Could   No
                                                      not load earnings. Please   
                                                      try again.\" + retry button 

  **Entry detail** 404 ERR_EARNINGS_ENTRY_NOT_FOUND   Inline in drawer: \"This    No
                                                      entry could not be          
                                                      found.\" + close button     

  **Export         500                                Toast: \"Export failed.     Yes
  (sync)**                                            Please try again.\"         

  **Export (async  No notification after 5 min        In-app notification: \"Your No ---
  timeout)**                                          export could not be         notification
                                                      completed. Please try       
                                                      again.\"                    

  **Any endpoint** 401 any auth error                 Redirect to login. No       No
                                                      inline treatment.           
  ----------------------------------------------------------------------------------------------

# **9. Currency Display Rules**

  -----------------------------------------------------------------------
  **Rule**              **Detail**
  --------------------- -------------------------------------------------
  **No decimal places** All \*Display fields are whole integers. Never
                        render \"₹6,674.00\" --- render \"₹6,674\".

  **Symbol placement**  Follow locale convention for the displayCurrency.
                        Use Intl.NumberFormat with currency style.

  **Raw amounts (in fee Show rateCurrency raw amounts with 2 decimal
  breakdown)**          places. e.g. \"100.00 USD\". These are from \*Raw
                        fields.

  **Negative amounts**  Fee row in lineItems\[\]: amount starts with
                        \"-\". Render in muted colour, not red.

  **Zero display**      Show \"0\" not \"0.00\" for display amounts. Show
                        \"0.00\" for raw amounts.

  **Currency mismatch   localCurrency ≠ displayCurrency is expected. Show
  (travel)**            both. No warning.

  **Stale FX**          Append asterisk to converted amount + tooltip.
                        Never hide the amount.
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Intl.NumberFormat usage**                                           |
|                                                                       |
| const fmt = new Intl.NumberFormat(locale, { style: \"currency\",      |
| currency: displayCurrency,                                            |
|                                                                       |
| maximumFractionDigits: 0 });                                          |
|                                                                       |
| fmt.format(parseInt(availableBalanceDisplay));                        |
|                                                                       |
| For raw amounts use maximumFractionDigits: 2.                         |
+=======================================================================+

# **10. Help & Support Tab**

Static content tab. No API calls. Content sections required (copy is
placeholder --- Legal must review before launch):

  -----------------------------------------------------------------------
  **Section**        **Content**
  ------------------ ----------------------------------------------------
  **How billing      Numbered steps: track time → client approves →
  works**            billing generates → 20% fee deducted → net added to
                     balance

  **Payout           Info cards per schedule type. Callout: first payout
  schedule**         has a 5-business-day KYC hold.

  **Currency & FX**  Contract rate is locked at creation. Display
                     currency is for reference only. Change in Settings.

  **Taxes**          \$600 USD annual threshold triggers W-9/W-8BEN
                     request. Marketeq does not withhold taxes.

  **Export &         Link to Earnings tab → Export button.
  records**          

  **Contact          Live chat button + support@marketeq.com placeholder.
  support**          
  -----------------------------------------------------------------------

The \"How does billing work?\" CTA in the onboarding state (ES-12 §5)
links directly to this tab.

# **11. Log Time Action Wiring**

## **11.1 Modal open**

On modal open: fetch active contracts from contracts-service. Populate
contract dropdown. If no active contracts, show disabled state with
copy: \"You have no active contracts.\"

## **11.2 Validation rules**

  ---------------------------------------------------------------------------
  **Field**         **Rule**                  **Error copy**
  ----------------- ------------------------- -------------------------------
  **Contract**      Required. Active          Select a contract to continue.
                    contracts only.           

  **Date**          Required. Not future. Not Select a valid date within the
                    \> 90 days past.          allowed range.

  **Start time**    Required. Before end      Start time must be before end
                    time.                     time.

  **End time**      Required. After start     Entries cannot exceed 12 hours.
                    time. Max 12h session.    

  **Description**   Optional. Max 500 chars.  Maximum 500 characters.
  ---------------------------------------------------------------------------

## **11.3 Submit flow**

  -----------------------------------------------------------------------
  **Step**        **Behaviour**
  --------------- -------------------------------------------------------
  **Client        All required fields pass before submit button enables.
  validation**    

  **Overlap       Check existing entries for same contract + date +
  check**         overlapping time. Warn if found: \"You have an
                  overlapping entry. Continue?\"

  **API call**    POST to time-tracking-service. Not to earnings-service.

  **Success**     Close modal. Toast: \"Time entry submitted. Earnings
                  will appear once the session is confirmed.\"

  **Failure**     Inline error inside modal. Do not close. Copy: \"Could
                  not submit. Please try again.\"

  **Balance       Balance does not update immediately. Updates when
  update timing** transaction.created consumer (ES-04) processes the
                  event --- typically \< 5 seconds. Ably event will
                  trigger balance card refresh automatically.
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Log Time calls time-tracking-service, not earnings-service**        |
|                                                                       |
| The submit action POSTs to time-tracking-service.                     |
|                                                                       |
| earnings-service is updated asynchronously via the                    |
| transaction.created RabbitMQ event (ES-04).                           |
|                                                                       |
| Do not poll earnings-service after submit. Wait for the Ably          |
| balance.updated event.                                                |
+=======================================================================+

# **12. References**

  -----------------------------------------------------------------------
  **Document**           **Relevant sections**
  ---------------------- ------------------------------------------------
  **ES-02 --- Contractor Full response shapes for all GET endpoints
  Endpoints**            

  **ES-05 ---            earnings.balance.updated event payload ---
  Publishers**           triggers Ably balance refresh

  **ES-08 --- Fee        feeBreakdown and lineItems field names and label
  Display**              strings

  **ES-09 --- Export**   Sync vs async thresholds, 202 payload,
                         earnings.export.ready event

  **ES-10 --- Error      All errorCode strings used in §8 error state
  Catalog**              switching

  **ES-12 --- UX         Empty state specs, onboarding state, loading
  States**               state min durations
  -----------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
earnings-service ES-13 \| v1.0
