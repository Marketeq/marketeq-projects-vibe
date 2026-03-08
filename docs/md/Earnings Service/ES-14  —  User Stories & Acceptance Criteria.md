**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**earnings-service**

ES-14 --- User Stories & Acceptance Criteria

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        ES-14 --- User Stories & Acceptance Criteria

  **Version**         1.0

  **Stories**         38 across 10 feature areas

  **Format**          Given/When/Then

  **Prerequisites**   ES-02, ES-08, ES-09, ES-12, ES-13
  -----------------------------------------------------------------------

# **1. Balance Card**

### **US-01 --- View current balance**

As a contractor, I want see my available balance on the Overview tab, so
that I know how much I can withdraw.

  -------------------------------------------------------------------------------
  **\#**   **Given**              **When**              **Then**
  -------- ---------------------- --------------------- -------------------------
  **1**    I am authenticated     I open Overview       Balance card shows
                                                        whole-integer amount in
                                                        displayCurrency with
                                                        subtitle from
                                                        displayLabel

  **2**    Balance is \$0.00      I view the card       Card shows \"\$0\"
                                                        normally --- not hidden.
                                                        Withdraw button disabled
                                                        with tooltip \"No
                                                        available balance to
                                                        withdraw.\"

  **3**    GET                    The card loads        Card shows \"Balance
           /v1/earnings/balance                         unavailable\" and a Retry
           returns 500                                  link. No toast.
  -------------------------------------------------------------------------------

### **US-02 --- See local currency equivalent**

As a contractor outside the US, I want see my balance in my local
currency alongside display currency, so that I understand earnings in
familiar terms.

  ------------------------------------------------------------------------------
  **\#**   **Given**             **When**              **Then**
  -------- --------------------- --------------------- -------------------------
  **1**    localCurrency=INR,    I view the balance    Secondary amount shows
           displayCurrency=USD   card                  INR whole-integer
                                                       equivalent

  **2**    localCurrency equals  I view the balance    Only one amount shown ---
           displayCurrency       card                  no duplicate

  **3**    FX API is unavailable I view the card       Balance shown in USD.
           and DB cache \>24h                          Banner: \"Showing in USD
           old                                         --- currency data
                                                       temporarily
                                                       unavailable.\"
  ------------------------------------------------------------------------------

### **US-03 --- Balance updates in real time**

As a contractor, I want see my balance refresh automatically after new
earnings, so that I never need to manually reload.

  -----------------------------------------------------------------------------------
  **\#**   **Given**             **When**                   **Then**
  -------- --------------------- -------------------------- -------------------------
  **1**    Ably is connected and earnings.balance.updated   Balance card refreshes
           I am on Overview      fires                      within 3 seconds without
                                                            page reload

  **2**    Ably is unavailable   I stay on the earnings     Balance polls every 60
                                 page                       seconds while page is
                                                            focused

  **3**    Page moves to         Ably is unavailable        Polling pauses. Resumes
           background tab                                   on focus restore.
  -----------------------------------------------------------------------------------

### **US-04 --- New contractor onboarding state**

As a new contractor with no earnings, I want see a helpful message
instead of a blank screen, so that I understand why no balance is shown.

  ------------------------------------------------------------------------------
  **\#**   **Given**             **When**              **Then**
  -------- --------------------- --------------------- -------------------------
  **1**    No balance_snapshots  I open Overview       Balance card hidden.
           row exists (404)                            Onboarding illustration +
                                                       \"Your earnings will
                                                       appear here once your
                                                       first billing is
                                                       confirmed.\"

  **2**    I am in onboarding    My first              Page transitions to
           state                 transaction.created   normal dashboard
                                 is processed          automatically --- no
                                                       reload required

  **3**    Balance is \$0.00     I open Overview       Normal balance card with
           (200 response)                              \$0 shown --- NOT the
                                                       onboarding state
  ------------------------------------------------------------------------------

# **2. Summary Cards**

### **US-05 --- View period summary cards**

