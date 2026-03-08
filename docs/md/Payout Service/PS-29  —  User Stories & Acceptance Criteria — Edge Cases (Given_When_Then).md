**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**payout-service**

PS-29 --- User Stories & Acceptance Criteria --- Edge Cases
(Given/When/Then)

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        PS-29 --- User Stories & Acceptance Criteria ---
                      Edge Cases (Given/When/Then)

  **Version**         1.0

  **Format**          Given / When / Then. Each scenario is independently
                      testable.

  **Audience**        QA engineers. Used directly to write test cases and
                      regression suites.

  **Source**          All edge cases from PS-25. Every scenario has been
                      formalised into one or more GWT acceptance
                      criteria.

  **Coverage**        Race conditions, fee/balance edge cases, split
                      payout edge cases, method management edge cases,
                      feature flag edge cases, currency/localisation edge
                      cases, data limitation edge cases.

  **Prerequisites**   PS-25 (source material), PS-24 (error codes), PS-27
                      (API contracts)
  -----------------------------------------------------------------------

This document formalises every edge case from PS-25 as Given/When/Then
acceptance criteria. Each story maps to one or more testable scenarios.
QA engineers should treat each scenario row as one test case. Priority
P1 = must be tested before MVP launch. Priority P2 = must be tested
before feature GA. Where a scenario requires a specific database or
Redis state to be set up, that setup is described in the Given column.

# **1. Race Conditions**

## **EC-01 Simultaneous withdrawal from two sessions --- second payout fails at execution**

  ---------------------------------------------------------------------------------------------------------------------
  **Scenario**                 **Given**          **When**                   **Then**
  ---------------------------- ------------------ -------------------------- ------------------------------------------
  **Two simultaneous           Contractor has     Session A calls POST       1\. Both POST requests return 202
  initiations --- balance      \$200.00 available /v1/payouts/initiate for   Accepted. Two payout_requests rows exist
  sufficient for only one**    balance. No        \$200.00. Before Session   with status = awaiting_verification.2.
                               pending            A\'s magic link is         Session A clicks the magic link. The
                               payout_requests    verified, Session B also   payout executes and the balance drops to
                               exist. Contractor  calls POST                 \$0.00.3. Session B\'s payout_requests row
                               has two browser    /v1/payouts/initiate for   transitions to status = failed with
                               sessions open      \$200.00.                  failureCode =
                               simultaneously.                               ERR_INSUFFICIENT_BALANCE_AT_EXECUTION.4.
                                                                             Session B contractor receives a \"Your
                                                                             balance changed before your withdrawal
                                                                             could be sent\" notification.5. The
                                                                             earnings balance never goes below \$0.00.
                                                                             No negative balance is created.

  **earnings.balance.updated   Same setup as      Session A\'s payout        1\. payout-service\'s
  proactive failure ---        above. Session     executes and               earnings.balance.updated consumer detects
  session B fails before       A\'s payout has    earnings-service publishes Session B\'s pending payout_requests
  execution attempt**          been initiated but earnings.balance.updated   row.2. Session B\'s payout_requests row
                               not yet verified.  with newBalanceUSD = 0.    transitions to failed before Session B\'s
                                                                             magic link is clicked.3. A payout.failed
                                                                             event is published for Session B.4. When
                                                                             Session B clicks the magic link, GET
                                                                             /v1/payouts/verify-magic-link returns
                                                                             ERR_MAGIC_LINK_INVALID or the payout is
                                                                             already in failed state --- no
                                                                             double-execution occurs.

  **Earnings debit atomicity   Two                Both execution calls       1\. The earnings-service row-level
  --- concurrent execution     payout_requests    attempt to debit the       pessimistic write lock ensures only one
  attempts serialise           rows both reach    earnings-service balance   debit succeeds.2. The second debit attempt
  correctly**                  processing state   concurrently.              receives an INSUFFICIENT_BALANCE error
                               simultaneously                                from the earnings-service.3. Exactly one
                               (e.g. two magic                               payout completes. Exactly one payout
                               links clicked                                 fails. Total debited amount equals
                               within                                        original balance --- no loss or
                               milliseconds).                                duplication.
  ---------------------------------------------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Priority: P1 \| Source: PS-25 §2.1**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **EC-02 Scheduled payout fires while manual withdrawal is AWAITING_VERIFICATION**

  -------------------------------------------------------------------------------------------
  **Scenario**   **Given**                **When**                  **Then**
  -------------- ------------------------ ------------------------- -------------------------
  **Schedule     Contractor has \$500.00  ScheduledPayoutExecutor   1\. The schedule
  skips cycle    balance. A manual payout checks for pending        execution is skipped for
  when manual    of \$500.00 is in status payout_requests for this  this contractor for this
  withdrawal is  = awaiting_verification. contractor.               cycle.2. No
  pending**      The schedule cron fires.                           payout_requests row is
                                                                    created by the
                                                                    scheduler.3. No ERR\_ is
                                                                    returned to any user ---
                                                                    this is an internal skip
                                                                    with no contractor
                                                                    notification.4.
                                                                    nextExecutionAt advances
                                                                    to the next scheduled
                                                                    execution time.

  **Schedule     The manual withdrawal    ScheduledPayoutExecutor   1\. No pending manual
  executes       from above reaches       checks for pending        payout_requests row
  normally after 15-minute TTL without    payout_requests.          exists.2. The schedule
  manual         the magic link being                               execution proceeds
  withdrawal     clicked. The                                       normally.
  expires**      payout_requests row is                             
                 cancelled by the cron.                             
                 The next schedule                                  
                 execution fires.                                   
  -------------------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Priority: P1 \| Source: PS-25 §2.2**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

# **2. Fee and Balance Edge Cases**

