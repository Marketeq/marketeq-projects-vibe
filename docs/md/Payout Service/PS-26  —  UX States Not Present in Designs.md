**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**payout-service**

PS-26 --- UX States Not Present in Designs

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        PS-26 --- UX States Not Present in Designs

  **Version**         1.0

  **Applies to**      All payout-related screens: Earnings overview,
                      Withdrawal modal, Deposit method settings, Schedule
                      settings, Transaction history.

  **Status**          ⚠️ DESIGN TEAM ACTION REQUIRED --- Screens flagged
                      \[DESIGN REQUIRED\] must be produced before
                      engineering can build them.

  **Purpose**         Documents every UI state engineering needs to build
                      that is absent from the provided design files.
                      Ensures nothing is silently left as an undefined
                      state in production.

  **Prerequisites**   PS-13, PS-14, PS-15, PS-16, PS-17, PS-19
  -----------------------------------------------------------------------

# **1. Overview**

Design files provided for the payout feature cover the happy path for a
contractor who already has a verified deposit method, a positive
balance, and a completed payout history. Every state that diverges from
this condition --- empty states, loading states, error states,
first-time user states, and blocked states --- must also be designed and
built. This document catalogs every missing state, defines the exact
copy and behaviour required, and flags where the design team must
produce new screens before engineering can proceed.

+-----------------------------------------------------------------------+
| **Design team: screens flagged \[DESIGN REQUIRED\] block              |
| engineering**                                                         |
|                                                                       |
| Any section marked \[DESIGN REQUIRED\] means engineering cannot build |
| that state                                                            |
|                                                                       |
| until a design screen is provided and approved.                       |
|                                                                       |
| Sections without that flag include copy and layout guidance that      |
| engineering                                                           |
|                                                                       |
| can implement from this specification without a separate design file. |
|                                                                       |
| Priority: P0 states block the MVP launch. P1 states are required but  |
| can follow.                                                           |
+=======================================================================+

# **2. Empty States**

## **2.1 No deposit methods added yet**

  -----------------------------------------------------------------------
  **Element**        **Content**
  ------------------ ----------------------------------------------------
  **Screen**         Deposit method settings (/settings/payouts)

  **Illustration**   Wallet or payment card icon --- neutral, not an
                     error state. \[DESIGN REQUIRED for illustration\]

  **Headline**       Add your first payout method

  **Body**           Choose how you\'d like to receive your earnings. You
                     can add a bank account, PayPal, Wise, Payoneer, a
                     crypto wallet, or request a Marketeq debit card.

  **Primary CTA**    Add payout method

  **CTA behaviour**  Opens the method type selector (first step of the
                     method setup flow).

  **Secondary CTA**  None

  **What does NOT    No \"You haven\'t added a method yet\" error banner.
  appear**           No red. Empty states are welcoming, not alarming.

  **Priority**       P0 --- every new contractor starts here.
  -----------------------------------------------------------------------

## **2.2 No payout history**

  -----------------------------------------------------------------------
  **Element**        **Content**
  ------------------ ----------------------------------------------------
  **Screen**         Transaction history / Payouts history tab

  **Illustration**   Clock or receipt icon. \[DESIGN REQUIRED for
                     illustration\]

  **Headline**       No payouts yet

  **Body**           Your payout history will appear here once you\'ve
                     made your first withdrawal.

  **Primary CTA**    Withdraw now --- only shown if contractor has a
                     verified method and positive balance. Hidden if not.

  **Secondary CTA**  None

  **Priority**       P0
  -----------------------------------------------------------------------

## **2.3 No upcoming scheduled payout**

  -----------------------------------------------------------------------
  **Element**        **Content**
  ------------------ ----------------------------------------------------
  **Screen**         Earnings overview --- \"Next payout\" widget /
                     schedule section

  **Condition**      Contractor has no deposit schedule configured
                     (isActive=false or no schedule row exists).

  **Display**        Widget shows: \"No payout scheduled. Set up
                     automatic payouts to receive your earnings on a
                     regular schedule.\"

  **CTA**            Set up schedule → /settings/payouts/schedule

  **Condition 2**    Schedule exists but nextExecutionAt is null (e.g.
                     threshold schedule with no upcoming trigger date).

  **Display for      \"Next payout triggered when your balance reaches
  Condition 2**      \${threshold}.\"

  **Priority**       P1
  -----------------------------------------------------------------------

