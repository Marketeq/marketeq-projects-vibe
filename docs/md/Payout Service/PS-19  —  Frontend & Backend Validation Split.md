**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**payout-service**

PS-19 --- Frontend & Backend Validation Split

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        PS-19 --- Frontend & Backend Validation Split

  **Version**         1.0

  **Applies to**      All payout flows: manual withdrawal, deposit method
                      setup, schedule configuration, split payout config.

  **Validation        Frontend only (UX guard), Backend only
  layers**            (security/business rule), Both (duplicated for UX +
                      enforcement).

  **Key rule**        Frontend validations are UX --- they can be
                      bypassed. Backend validations are the enforcement
                      layer. Any rule that would produce data loss,
                      incorrect fund movement, or a security failure MUST
                      be enforced on the backend regardless of frontend
                      coverage.

  **Prerequisites**   PS-02, PS-03, PS-04, PS-08, PS-10, PS-14, PS-15,
                      PS-17, PS-18
  -----------------------------------------------------------------------

# **1. Overview and Layer Definitions**

Every input across every payout flow belongs to one of three validation
categories. Frontend only validations are UX helpers --- they improve
the experience but do not constitute enforcement. A sufficiently
technical user who submits a raw API request bypasses them entirely.
Backend only validations are rules that require server-side context
(balance state, rate limiting, idempotency) or that are too expensive to
run client-side on every keystroke. Both validations are rules that are
enforced on the backend AND mirrored on the frontend so the contractor
receives immediate feedback --- the backend is always the source of
truth, the frontend check is a convenience layer only.

  -------------------------------------------------------------------------
  **Layer**    **Enforced by**       **Can be bypassed  **Purpose**
                                     by raw API call?** 
  ------------ --------------------- ------------------ -------------------
  **Frontend   Browser / client code Yes                UX convenience.
  only**                                                Prevents obviously
                                                        invalid inputs
                                                        before server
                                                        round-trip.

  **Backend    payout-service API    No                 Rules requiring
  only**                                                server state,
                                                        security
                                                        enforcement, or
                                                        execution-time
                                                        re-checks.

  **Both**     Browser AND           No (backend always Rules where
               payout-service API    enforces)          immediate UI
                                                        feedback matters
                                                        AND enforcement is
                                                        required.
  -------------------------------------------------------------------------

# **2. Frontend Only Validations**

+-----------------------------------------------------------------------+
| **Frontend-only validations are UX helpers --- not security           |
| controls**                                                            |
|                                                                       |
| None of the rules in this section are enforced by the backend.        |
|                                                                       |
| They exist solely to prevent user mistakes and improve form           |
| usability.                                                            |
|                                                                       |
| No backend error code maps to these --- they never reach the API.     |
+=======================================================================+

## **2.1 Schedule Calendar --- Past Dates Disabled**

  --------------------------------------------------------------------------
  **Field**    **Flow**      **Rule**            **Implementation**
  ------------ ------------- ------------------- ---------------------------
  **Start date Schedule      All dates before    Date picker renders
  picker on    creation /    today are disabled  disabled state (greyed out,
  deposit      edit          and unselectable.   not clickable) for any date
  schedule**                 Today is            \< today. Today\'s date is
                             selectable. No      calculated in the user\'s
                             minimum future date local timezone, not UTC.
                             beyond today.       

  --------------------------------------------------------------------------

## **2.2 Split Percentage Fields --- Auto-Balance**

  ---------------------------------------------------------------------------
  **Field**   **Flow**        **Rule**            **Implementation**
  ----------- --------------- ------------------- ---------------------------
  **Primary % Split payout    Editing one field   onChange handler on both
  and         configuration   auto-fills the      fields. Secondary input may
  Secondary %                 other in real time. be read-only or editable
  inputs**                    See PS-18 §3 for    depending on UX decision
                              full rules.         (either way, API only
                              Secondary field     accepts
                              always shows 100 −  primarySplitPercent).
                              primary.            

  ---------------------------------------------------------------------------