As a contractor, I want see net earnings for Today / This Week / This
Month / All Time, so that I can track earning trends at a glance.

  ------------------------------------------------------------------------------
  **\#**   **Given**             **When**              **Then**
  -------- --------------------- --------------------- -------------------------
  **1**    I open Overview       Summary cards load    Four cards show
                                                       whole-integer net amounts
                                                       in displayCurrency with
                                                       feeNoteLabel subtitle

  **2**    One of the four card  The others succeed    Three cards display
           API calls fails                             normally. Failed card
                                                       shows \"---\" with retry
                                                       icon. No toast.

  **3**    Period has no         I view that card      Card shows \"0\" with
           earnings                                    feeNoteLabel --- not an
                                                       error state
  ------------------------------------------------------------------------------

# **3. Earnings History List**

### **US-06 --- Browse paginated earnings history**

As a contractor, I want browse my earnings history in pages, so that I
can review past sessions without loading everything at once.

  ------------------------------------------------------------------------------
  **\#**   **Given**             **When**              **Then**
  -------- --------------------- --------------------- -------------------------
  **1**    I open the Earnings   List loads            Rows ordered most-recent
           tab                                         first. Each row shows
                                                       date, project, type,
                                                       duration,
                                                       netAmountDisplay.

  **2**    Total entries \> 25   I view the list       Pagination controls
                                                       visible

  **3**    I am on page 3 and    Filter applies        List resets to page 1
           change the date                             
           filter                                      
  ------------------------------------------------------------------------------

### **US-07 --- View fee breakdown per row**

As a contractor, I want see gross, fee, and net for each entry, so that
I understand exactly what was deducted.

  ------------------------------------------------------------------------------
  **\#**   **Given**             **When**              **Then**
  -------- --------------------- --------------------- -------------------------
  **1**    I view any row        I expand the fee      Three lines appear: Gross
                                 chevron               Earnings / Marketeq
                                                       Service Fee (X%) / You
                                                       Receive

  **2**    Fee breakdown is      I read the amounts    Fee is shown as negative.
           expanded                                    All display amounts are
                                                       whole integers. Raw
                                                       rateCurrency amounts
                                                       shown alongside.
  ------------------------------------------------------------------------------

### **US-08 --- Switch between Daily / Weekly / Monthly views**

As a contractor, I want group my earnings by day, week, or month, so
that I can analyse income at different granularities.

  ------------------------------------------------------------------------------
  **\#**   **Given**             **When**              **Then**
  -------- --------------------- --------------------- -------------------------
  **1**    I select Weekly view  List reloads          Rows grouped by
                                                       week-range. Hours and net
                                                       aggregated per week per
                                                       project.

  **2**    I switch from Weekly  List reloads          Page resets to 1. Rows
           to Monthly                                  grouped by month.
  ------------------------------------------------------------------------------

# **4. Filters**

### **US-09 --- Filter by date range preset**

As a contractor, I want filter earnings by common date ranges, so that I
can quickly see earnings for a period.

  ------------------------------------------------------------------------------
  **\#**   **Given**             **When**              **Then**
  -------- --------------------- --------------------- -------------------------
  **1**    I select \"Last       List reloads          Only entries from the
           Month\"                                     previous calendar month
                                                       shown. Preset button
                                                       highlighted.

  **2**    I select \"Custom\"   I try to apply        Inline validation error
           and enter startDate                         shown. API not called.
           after endDate                               
  ------------------------------------------------------------------------------

### **US-10 --- Filter by project, client, type, status**

As a contractor, I want filter by project/client/type/status, so that I
can isolate specific work.

  ------------------------------------------------------------------------------
  **\#**   **Given**             **When**              **Then**
  -------- --------------------- --------------------- -------------------------
  **1**    I select a project    List reloads          Only entries for that
           filter                                      project shown. Filter
                                                       chip appears above list.

  **2**    Multiple filters are  I click \"Clear all\" All filters removed. Full
           active                                      unfiltered list reloads.

  **3**    Filter combination    List loads            Inline empty state with
           returns 0 rows                              active chips visible.
                                                       \"No earnings match your
                                                       current filters.\" +
                                                       Clear all CTA. No toast.
  ------------------------------------------------------------------------------

# **5. Export**

### **US-11 --- Export as CSV --- under 5,000 rows**