## **2.4 \$0 available balance**

  -----------------------------------------------------------------------
  **Element**        **Content**
  ------------------ ----------------------------------------------------
  **Screen**         Earnings overview --- balance display

  **Display**        \$0.00 displayed in the balance field. No error
                     styling --- \$0 is a valid balance.

  **Withdraw button  Disabled. Tooltip on hover/tap: \"You don\'t have
  state**            any earnings to withdraw yet.\"

  **Scheduled payout Shows \"Nothing to pay out\" if a schedule exists
  widget**           but balance is \$0. Does NOT hide the schedule ---
                     the schedule is still active.

  **First-time user  If balance is \$0 and no completed contracts exist:
  variant**          show a contextual message. \"Your earnings will
                     appear here when a client pays for your work.\" ---
                     replaces the \$0 display for brand-new accounts.
                     \[See §6 for full first-time state.\]

  **Priority**       P0
  -----------------------------------------------------------------------

## **2.5 No transactions in selected date range (transaction history filter)**

  -----------------------------------------------------------------------
  **Element**        **Content**
  ------------------ ----------------------------------------------------
  **Screen**         Transaction history --- after date range filter
                     applied with no results

  **Illustration**   Empty calendar or search icon. \[DESIGN REQUIRED for
                     illustration\]

  **Headline**       No transactions found

  **Body**           There are no payouts in the selected date range. Try
                     a different date range or clear the filter.

  **CTA**            Clear filter --- resets to default (all time or last
                     90 days)

  **What does NOT    This state must not reuse the \"No payouts yet\"
  appear**           empty state from §2.2. They are different --- one is
                     truly empty, one is a filtered empty. Different copy
                     is required.

  **Priority**       P1
  -----------------------------------------------------------------------

# **3. Loading States --- 6-Step Withdrawal Modal**

The withdrawal modal has 6 steps. Each step has a loading state that
occurs between the contractor\'s action and the system\'s response.
Every loading state must block further interaction and show a progress
indicator. The following defines loading state copy per step.

  -------------------------------------------------------------------------------------
  **Step**   **Step name**  **Trigger for    **Loading copy**    **Duration estimate**
                            loading state**                      
  ---------- -------------- ---------------- ------------------- ----------------------
  **1**      Select method  Contractor taps  Checking your       \< 1 second typically.
             and enter      \"Continue\".    balance...          Show after 300ms delay
             amount         Backend                              to avoid flash.
                            validates amount                     
                            and method.                          

  **2**      KYC gate check Automatic on     Verifying your      \< 2 seconds. Shown if
                            modal open or    account...          kyc-identity-service
                            step transition.                     response takes \>
                            Fetches KYC gate                     300ms.
                            status.                              

  **3**      Magic link     Contractor       Sending your        1--5 seconds (email
             dispatch       confirms on step confirmation        delivery latency).
                            3. Backend       email...            Spinner with estimated
                            creates token                        wait: \"This usually
                            and publishes                        takes a few seconds.\"
                            email event.                         

  **4**      Awaiting magic Not a loading    Waiting for you to  Up to 15 minutes. Show
             link click     state --- this   confirm via email.  countdown timer:
                            is a waiting     Check your inbox    \"Link expires in
                            state.           for a message from  {mm:ss}.\"
                            Contractor must  Marketeq.           
                            act externally                       
                            (check email).                       

  **5**      Token          Contractor       Verifying your      \< 1 second. Spinner
             verification   clicks magic     confirmation...     while GET
                            link in email.                       /verify-email is in
                            Browser loads                        flight.
                            verification                         
                            page. Backend                        
                            validates token.                     

  **6**      Payout         Token verified.  Your withdrawal is  Varies by method: ACH
             execution      Payout is being  being processed.    may show \"Processing
                            processed.       This may take a     --- funds usually
                                             moment.             arrive in 1--3
                                                                 business days.\"
                                                                 Crypto shows
                                                                 network-specific
                                                                 timing. Card:
                                                                 \"Usually instant.\"
  -------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Loading states: show after 300ms, not immediately**                 |
|                                                                       |
| Showing a spinner on every sub-300ms response creates visual noise.   |
|                                                                       |
| All loading states must be revealed only if the operation takes more  |
| than 300ms.                                                           |
|                                                                       |
| Implementation: set a 300ms setTimeout before showing the spinner.    |
|                                                                       |
| Cancel the timeout if the response arrives first.                     |
|                                                                       |
| This prevents the \"flicker\" of a spinner that appears and           |
| disappears instantly.                                                 |
+=======================================================================+

# **4. Error Display Per Component**