## **EC-03 Fee reduces net payout to zero or below minimum**

  -------------------------------------------------------------------------------------------
  **Scenario**   **Given**          **When**               **Then**
  -------------- ------------------ ---------------------- ----------------------------------
  **v1 zero-fee: Contractor         POST                   1\. Response returns { valid:
  feeAmountUSD   requests a         /v1/payouts/validate   true, netAmountUSD: 50.00,
  is always 0**  withdrawal of      is called.             feeAmountUSD: 0.00 }.2. Payout
                 exactly \$50.00.                          proceeds normally. No
                 No fee model is                           ERR_INSUFFICIENT_FUNDS_AFTER_FEE
                 configured (v1).                          is triggered.
                 feeAmountUSD = 0.                         

  **Future fee   A fee model is     POST                   1\. netAmountUSD = 52.00 − 5.00 =
  model: fee     introduced where   /v1/payouts/validate   47.00, which is below the \$50.00
  makes net      feeAmountUSD =     is called.             minimum.2. Response returns
  amount below   5.00. Contractor                          ERR_INSUFFICIENT_FUNDS_AFTER_FEE
  minimum**      requests                                  with metadata { feeAmountUSD:
                 withdrawal of                             5.00, amountAfterFeeUSD: 47.00
                 \$52.00.                                  }.3. No payout_requests row is
                                                           created.

  **\$0 balance  Contractor\'s      The next schedule      1\. currentBalanceUSD = 0.00. The
  after payout   balance drops to   execution cycle fires. schedule threshold check fails (0
  --- scheduled  exactly \$0.00                            \< minimumThreshold).2. The cycle
  payouts handle after a successful                        is skipped silently.
  gracefully**   payout.                                   consecutiveMissCount increments.3.
                                                           No ERR\_ is surfaced to the
                                                           contractor until
                                                           consecutiveMissCount reaches 3.4.
                                                           The balance display on the
                                                           Earnings overview shows \$0.00
                                                           with no error styling.
  -------------------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Priority: P1 \| Source: PS-25 §3.1**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **EC-04 Reserve amount blocks withdrawal --- contractor wants to override**

  ------------------------------------------------------------------------------------
  **Scenario**     **Given**          **When**               **Then**
  ---------------- ------------------ ---------------------- -------------------------
  **Reserve blocks Contractor has     POST                   1\. Response returns
  withdrawal ---   \$300.00 balance   /v1/payouts/validate   ERR_INSUFFICIENT_FUNDS
  contractor must  and \$250.00       is called with         with metadata {
  lower reserve    reserve.           amountUSD = 200.00.    availableBalanceUSD:
  first**          withdrawableUSD =                         300.00,
                   \$50.00.                                  requestedAmountUSD:
                   Contractor                                200.00, reserveAmountUSD:
                   attempts a                                250.00 }.2. No
                   \$200.00                                  payout_requests row is
                   withdrawal.                               created.3. The error
                                                             userMessage reads: \"Your
                                                             available balance is too
                                                             low for this
                                                             withdrawal.\"

  **Contractor     Same setup as      PUT                    1\. Schedule save
  lowers reserve   above. Contractor  /v1/payouts/schedule   succeeds. withdrawableUSD
  then withdraws   navigates to       is called with         is now \$300.00.2. POST
  successfully**   schedule settings  reserveAmountUSD = 0.  /v1/payouts/validate with
                   and sets           Contractor then        amountUSD = 200.00
                   reserveAmountUSD   re-initiates the       returns { valid: true
                   to \$0.00.         \$200.00 withdrawal.   }.3. The payout proceeds
                                                             normally.

  **Reserve of \$0 Contractor sets    GET                    1\. withdrawableUSD
  disables it ---  reserve to \$0.00. /v1/earnings/balance   equals
  full balance is                     is called.             availableBalanceUSD.2.
  withdrawable**                                             The reserve display on
                                                             the Earnings overview is
                                                             hidden or shows \"\$0.00
                                                             reserved.\"
  ------------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Priority: P2 \| Source: PS-25 §3.2**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

# **3. Split Payout Edge Cases**