As a contractor, I want download my earnings as a CSV, so that I can use
it in spreadsheet software for tax or accounting.

  ------------------------------------------------------------------------------
  **\#**   **Given**             **When**              **Then**
  -------- --------------------- --------------------- -------------------------
  **1**    Filtered earnings \<  I click Export → CSV  Browser downloads
           5,000 rows                                  earnings-YYYY-MM-DD.csv
                                                       with 21 columns. Dates in
                                                       YYYY-MM-DD. Display
                                                       amounts are whole
                                                       integers. UTC note in
                                                       header.

  ------------------------------------------------------------------------------

### **US-12 --- Export large dataset asynchronously**

As a contractor, I want export my full history even if it takes time, so
that I can access complete records.

  ------------------------------------------------------------------------------
  **\#**   **Given**             **When**              **Then**
  -------- --------------------- --------------------- -------------------------
  **1**    Filtered earnings \>= I click Export        202 returned immediately.
           5,000 rows                                  UI shows \"Your export is
                                                       being prepared. We\'ll
                                                       notify you when it\'s
                                                       ready.\"

  **2**    Export job completes  Notification arrives  Notification contains
                                                       download link valid for
                                                       24 hours
  ------------------------------------------------------------------------------

### **US-13 --- Export blocked when no data**

As a contractor, I want see the Export button disabled when no rows
match my filters, so that I am not confused by an empty export.

  ------------------------------------------------------------------------------
  **\#**   **Given**             **When**              **Then**
  -------- --------------------- --------------------- -------------------------
  **1**    Filter returns 0 rows I view the Earnings   Export button disabled.
                                 tab                   Tooltip: \"No data to
                                                       export for the selected
                                                       range.\"

  ------------------------------------------------------------------------------

### **US-14 --- Export rejected when over row limit**

As a contractor, I want see a clear message if my export is too large,
so that I know to narrow my filters.

  ------------------------------------------------------------------------------
  **\#**   **Given**             **When**              **Then**
  -------- --------------------- --------------------- -------------------------
  **1**    Date range has \>     I click Export        400 error. Modal shows:
           500,000 entries                             \"Your export contains
                                                       too many rows. Please
                                                       narrow the date range or
                                                       apply filters.\" Modal
                                                       does not close.

  ------------------------------------------------------------------------------

# **6. Entry Detail Drawer**

### **US-15 --- View full detail for a single entry**

As a contractor, I want drill into a single earnings entry to see all
details including fee breakdown, so that I can verify my pay.

  ------------------------------------------------------------------------------
  **\#**   **Given**             **When**              **Then**
  -------- --------------------- --------------------- -------------------------
  **1**    I click any row in    Drawer opens          Shows: date, time,
           the history list                            duration, project,
                                                       client, contract, type,
                                                       status, 3-row fee table
                                                       (Gross/Fee/You Receive),
                                                       locked FX rate label

  **2**    Entry type is manual  Drawer opens          Activity metrics section
                                                       (keyboard %, mouse %) not
                                                       rendered

  **3**    GET /v1/earnings/:id  Drawer opens          Drawer shows \"This entry
           returns 404                                 could not be found.\"
                                                       with close button. No
                                                       toast.
  ------------------------------------------------------------------------------

# **7. Currency Display**

### **US-16 --- All display amounts are whole integers**

As a contractor, I want see amounts without decimal places, so that the
interface is clean and easy to read.

  ------------------------------------------------------------------------------
  **\#**   **Given**             **When**              **Then**
  -------- --------------------- --------------------- -------------------------
  **1**    Any earnings screen   Display amounts       No decimal places in any
           is open               render                \*Display field. Raw
                                                       rateCurrency fields show
                                                       2 decimal places. \$0
                                                       shows as \"0\" not
                                                       \"0.00\".

  ------------------------------------------------------------------------------

### **US-17 --- Change display currency**

As a contractor, I want change my display currency in Settings, so that
I can view amounts in the currency most useful to me.

  ------------------------------------------------------------------------------
  **\#**   **Given**             **When**              **Then**
  -------- --------------------- --------------------- -------------------------
  **1**    I change              I return to earnings  Amounts convert to new
           displayCurrency in    page                  currency within 5 minutes
           Settings                                    (cache TTL). Next JWT
                                                       refresh shows new
                                                       currency immediately.

  ------------------------------------------------------------------------------

# **8. Empty & Error States**

### **US-18 --- No activity in selected date range**