## **2.3 Withdrawal Amount --- Currency Formatting**

  --------------------------------------------------------------------------
  **Field**    **Flow**      **Rule**            **Implementation**
  ------------ ------------- ------------------- ---------------------------
  **Amount     Manual        Non-numeric         Input type=\"text\" with
  input on     withdrawal    characters stripped numeric input filter.
  withdrawal   initiation    in real time. Input onKeyDown strips
  screen**                   formatted as        non-numeric/non-decimal
                             currency: commas    characters. onBlur formats
                             inserted at         to 2dp with commas.
                             thousands, 2        Prevents paste of
                             decimal places      non-numeric strings.
                             enforced. Leading   
                             zeros stripped.     
                             Negative values     
                             prevented.          

  --------------------------------------------------------------------------

## **2.4 Withdraw Full Amount --- Pre-fill**

  ----------------------------------------------------------------------------
  **Field**      **Flow**      **Rule**            **Implementation**
  -------------- ------------- ------------------- ---------------------------
  **\"Withdraw   Manual        When toggled:       Toggle sets amount field
  full amount\"  withdrawal    amount input        value to (displayedBalance
  toggle or      initiation    pre-fills with      − reserveAmount). If no
  button**                     contractor\'s       reserve configured:
                               current available   pre-fills with full
                               balance minus the   displayedBalance. Value
                               reserve amount (if  sourced from the GET
                               reserve is          /v1/balance response
                               configured). Amount already loaded on the page
                               field becomes       --- not a new fetch.
                               read-only while     
                               toggle is on.       
                               Toggle off: amount  
                               field becomes       
                               editable again,     
                               value cleared.      

  ----------------------------------------------------------------------------

## **2.5 Reserve Amount --- \$250 Cap at Input Level**

  ----------------------------------------------------------------------------
  **Field**    **Flow**        **Rule**            **Implementation**
  ------------ --------------- ------------------- ---------------------------
  **Reserve    Schedule        Input capped at     Max attribute or onKeyDown
  amount input configuration   \$250.00 at the UI  cap at 250. Any pasted
  on schedule                  level. User cannot  value above 250 is silently
  settings**                   type a value above  truncated to 250. Decimal
                               250. Maximum        input allowed up to 2dp.
                               enforced on         Label reads: \"Reserve up
                               keypress --- not    to \$250.00\"
                               just on submit.     

  ----------------------------------------------------------------------------

## **2.6 Additional Frontend-Only UX Guards**

  ------------------------------------------------------------------------
  **Field /         **Flow**         **Rule**
  Element**                          
  ----------------- ---------------- -------------------------------------
  **Submit /        All forms        Disabled until all required fields
  Withdraw button**                  are filled and pass client-side
                                     format checks. Prevents accidental
                                     double-submit during loading state
                                     --- button disabled and shows spinner
                                     after first click.

  **Secondary       Split            Dropdown excludes the currently
  method selector   configuration    selected primary method. Cannot
  in split config**                  select the same method for both
                                     primary and secondary.

  **Micro-deposit   Bank account     Accepts only positive decimal values
  amount inputs**   micro-deposit    between \$0.01 and \$0.99. Values
                    verification     outside range blocked at input.

  **Schedule        Schedule         If THRESHOLD frequency is selected:
  frequency         creation         amount input shown. If
  selector**                         WEEKLY/BIWEEKLY/MONTHLY: amount input
                                     hidden and calendar shown. Toggle
                                     between field sets is frontend
                                     routing only.

  **WalletConnect   Crypto wallet    5-minute countdown displayed. At
  countdown timer** connection       0:00: QR code greyed out, \"Try
                                     Again\" button appears. Timer is
                                     purely display --- backend session
                                     TTL is the enforcement (PS-10 §5.3).
  ------------------------------------------------------------------------

# **3. Backend Only Validations**

+-----------------------------------------------------------------------+
| **Backend-only validations require server-side context --- cannot be  |
| replicated client-side**                                              |
|                                                                       |
| These rules depend on state that only the server knows: live balance, |
|                                                                       |
| concurrent request history, idempotency records, execution-time KYC   |
| status.                                                               |
|                                                                       |
| The frontend has no equivalent check for any rule in this section.    |
+=======================================================================+