## **EC-05 Split percentage rounding --- truncation not rounding**

  ---------------------------------------------------------------------------------
  **Scenario**     **Given**          **When**           **Then**
  ---------------- ------------------ ------------------ --------------------------
  **One-third      Split is enabled.  The secondary      1\. secondaryPercent = 100
  split ---        Contractor types   percentage         − 33.33 = 66.67 (exact ---
  truncated        33.33 in the       auto-calculates.   no truncation needed).2.
  correctly**      primary percentage                    The live preview shows
                   input.                                primary amount =
                                                         floor(balance × 0.3333)
                                                         and secondary = balance −
                                                         primary.3. For a \$100.00
                                                         balance: primary =
                                                         \$33.33, secondary =
                                                         \$66.67, sum = \$100.00.

  **Repeating      Contractor types   Frontend truncates 1\. primaryPercent = 33.33
  decimal ---      33.337 in the      to 2dp.            (truncated, not rounded
  truncation       primary percentage                    --- 33.34 would be
  prevents \> 100% input.                                incorrect).2.
  sum**                                                  secondaryPercent =
                                                         66.67.3. Sum = 100.00.

  **Split          Split is           Split execution    1\. primaryAmount =
  execution        configured with    runs.              floor(\$1.00 × 0.3333) =
  invariant ---    primary = 33.33%.                     \$0.33.2. secondaryAmount
  sum must equal   Balance = \$1.00.                     = \$1.00 − \$0.33 =
  balance**                                              \$0.67.3. primaryAmount +
                                                         secondaryAmount = \$1.00.
                                                         Invariant holds.4.
                                                         ERR_SPLIT_ROUNDING_FAULT
                                                         is NOT triggered.

  **Rounding fault A floating-point   The split rounding 1\. Execution is halted.
  guard fires on   calculation error  invariant check    No funds move.2.
  floating-point   causes             runs in the        ERR_SPLIT_ROUNDING_FAULT
  anomaly**        primaryUSD +       execution engine.  (HTTP 500) is returned.3.
                   secondaryUSD to                       An engineering alert
                   differ from                           fires. The error is logged
                   balanceUSD by more                    with balanceUSD,
                   than \$0.01.                          primaryUSD, secondaryUSD,
                                                         and sumUSD.4. The
                                                         contractor receives a
                                                         \"Something went wrong\"
                                                         message. Their balance is
                                                         unchanged.
  ---------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Priority: P1 \| Source: PS-25 §4.1**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **EC-06 Removing the default method when split is active**

  ---------------------------------------------------------------------------------------------------------------------------
  **Scenario**   **Given**                       **When**                              **Then**
  -------------- ------------------------------- ------------------------------------- --------------------------------------
  **Deletion     Split is active: Bank A         DELETE                                1\. Response returns
  blocked when   (primary, 60%) and PayPal       /v1/deposit-methods/{bankAMethodId}   ERR_CANNOT_REMOVE_DEFAULT_WITH_SPLIT
  no other       (secondary, 40%). Bank A is the is called.                            (HTTP 409).2. Bank A is not removed.3.
  verified       only other verified method.                                           The UI shows: \"You can\'t remove your
  method         Contractor attempts to delete                                         only active payout method. Add another
  exists**       Bank A.                                                               method first.\"

  **Deletion     Contractor adds a new verified  DELETE                                1\. Bank A is removed successfully.2.
  permitted      bank account (Bank B) and sets  /v1/deposit-methods/{bankAMethodId}   splitEnabled transitions to false.
  after new      it as default. Bank A is no     is called.                            primarySplitPercent = 100.00.
  default is set longer the default.                                                   secondaryMethodId = null.3. All future
  --- split                                                                            payouts go to Bank B at 100%.4. An
  disables**                                                                           in-app notification is sent: \"Your
                                                                                       split payout has been turned off
                                                                                       because you removed a payout
                                                                                       account.\"

  **Pause banner Contractor deletes Bank A (the  The assertNotPaused() evaluation      1\. NO_DEFAULT_METHOD pause condition
  fires when     only method) via a path that    runs.                                 is detected.2. A payout.paused event
  deletion       bypasses the                                                          is published.3. The pause banner
  leaves no      ERR_CANNOT_REMOVE_ONLY_METHOD                                         renders on the Earnings overview with
  default**      guard (direct API call with a                                         the NO_DEFAULT_METHOD content.
                 method that was just                                                  
                 deactivated).                                                         
  ---------------------------------------------------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Priority: P1 \| Source: PS-25 §4.2**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

# **4. Method Management Edge Cases**