Error display is context-dependent. The same underlying error (e.g.
ERR_INSUFFICIENT_FUNDS) must be displayed differently depending on where
it occurs --- inline in a form field, as a modal message, as a banner,
or as a full-screen intercept.

  ---------------------------------------------------------------------------
  **Error context**   **Display pattern**   **Example**
  ------------------- --------------------- ---------------------------------
  **Form field        Inline below the      Amount field: \"The minimum
  validation          specific field. Red   withdrawal amount is \$50.00.\"
  (frontend-only)**   text. Field border    shown directly below the amount
                      turns red. No toast.  input.

  **Form submission   Inline within the     Step 1 of withdrawal modal:
  error (backend      form/modal. Red alert \"Your available balance is too
  validation)**       box at the top of the low for this withdrawal.\" shown
                      current step.         as a red banner inside the modal
                      Specific field        header.
                      highlighted if        
                      applicable. No        
                      navigation away.      

  **KYC gate error**  Full-screen intercept Tier 1 not verified: entire
                      (see §5). Not a       withdrawal flow is replaced with
                      toast, not a modal    the identity verification prompt.
                      error. Replaces the   
                      withdrawal modal with 
                      a dedicated gate      
                      screen.               

  **Magic link error  Full page --- the     ERR_MAGIC_LINK_EXPIRED: page
  (expired/used)**    verification URL      shows \"This link has
                      returns a dedicated   expired.\" + \"Start new
                      page, not a JSON API  withdrawal\" button. Not inside
                      response. Page shows  the modal (the modal is closed at
                      the error and a CTA   this point).
                      to start a new        
                      withdrawal.           

  **Payout execution  In-app notification + payout.failed event →
  failure (async)**   email. Not shown in   notification-service → \"Your
                      the UI immediately    withdrawal could not be sent. Tap
                      --- the contractor is to view details.\"
                      not watching the      
                      screen at execution   
                      time. Error surfaced  
                      in transaction        
                      history with status   
                      \"Failed\" and a      
                      reason.               

  **Pause condition** Persistent banner per See §7 for exact copy per
                      PS-16. Not a toast.   condition.
                      Not dismissible.      
                      Shown at top of       
                      earnings and payout   
                      screens.              

  **Service           Toast notification    ERR_KYC_SERVICE_UNAVAILABLE or
  unavailable (503)** for transient errors. ERR_PROVIDER_UNAVAILABLE.
                      \"Something went      
                      wrong. Please try     
                      again.\" Retry CTA.   
                      Auto-dismiss after 8  
                      seconds.              

  **Rate limit        Toast notification    ERR_WITHDRAWAL_RATE_LIMIT.
  (429)**             with a countdown:     
                      \"Too many requests.  
                      Try again in          
                      {seconds} seconds.\"  
                      Auto-dismiss when     
                      countdown reaches 0.  
  ---------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **\[DESIGN REQUIRED\] --- Error states within the withdrawal modal**  |
|                                                                       |
| The design files show the happy path of the 6-step withdrawal modal   |
| only.                                                                 |
|                                                                       |
| Design must produce:                                                  |
|                                                                       |
| \- Step-level error state: red alert box within each step for backend |
| errors                                                                |
|                                                                       |
| \- Form field error state: inline red text below each input           |
|                                                                       |
| \- Magic link expired page (standalone --- outside the modal)         |
|                                                                       |
| \- Magic link already-used page (standalone)                          |
|                                                                       |
| \- Payout failed state in transaction history (with failure reason    |
| displayed)                                                            |
+=======================================================================+

# **5. KYC Gating Screen Content and CTA Per Tier**

When a contractor attempts to withdraw and a KYC gate blocks them, the
withdrawal modal is replaced entirely by a full-screen intercept. This
is not a modal error --- it is a dedicated screen. The content differs
by tier. Engineering can build these screens from the specification
below without a separate design file, but the design team must confirm
the layout and illustration.

## **5.1 Tier 1 --- Government ID gate**

  -----------------------------------------------------------------------
  **Element**        **Content**
  ------------------ ----------------------------------------------------
  **Screen type**    Full-screen intercept. Replaces withdrawal modal.

  **Illustration**   Identification card or passport icon. \[DESIGN
                     REQUIRED for illustration asset\]

  **Headline**       Verify your identity to withdraw

  **Body paragraph   Before you can withdraw your earnings, we need to
  1**                verify your identity. This is a one-time step
                     required by financial regulations.

  **Body paragraph   You\'ll need a government-issued photo ID, such as a
  2**                passport, national identity card, or driver\'s
                     licence.

  **Estimated time   Most verifications are completed in under 2 minutes.
  copy**             

  **Primary CTA      Verify my identity
  label**            

  **Primary CTA      Identity verification flow in kyc-identity-service
  destination**      or identity-service UI

  **Secondary CTA    Do this later
  label**            

  **Secondary CTA    Closes the intercept. Returns contractor to the
  behaviour**        Earnings screen. The withdrawal they attempted is
                     not saved.

  **Status variant   If Tier 1 status is \"pending\" (submitted but not
  --- pending**      yet reviewed): show \"Your identity verification is
                     in progress. We\'ll notify you once it\'s complete
                     --- usually within 1--2 business days.\" Primary
                     CTA: \"Got it\". No \"Verify\" CTA shown.

  **Status variant   If Tier 1 status is \"failed\": \"Your identity
  --- failed**       verification was unsuccessful. Please try again with
                     a valid government-issued ID.\" Primary CTA: \"Try
                     again\". Secondary CTA: \"Contact support\".

  **Priority**       P0

  **\[DESIGN         Layout, illustration, and confirmation of copy
  REQUIRED\]**       required from design team.
  -----------------------------------------------------------------------