## **3.1 Idempotency Checks**

  ------------------------------------------------------------------------
  **Rule**               **Layer**   **Detail**
  ---------------------- ----------- -------------------------------------
  **Duplicate withdrawal Backend     If POST /v1/payouts/initiate is
  request detected**     only        received with the same idempotencyKey
                                     as a previously processed request for
                                     the same contractorId: return the
                                     original response without creating a
                                     new payout_requests row.
                                     idempotencyKey is client-provided
                                     (UUID) or generated server-side from
                                     contractorId + timestamp + methodId
                                     hash if not provided. See PS-02 for
                                     full idempotency key spec.

  **Duplicate schedule   Backend     ScheduledPayoutExecutor checks for an
  execution detected**   only        existing payout_requests row with
                                     matching scheduleId + splitRole +
                                     executionCycleId before creating a
                                     new one. Prevents double execution if
                                     cron fires twice in rapid succession
                                     (e.g. pod restart during execution
                                     window).

  **Duplicate deposit    Backend     On POST /v1/deposit-methods: if a
  method creation**      only        BANK_MANUAL or BANK_STRIPE method
                                     with the same account number hash
                                     already exists for the contractor,
                                     return the existing method ID rather
                                     than creating a duplicate. Account
                                     number hash is a SHA-256 of the
                                     normalised account number --- stored
                                     for deduplication only.
  ------------------------------------------------------------------------

## **3.2 Rate Limiting --- 5 Withdrawals Per Hour**

  -------------------------------------------------------------------------
  **Rule**               **Layer**   **Detail**
  ---------------------- ----------- --------------------------------------
  **Manual withdrawal    Backend     Maximum 5 POST /v1/payouts/initiate
  rate limit**           only        requests per contractorId per rolling
                                     60-minute window. Tracked in Redis:
                                     key =
                                     ratelimit:withdrawal:{contractorId},
                                     value = count, TTL = 3600s. On 6th
                                     request: HTTP 429
                                     ERR_WITHDRAWAL_RATE_LIMIT. Limit
                                     applies to manual withdrawals only ---
                                     scheduled payouts are exempt.

  -------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/withdrawal/rate-limit.guard.ts                                 |