## **EC-07 Removing the only connected account**

  --------------------------------------------------------------------------------------------------
  **Scenario**   **Given**          **When**                         **Then**
  -------------- ------------------ -------------------------------- -------------------------------
  **Delete       Contractor has     DELETE                           1\. Response returns
  blocked ---    exactly one active /v1/deposit-methods/{methodId}   ERR_CANNOT_REMOVE_ONLY_METHOD
  one method     deposit method.    is called.                       (HTTP 409).2. The method is not
  remaining**                                                        removed. No change to isActive
                                                                     status.3. The UI delete icon is
                                                                     disabled with tooltip: \"Add
                                                                     another method before removing
                                                                     this one.\"

  **Delete       Contractor has     The contractor views the method  1\. The delete action for the
  blocked via UI exactly one active list.                            single method is disabled
  --- delete     deposit method.                                     (greyed out icon).2. No
  icon           The method                                          confirmation dialog appears on
  disabled**     management screen                                   tap.3. A tooltip reads: \"Add
                 is loaded.                                          another method before removing
                                                                     this one.\"
  --------------------------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Priority: P1 \| Source: PS-25 §5.1**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **EC-08 Maximum connected accounts limit reached**

  -------------------------------------------------------------------------------------------
  **Scenario**    **Given**          **When**              **Then**
  --------------- ------------------ --------------------- ----------------------------------
  **Add method    Contractor has     POST                  1\. Response returns
  blocked at      exactly 5 active   /v1/deposit-methods   ERR_DEPOSIT_METHOD_LIMIT_REACHED
  limit --- API   deposit methods.   is called with any    (HTTP 422) before any Stripe,
  layer**                            payload.              OAuth, or WalletConnect call is
                                                           made.2. No deposit_methods row is
                                                           created.

  **Add method    Contractor has 5   The contractor views  1\. The \"Add method\" entry point
  blocked at      active deposit     the screen.           is disabled.2. A tooltip or inline
  limit --- UI    methods. The                             message reads: \"You\'ve reached
  layer**         method management                        the maximum of 5 payout methods.
                  screen is loaded.                        Remove one before adding
                                                           another.\"3. The method count
                                                           display shows \"5 of 5 methods
                                                           used.\"

  **Deactivated   Contractor has 4   The contractor views  1\. The method count shows \"4 of
  methods do not  active methods and the method management 5 methods used.\"2. The \"Add
  count toward    3 deactivated      screen.               method\" entry point is enabled.3.
  the limit**     (isActive = false)                       POST /v1/deposit-methods succeeds
                  methods.                                 for a new method.
  -------------------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Priority: P1 \| Source: PS-25 §5.2**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **EC-09 OAuth token expires mid-connection flow**

  -------------------------------------------------------------------------------------------------------
  **Scenario**   **Given**          **When**                   **Then**
  -------------- ------------------ -------------------------- ------------------------------------------
  **State token  Contractor begins  The contractor completes   1\. The state parameter in the callback
  TTL expires    OAuth connection   PayPal login and is        URL is no longer in Redis.2. GET
  before         to PayPal. The     redirected back to the     /v1/oauth/paypal/callback returns an error
  contractor     OAuth state token  Marketeq OAuth callback    response with reason = state_expired.3.
  returns from   is stored in Redis URL.                       The contractor is redirected to
  provider**     with a 10-minute                              /settings/payouts?error=state_expired.4.
                 TTL. Contractor                               No deposit_methods row is created. No
                 leaves the PayPal                             OAuth token is stored.5. The UI shows:
                 login page idle                               \"Your PayPal connection timed out. Please
                 for more than 10                              try again.\" with a \"Try again\" CTA that
                 minutes.                                      restarts the OAuth flow.

  **Retry after  The contractor     GET                        1\. A new state token is generated and
  expiry creates sees the           /v1/oauth/paypal/connect   stored in Redis with a fresh 10-minute
  a fresh state  \"connection timed is called.                 TTL.2. A new redirectUrl is returned. The
  token**        out\" error and                               old state token cannot be reused.
                 taps \"Try                                    
                 again.\"                                      
  -------------------------------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Priority: P1 \| Source: PS-25 §5.3**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **EC-10 WalletConnect QR code expires during scan**

  ------------------------------------------------------------------------------------------------
  **Scenario**   **Given**          **When**                    **Then**
  -------------- ------------------ --------------------------- ----------------------------------
  **QR countdown Contractor opens   The 5-minute countdown      1\. The QR code is greyed out and
  reaches zero   WalletConnect QR   reaches 0:00.               no longer scannable.2. The message
  --- expired    code screen. The                               \"QR code expired\" is shown.3. A
  state shown**  5-minute countdown                             \"Generate new code\" CTA
                 is displayed. No                               appears.4. The session polling
                 wallet app has                                 stops.
                 scanned the code                               
                 yet.                                           

  **Expired QR   The WalletConnect  The wallet app attempts to  1\. The Redis session key no
  scanned by     session in Redis   respond to the expired      longer exists.2. The callback
  wallet ---     has expired (TTL   session. The session poll   finds no matching session.
  backend        elapsed). The      returns.                    ERR_CRYPTO_WALLETCONNECT_EXPIRED
  rejects        contractor scans                               is returned.3. The UI shows:
  correctly**    the old QR code                                \"Your wallet connection timed
                 from their wallet                              out. Please scan the new QR
                 app before                                     code.\"4. No deposit_methods row
                 noticing the                                   is created from the expired
                 expiry.                                        session.

  **New QR code  The QR code has    POST                        1\. A new WalletConnect session is
  generation     expired.           /v1/walletconnect/session   created with a new URI and
  after expiry** Contractor taps    is called.                  sessionId.2. A new 5-minute TTL is
                 \"Generate new                                 set in Redis.3. The old QR code
                 code.\"                                        cannot be used to respond to the
                                                                new session.4. The countdown timer
                                                                resets to 5:00.
  ------------------------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Priority: P1 \| Source: PS-25 §5.4**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **EC-11 Stripe Financial Connections session expires during bank link**

  ----------------------------------------------------------------------------------------------
  **Scenario**   **Given**          **When**           **Then**
  -------------- ------------------ ------------------ -----------------------------------------
  **Stripe modal Contractor opens   The Stripe         1\. The Stripe modal closes or shows an
  idle timeout   the Stripe         Financial          error.2. No POST /v1/deposit-methods call
  --- no partial Financial          Connections        is made by the Stripe SDK callback.3. No
  record         Connections modal  session expires    deposit_methods row is created in
  created**      and logs in to     (Stripe SDK        payout-service.4. The contractor is
                 their bank. They   returns            returned to the bank account linking
                 then leave the     session_expired    screen.5. The message is shown: \"Your
                 modal idle for     error).            bank connection session timed out. Please
                 more than 30                          try again.\"6. A \"Try again\" CTA
                 minutes.                              re-calls POST
                                                       /v1/deposit-methods/stripe-link-session
                                                       for a fresh session.

  **Link token   The link_token     Contractor taps    1\. POST
  TTL expires    fetched by         \"Try again.\"     /v1/deposit-methods/stripe-link-session
  --- fresh      Marketeq from                         is called and returns a new link_token.2.
  token on       Stripe expired                        The Stripe Financial Connections modal is
  retry**        before the                            reinitialised with the new token.3. The
                 contractor                            expired link_token cannot be reused.
                 completed the                         
                 flow.                                 
  ----------------------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Priority: P2 \| Source: PS-25 §5.5**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **EC-12 Contractor adds the same bank account twice**

  --------------------------------------------------------------------------------------
  **Scenario**       **Given**           **When**              **Then**
  ------------------ ------------------- --------------------- -------------------------
  **Duplicate active Contractor has an   POST                  1\. payout-service
  bank account ---   active deposit      /v1/deposit-methods   detects the hash
  idempotent         method for Chase    is called with the    collision for this
  response**         checking account    same routing number   contractorId.2. The
                     (\...4521). The     and account number.   existing deposit method
                     SHA-256 hash of                           record is returned with
                     (routing_number +                         HTTP 200 (not 201).3. No
                     account_number) is                        duplicate deposit_methods
                     stored on the                             row is created.4. The
                     existing row.                             response body is
                                                               identical in shape to a
                                                               newly created method.

  **Duplicate        The existing Chase  POST                  1\. A new deposit_methods
  account previously account method has  /v1/deposit-methods   row is created with
  deactivated ---    isActive = false    is called with the    isActive = true.2. The
  new active record  (previously         same account details. deactivated row is
  created**          deactivated).                             retained for audit
                                                               purposes.3. The new
                                                               method requires fresh
                                                               micro-deposit or
                                                               Financial Connections
                                                               verification.

  **Same bank        Contractor A and    Both POST             1\. Both deposit_methods
  account, different Contractor B both   /v1/deposit-methods   rows are created
  contractor ---     submit the same     calls are processed.  successfully.2.
  cross-contractor   routing number and                        Deduplication is per
  duplication is     account number.                           contractorId.
  permitted**                                                  Cross-contractor
                                                               deduplication is not
                                                               applied.
  --------------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Priority: P1 \| Source: PS-25 §8.4**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **EC-13 WalletConnect --- contractor sends from a different address mid-session**

  --------------------------------------------------------------------------------
  **Scenario**     **Given**          **When**           **Then**
  ---------------- ------------------ ------------------ -------------------------
  **Address        Contractor         A scheduled or     1\. The payout is sent to
  captured at      connects via       manual payout is   0xABC --- the address
  connection time  WalletConnect. The executed to the    captured at connection
  --- not updated  session confirms   crypto method.     time.2. payout-service
  if wallet        address 0xABC.                        has no awareness of the
  switches         After saving, the                     in-wallet account
  accounts**       contractor                            switch.3. No automatic
                   switches accounts                     address refresh occurs.
                   in their wallet                       
                   app to 0xDEF.                         

  **Contractor     Contractor         Contractor deletes 1\. The old
  resolves address realises payouts   the existing       deposit_methods row is
  mismatch by      are going to the   crypto method and  deactivated.2. A new
  reconnecting**   wrong address      re-adds it with    deposit_methods row is
                   (0xABC) and wants  WalletConnect      created with
                   to update to       using the 0xDEF    walletAddress = 0xDEF.3.
                   0xDEF.             wallet.            Future payouts go to
                                                         0xDEF.
  --------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Priority: P2 \| Source: PS-25 §8.5**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