As a contractor, I want see an informative message when no earnings
exist for a period, so that I know the period is empty rather than
broken.

  ------------------------------------------------------------------------------
  **\#**   **Given**             **When**              **Then**
  -------- --------------------- --------------------- -------------------------
  **1**    I select a date range List loads            Inline empty state: \"No
           with no entries                             earnings found for this
                                                       period. Try a different
                                                       date range or remove
                                                       filters.\" No toast.

  ------------------------------------------------------------------------------

### **US-19 --- Service unavailable graceful degradation**

As a contractor, I want see partial content when a component fails, so
that I am not blocked from using the rest of the page.

  ------------------------------------------------------------------------------
  **\#**   **Given**             **When**              **Then**
  -------- --------------------- --------------------- -------------------------
  **1**    Balance card API      Other components load Balance card shows
           returns 500                                 \"Balance unavailable\" +
                                                       retry link. Summary cards
                                                       and history list function
                                                       independently.

  **2**    Any component         Page loads            Full redirect to login.
           receives 401                                No inline error.
  ------------------------------------------------------------------------------

# **9. Help & Support Tab**

### **US-20 --- Access billing and payout help**

As a contractor, I want access help content about billing, payouts, and
taxes from the earnings page, so that I can answer my own questions
without contacting support.

  ------------------------------------------------------------------------------
  **\#**   **Given**             **When**              **Then**
  -------- --------------------- --------------------- -------------------------
  **1**    I click the Help &    Tab opens             Static content renders:
           Support tab                                 How billing works, Payout
                                                       schedule, Currency & FX,
                                                       Taxes, Export & records,
                                                       Contact support link

  **2**    I am in the           I click \"How does    Help & Support tab opens
           onboarding state      billing work?\"       directly to the billing
                                                       section
  ------------------------------------------------------------------------------

# **10. Admin --- Earnings Support Access**

### **US-21 --- Admin views contractor balance for support**

As a support admin, I want look up any contractor\'s current balance, so
that I can assist with payout or earnings queries.

  ------------------------------------------------------------------------------------------------
  **\#**   **Given**             **When**                                **Then**
  -------- --------------------- --------------------------------------- -------------------------
  **1**    I am authenticated as I call GET                              200 returned with
           an admin              /v1/internal/earnings/balance/:userId   contractor\'s full
                                 with valid X-Service-Token              balance object

  **2**    Contractor has no     I look up their balance                 200 returned with all
           earnings history                                              fields as \"0.00\" --- no
                                                                         404
  ------------------------------------------------------------------------------------------------

### **US-22 --- Admin views contractor YTD earnings for compliance**

As a compliance admin, I want look up a contractor\'s year-to-date
earnings, so that I can determine if a 1099 is required.

  -------------------------------------------------------------------------------------------------------
  **\#**   **Given**                           **When**              **Then**
  -------- ----------------------------------- --------------------- ------------------------------------
  **1**    I call GET                          Contractor has \>=    Response includes ytdTotalUsd \>=
           /v1/internal/earnings/ytd/:userId   \$600 YTD             600 and thresholdReached: true
           for the current year                                      

  **2**    Contractor has \< \$600 YTD         I call the YTD        thresholdReached: false. No error.
                                               endpoint              

  **3**    I supply year=2019 (before platform I call the YTD        422
           launch)                             endpoint              ERR_EARNINGS_YTD_YEAR_OUT_OF_RANGE
                                                                     returned
  -------------------------------------------------------------------------------------------------------

### **US-23 --- Admin access blocked from contractor endpoints**

As the platform, I want prevent admin tokens from accessing
contractor-scoped earnings data directly, so that contractor data is
accessed only through audited internal channels.

  ----------------------------------------------------------------------------------------------
  **\#**   **Given**              **When**              **Then**
  -------- ---------------------- --------------------- ----------------------------------------
  **1**    An admin JWT with      Request arrives       403 ERR_EARNINGS_WRONG_ROLE returned
           role=admin calls GET                         
           /v1/earnings/balance                         

  **2**    An internal            Request arrives       403
           X-Service-Token is                           ERR_EARNINGS_INTERNAL_NETWORK_EXPOSURE
           used from an external                        returned. Infrastructure team alerted.
           IP                                           
  ----------------------------------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
earnings-service ES-14 \| v1.0