## **5.2 Tier 2 gate --- US contractor (SSN/ITIN)**

  -----------------------------------------------------------------------
  **Element**        **Content**
  ------------------ ----------------------------------------------------
  **Screen type**    Full-screen intercept.

  **Illustration**   Document with a tax symbol or form icon. \[DESIGN
                     REQUIRED for illustration asset\]

  **Headline**       Add your tax information to withdraw

  **Body paragraph   US contractors are required to provide a Social
  1**                Security Number (SSN) or Individual Taxpayer
                     Identification Number (ITIN) before withdrawing.
                     This is needed for IRS tax reporting.

  **Body paragraph   Your tax information is encrypted and stored
  2**                securely. It is used solely for required tax
                     reporting.

  **Primary CTA      Add tax information
  label**            

  **Primary CTA      Tax identity form --- kyc-identity-service or
  destination**      identity-service UI

  **Secondary CTA    Do this later
  label**            

  **Secondary CTA    Closes intercept. Returns to Earnings.
  behaviour**        

  **Status variant   Your tax information is being reviewed. We\'ll
  --- pending**      notify you once it\'s confirmed.

  **Status variant   The tax ID you provided doesn\'t match IRS records.
  --- TIN mismatch   Please re-enter your SSN or ITIN carefully. ---
  (subReason:        Primary CTA: \"Update tax information\".
  TIN_MISMATCH)**    

  **Status variant   Your W-8BEN tax certification has expired. Please
  --- W-8BEN expired complete a new form to continue withdrawing. ---
  (subReason:        Primary CTA: \"Renew W-8BEN\".
  W8BEN_EXPIRED)**   

  **Priority**       P0

  **\[DESIGN         Layout and illustration required from design team.
  REQUIRED\]**       
  -----------------------------------------------------------------------

## **5.3 Tier 2 gate --- International contractor (W-8BEN)**

  -----------------------------------------------------------------------
  **Element**        **Content**
  ------------------ ----------------------------------------------------
  **Screen type**    Full-screen intercept.

  **Headline**       Complete your tax certification to withdraw

  **Body paragraph   International contractors must complete a W-8BEN
  1**                form to certify their non-US tax status. This is
                     required by US tax law before any earnings can be
                     paid out.

  **Body paragraph   The form takes about 5 minutes to complete. You\'ll
  2**                need your country of residence and, if applicable,
                     your local tax identification number.

  **Primary CTA      Complete W-8BEN
  label**            

  **Primary CTA      W-8BEN form --- kyc-identity-service UI
  destination**      

  **Secondary CTA    Do this later
  label**            

  **Tax treaty       A small contextual note below the CTA: \"If your
  note**             country has a US tax treaty, you may qualify for a
                     reduced withholding rate. The form will guide you
                     through this.\"

  **Priority**       P0

  **\[DESIGN         Layout and illustration required from design team.
  REQUIRED\]**       
  -----------------------------------------------------------------------

## **5.4 Tier 3 gate --- Bank account ownership**

  -----------------------------------------------------------------------
  **Element**        **Content**
  ------------------ ----------------------------------------------------
  **Screen type**    Full-screen intercept. Method-scoped --- only blocks
                     withdrawal to the unverified bank account.

  **Headline**       Verify your bank account to withdraw

  **Body paragraph   Before we can send funds to your bank account ending
  1**                in {last4}, we need to confirm you own it. We\'ve
                     sent two small test deposits.

  **Body paragraph   Check your bank statement for two deposits from
  2**                Marketeq (each less than \$1.00). This usually takes
                     1--3 business days.

  **Primary CTA      Enter deposit amounts
  label**            

  **Primary CTA      Micro-deposit verification screen (PS-08)
  destination**      

  **Secondary CTA    Use a different payout method
  label (if other    
  verified methods   
  exist)**           

  **Secondary CTA    Returns contractor to method selector with the
  behaviour**        unverified bank account greyed out and labelled
                     \"Verification pending\".

  **Status variant   Waiting for test deposits. This usually takes 1--3
  --- deposits not   business days. We\'ll email you when they\'re ready
  yet arrived**      to verify. --- Primary CTA: \"Remind me by email\"
                     (re-sends the notification). Secondary CTA: \"Use a
                     different method\".

  **Priority**       P0

  **\[DESIGN         Layout required. Note that secondary CTA is
  REQUIRED\]**       conditional --- design must handle both variants
                     (with and without secondary CTA).
  -----------------------------------------------------------------------