# **5. Feature Flag Edge Cases**

## **EC-14 TEQ Coin feature flag is OFF**

  ----------------------------------------------------------------------------------------------------------------
  **Scenario**   **Given**                    **When**                              **Then**
  -------------- ---------------------------- ------------------------------------- ------------------------------
  **TEQ Coin     FEATURE_TEQ_COIN_ENABLED =   GET                                   1\. The response includes
  hidden in      false in the server          /v1/deposit-methods/available-types   TEQ_COIN with available:
  method type    environment.                 is called.                            false.2. The frontend hides
  selector when                                                                     the TEQ Coin option from the
  flag is OFF**                                                                     method type selector entirely
                                                                                    (not greyed out).3. No
                                                                                    \"Coming Soon\" placeholder is
                                                                                    shown unless explicitly
                                                                                    specified by product.

  **TEQ Coin     FEATURE_TEQ_COIN_ENABLED =   POST /v1/deposit-methods is called    1\. Response returns HTTP 422
  method         false.                       with methodType = TEQ_COIN (e.g. via  with code ERR_FEATURE_DISABLED
  creation                                    direct API call or tooling).          and metadata { feature:
  blocked at API                                                                    \"FEATURE_TEQ_COIN_ENABLED\"
  layer**                                                                           }.2. No deposit_methods row is
                                                                                    created.

  **TEQ Coin     FEATURE_TEQ_COIN_ENABLED is  GET                                   1\. The response includes
  becomes        changed to true.             /v1/deposit-methods/available-types   TEQ_COIN with available:
  available when                              is called after the flag change (no   true.2. The frontend renders
  flag is                                     deployment required).                 the TEQ Coin option in the
  toggled ON**                                                                      method type selector.3. POST
                                                                                    /v1/deposit-methods with
                                                                                    methodType = TEQ_COIN is
                                                                                    accepted (assuming the method
                                                                                    logic is implemented).

  **Debit card   FEATURE_DEBIT_CARD_ENABLED = GET                                   1\. The response includes
  feature flag   false.                       /v1/deposit-methods/available-types   DEBIT_CARD with available:
  OFF --- card                                is called.                            false.2. The debit card option
  option                                                                            is hidden in the method type
  hidden**                                                                          selector.
  ----------------------------------------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Priority: P1 \| Source: PS-25 §6.1**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

# **6. Currency and Localisation Edge Cases**

## **EC-15 displayCurrency manually set --- not overridden by country change**

  -------------------------------------------------------------------------------------------------
  **Scenario**        **Given**                     **When**           **Then**
  ------------------- ----------------------------- ------------------ ----------------------------
  **Manual            Contractor\'s country is DE   Contractor\'s      1\. localCurrency is updated
  displayCurrency is  (Germany). localCurrency =    country changes to to CAD.2. displayCurrency
  preserved after     EUR. Contractor has manually  CA (Canada).       remains GBP (unchanged)
  country change**    set displayCurrency = GBP     user-service       because
                      (displayCurrencyManuallySet = publishes a        displayCurrencyManuallySet =
                      true).                        country_changed    true.3. Earnings amounts
                                                    event.             continue to be displayed in
                                                                       GBP.

  **Auto-following    Contractor\'s country is DE.  Contractor\'s      1\. localCurrency is updated
  displayCurrency     localCurrency = EUR.          country changes to to CAD.2. displayCurrency is
  updates when not    displayCurrency = EUR         CA.                also updated to CAD
  manually set**      (displayCurrencyManuallySet =                    automatically.3. Earnings
                      false).                                          amounts are now displayed in
                                                                       CAD.

  **Soft prompt shown Contractor has manually set   The contractor     1\. A one-time soft prompt
  on country change   displayCurrency = GBP and     next loads any     is shown: \"Your location
  for manually set    their country changes to CA.  earnings screen.   changed to Canada. Would you
  currency**                                                           like to update your display
                                                                       currency to CAD?\"2. If the
                                                                       contractor dismisses it, the
                                                                       prompt does not appear
                                                                       again.3. If the contractor
                                                                       accepts, displayCurrency is
                                                                       updated to CAD and
                                                                       displayCurrencyManuallySet
                                                                       remains true (it was an
                                                                       explicit choice).

  **displayCurrency   Contractor changes            A payout is        1\. The payout amount is
  change has no       displayCurrency from GBP to   initiated for the  denominated in USD in the
  effect on payout    CAD.                          contractor\'s full payout_requests row.2. The
  amounts**                                         withdrawable       payout is sent in USD to the
                                                    balance.           contractor\'s designated
                                                                       method.3. Changing
                                                                       displayCurrency does not
                                                                       change the payout amount.

  **OFAC-blocked      Contractor has an existing    Contractor         1\. checkOFACAtExecution()
  country --- crypto  Ethereum wallet method.       attempts a payout  detects the contractor\'s
  method availability Contractor\'s country changes to their Ethereum  country is OFAC-blocked.2.
  unchanged for       to a non-OFAC-blocked         wallet.            The payout is blocked with
  existing methods**  country, then to an                              ERR_PAYOUT_OFAC_BLOCKED.3.
                      OFAC-blocked country.                            The pause condition
                                                                       OFAC_FLAG is set.4. The
                                                                       pause banner renders with
                                                                       the red OFAC_FLAG content.
  -------------------------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Priority: P1 \| Source: PS-25 §7.1**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

