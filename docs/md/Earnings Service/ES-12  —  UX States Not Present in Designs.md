**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**earnings-service**

ES-12 --- UX States Not Present in Designs

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Service**         earnings-service

  **Document**        ES-12 --- UX States Not Present in Designs

  **Version**         1.0

  **Status**          Draft --- Awaiting Engineering Review

  **States            28 across 6 categories
  documented**        

  **Prerequisites**   ES-00 through ES-11

  **Next Document**   ES-13 --- Integration Test Suite
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Purpose**                                                           |
|                                                                       |
| Documents every UI state required by earnings-service that is not     |
| shown in the design files.                                            |
|                                                                       |
| Each state includes: trigger condition, required copy, component      |
| behaviour, and API signal.                                            |
|                                                                       |
| Categories:                                                           |
|                                                                       |
| §2 Empty states (5)                                                   |
|                                                                       |
| §3 Loading states per component (6)                                   |
|                                                                       |
| §4 Error states per component (8)                                     |
|                                                                       |
| §5 First-time contractor onboarding state                             |
|                                                                       |
| §6 Help & Support tab content requirements                            |
|                                                                       |
| §7 Log Time quick action --- behaviour and validation                 |
+=======================================================================+

# **2. Empty States**

Empty states occur when data exists but is genuinely absent for the
current context --- not an error. All empty states return HTTP 200 or
404 with ERR_EARNINGS\_\*\_NOT_FOUND. None should show a generic error
toast.

## **2.1 Zero balance --- contractor has been fully paid out**

  -----------------------------------------------------------------------
  **Property**          **Spec**
  --------------------- -------------------------------------------------
  **Trigger**           GET /v1/earnings/balance returns 200 with
                        availableBalance=\"0.00\"

  **API signal**        HTTP 200. availableBalanceDisplay=\"0\". Not a
                        404.

  **Headline copy**     \"\$0\" (or local currency equivalent --- whole
                        unit, no decimals)

  **Subtext copy**      \"After reserve & threshold deductions\"

  **Balance card        Show card normally. Show \$0 prominently. Do not
  state**               hide or replace the card.

  **CTA visible**       Yes --- \"Withdraw\" button is disabled (zero
                        balance). Tooltip: \"No available balance to
                        withdraw.\"

  **Earnings history**  Still queryable --- show history list normally
                        below the balance card.

  **Do NOT show**       Onboarding/empty state illustration. That is
                        reserved for Case 2.2 only.
  -----------------------------------------------------------------------

## **2.2 No earnings history --- first-time contractor**

  -----------------------------------------------------------------------
  **Property**          **Spec**
  --------------------- -------------------------------------------------
  **Trigger**           GET /v1/earnings/balance returns 404 with
                        errorCode ERR_EARNINGS_BALANCE_NOT_FOUND

  **API signal**        HTTP 404.
                        errorCode=ERR_EARNINGS_BALANCE_NOT_FOUND.

  **Illustration**      Show onboarding illustration (to be designed).
                        Centred, above copy.

  **Headline copy**     \"Your earnings will appear here\"

  **Body copy**         \"Once your first billing is confirmed, you\'ll
                        see your balance and full earnings history
                        here.\"

  **CTA**               None --- no withdraw button, no export button.

  **Balance card**      Hidden entirely. Do not show a \$0 card.

  **Do NOT show**       Error toast. Error icon. Red text. This is an
                        expected state for new contractors.
  -----------------------------------------------------------------------

## **2.3 No activity in selected date range**

  -----------------------------------------------------------------------
  **Property**          **Spec**
  --------------------- -------------------------------------------------
  **Trigger**           GET /v1/earnings returns 404 with errorCode
                        ERR_EARNINGS_NO_DATA_IN_RANGE

  **API signal**        HTTP 404.
                        errorCode=ERR_EARNINGS_NO_DATA_IN_RANGE.

  **Scope**             Earnings history list only. Balance card remains
                        visible with current balance.

  **Illustration**      Small inline empty state (not full-page). No
                        separate illustration file needed.

  **Copy**              \"No earnings found for this period.\" + \"Try a
                        different date range or remove filters.\"

  **CTA**               Date range picker highlighted/pulsing to guide
                        interaction.

  **Do NOT show**       Full-page empty state. Error toast.
  -----------------------------------------------------------------------

## **2.4 No results for active filter combination**

  -----------------------------------------------------------------------
  **Property**          **Spec**
  --------------------- -------------------------------------------------
  **Trigger**           GET /v1/earnings returns 404 when projectId,
                        clientId, entryType, or status filter yields zero
                        rows

  **API signal**        HTTP 404.
                        errorCode=ERR_EARNINGS_NO_DATA_IN_RANGE.

  **Distinguishing from Show active filter chips above the empty state.
  2.3**                 List which filters are active.

  **Copy**              \"No earnings match your current filters.\"

  **CTA**               \"Clear filters\" button --- removes all active
                        filters and re-fetches.

  **Filter chips**      Remain visible above the empty state so the user
                        can see what is active.
  -----------------------------------------------------------------------