# **6. First-Time User State --- No Methods, No History**

A contractor who has just signed up has: no deposit methods, no earnings
balance, no payout history, and no schedule. This is a distinct state
from the regular empty state --- it requires an onboarding-oriented
experience, not an empty-list experience.

  -----------------------------------------------------------------------
  **Screen**            **First-time state content**
  --------------------- -------------------------------------------------
  **Earnings overview** Headline: \"Welcome to your earnings dashboard.\"
                        Body: \"This is where you\'ll track your earnings
                        and withdraw funds. Once you complete your first
                        contract, your earnings will appear here.\" CTA:
                        \"Set up your payout method\" →
                        /settings/payouts. No \$0 balance shown ---
                        instead show a placeholder card: \"Your balance
                        will appear here.\"

  **Deposit method      Use §2.1 empty state. Same content --- the
  settings**            first-time variant does not differ for this
                        screen.

  **Transaction         Headline: \"No transactions yet.\" Body: \"Your
  history**             payout history will appear here after your first
                        withdrawal.\" No CTA (they have no balance to
                        withdraw). Distinct from §2.2 which shows a
                        \"Withdraw now\" CTA.

  **Schedule settings** Softer prompt: \"Set up automatic payouts so your
                        earnings are transferred on a schedule you
                        choose.\" CTA: \"Set up a schedule\". Note below:
                        \"You can also withdraw manually at any time.\"
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **\[DESIGN REQUIRED\] --- First-time user state screens**             |
|                                                                       |
| The design files do not include a first-time user state for the       |
| Earnings overview.                                                    |
|                                                                       |
| Design must produce:                                                  |
|                                                                       |
| \- Earnings overview --- first-time state (no balance, no methods, no |
| history)                                                              |
|                                                                       |
| \- Welcome illustration or graphic for this state                     |
|                                                                       |
| The method settings and transaction history first-time states can be  |
| built from                                                            |
|                                                                       |
| the empty state specs in §2 without additional design files.          |
+=======================================================================+

# **7. Paused Payouts Banner --- Exact Content Per Condition**

The paused payouts banner is a persistent, non-dismissible alert in the
promotional banner slot (PS-16). This section reproduces the exact copy
for each condition with full layout specification. \[DESIGN REQUIRED for
the visual design of the amber and red banner variants --- see PS-16 §4
for layout rules.\]

  ------------------------------------------------------------------------------------------------------------------------------------------
  **Condition**                      **Banner   **Icon**   **Headline**   **Body**         **CTA       **CTA destination**
                                     colour**                                              label**     
  ---------------------------------- ---------- ---------- -------------- ---------------- ----------- -------------------------------------
  **NO_DEFAULT_METHOD**              Amber      ⚠️         Your payouts   You don\'t have  Set default /settings/payouts
                                                           are paused.    a default payout payout      
                                                                          method set.      method      

  **DEFAULT_METHOD_DEACTIVATED**     Amber      ⚠️         Your payouts   Your default     Update      /settings/payouts
                                                           are paused.    payout method    payout      
                                                                          has been         method      
                                                                          deactivated and              
                                                                          can no longer                
                                                                          receive payouts.             

  **DEFAULT_METHOD_REAUTH_REQUIRED   Amber      ⚠️         Your payouts   Your PayPal      Reconnect   /settings/payouts?reauth={methodId}
  (PayPal)**                                               are paused.    connection has   PayPal      
                                                                          expired.                     
                                                                          Reconnect your               
                                                                          account to                   
                                                                          resume payouts.              

  **DEFAULT_METHOD_REAUTH_REQUIRED   Amber      ⚠️         Your payouts   Your Wise        Reconnect   /settings/payouts?reauth={methodId}
  (Wise)**                                                 are paused.    connection has   Wise        
                                                                          expired.                     
                                                                          Reconnect your               
                                                                          account to                   
                                                                          resume payouts.              

  **DEFAULT_METHOD_REAUTH_REQUIRED   Amber      ⚠️         Your payouts   Your Payoneer    Reconnect   /settings/payouts?reauth={methodId}
  (Payoneer)**                                             are paused.    connection has   Payoneer    
                                                                          expired.                     
                                                                          Reconnect your               
                                                                          account to                   
                                                                          resume payouts.              

  **OFAC_FLAG**                      Red        🚫         Your payouts   Your account has Contact     https://support.marketeq.com
                                                           are paused.    been flagged for support     
                                                                          a compliance                 
                                                                          review. Payouts              
                                                                          are unavailable              
                                                                          while this                   
                                                                          review is in                 
                                                                          progress.                    

  **ACCOUNT_SUSPENDED**              Red        🚫         Your payouts   Your account has Contact     https://support.marketeq.com
                                                           are paused.    been suspended.  support     
                                                                          Please contact               
                                                                          support for more             
                                                                          information.                 
  ------------------------------------------------------------------------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Banner implementation notes**                                       |