# **7. Additional Edge Cases**

## **EC-16 JWT expires while contractor is filling out the withdrawal form**

  ----------------------------------------------------------------------------------
  **Scenario**   **Given**          **When**               **Then**
  -------------- ------------------ ---------------------- -------------------------
  **JWT expires  Contractor opens   POST                   1\. The API returns HTTP
  between form   the withdrawal     /v1/payouts/initiate   401 Unauthorized.2. The
  load and       modal. Their JWT   is called after JWT    frontend detects the 401
  submit**       is valid. The      expiry.                and redirects the
                 contractor fills                          contractor to the login
                 in the form but                           screen.3. After
                 does not submit                           re-authentication, the
                 for a long period.                        contractor is returned to
                 The JWT expires.                          the Earnings screen (not
                                                           auto-returned to the
                                                           withdrawal modal).4. No
                                                           payout_requests row was
                                                           created. The contractor
                                                           must re-initiate the
                                                           withdrawal.

  ----------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Priority: P1 \| Source: PS-25 §8.1**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **EC-17 Default method changed while payout is AWAITING_VERIFICATION**

  --------------------------------------------------------------------------------
  **Scenario**   **Given**          **When**           **Then**
  -------------- ------------------ ------------------ ---------------------------
  **In-flight    Contractor         Contractor clicks  1\. The payout is sent to
  payout         initiates a \$200  the magic link and Bank A --- the
  continues to   withdrawal to Bank the payout         depositMethodId locked at
  original       A (their default   executes.          creation time.2. The change
  method despite at initiation).                       of default method has no
  default        payout_requests                       retroactive effect on
  change**       row is created                        in-flight
                 with                                  payout_requests.3. The
                 depositMethodId =                     PayPal method is used for
                 Bank A. Before                        all future payouts.
                 clicking the magic                    
                 link, the                             
                 contractor changes                    
                 their default                         
                 method to PayPal.                     

  **Method       Same setup. After  Contractor clicks  1\. Method status check
  deactivated    initiating but     the magic link and finds Bank A has isActive =
  after          before clicking    the execution      false.2. payout_requests
  initiation --- the magic link,    engine checks      status transitions to
  payout fails   the contractor     method status.     failed with failureCode =
  at execution** deactivates Bank                      ERR_METHOD_DEACTIVATED.3.
                 A.                                    Contractor is notified:
                                                       \"Your withdrawal could not
                                                       be sent because the payout
                                                       method was deactivated.\"4.
                                                       The balance is returned to
                                                       the contractor\'s available
                                                       balance.
  --------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Priority: P1 \| Source: PS-25 §8.2**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **EC-18 EDD hold placed between pre-flight check and execution (TOCTOU)**

  ------------------------------------------------------------------------------------
  **Scenario**        **Given**          **When**            **Then**
  ------------------- ------------------ ------------------- -------------------------
  **assertNotPaused   A scheduled payout assertNotPaused()   1\. assertNotPaused()
  fires after         passes all         is called as the    detects the new pause
  pre-flight passes   pre-flight checks  final gate          condition.2. Execution is
  --- execution       (KYC, balance,     immediately before  halted. The Stripe API is
  blocked**           pause conditions). the Stripe API      not called. No money
                      In the             call.               moves.3. payout_requests
                      milliseconds                           status is set to failed
                      between the                            or awaiting_edd depending
                      pre-flight check                       on the hold type.4. The
                      and the Stripe API                     contractor is notified of
                      call, a compliance                     the hold.
                      officer places an                      
                      EDD hold on the                        
                      contractor                             
                      account.                               

  ------------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Priority: P1 \| Source: PS-25 §8.3**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

# **8. Data Limitation Edge Cases**