## **2.5 Export --- no rows to export**

  -----------------------------------------------------------------------
  **Property**          **Spec**
  --------------------- -------------------------------------------------
  **Trigger**           User requests export but the selected date
                        range + filters return zero rows

  **API signal**        HTTP 404 with ERR_EARNINGS_NO_DATA_IN_RANGE
                        before export is initiated

  **Behaviour**         Do not call GET /v1/earnings/export. Disable the
                        Export button.

  **Copy**              Tooltip on disabled Export button: \"No data to
                        export for the selected range.\"

  **Row count           Show \"0 rows\" next to Export button before
  indicator**           confirming --- computed from the live history
                        count.
  -----------------------------------------------------------------------

# **3. Loading States Per Component**

Every component that makes an async API call must show a loading state.
Skeleton loaders are preferred over spinners for content-heavy
components. Spinners are acceptable for single-value components.

  ----------------------------------------------------------------------------
  **Component**      **Loading          **Duration         **Copy during
                     treatment**        trigger**          load**
  ------------------ ------------------ ------------------ -------------------
  **Balance card --- Skeleton block:    On mount + after   --- (no text during
  main amount**      120px × 40px,      balance            skeleton)
                     pulsing grey       invalidation event 

  **Balance card --- Skeleton block:    Same as main       ---
  secondary (local   80px × 24px        amount             
  currency)**                                              

  **Earnings history 3 skeleton rows:   On date range      ---
  list --- rows**    full-width,        change, filter     
                     alternating        change, or page    
                     shading, 16px      turn               
                     height each                           

  **Summary cards    4 skeleton cards:  On mount and       ---
  (Today / Week /    same dimensions as period tab change  
  Month / All        real cards,                           
  Time)**            pulsing                               

  **Export button**  Spinner inside     From click until   Preparing export...
                     button, button     200 (sync) or 202  
                     text changes to    (async) received   
                     \"Preparing                           
                     export...\"                           

  **Entry detail     Full-width         On drawer open     ---
  drawer**           skeleton covering  until GET          
                     fee section,       /v1/earnings/:id   
                     activity section,  responds           
                     time section                          
  ----------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Skeleton minimum display time**                                     |
|                                                                       |
| Set a minimum skeleton display time of 150ms.                         |
|                                                                       |
| If the API responds in \< 150ms, hold the skeleton for the remainder  |
| to prevent layout flash.                                              |
|                                                                       |
| This applies to all 6 components above.                               |
+=======================================================================+

# **4. Error States Per Component**

Error states appear when an API call fails with a non-404 error code.
Each component has its own inline error treatment --- not a full-page
error overlay, and not a generic toast except where noted.

  -----------------------------------------------------------------------------------------------------
  **Component**     **Error trigger**                  **Inline          **Toast?**     **Retry CTA?**
                                                       treatment**                      
  ----------------- ---------------------------------- ----------------- -------------- ---------------
  **Balance card**  500 or 503 from GET                Replace card      No             Yes ---
                    /v1/earnings/balance               content with:                    \"Retry\" link
                                                       \"Balance                        inside card
                                                       unavailable\" +                  
                                                       small warning                    
                                                       icon. Keep card                  
                                                       frame visible.                   

  **Balance card    422                                Show balance in   No             No ---
  --- FX            ERR_EARNINGS_FX_RATE_UNAVAILABLE   USD with banner:                 auto-retries on
  unavailable**                                        \"Showing in USD                 next page load
                                                       --- currency data                
                                                       temporarily                      
                                                       unavailable.\"                   

  **Earnings        500 or 503 from GET /v1/earnings   Replace list      No             Yes --- \"Try
  history list**                                       with: \"Could not                again\" button
                                                       load earnings.                   
                                                       Please try                       
                                                       again.\" + retry                 
                                                       button.                          

  **Summary cards** 500 or 503 from GET                Replace each card No             Yes ---
                    /v1/earnings/summary               amount with                      \"Refresh\"
                                                       \"---\". Show one                link
                                                       shared error                     
                                                       message below all                
                                                       4 cards.                         

  **Export --- sync 500 from GET /v1/earnings/export   Toast only:       Yes            Toast includes
  failure**                                            \"Export failed.                 retry action
                                                       Please try                       
                                                       again.\"                         

  **Export ---      earnings.export.ready not received In-app            No ---         Yes --- button
  async job         after 5 minutes                    notification:     notification   in notification
  failure**                                            \"Your export                    
                                                       could not be                     
                                                       completed. Please                
                                                       try again.\"                     

  **Entry detail    404 ERR_EARNINGS_ENTRY_NOT_FOUND   Drawer shows:     No             No
  drawer**                                             \"This entry                     
                                                       could not be                     
                                                       found.\" with                    
                                                       close button.                    

  **Auth failure on 401 from any endpoint              Full redirect to  No             N/A ---
  any component**                                      login. No inline                 redirect
                                                       treatment.                       
  -----------------------------------------------------------------------------------------------------