|                                                                       |
| Banner is rendered in the same slot as promotional banners --- not    |
| above or below it.                                                    |
|                                                                       |
| It completely replaces any active promotional banner while the        |
| condition is active.                                                  |
|                                                                       |
| Multiple active conditions: only the highest-priority condition is    |
| shown.                                                                |
|                                                                       |
| Priority order: OFAC_FLAG \> ACCOUNT_SUSPENDED \> REAUTH_REQUIRED \>  |
| DEACTIVATED \> NO_DEFAULT.                                            |
|                                                                       |
| Banner is not dismissible --- no X button, no close action.           |
|                                                                       |
| Banner clears automatically when GET /v1/payouts/pause-status returns |
| paused: false.                                                        |
|                                                                       |
| Frontend polls this endpoint every 30 seconds while a pause banner is |
| active.                                                               |
+=======================================================================+

# **8. Debit Card Setup Flow --- Missing from Designs**

+-----------------------------------------------------------------------+
| **\[DESIGN REQUIRED\] --- All debit card screens are missing from     |
| provided designs**                                                    |
|                                                                       |
| The debit card appears as a deposit method option in the designs.     |
|                                                                       |
| None of the screens required to set up, activate, or manage the card  |
| are provided.                                                         |
|                                                                       |
| Engineering cannot build the debit card flow without these screens.   |
|                                                                       |
| This section documents all required screens for the design team.      |
|                                                                       |
| See also PS-13 for the full technical specification of each screen.   |
|                                                                       |
| Priority: All screens below are P0 --- required before debit card     |
| feature can launch.                                                   |
+=======================================================================+

  ----------------------------------------------------------------------------
  **Screen name**  **Trigger**     **Key elements required**         **Ref**
  ---------------- --------------- --------------------------------- ---------
  **Card type      Contractor      Radio: Virtual card (instant) vs  PS-13 §8
  selection**      selects         Physical card (7--14 business     
                   \"Marketeq      days). Description of each. Terms 
                   Debit Card\"    acceptance checkbox. \"Request    
                   from method     card\" CTA. \"Learn more\" link.  
                   type selector                                     

  **KYC gate ---   Contractor      Same layout as §5.1 KYC gate but  PS-13 §8,
  card**           requests a card context-specific headline:        PS-15
                   but KYC Tier 1  \"Verify your identity to get a   
                   is not yet      Marketeq card.\" Same CTA and     
                   verified        behaviour.                        

  **Card terms     Before card     Card programme terms with         PS-13 §3
  acceptance**     creation ---    scroll + accept checkbox.         
                   separate from   \"Request card\" CTA active only  
                   platform ToS    after checkbox is checked.        

  **Virtual card   After           Displays full card number,        PS-13 §3
  issued**         successful card expiry, CVV in a secure card      
                   creation ---    widget. \"Copy card number\"      
                   virtual card    actions. \"Activate card\" CTA.   
                   type            Security note: \"This is the only 
                                   time your full card number will   
                                   be shown.\"                       

  **Physical card  After           Order confirmation. Estimated     PS-13 §3
  requested**      successful card delivery range: 7--14 business    
                   creation ---    days. \"I\'ll activate it when it 
                   physical card   arrives\" CTA. Support link.      
                   type                                              

  **Card           Physical card   Two inputs: last 4 digits, CVV.   PS-13 §3
  activation**     arrives ---     \"Activate card\" CTA. Error      
                   contractor      state for mismatch (attempt       
                   activates       counter shown after 2nd failure). 
                                   Success state.                    

  **Card           Contractor      Card visual (Marketeq branded     PS-13 §7
  management       views their     Visa). Last 4 digits. Status      
  screen**         active card     badge (Active / Frozen /          
                                   Cancelled). Card balance          
                                   (spending balance, not earnings   
                                   balance). Freeze/unfreeze toggle. 
                                   \"Report lost or stolen\" link.   
                                   \"Cancel card\" link (destructive 
                                   --- confirm dialog required).     
                                   Spending limits section. Recent   
                                   card transactions list (future    
                                   --- not v1).                      

  **Freeze         Contractor taps Confirm dialog: \"Freeze your     PS-13 §7
  confirmation**   freeze toggle   card? You won\'t be able to use   
                                   it for purchases until you        
                                   unfreeze it.\" Cancel / Freeze    
                                   CTA.                              

  **Report         Contractor      Confirm that old card will be     PS-13 §7
  lost/stolen**    reports card    cancelled immediately and a       
                   lost or stolen  replacement card will be ordered. 
                                   Displays replacement delivery     
                                   estimate. Confirm / Cancel.       

  **Cancel card    Contractor      Destructive confirmation dialog:  PS-13 §7
  confirmation**   cancels card    \"Cancel your Marketeq card? This 
                   permanently     cannot be undone. Any balance on  
                                   your card will be returned to     
                                   your earnings balance.\" Type     
                                   \"CANCEL\" to confirm. Cancel /   
                                   Confirm CTA.                      

  **Geographic     Contractor is   Debit card option in method       PS-13 §6
  unavailable      not US-based    selector is visible but disabled  
  state**          and views debit with a lock icon and tooltip:     
                   card option     \"The Marketeq card is currently  
                                   available to US contractors only. 
                                   We\'re working on expanding to    
                                   more countries soon.\"            
  ----------------------------------------------------------------------------