## **EC-19 FX rate cache is stale**

  ------------------------------------------------------------------------------
  **Scenario**   **Given**          **When**           **Then**
  -------------- ------------------ ------------------ -------------------------
  **Stale FX     The fawazahmed0 FX The contractor     1\. The displayed GBP
  rate displayed rate cache is 14   views their        amount uses the cached
  --- no         minutes old        balance on the     rate --- not the live
  financial      (within the        Earnings overview. rate.2. The display label
  impact**       15-minute TTL).                       shows: \"Approximate ---
                 The GBP/USD rate                      rates updated every 15
                 has moved since                       minutes.\"3. All payout
                 the cache was                         amounts are calculated in
                 populated.                            USD regardless of the
                                                       displayed currency.4. The
                                                       stale display rate has no
                                                       effect on the actual
                                                       payout amount sent.

  ------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Priority: P2 \| Source: PS-25 §9**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **EC-20 kyc-identity-service is unavailable during payout initiation**

  -------------------------------------------------------------------------------------------
  **Scenario**   **Given**              **When**                **Then**
  -------------- ---------------------- ----------------------- -----------------------------
  **KYC service  kyc-identity-service   POST                    1\. payout-service cannot
  down ---       is returning 503 or is /v1/payouts/initiate is complete the KYC gate
  payout         unreachable.           called by a contractor. check.2. Response returns
  blocked, not                                                  ERR_KYC_SERVICE_UNAVAILABLE
  bypassed**                                                    (HTTP 503) with
                                                                retryAfterSeconds = 60.3. No
                                                                payout_requests row is
                                                                created.4. The KYC check is
                                                                NOT bypassed or skipped ---
                                                                safety-first policy.5. The UI
                                                                shows: \"We\'re unable to
                                                                verify your account right
                                                                now. Please try again in a
                                                                few minutes.\"

  **KYC service  kyc-identity-service   The contractor retries  1\. The KYC gate check
  recovers ---   recovers within 60     POST                    succeeds.2. The payout
  payout         seconds.               /v1/payouts/initiate.   proceeds normally.
  succeeds on                                                   
  retry**                                                       
  -------------------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Priority: P1 \| Source: PS-25 §9**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **EC-21 Split execution partial failure --- primary succeeds, secondary fails**

  ------------------------------------------------------------------------------
  **Scenario**   **Given**          **When**           **Then**
  -------------- ------------------ ------------------ -------------------------
  **Primary      Split is active:   Secondary          1\. Primary payout is NOT
  success +      60% primary (Bank  execution fails    reversed. The \$60%
  secondary      A), 40% secondary  after primary has  portion is settled to
  failure ---    (PayPal).          already settled.   Bank A.2. Secondary is
  primary is not Scheduled payout                      retried up to 3 times
  reversed**     fires. Primary                        with exponential
                 execution                             backoff.3. After 3 failed
                 succeeds.                             retries,
                 Secondary                             payout.secondary.failed
                 execution fails                       event is published.4.
                 (PayPal API                           Finance alert fires.
                 returns 503).                         Contractor receives an
                                                       in-app notification:
                                                       \"Part of your scheduled
                                                       payout couldn\'t be sent
                                                       to your PayPal
                                                       account.\"5. The
                                                       notification shows both
                                                       the amount sent to Bank A
                                                       and the amount that could
                                                       not be sent to PayPal.

  ------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Priority: P1 \| Source: PS-25 §9**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **EC-22 Business day calculator --- schedule deferred over weekend**

  -------------------------------------------------------------------------------
  **Scenario**    **Given**          **When**           **Then**
  --------------- ------------------ ------------------ -------------------------
  **Monthly       A monthly schedule The schedule       1\. The cron detects the
  schedule on 1st is configured. The execution cron     1st is a Saturday
  falls on        1st of the month   evaluates the      (outside the Mon--Fri
  Saturday ---    falls on a         schedule.          execution window).2.
  deferred to     Saturday.                             nextExecutionAt is set to
  Monday**                                              the following Monday at
                                                        06:00 UTC.3. The payout
                                                        fires on Monday morning.

  **Non-US public A weekly schedule  The schedule       1\. In v1, the holiday
  holiday ---     is configured for  execution cron     list only covers US
  schedule fires  a UK contractor. A evaluates the      federal holidays.2. The
  on the holiday  UK public holiday  schedule.          UK public holiday is not
  (v1             falls on the                          in the holiday list.3.
  limitation)**   scheduled Monday.                     The schedule fires on the
                                                        UK public holiday as if
                                                        it were a normal business
                                                        day.4. This is a known v1
                                                        limitation documented in
                                                        PS-25 §9.
  -------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Priority: P1 \| Source: PS-25 §9**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

# **9. Magic Link Edge Cases**