# **5. First-Time Contractor Onboarding State**

The first-time state is triggered by ERR_EARNINGS_BALANCE_NOT_FOUND
(404) on initial page load. It replaces the entire earnings dashboard
with a single centred onboarding view.

  -----------------------------------------------------------------------
  **Element**        **Spec**
  ------------------ ----------------------------------------------------
  **Page layout**    Full earnings page replaced by centred single-column
                     layout. Navigation tabs hidden.

  **Illustration**   To be provided by design. Placeholder: clock/money
                     icon. 200px × 200px.

  **Headline**       \"Welcome to Earnings\"

  **Body (line 1)**  \"Your balance and earnings history will appear here
                     once your first work session is billed.\"

  **Body (line 2)**  \"Make sure your account is connected to an active
                     contract with billing enabled.\"

  **Primary CTA**    \"View My Contracts\" --- links to contracts page.

  **Secondary CTA**  \"How does billing work?\" --- opens Help & Support
                     tab (§6).

  **Persistence**    Show until the first successful GET
                     /v1/earnings/balance returns 200. Then show normal
                     dashboard.

  **Poll behaviour** Poll GET /v1/earnings/balance every 60 seconds while
                     onboarding state is visible. Switch to normal
                     dashboard automatically on 200.

  **Do NOT show**    Zero balance card. Empty history list. Export
                     button. Withdraw button.
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Distinguishing onboarding state from zero balance state**           |
|                                                                       |
| Onboarding state: 404 ERR_EARNINGS_BALANCE_NOT_FOUND --- contractor   |
| has never had a transaction.                                          |
|                                                                       |
| Zero balance state: 200 with availableBalance=\"0.00\" --- contractor |
| has been fully paid out.                                              |
|                                                                       |
| These are visually and semantically distinct. Never show the          |
| onboarding illustration for a 200+\$0 response.                       |
|                                                                       |
| The balance card with \$0 is the correct treatment for a fully        |
| paid-out contractor.                                                  |
+=======================================================================+

# **6. Help & Support Tab --- Content Requirements**

The Help & Support tab is referenced in the onboarding state CTA (§5)
and is accessible from the earnings page header. Design files do not
specify its content. Required content items are listed below.

  ------------------------------------------------------------------------------
  **Section**        **Content item**                         **Format**
  ------------------ ---------------------------------------- ------------------
  **How billing      Explain: contractor rate × hours tracked Numbered steps
  works**            = gross earnings. 20% service fee        with icons
                     deducted. Net deposited to available     
                     balance.                                 

  **How billing      Explain: billing happens automatically   Numbered steps
  works**            after each tracked work session is       with icons
                     approved by the client.                  

  **Payout           Explain:                                 Info cards per
  schedule**         daily/weekly/bi-weekly/monthly/custom.   schedule type
                     Minimum \$50. Instant withdrawal         
                     available for \$1.75 fee.                

  **Payout           Explain: first payout has a              Callout box
  schedule**         5-business-day hold for KYC              
                     verification.                            

  **Currency & FX**  Explain: contract rate is locked at      Plain text +
                     contract creation. Display currency can  Settings link
                     be changed in Settings.                  

  **Currency & FX**  Explain: displayed amounts are           Plain text
                     approximate conversions for reference    
                     only. Payouts are always in the contract 
                     currency.                                

  **Taxes &          Explain: \$600 USD annual threshold      Callout box with
  compliance**       triggers W-9/W-8BEN form request from    link to tax docs
                     Marketeq.                                

  **Taxes &          Explain: Marketeq does not withhold      Disclaimer text
  compliance**       taxes. Contractor is responsible for     
                     their own tax obligations.               

  **Export &         Explain: export your full earnings       Plain text + link
  records**          history as CSV or PDF from the Earnings  to earnings
                     History tab.                             history

  **Contact          Link to live chat / email support.       Button + email
  support**          Include Marketeq support email address   link
                     (placeholder: support@marketeq.com).     
  ------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Content ownership**                                                 |
|                                                                       |
| The Help & Support tab content is owned by the Product/Legal team --- |
| not engineering.                                                      |
|                                                                       |
| Engineering must provide the tab shell, routing, and rendering        |
| component.                                                            |
|                                                                       |
| The copy above is a placeholder specification. Legal must review the  |
| tax and compliance items before launch.                               |
+=======================================================================+