|                                                                       |
| async checkWithdrawalRateLimit(contractorId: string): Promise\<void\> |
| {                                                                     |
|                                                                       |
| const key = \`ratelimit:withdrawal:\${contractorId}\`;                |
|                                                                       |
| const count = await this.redis.incr(key);                             |
|                                                                       |
| if (count === 1)                                                      |
|                                                                       |
| await this.redis.expire(key, 3600); // Set TTL on first increment     |
| only                                                                  |
|                                                                       |
| if (count \> 5)                                                       |
|                                                                       |
| throw new PayoutError(                                                |
|                                                                       |
| \"You have reached the maximum of 5 withdrawals per hour. Please try  |
| again later.\",                                                       |
|                                                                       |
| HttpStatus.TOO_MANY_REQUESTS,                                         |
|                                                                       |
| \"ERR_WITHDRAWAL_RATE_LIMIT\",                                        |
|                                                                       |
| { retryAfterSeconds: await this.redis.ttl(key) },                     |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **3.3 Balance Sufficiency Re-Check at Execution**

  ------------------------------------------------------------------------
  **Rule**               **Layer**   **Detail**
  ---------------------- ----------- -------------------------------------
  **Available balance    Backend     The contractor\'s balance is checked
  re-checked at          only        at initiation (to validate the
  execution time**                   requested amount) AND again
                                     immediately before execution (to
                                     guard against race conditions where
                                     another withdrawal processed between
                                     initiation and execution). If balance
                                     at execution is less than the payout
                                     amount: payout_requests.status →
                                     failed, failureReason =
                                     INSUFFICIENT_BALANCE_AT_EXECUTION.
                                     Contractor notified. Balance
                                     unchanged.

  ------------------------------------------------------------------------

## **3.4 KYC Tier Check at Execution**

  ------------------------------------------------------------------------
  **Rule**               **Layer**   **Detail**
  ---------------------- ----------- -------------------------------------
  **KYC status           Backend     KYC tier status is checked at
  re-verified at         only        initiation (PS-15) AND re-verified at
  execution**                        execution time. A contractor\'s KYC
                                     status can change between initiation
                                     and execution (e.g. KYC failed after
                                     initiation, OFAC flag added). If any
                                     KYC gate fails at execution:
                                     payout_requests.status → failed.
                                     Contractor notified. Balance
                                     unchanged. This is distinct from the
                                     initiation check --- it is a second
                                     independent gate.

  ------------------------------------------------------------------------

## **3.5 Additional Backend-Only Rules**

  ----------------------------------------------------------------------------------------
  **Rule**               **Error code**                     **Detail**
  ---------------------- ---------------------------------- ------------------------------
  **Withdrawal amount    ERR_INSUFFICIENT_BALANCE           Checked at initiation.
  cannot exceed                                             availableBalance −
  available balance                                         reserveAmount \<
  minus reserve**                                           requestedAmount → blocked.

  **Scheduled payout     ERR_SCHEDULE_BELOW_THRESHOLD       PS-17 §5. Not shown to
  skipped if balance                                        contractor as a withdrawal
  below                                                     error --- silent skip with
  minimumThreshold**                                        consecutive miss tracking.

  **One active debit     ERR_CARD_ALREADY_EXISTS            PS-13. Checked at card
  card per contractor**                                     creation. Cannot have 2 active
                                                            debit cards.

  **Magic link token     ERR_MAGIC_LINK_ALREADY_USED        Atomic Redis DEL. Server state
  one-use enforcement**                                     only --- frontend cannot check
                                                            this. PS-14.

  **EDD \$10,000         No error --- 202 with awaiting_edd Server compares
  threshold routing**    status                             requestedAmount to
                                                            EDD_THRESHOLD constant. PS-15
                                                            §6.

  **OFAC wallet address  ERR_PAYOUT_OFAC_BLOCKED            Chainalysis API call at
  screening**                                               execution. Cannot be
                                                            frontend-checked. PS-12 §9.1.

  **Maximum 5 active     ERR_DEPOSIT_METHOD_LIMIT_REACHED   Checked at method creation.
  deposit methods**                                         Server count of isActive=true
                                                            methods for contractorId.

  **OAuth token          ERR_OAUTH_REAUTH_REQUIRED          Token expiry check via
  freshness at                                              provider API. Server-side
  execution**                                               only. PS-09 §7.

  **Gas spike protection ERR_GAS_TOO_HIGH                   eth_estimateGas at execution
  on crypto payouts**                                       time. Cannot be precomputed
                                                            client-side. PS-12 §4.3.
  ----------------------------------------------------------------------------------------

# **4. Both --- Frontend and Backend**

+-----------------------------------------------------------------------+
| **Backend is always the source of truth for all rules in this         |
| section**                                                             |
|                                                                       |
| Frontend checks in this section provide immediate user feedback.      |
|                                                                       |
| Backend checks are the enforcement layer.                             |
|                                                                       |
| If the two checks produce different results (e.g. user manipulates    |
| client-side state),                                                   |
|                                                                       |
| the backend result governs. Frontend checks are never trusted for     |
| enforcement.                                                          |
+=======================================================================+

## **4.1 Minimum \$50 Withdrawal Amount**

  ----------------------------------------------------------------------------------------
  **Rule**        **Frontend         **Backend behaviour**      **Error code**
                  behaviour**                                   
  --------------- ------------------ -------------------------- --------------------------
  **Minimum       Amount input shows POST /v1/payouts/initiate  ERR_BELOW_MINIMUM_AMOUNT
  withdrawal      inline error if    validates amount \>= 50.   
  amount is       value \< 50 on     Returns                    
  \$50.00 USD**   blur. Submit       ERR_BELOW_MINIMUM_AMOUNT   
                  button disabled if if not.                    
                  amount \< 50.                                 

  ----------------------------------------------------------------------------------------

## **4.2 Bank Field Format Validation**

  ------------------------------------------------------------------------------------------------
  **Field**           **Frontend rule**  **Backend rule**             **Error code**
  ------------------- ------------------ ---------------------------- ----------------------------
  **US routing        9 digits exactly.  9 digits, numeric, ABA       ERR_INVALID_ROUTING_NUMBER
  number**            Numeric only. ABA  checksum algorithm           
                      checksum validated re-validated.                
                      client-side on     ERR_INVALID_ROUTING_NUMBER   
                      blur.              if fails.                    

  **US account        4--17 digits.      4--17 digits, numeric.       ERR_INVALID_ACCOUNT_NUMBER
  number**            Numeric only.      ERR_INVALID_ACCOUNT_NUMBER   
                      Shown masked after if fails.                    
                      entry.                                          

  **IBAN              Validated against  IBAN format + check digit    ERR_INVALID_IBAN
  (international)**   country-specific   re-validated server-side.    
                      IBAN length and    ERR_INVALID_IBAN if fails.   
                      format. Check                                   
                      digits validated                                
                      client-side.                                    

  **SWIFT/BIC code**  8 or 11            8 or 11 chars, alphanumeric, ERR_INVALID_SWIFT
                      characters.        regex re-validated.          
                      Alphanumeric.      ERR_INVALID_SWIFT if fails.  
                      Format regex                                    
                      validated                                       
                      client-side.                                    

  **IFSC code         11 characters.     Same regex server-side.      ERR_INVALID_IFSC
  (India)**           First 4 alpha, 5th ERR_INVALID_IFSC if fails.   
                      always 0, last 6                                
                      alphanumeric.                                   
                      Client-side regex.                              

  **Sort code (UK)**  6 digits,          6 digits numeric (hyphens    ERR_INVALID_SORT_CODE
                      formatted as       stripped).                   
                      XX-XX-XX. Numeric  ERR_INVALID_SORT_CODE if     
                      only.              fails.                       

  **BSB number        6 digits,          6 digits numeric (hyphen     ERR_INVALID_BSB
  (Australia)**       formatted as       stripped). ERR_INVALID_BSB   
                      XXX-XXX.           if fails.                    
  ------------------------------------------------------------------------------------------------

## **4.3 Wallet Address Format Validation**

  ---------------------------------------------------------------------------------------------------------------------
  **Network**    **Frontend rule**                            **Backend rule**             **Error code**
  -------------- -------------------------------------------- ---------------------------- ----------------------------
  **Ethereum /   Regex: /\^0x\[0-9a-fA-F\]{40}\$/. Validated  Same regex. EIP-55 checksum  ERR_CRYPTO_ADDRESS_INVALID
  EVM (Polygon,  on blur. EIP-55 checksum warning if mixed    normalisation applied        
  BSC)**         case fails checksum (not a hard error        (ethers.js getAddress()).    
                 client-side).                                ERR_CRYPTO_ADDRESS_INVALID   
                                                              if regex fails.              

  **Bitcoin**    Regex: P2PKH                                 Same regexes server-side.    ERR_CRYPTO_ADDRESS_INVALID
                 /\^\[13\]\[a-zA-Z1-9\]{25,34}\$/ or Bech32   ERR_CRYPTO_ADDRESS_INVALID   
                 /\^bc1\[ac-hj-np-z02-9\]{6,87}\$/. Validated if neither matches.          
                 on blur.                                                                  

  **Solana**     Regex: /\^\[1-9A-HJ-NP-Za-km-z\]{32,44}\$/.  Same regex server-side.      ERR_CRYPTO_ADDRESS_INVALID
                 Validated on blur.                           ERR_CRYPTO_ADDRESS_INVALID   
                                                              if fails.                    

  **Tron**       Regex: /\^T\[1-9A-HJ-NP-Za-km-z\]{33}\$/.    Same regex server-side.      ERR_CRYPTO_ADDRESS_INVALID
                 Validated on blur.                                                        

  **Litecoin**   Regex:                                       Same regex server-side.      ERR_CRYPTO_ADDRESS_INVALID
                 /\^\[LM3\]\[a-km-zA-HJ-NP-Z1-9\]{26,33}\$/                                
                 or /\^ltc1\[ac-hj-np-z02-9\]{6,87}\$/.                                    
                 Validated on blur.                                                        
  ---------------------------------------------------------------------------------------------------------------------

## **4.4 Split Percentage Range Validation**

  ------------------------------------------------------------------------------------------------
  **Rule**                **Frontend         **Backend            **Error code**
                          behaviour**        behaviour**          
  ----------------------- ------------------ -------------------- --------------------------------
  **primarySplitPercent   Inline error if    Rejects values       ERR_SPLIT_PERCENT_OUT_OF_RANGE
  must be between 0.01    value out of       outside 0.01--99.99. 
  and 99.99**             range. Submit      Truncates to 2dp     
                          disabled.          before range check.  

  **Primary and secondary Secondary method   Compares             ERR_SPLIT_SAME_METHOD
  methods must differ**   dropdown excludes  primaryMethodId and  
                          the currently      secondaryMethodId.   
                          selected primary.  Rejects if equal.    
  ------------------------------------------------------------------------------------------------

## **4.5 Deposit Method Limits**

  --------------------------------------------------------------------------------------------------
  **Rule**           **Frontend            **Backend behaviour**  **Error code**
                     behaviour**                                  
  ------------------ --------------------- ---------------------- ----------------------------------
  **Maximum 5 active \"Add method\" button Count of isActive=true ERR_DEPOSIT_METHOD_LIMIT_REACHED
  deposit methods**  disabled when 5       methods for            
                     methods exist.        contractorId checked   
                     Tooltip: \"You\'ve    at POST                
                     reached the maximum   /v1/deposit-methods.   
                     of 5 payout           Rejects if count \>=   
                     methods.\"            5.                     

  --------------------------------------------------------------------------------------------------

## **4.6 Schedule Minimum Amount for Threshold-Based Schedules**

  --------------------------------------------------------------------------------------------
  **Rule**           **Frontend            **Backend          **Error code**
                     behaviour**           behaviour**        
  ------------------ --------------------- ------------------ --------------------------------
  **Threshold amount Inline error on       Validates          ERR_SCHEDULE_THRESHOLD_TOO_LOW
  must be \>=        threshold amount      thresholdAmount    
  \$50.00**          input if value \< 50. \>= 50 on schedule 
                                           create/update.     

  --------------------------------------------------------------------------------------------

# **5. Complete Validation Master Table**

  --------------------------------------------------------------------------------------------
  **Validation**         **Flow**          **Layer**   **Error code or behaviour**
  ---------------------- ----------------- ----------- ---------------------------------------
  **Past dates disabled  Schedule creation Frontend    Disabled UI state --- no error code
  in calendar**                            only        

  **Percentage           Split config      Frontend    Counterpart field auto-fills --- no
  auto-balance**                           only        error code

  **Currency formatting  Manual withdrawal Frontend    Input reformatted --- no error code
  on amount input**                        only        

  **Withdraw Full Amount Manual withdrawal Frontend    Amount pre-filled from loaded balance
  pre-fill**                               only        --- no error code

  **Reserve \$250 cap on Schedule config   Frontend    Input capped at 250 --- no error code
  input**                                  only        

  **Submit button        All forms         Frontend    Button disabled state --- no error code
  disabled until valid**                   only        

  **Secondary method     Split config      Frontend    Dropdown filter --- no error code
  excludes primary in                      only        
  dropdown**                                           

  **Micro-deposit input  Micro-deposit     Frontend    Input blocked --- no error code
  range \$0.01--\$0.99** verification      only        

  **WalletConnect        Crypto wallet     Frontend    Timer display only --- backend TTL is
  countdown timer        setup             only        enforcement
  display**                                            

  **Idempotency ---      Manual withdrawal Backend     Returns original response --- no error
  duplicate withdrawal**                   only        to client

  **Idempotency ---      Scheduled payout  Backend     Execution skipped --- no client-facing
  duplicate schedule                       only        error
  execution**                                          

  **Idempotency ---      Method setup      Backend     Returns existing method ID
  duplicate method                         only        
  creation**                                           

  **Rate limit --- 5     Manual withdrawal Backend     ERR_WITHDRAWAL_RATE_LIMIT (429)
  withdrawals per hour**                   only        

  **Balance re-check at  All payout types  Backend     ERR_INSUFFICIENT_BALANCE_AT_EXECUTION
  execution**                              only        

  **KYC re-check at      All payout types  Backend     ERR_KYC_TIER1_REQUIRED /
  execution**                              only        ERR_KYC_TIER2_REQUIRED (403)

  **OFAC wallet          Crypto payout     Backend     ERR_PAYOUT_OFAC_BLOCKED (403)
  screening at           execution         only        
  execution**                                          

  **Magic link one-use   Manual withdrawal Backend     ERR_MAGIC_LINK_ALREADY_USED (410)
  enforcement**                            only        

  **EDD \$10,000         All payout types  Backend     202 awaiting_edd --- not an error
  routing**                                only        

  **Gas spike            Crypto execution  Backend     ERR_GAS_TOO_HIGH (422)
  protection**                             only        

  **OAuth token          OAuth method      Backend     ERR_OAUTH_REAUTH_REQUIRED (401)
  freshness**            execution         only        

  **One active debit     Card setup        Backend     ERR_CARD_ALREADY_EXISTS (409)
  card per contractor**                    only        

  **Maximum 5 active     Method setup      Both        ERR_DEPOSIT_METHOD_LIMIT_REACHED (422)
  methods**                                            

  **Minimum \$50.00      Manual            Both        ERR_BELOW_MINIMUM_AMOUNT (422)
  withdrawal amount**    withdrawal,                   
                         scheduled                     

  **US routing number    Bank method setup Both        ERR_INVALID_ROUTING_NUMBER (422)
  --- 9 digits + ABA                                   
  checksum**                                           

  **US account number    Bank method setup Both        ERR_INVALID_ACCOUNT_NUMBER (422)
  --- 4--17 digits**                                   

  **IBAN format + check  Bank method setup Both        ERR_INVALID_IBAN (422)
  digit**                (international)               

  **SWIFT/BIC --- 8 or   Bank method setup Both        ERR_INVALID_SWIFT (422)
  11 chars               (international)               
  alphanumeric**                                       

  **IFSC --- 11 chars,   Bank method setup Both        ERR_INVALID_IFSC (422)
  India format**         (India)                       

  **Sort code --- 6      Bank method setup Both        ERR_INVALID_SORT_CODE (422)
  digits (UK)**          (UK)                          

  **BSB --- 6 digits     Bank method setup Both        ERR_INVALID_BSB (422)
  (Australia)**          (Australia)                   

  **EVM wallet address   Crypto method     Both        ERR_CRYPTO_ADDRESS_INVALID (422)
  regex**                setup                         

  **Bitcoin address      Crypto method     Both        ERR_CRYPTO_ADDRESS_INVALID (422)
  regex (P2PKH +         setup                         
  Bech32)**                                            

  **Solana address       Crypto method     Both        ERR_CRYPTO_ADDRESS_INVALID (422)
  regex**                setup                         

  **Tron address regex** Crypto method     Both        ERR_CRYPTO_ADDRESS_INVALID (422)
                         setup                         

  **Litecoin address     Crypto method     Both        ERR_CRYPTO_ADDRESS_INVALID (422)
  regex**                setup                         

  **Split percent        Split config      Both        ERR_SPLIT_PERCENT_OUT_OF_RANGE (422)
  0.01--99.99 range**                                  

  **Primary and          Split config      Both        ERR_SPLIT_SAME_METHOD (409)
  secondary methods must                               
  differ**                                             

  **Threshold amount \>= Threshold         Both        ERR_SCHEDULE_THRESHOLD_TOO_LOW (422)
  \$50.00**              schedule                      
  --------------------------------------------------------------------------------------------

# **6. References**

  -----------------------------------------------------------------------
  **Document**           **Validation rules sourced from**
  ---------------------- ------------------------------------------------
  **PS-02 --- Withdrawal Idempotency key spec. Rate limiting context.
  Flow**                 

  **PS-08 ---            Micro-deposit amount input range.
  Micro-Deposit          
  Verification**         

  **PS-09 ---            OAuth token freshness check at execution.
  Third-Party OAuth**    

  **PS-10 --- Crypto     Wallet address regex per network. PS-10 §7.
  Wallet Connection**    

  **PS-12 --- Crypto     Gas spike protection. OFAC wallet screening.
  Payout Settlement**    

  **PS-13 --- Debit      One card per contractor limit.
  Card**                 

  **PS-14 --- Magic      One-use enforcement.
  Link**                 

  **PS-15 --- KYC        KYC re-check at execution. EDD threshold.
  Gating**               

  **PS-17 --- Schedule   Balance re-check at execution. Threshold skip
  Execution Engine**     logic.

  **PS-18 ---            Split percent range. Same-method check.
  Auto-Balance Logic**   
  -----------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
payout-service PS-19 \| v1.0