## **EC-23 Magic link one-use enforcement under concurrent verification attempts**

  ----------------------------------------------------------------------------------------------------
  **Scenario**     **Given**                       **When**           **Then**
  ---------------- ------------------------------- ------------------ --------------------------------
  **Same magic     A valid magic link exists in    Both requests      1\. Redis atomic DEL returns 1
  link clicked     Redis. Two simultaneous GET     attempt to         for exactly one request and 0
  twice            /v1/payouts/verify-magic-link   validate the       for the other.2. The request
  simultaneously   requests are made with the same token.             that received DEL = 1 proceeds
  --- atomic DEL   token (e.g. contractor                             to advance the payout to
  prevents double  double-tapped or link was                          processing.3. The request that
  use**            opened in two tabs).                               received DEL = 0 returns
                                                                      ERR_MAGIC_LINK_ALREADY_USED.4.
                                                                      Exactly one payout_requests row
                                                                      transitions to processing. No
                                                                      double-execution occurs.

  ----------------------------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Priority: P1 \| Source: PS-25 PS-14**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **EC-24 Magic link sent to wrong email --- resend flow**

  --------------------------------------------------------------------------------------------------------------------
  **Scenario**    **Given**          **When**                                            **Then**
  --------------- ------------------ --------------------------------------------------- -----------------------------
  **Contractor    A magic link has   POST                                                1\. A new token is generated.
  resends         been sent to the   /v1/payouts/{payoutRequestId}/resend-verification   The old token in Redis is
  verification    contractor\'s      is called.                                          deleted (or overwritten).2. A
  email ---       email. The                                                             new magic link email is
  previous link   contractor                                                             sent.3. The old link, if
  invalidated**   realises the link                                                      clicked, returns
                  was not received                                                       ERR_MAGIC_LINK_INVALID (token
                  and taps \"Resend                                                      no longer in Redis).4. The
                  email.\"                                                               resend count increments.
                                                                                         resendCount = 1.

  **Resend limit  The contractor has POST                                                1\. Response returns
  reached ---     already used 3     /v1/payouts/{payoutRequestId}/resend-verification   ERR_MAGIC_LINK_RESEND_LIMIT
  maximum 3       resends for the    is called a 4th time.                               (HTTP 429) with metadata {
  resends**       same                                                                   resendCount: 3, maxResends: 3
                  payoutRequestId.                                                       }.2. No new email is sent.3.
                                                                                         The UI replaces the \"Resend
                                                                                         email\" link with a \"Start a
                                                                                         new withdrawal\" link.
  --------------------------------------------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Priority: P2 \| Source: PS-25 PS-14**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

# **10. EDD and Compliance Edge Cases**

## **EC-25 \$10,000 threshold EDD routing**

  ---------------------------------------------------------------------------------------
  **Scenario**   **Given**              **When**               **Then**
  -------------- ---------------------- ---------------------- --------------------------
  **Single       Contractor has         POST                   1\. checkEDD() detects
  payout of      \$15,000.00 available  /v1/payouts/initiate   amountUSD \>= 10000.2.
  exactly        balance. Contractor    is called.             payout_requests row is
  \$10,000       initiates a withdrawal                        created with status =
  triggers EDD** of exactly                                    awaiting_edd.3. A
                 \$10,000.00.                                  payout.edd.triggered event
                                                               is published to the
                                                               compliance queue.4.
                                                               Response returns HTTP 202
                                                               with status = awaiting_edd
                                                               and EDD copy.5. The payout
                                                               is NOT processed until a
                                                               compliance officer
                                                               approves it.

  **EDD approved The compliance officer The approval is        1\. A new magic link is
  --- fresh      approves the EDD       recorded.              generated and sent to the
  magic link     review.                                       contractor.2.
  required**     edd_reviews.decision =                        payout_requests status
                 APPROVED.                                     transitions from
                                                               awaiting_edd to
                                                               awaiting_verification.3.
                                                               The contractor must click
                                                               the new magic link to
                                                               execute the payout.

  **EDD rejected The compliance officer edd_reviews.decision = 1\. payout_requests status
  --- payout     rejects the EDD        REJECTED is recorded.  transitions to failed with
  failed**       review.                                       failureCode =
                                                               EDD_REJECTED.2. The
                                                               contractor is notified.3.
                                                               The balance is returned to
                                                               available.

  **Payout of    Contractor initiates a POST                   1\. checkEDD() does not
  \$9,999.99     withdrawal of          /v1/payouts/initiate   trigger (amount \<
  does not       \$9,999.99.            is called.             10000).2. payout_requests
  trigger EDD**                                                row is created with status
                                                               = awaiting_verification.3.
                                                               Normal magic link flow
                                                               proceeds.
  ---------------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Priority: P1 \| Source: PS-25 PS-15**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

# **11. First Payout Hold**

## **EC-26 5-business-day first payout hold**

  -------------------------------------------------------------------------------
  **Scenario**    **Given**          **When**           **Then**
  --------------- ------------------ ------------------ -------------------------
  **First payout  Contractor has     The KYC gate check 1\.
  blocked ---     never initiated a  evaluates          firstPayoutHold.active =
  hold active**   payout before.     firstPayoutHold.   true.2. The withdrawal
                  They initiate                         modal closes. The
                  their first                           first-payout hold
                  withdrawal.                           intercept screen
                                                        renders.3. The screen
                                                        shows the holdReleasesAt
                                                        date formatted as a
                                                        human-readable date.4.
                                                        The payout cannot proceed
                                                        until holdReleasesAt.

  **Hold released 5 business days    The contractor     1\. The KYC gate check
  after 5         have passed since  initiates a new    returns
  business days   the contractor\'s  withdrawal.        firstPayoutHold.active =
  --- payout      first payout was                      false.2. The withdrawal
  proceeds**      initiated. The                        proceeds normally with no
                  hold release cron                     hold intercept.
                  has run.                              

  **Admin waives  A Marketeq admin   The contractor     1\. The KYC gate check
  the hold ---    calls the          initiates a        returns
  payout proceeds waive-hold         withdrawal.        firstPayoutHold.active =
  immediately**   endpoint for the                      false.2. The withdrawal
                  contractor.                           proceeds without waiting
                                                        for the 5-business-day
                                                        period.
  -------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Priority: P1 \| Source: PS-25 PS-15**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

# **12. Rate Limiting**

## **EC-27 Withdrawal rate limit --- 5 per hour**

  ------------------------------------------------------------------------------------
  **Scenario**   **Given**          **When**               **Then**
  -------------- ------------------ ---------------------- ---------------------------
  **Sixth        Contractor has     POST                   1\. Response returns
  withdrawal     made 5 manual      /v1/payouts/initiate   ERR_WITHDRAWAL_RATE_LIMIT
  attempt within withdrawal         is called for the 6th  (HTTP 429) with
  60 minutes is  initiations within time.                  retryAfterSeconds =
  blocked**      the last 60                               remaining TTL of the Redis
                 minutes. The Redis                        key.2. No payout_requests
                 rate-limit counter                        row is created.3. The UI
                 for this                                  shows a toast: \"You\'ve
                 contractor is at                          reached the maximum of 5
                 5.                                        withdrawals per hour. Try
                                                           again in
                                                           {retryAfterSeconds}
                                                           seconds.\"

  **Rate limit   The 60-minute      POST                   1\. The Redis INCR counter
  resets after   window has elapsed /v1/payouts/initiate   has expired (TTL
  60 minutes**   since the first of is called.             elapsed).2. The new call is
                 the 5 withdrawals.                        accepted as the first
                                                           request in a fresh
                                                           window.3. The payout
                                                           proceeds normally.

  **Scheduled    The contractor\'s  A scheduled payout     1\. The rate limit check
  payouts are    rate limit counter execution fires.       applies to POST
  not subject to is at 5 (manual                           /v1/payouts/initiate
  the rate       withdrawal limit                          only.2. Scheduled execution
  limit**        reached).                                 uses a separate code path
                                                           not subject to the
                                                           rate-limit middleware.3.
                                                           The scheduled payout
                                                           executes successfully.
  ------------------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **Priority: P1 \| Source: PS-25 PS-19**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
payout-service PS-29 \| v1.0