# **7. Log Time Quick Action --- Behaviour & Validation**

The Log Time quick action appears in the earnings dashboard header. It
allows contractors to manually submit time entries. Design files show
the button but do not specify validation rules, error states, or the
submission flow.

## **7.1 Entry form fields and validation**

  ------------------------------------------------------------------------------------------
  **Field**            **Type**   **Required?**   **Validation rules**   **Error copy**
  -------------------- ---------- --------------- ---------------------- -------------------
  **Contract**         Dropdown   Yes             Must select from       Select a contract
                                                  active contracts only. to continue.
                                                  Contracts with status  
                                                  != active are greyed   
                                                  out and unselectable.  

  **Date**             Date       Yes             Cannot be in the       Select a valid date
                       picker                     future. Cannot be more within the allowed
                                                  than 90 days in the    range.
                                                  past (configurable).   
                                                  Cannot be a date where 
                                                  the contract was not   
                                                  yet active.            

  **Start time**       Time       Yes             Must be before end     Start time must be
                       picker                     time. Cannot be in the before end time.
                       (HH:MM)                    future.                

  **End time**         Time       Yes             Must be after start    Entries cannot
                       picker                     time. Entry cannot     exceed 12 hours.
                       (HH:MM)                    exceed 12 hours        Please split into
                                                  (single session cap).  multiple sessions.

  **Description**      Text area  No              Max 500 characters. No Maximum 500
                                                  special validation.    characters.

  **Activity level     Not shown  N/A             Manual entries always  ---
  (keyboard/mouse)**   for manual                 have                   
                       entries                    avgKeyboardPct=null,   
                                                  avgMousePct=null.      
  ------------------------------------------------------------------------------------------

## **7.2 Submission flow**

  -----------------------------------------------------------------------
  **Step**        **Behaviour**
  --------------- -------------------------------------------------------
  **1 --- Form    Client-side validation runs on all required fields
  validation**    before submit. Submit button disabled until all
                  required fields pass.

  **2 ---         Before calling the API, check for an existing entry on
  Duplicate       the same contract + same date with overlapping time
  check**         range. Show warning: \"You have an existing entry that
                  overlaps this time. Continue?\" with Confirm / Cancel.

  **3 --- API     POST to time-tracking-service (not earnings-service).
  call**          earnings-service receives the resulting
                  transaction.created event asynchronously.

  **4 --- Success Close modal. Show toast: \"Time entry submitted.
  state**         Earnings will appear once the session is confirmed.\"
                  Balance does not update immediately --- it updates when
                  transaction.created is processed.

  **5 --- Failure If API returns error: show inline error inside modal.
  state**         Do not close. Copy: \"Could not submit time entry.
                  Please try again.\"

  **6 --- Pending Submitted entry does not appear in earnings history
  state**         immediately. It appears once the transaction.created
                  consumer (ES-04) processes the event --- typically \< 5
                  seconds.
  -----------------------------------------------------------------------

## **7.3 State of Log Time button**

  -----------------------------------------------------------------------
  **Condition**               **Button state**
  --------------------------- -------------------------------------------
  **Contractor has no active  Disabled. Tooltip: \"You have no active
  contracts**                 contracts. Log Time requires an active
                              contract.\"

  **Contractor account        Hidden entirely.
  suspended**                 

  **Normal state**            Enabled.

  **While entry is            Disabled. Spinner inside button. Copy:
  submitting**                \"Submitting...\"

  **After successful submit** Enabled. Toast shown separately.
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Log Time is not an earnings-service endpoint**                      |
|                                                                       |
| Log Time submission calls time-tracking-service, not                  |
| earnings-service.                                                     |
|                                                                       |
| earnings-service is updated asynchronously via the                    |
| transaction.created RabbitMQ event (ES-04).                           |
|                                                                       |
| The Log Time button behaviour is specified here because the earnings  |
| dashboard hosts it,                                                   |
|                                                                       |
| but its API integration belongs to the time-tracking-service          |
| documentation.                                                        |
+=======================================================================+

# **8. References**

  -----------------------------------------------------------------------
  **Document**              **Relationship**
  ------------------------- ---------------------------------------------
  **ES-02 --- Contractor    Balance and history API signals that trigger
  Endpoints**               these UI states

  **ES-04 --- RabbitMQ      transaction.created processing --- explains
  Consumers**               why Log Time earnings appear with a delay

  **ES-10 --- Error         errorCode strings used to distinguish UI
  Catalog**                 states in §2, §3, §4

  **ES-11 --- Edge Cases**  Cases 01 and 02 map directly to §2.1 and §2.2
                            of this document
  -----------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
earnings-service ES-12 \| v1.0