# **9. Additional Missing States**

## **9.1 Split payout --- secondary method verification pending**

  -----------------------------------------------------------------------
  **Element**        **Content**
  ------------------ ----------------------------------------------------
  **Screen**         Deposit method settings --- split payout
                     configuration

  **Condition**      Split is enabled. Secondary method exists but is in
                     PENDING verification state (e.g. micro-deposits not
                     yet verified).

  **Display**        Secondary method shown with a yellow \"Verification
                     pending\" badge. Split toggle remains on. A
                     contextual note below: \"Your split payouts will
                     only go to your primary account until your second
                     account is verified.\"

  **CTA**            Verify now →
                     /settings/payouts?verify={secondaryMethodId}

  **\[DESIGN         Badge and inline note layout within the split
  REQUIRED\]**       configuration UI.
  -----------------------------------------------------------------------

## **9.2 EDD review in progress --- payout status screen**

  -----------------------------------------------------------------------
  **Element**        **Content**
  ------------------ ----------------------------------------------------
  **Screen**         Transaction history --- payout detail screen for a
                     payout in awaiting_edd status

  **Status badge**   Under review --- yellow/amber badge. Not
                     \"Processing\" --- distinct status.

  **Body**           Your withdrawal of \$X,XXX.XX is being reviewed by
                     our compliance team. Large withdrawals are checked
                     before processing. This usually takes 1--2 business
                     days.

  **CTA**            None --- contractor cannot act. Support link shown
                     as a secondary option.

  **\[DESIGN         The awaiting_edd status is not in the design files.
  REQUIRED\]**       Status badge and screen state required.
  -----------------------------------------------------------------------

## **9.3 First payout hold --- payout status screen**

  -----------------------------------------------------------------------
  **Element**        **Content**
  ------------------ ----------------------------------------------------
  **Screen**         Transaction history --- payout detail for a payout
                     in awaiting_hold (first-payout hold active)

  **Status badge**   Scheduled for release --- blue badge.

  **Body**           Your first withdrawal is held for security
                     verification. It will be released on {releaseDate,
                     formatted as \"Monday, June 16\"}.

  **Progress         Optional: a timeline showing \"Withdrawal
  indicator**        requested\" → \"Security hold\" → \"Released on
                     {date}\" → \"Sent\". \[DESIGN REQUIRED if progress
                     indicator is desired.\]

  **CTA**            None --- hold cannot be self-resolved. \"Contact
                     support\" secondary link.
  -----------------------------------------------------------------------

## **9.4 WalletConnect --- connecting state**

  -----------------------------------------------------------------------
  **Element**        **Content**
  ------------------ ----------------------------------------------------
  **Screen**         Crypto wallet setup --- WalletConnect QR code screen

  **States required  \(1\) QR code displayed with countdown timer. (2)
  (all missing from  Scanning in progress (wallet app opened QR). (3)
  designs)**         Connection confirmed (wallet connected, address
                     shown). (4) QR expired (countdown reached 0:00). (5)
                     Connection rejected (user declined in wallet app).

  **State 1 copy**   Scan with your wallet app. Link expires in {mm:ss}.

  **State 2 copy**   Connecting... waiting for your wallet to confirm.

  **State 3 copy**   Connected. Wallet address: {address truncated}.
                     \"Save this wallet\" CTA.

  **State 4 copy**   QR code expired. \"Generate new code\" CTA.

  **State 5 copy**   Connection declined. \"Try again\" CTA.

  **\[DESIGN         All 5 states. The designs only show the static QR
  REQUIRED\]**       code screen.
  -----------------------------------------------------------------------

# **10. Design Deliverables Summary --- Full List**

  -------------------------------------------------------------------------------------
  **Screen / state**         **Priority**   **Blocking    **Section**
                                            build?**      
  -------------------------- -------------- ------------- -----------------------------
  **Empty state              P1             No ---        §2
  illustrations (wallet,                    engineering   
  receipt, calendar icons)**                can use       
                                            placeholder   
                                            icons         

  **Withdrawal modal ---     P0             Yes           §4
  step-level error states                                 
  (red alert banner per                                   
  step)**                                                 

  **Withdrawal modal ---     P0             Yes           §4
  magic link expired page                                 
  (standalone)**                                          

  **Withdrawal modal ---     P0             Yes           §4
  magic link already-used                                 
  page (standalone)**                                     

  **Transaction history ---  P0             Yes           §4
  payout failed state with                                
  reason displayed**                                      

  **KYC Tier 1 intercept     P0             Yes           §5.1
  screen (layout +                                        
  illustration)**                                         

  **KYC Tier 2 intercept     P0             Yes           §5.2
  screen --- US (SSN/ITIN)**                              

  **KYC Tier 2 intercept     P0             Yes           §5.3
  screen --- International                                
  (W-8BEN)**                                              

  **KYC Tier 3 intercept     P0             Yes           §5.4
  screen (layout)**                                       

  **Earnings overview ---    P0             Yes           §6
  first-time user state +                                 
  illustration**                                          

  **Paused payouts banner    P0             Yes           §7
  --- amber variant (visual                               
  design)**                                               

  **Paused payouts banner    P0             Yes           §7
  --- red variant (visual                                 
  design)**                                               

  **Debit card --- card type P0             Yes ---       §8
  selection screen**                        blocks card   
                                            feature       

  **Debit card --- KYC gate  P0             Yes ---       §8
  screen (card context)**                   blocks card   
                                            feature       

  **Debit card --- card      P0             Yes ---       §8
  terms acceptance screen**                 blocks card   
                                            feature       

  **Debit card --- virtual   P0             Yes ---       §8
  card issued screen (secure                blocks card   
  card number display)**                    feature       

  **Debit card --- physical  P0             Yes ---       §8
  card requested screen**                   blocks card   
                                            feature       

  **Debit card --- card      P0             Yes ---       §8
  activation screen**                       blocks card   
                                            feature       

  **Debit card --- card      P0             Yes ---       §8
  management screen**                       blocks card   
                                            feature       

  **Debit card --- freeze    P0             Yes ---       §8
  confirmation dialog**                     blocks card   
                                            feature       

  **Debit card ---           P0             Yes ---       §8
  lost/stolen replacement                   blocks card   
  flow**                                    feature       

  **Debit card --- cancel    P0             Yes ---       §8
  card confirmation dialog**                blocks card   
                                            feature       

  **Debit card ---           P0             Yes           §8
  geographic unavailable                                  
  state**                                                 

  **Split --- secondary      P1             No --- can    §9.1
  method verification                       use inline    
  pending state**                           note          

  **Transaction history ---  P0             Yes           §9.2
  awaiting_edd status badge                               
  and screen**                                            

  **Transaction history ---  P0             Yes           §9.3
  first payout hold status                                
  badge**                                                 

  **WalletConnect --- all 5  P0             Yes           §9.4
  connection states**                                     
  -------------------------------------------------------------------------------------

# **11. References**

  -----------------------------------------------------------------------
  **Document**          **Relevant to**
  --------------------- -------------------------------------------------
  **PS-13 --- Debit     Full technical spec for all debit card screens
  Card Setup &          listed in §8.
  Integration**         

  **PS-14 --- Magic     Magic link expired / used pages. Step 3, 4, 5 of
  Link Email            withdrawal modal.
  Verification**        

  **PS-15 ---           KYC intercept screen content and tier
  KYC-Identity Gating** definitions.

  **PS-16 --- Paused    Banner content, priority, placement, and
  Payouts & Alert       auto-clear behaviour.
  System**              

  **PS-17 --- Schedule  Schedule empty state. EDD hold payout status.
  Execution Engine**    
  -----------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
payout-service PS-26 \| v1.0
